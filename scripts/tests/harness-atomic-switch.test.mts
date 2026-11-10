/**
 * harness-atomic-switch.test.mts — the harness switch must never be visible as
 * a missing/half-written tree. Stress: thousands of real shim launches while the
 * update lands, long-running processes loaded before it, kill -9 mid-install,
 * and every deployed shim copy resolving a working bin afterwards.
 * STRESS_RUNS (default 1) repeats the stress loop; the proof run uses 5.
 */
import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FLOOR, REPO, SHIM, answer, answeredVersion, installs, makeFixture, payload, runShim, waitFor, type Fixture } from "./harness-fixtures.mts";

const RUNS = Number(process.env.STRESS_RUNS ?? "1");
const LAUNCHES = 2000;

interface Launch { ok: boolean; ver: string | null; detail: string; code: number }

/** One real shim launch (async); ok only on exit 0 + a parsable harness answer + no skip note. */
async function launch(f: Fixture, event: string, extra: Record<string, string> = {}): Promise<Launch> {
	const p = Bun.spawn(["bun", SHIM, "core"], {
		env: { ...(process.env as Record<string, string>), ...f.env, ...extra },
		stdin: new Blob([payload(event)]),
		stdout: "pipe",
		stderr: "pipe",
	});
	const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
	let ver: string | null = null;
	try { ver = (JSON.parse(out) as { ver: string }).ver; } catch { /* leave null */ }
	const ok = code === 0 && ver !== null && !err.includes("not found");
	return { ok, ver, code, detail: ok ? "" : `code=${code} out=${out.slice(0, 80)} err=${err.slice(0, 160)}` };
}

describe("atomic harness switch", () => {
	for (let run = 1; run <= RUNS; run++) {
		test(`stress run ${run}/${RUNS}: ${LAUNCHES}+ launches across the switch, 0 failures, long processes survive`, async () => {
			const f = makeFixture("0.1.110");
			const longs = [1, 2, 3].map(() => launch(f, "PreToolUse", { LONG: "1" }));
			const starter = launch(f, "SessionStart", { INSTALL_SLEEP_MS: "1500" });
			const switched = () => existsSync(join(f.home, "harness-current"));
			const failures: string[] = [];
			const seen = new Map<string, number>();
			let total = 0;
			let after = 0;
			const deadline = Date.now() + 150_000;
			const worker = async (): Promise<void> => {
				while (Date.now() < deadline && !(total >= LAUNCHES && after >= 300)) {
					const wasSwitched = switched();
					total++;
					const r = await launch(f, "PreToolUse");
					if (wasSwitched) after++;
					if (r.ok) seen.set(r.ver!, (seen.get(r.ver!) ?? 0) + 1);
					else failures.push(r.detail);
				}
			};
			await Promise.all(Array.from({ length: 16 }, worker));
			const settled = await Promise.all([starter, ...longs]);
			expect(failures).toEqual([]);
			expect(settled.map((s) => s.code)).toEqual([0, 0, 0, 0]);
			expect(settled.slice(1).map((s) => s.ver)).toEqual(["0.1.110", "0.1.110", "0.1.110"]);
			expect(total).toBeGreaterThanOrEqual(LAUNCHES);
			expect(seen.get("0.1.110") ?? 0).toBeGreaterThan(0);
			expect(seen.get(FLOOR) ?? 0).toBeGreaterThan(0);
			expect(installs(f)).toBe(1);
		}, 200_000);
	}

	test("kill -9 in the middle of the staging install leaves a working live tree, next SessionStart recovers", async () => {
		const f = makeFixture("0.1.110");
		runShim(SHIM, f, "SessionStart", { INSTALL_SLEEP_MS: "60000" });
		const pidOf = (): number | null => {
			const name = readdirSync(f.home).filter((n) => n.startsWith(".harness-update.lock")).sort().at(-1);
			try { return (JSON.parse(readFileSync(join(f.home, name!), "utf8")) as { pid?: number }).pid ?? null; } catch { return null; }
		};
		expect(await waitFor(() => pidOf() !== null && installs(f) === 1)).toBe(true);
		process.kill(-pidOf()!, "SIGKILL"); // worker + its installer (detached = own process group)
		await Bun.sleep(300);
		expect(answeredVersion(SHIM, f)).toBe("0.1.110");
		expect(existsSync(join(f.home, "harness-current"))).toBe(false);
		expect(existsSync(join(f.home, "node_modules/@fusengine/harness/dist/cli/bin.mjs"))).toBe(true);
		// The back-off stamp was written before the install: the killed worker is NOT relaunched.
		const pause = join(f.home, ".harness-update-paused");
		expect(existsSync(pause)).toBe(true);
		runShim(SHIM, f, "SessionStart");
		await Bun.sleep(800);
		expect(installs(f)).toBe(1);
		// Once the pause has expired, the dead-pid lock is reclaimed and the update lands.
		writeFileSync(pause, JSON.stringify({ ts: Date.now() - 31 * 60_000 }));
		runShim(SHIM, f, "SessionStart");
		expect(await waitFor(() => existsSync(join(f.home, "harness-current")))).toBe(true);
		expect(answeredVersion(SHIM, f)).toBe(FLOOR);
		expect(installs(f)).toBe(2);
	}, 60_000);

	test("every deployed shim copy resolves a working bin after the switch", async () => {
		const f = makeFixture("0.1.110");
		runShim(SHIM, f, "SessionStart");
		expect(await waitFor(() => existsSync(join(f.home, "harness-current")))).toBe(true);
		const pluginsDir = join(REPO, "plugins");
		const copies = readdirSync(pluginsDir, { withFileTypes: true })
			.filter((d) => d.isDirectory())
			.map((d) => join(pluginsDir, d.name, "scripts", "kimi-hook-shim.mjs"));
		expect(copies.length).toBe(26);
		// dep "staged" proves the bin resolved its deps from the symlink's REAL dir, not the legacy home.
		const bad = copies.filter((c) => JSON.stringify(answer(c, f)) !== JSON.stringify({ ver: FLOOR, dep: "staged" }));
		expect(bad).toEqual([]);
		expect(answeredVersion(SHIM, f)).toBe(FLOOR);
	}, 120_000);
});
