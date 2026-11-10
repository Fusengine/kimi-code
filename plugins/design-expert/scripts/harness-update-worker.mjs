/**
 * harness-update-worker.mjs — detached worker of harness-autoupdate.mjs.
 * Run as `bun harness-update-worker.mjs <kimiHome> <floor> <lockGen>`.
 * Stages `@fusengine/harness>=floor` in harness-versions/.tmp-*, verifies
 * version + bin, then switches with ONE rename(2) of the harness-current
 * symlink. The hook already wrote the back-off stamp; the worker never writes
 * the lock, deletes it only while it holds ITS pid, and only prunes / switches
 * under a lock it really owns. Success clears the stamp; failure leaves a note.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, realpathSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { BIN, LOG, PAUSE, PKG, POINTER, VERSIONS, installPlan, installedVersion, isBelow, lockPath, parse, pauseMinutes, readJson, readText, writeLog } from "./harness-autoupdate.mjs";

const INSTALL_MS = 120_000;
const DAY_MS = 86_400_000;
const stamp = (name) => Number(/-(\d{10,})$/.exec(name)?.[1] ?? 0); // creation time embedded in every dir name

/**
 * Remove old version dirs. Keeps the two newest (the current one and the one replaced just before it, which
 * running processes may still read, however old) and the current target; others go after a day. Dead workers'
 * `.tmp-*` stage dirs go after a day.
 */
export function prune(kimiHome, versions) {
	let current = null;
	try { current = realpathSync(join(kimiHome, POINTER)); } catch { /* no pointer yet */ }
	const root = realpathSync(versions);
	const names = readdirSync(root).sort((a, b) => stamp(b) - stamp(a));
	const keep = new Set(names.filter((n) => !n.startsWith(".tmp-")).slice(0, 2));
	for (const name of names) {
		const p = join(root, name);
		if (keep.has(name) || (current !== null && current.startsWith(p + sep)) || Date.now() - stamp(name) <= DAY_MS) continue;
		try { rmSync(p, { recursive: true, force: true }); } catch { /* best effort */ }
	}
}

function install(stage, floor) {
	const { cmd, args, shell } = installPlan(process.env, floor);
	const r = spawnSync(cmd, args, { cwd: stage, shell, stdio: "ignore", timeout: INSTALL_MS, env: { ...process.env, HARNESS_SPEC: `>=${floor}` } });
	if (r.status !== 0) throw new Error(`install exited ${r.status ?? r.signal}`);
}

/** Stage, verify, switch atomically. Back-off stamp BEFORE the install; cleared on success; one note on failure. */
export async function worker(kimiHome, floor, genArg) {
	const gen = Number(genArg);
	const lock = lockPath(kimiHome, gen);
	const owns = () => readJson(readText, lock)?.pid === process.pid;
	let stage = null;
	let settled = false;
	let from = "?";
	try {
		// The hook records our pid in our lock generation right after spawning us; never write the lock ourselves
		// (a superseded generation must not be resurrected). No pid in 2 s, or another pid: not ours to run.
		for (let i = 0; i < 100 && !owns(); i++) await new Promise((r) => setTimeout(r, 20));
		if (!owns()) return;
		const v = installedVersion(kimiHome, readText);
		if (v === null || !isBelow(v, floor)) { settled = true; return; } // already moved by someone else
		from = v;
		const versions = join(kimiHome, VERSIONS);
		mkdirSync(versions, { recursive: true });
		if (owns()) prune(kimiHome, versions);
		stage = join(versions, `.tmp-${process.pid}-${Date.now()}`);
		mkdirSync(stage);
		writeFileSync(join(stage, "package.json"), JSON.stringify({ name: "fusengine-harness-stage", private: true }));
		install(stage, floor);
		const pkgDir = join(stage, ...PKG);
		const ver = readJson(readText, join(pkgDir, "package.json"))?.version;
		if (!parse(ver) || isBelow(ver, floor) || !existsSync(join(pkgDir, BIN))) throw new Error(`staged harness invalid (${ver})`);
		// Re-check just before the switch: a setup.sh stage or a concurrent worker may have reached the floor meanwhile.
		const now = installedVersion(kimiHome, readText);
		if (now !== null && !isBelow(now, floor)) { settled = true; return; }
		if (!owns()) throw new Error("lock lost");
		const final = join(versions, `${ver}-${Date.now()}`);
		renameSync(stage, final);
		stage = null;
		const tmp = join(kimiHome, `.${POINTER}-${process.pid}`);
		symlinkSync(relative(kimiHome, join(final, ...PKG)), tmp);
		renameSync(tmp, join(kimiHome, POINTER)); // the one atomic switch
		settled = true;
	} catch (e) {
		writeLog(kimiHome, `harness auto-update ${from} -> >=${floor} failed: ${e.message}; retries paused ${pauseMinutes(process.env)} min`);
	} finally {
		if (settled) { // resolved: drop the stamp and any pending "paused" reminder a racing shim wrote meanwhile
			rmSync(join(kimiHome, PAUSE), { force: true });
			rmSync(join(kimiHome, LOG), { force: true });
		}
		if (stage) rmSync(stage, { recursive: true, force: true });
		if (owns()) rmSync(lock, { force: true });
	}
}

if (import.meta.main) await worker(process.argv[2], process.argv[3], process.argv[4]);
