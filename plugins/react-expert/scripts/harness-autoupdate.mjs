/**
 * harness-autoupdate.mjs — hook side of the SessionStart-only auto-update of the staged @fusengine/harness
 * to the package.json floor (fusengine.harnessMinVersion). Kimi's plugin manager copies plugin files only, so
 * nothing else moves the harness of an existing install. Sibling of kimi-hook-shim.mjs and
 * harness-update-worker.mjs (same bytes in every plugin's scripts/); the shim treats it as optional.
 *
 * maybeUpdate: 2 file reads, no spawn, when the version is fine. Stale -> pause
 * check -> single-flight lock (generation files, atomic reclaim) -> detached
 * worker (survives the hook timeout), which stages under harness-versions/ and
 * switches with ONE rename(2) of the harness-current symlink. Old trees are
 * never touched by a switch. The back-off stamp is written before the install
 * (a SIGKILLed worker is not relaunched for 30 min, FUSE_ENSURE_DEPS_BACKOFF_MIN);
 * success clears it. Problems leave ONE note in .harness-update.log that the
 * shim prints once at the next SessionStart (takeLog).
 */
import { spawn } from "node:child_process";
import { closeSync, ftruncateSync, openSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync, writeSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const PKG = ["node_modules", "@fusengine", "harness"];
export const BIN = join("dist", "cli", "bin.mjs");
export const POINTER = "harness-current";
export const VERSIONS = "harness-versions";
export const LOCK = ".harness-update.lock";
export const PAUSE = ".harness-update-paused";
export const LOG = ".harness-update.log";

export const readText = (p) => readFileSync(p, "utf8");

/** Parsed JSON file via `read`; null when missing or invalid. */
export function readJson(read, p) {
	try { return JSON.parse(read(p)); } catch { return null; }
}

export function parse(v) {
	const m = /^(\d+)\.(\d+)\.(\d+)/.exec(String(v));
	return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** True only when both versions parse and `v` is strictly below `floor` (numeric, not lexical). */
export function isBelow(v, floor) {
	const a = parse(v);
	const b = parse(floor);
	if (!a || !b) return false;
	for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] < b[i];
	return false;
}

/** Version of the harness the shim would run: harness-current first, else the legacy dir; null if unknown. */
export function installedVersion(kimiHome, read) {
	const ptr = readJson(read, join(kimiHome, POINTER, "package.json"));
	return (ptr ?? readJson(read, join(kimiHome, ...PKG, "package.json")))?.version ?? null;
}

/** Install command: `bun add` (argv, no shell); the FUSENGINE_HARNESS_INSTALL_CMD override only under FUSENGINE_TEST=1. */
export function installPlan(env, floor) {
	if (env.FUSENGINE_TEST === "1" && env.FUSENGINE_HARNESS_INSTALL_CMD) return { cmd: env.FUSENGINE_HARNESS_INSTALL_CMD, args: [], shell: true };
	return { cmd: "bun", args: ["add", `@fusengine/harness@>=${floor}`], shell: false };
}

function ancestors(dir, n) {
	const out = [];
	for (let d = dir; out.length < n; d = dirname(d)) {
		out.push(d);
		if (dirname(d) === d) break;
	}
	return out;
}

/** Floor from the first package.json declaring fusengine.harnessMinVersion (plugin root, then up from the shim). */
function findFloor(env, shimDir, read) {
	const dirs = new Set([...(env.KIMI_PLUGIN_ROOT ? ancestors(env.KIMI_PLUGIN_ROOT, 4) : []), ...ancestors(shimDir, 4)]);
	for (const d of dirs) {
		const floor = readJson(read, join(d, "package.json"))?.fusengine?.harnessMinVersion;
		if (typeof floor === "string") return floor;
	}
	// A lone marketplace plugin has no suite package.json above it: use the copy shipped beside the shim.
	const shipped = readJson(read, join(shimDir, "harness-floor.json"))?.harnessMinVersion;
	return typeof shipped === "string" ? shipped : null;
}

/** Back-off window in minutes: FUSE_ENSURE_DEPS_BACKOFF_MIN (default 30). */
export function pauseMinutes(env) {
	const raw = env.FUSE_ENSURE_DEPS_BACKOFF_MIN ? Number(env.FUSE_ENSURE_DEPS_BACKOFF_MIN) : Number.NaN;
	return Number.isFinite(raw) && raw >= 0 ? raw : 30;
}

function inPause(kimiHome, env, d) {
	const ts = readJson(d.readFile, join(kimiHome, PAUSE))?.ts;
	return typeof ts === "number" && d.now() - ts < pauseMinutes(env) * 60_000;
}

/** Record a back-off stamp (best effort). */
export function writePause(kimiHome) {
	try { writeFileSync(join(kimiHome, PAUSE), JSON.stringify({ ts: Date.now() })); } catch { /* best effort */ }
}

/** Write the one-line note shown at the next SessionStart (best effort); `keep` never overwrites a pending note. */
export function writeLog(kimiHome, line, keep = false) {
	try { writeFileSync(join(kimiHome, LOG), `${line}\n`, { flag: keep ? "wx" : "w" }); } catch { /* best effort */ }
}

/** The pending note, consumed atomically (rename: of parallel shims exactly one gets it), or "". Steady state: one failed rename. */
export function takeLog(kimiHome) {
	const p = join(kimiHome, LOG);
	const mine = `${p}.${process.pid}`;
	try {
		renameSync(p, mine);
		return readText(mine).trim();
	} catch { return ""; } finally { rmSync(mine, { force: true }); }
}

/** Lock generations present in the home, ascending; 0 is the legacy un-numbered name. */
export function lockGens(kimiHome) {
	try {
		return readdirSync(kimiHome).flatMap((n) => (n === LOCK ? [0] : n.startsWith(`${LOCK}.`) && /^\d+$/.test(n.slice(LOCK.length + 1)) ? [Number(n.slice(LOCK.length + 1))] : [])).sort((a, b) => a - b);
	} catch { return []; }
}

export const lockPath = (kimiHome, gen) => join(kimiHome, gen === 0 ? LOCK : `${LOCK}.${gen}`);

/** A lock is stale when its worker pid is dead (or >10 min old); without a pid yet, after 30 s. */
function lockStale(path) {
	try {
		const age = Date.now() - statSync(path).mtimeMs;
		const pid = readJson(readText, path)?.pid;
		if (typeof pid !== "number") return age > 30_000;
		try { process.kill(pid, 0); return age > 600_000; } catch (e) { return e.code !== "EPERM"; }
	} catch { return true; }
}

/**
 * Single-flight lock by GENERATION: the holder is the highest `.harness-update.lock.<n>`. A stale holder is
 * superseded by creating n+1 with O_EXCL, which only one contender can win, so a reclaim can never hand the
 * lock to two processes (no rename/delete of a file someone else may have just taken).
 * @returns a release fn carrying `.gen`, or null when another updater holds it
 */
function tryLock(kimiHome) {
	const gens = lockGens(kimiHome);
	const top = gens.at(-1);
	if (top !== undefined && !lockStale(lockPath(kimiHome, top))) return null;
	const gen = (top ?? -1) + 1 || 1;
	try { writeLock(lockPath(kimiHome, gen), "wx"); } catch { return null; }
	for (const old of gens) rmSync(lockPath(kimiHome, old), { force: true }); // we won gen n+1: older generations are dead
	return Object.assign(() => rmSync(lockPath(kimiHome, gen), { force: true }), { gen });
}

/** Write `{ts, ...data}` to a lock: "wx" creates a generation exclusively; "r+" (no O_CREAT) rewrites a held one and throws ENOENT on one reclaimed meanwhile instead of resurrecting it. */
export function writeLock(path, flag, data = {}) {
	const fd = openSync(path, flag);
	try { ftruncateSync(fd); writeSync(fd, JSON.stringify({ ts: Date.now(), ...data }), 0); } finally { closeSync(fd); }
}

/** Detached worker, whose pid is recorded in OUR lock generation (it only acts while the lock holds its pid); a spawn failure throws. */
function spawnWorker(kimiHome, floor, env, gen) {
	const worker = fileURLToPath(new URL("./harness-update-worker.mjs", import.meta.url));
	const child = spawn(process.execPath, [worker, kimiHome, floor, String(gen)], { detached: true, stdio: "ignore", env });
	child.on("error", () => {});
	if (child.pid === undefined) throw new Error("worker spawn failed");
	writeLock(lockPath(kimiHome, gen), "r+", { pid: child.pid }); // a hook stalled >30 s may have lost gen to a reclaim
	child.unref();
}

/** Production deps of maybeUpdate (exported for wiring tests). */ export const DEFAULT_DEPS = { readFile: readText, now: Date.now, lock: tryLock, spawnWorker, writePause, log: writeLog };

/**
 * Hook-side check. Never throws on a normal path; the caller wraps it anyway.
 * @param o - { kimiHome, env, shimDir, platform }
 * @param d - injectable { readFile, now, lock, spawnWorker, writePause, log } (tests)
 * @returns what happened: nofloor | unknown | current | unsupported | paused | locked | error | spawned
 */
export function maybeUpdate(o, d = DEFAULT_DEPS) {
	const floor = findFloor(o.env, o.shimDir, d.readFile);
	if (!floor) return "nofloor";
	const v = installedVersion(o.kimiHome, d.readFile);
	if (v === null) return "unknown"; // only a positively-known older version is touched
	if (!isBelow(v, floor)) return "current";
	const mins = pauseMinutes(o.env);
	// Reminders are written by the `rules` shim only (o.quiet = false): Kimi runs one SessionStart shim per scope in parallel.
	const remind = (line) => { if (!o.quiet) d.log(o.kimiHome, line, true); };
	if (o.platform === "win32") { // the symlink switch needs privileges there
		remind(`harness ${v} is older than the required ${floor}; auto-update unavailable on win32, run setup.ps1`);
		return "unsupported";
	}
	if (inPause(o.kimiHome, o.env, d)) {
		remind(`harness ${v} is older than the required ${floor}; auto-update is paused (retry within ${mins} min of the last attempt)`);
		return "paused";
	}
	const release = d.lock(o.kimiHome);
	if (!release) return "locked";
	d.writePause(o.kimiHome); // BEFORE the worker exists: whatever happens to it (kill, crash, never starts), no relaunch for the window
	try { d.spawnWorker(o.kimiHome, floor, o.env, release.gen); } catch (e) {
		d.log(o.kimiHome, `harness auto-update ${v} -> >=${floor} could not start (${e.message}); retries paused ${mins} min`);
		release();
		return "error";
	}
	return "spawned"; // the worker owns the lock now and removes it when done
}
