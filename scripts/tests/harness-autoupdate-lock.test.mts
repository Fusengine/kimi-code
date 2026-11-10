/**
 * harness-autoupdate-lock.test.mts — single-flight under races, a setup stage
 * landing mid-update, and a lone marketplace plugin (no suite package.json).
 */
import { describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { FLOOR, REPO, SHIM, answer, installs, makeFixture, runShim, sleep, waitFor } from "./harness-fixtures.mts";
import { burst, lockFiles } from "./harness-helpers.mts";

const SCOPES = ["rules", "core", "carto", "lessons", "memory", "solid"];

describe("single-flight", () => {
	test("reclaiming a STALE lock is atomic: 6 racing SessionStart shims never start 2 workers (15 trials)", async () => {
		let doubles = 0;
		for (let t = 0; t < 15; t++) {
			const f = makeFixture("0.1.110");
			writeFileSync(join(f.home, ".harness-update.lock"), JSON.stringify({ ts: 1, pid: 999_999 }));
			await burst(f, SCOPES, { INSTALL_SLEEP_MS: "700" });
			await waitFor(() => existsSync(join(f.home, "harness-current")));
			await sleep(150);
			if (installs(f) !== 1) doubles++;
		}
		expect(doubles).toBe(0);
	}, 120_000);

	test("a setup stage that reaches the floor while the worker installs wins: no pointer is written over it", async () => {
		const f = makeFixture("0.1.110");
		runShim(SHIM, f, "SessionStart", { INSTALL_SLEEP_MS: "1200" });
		expect(await waitFor(() => installs(f) === 1)).toBe(true);
		writeFileSync(join(f.home, "node_modules/@fusengine/harness/package.json"), JSON.stringify({ version: "0.1.116" }));
		expect(await waitFor(() => lockFiles(f.home).length === 0)).toBe(true); // the worker finished and released its lock
		expect(existsSync(join(f.home, "harness-current"))).toBe(false);
		expect(answer(SHIM, f)?.ver).toBe("0.1.116");
	});

	test("pid record after a >30 s stall: a lock reclaimed meanwhile is NOT resurrected; a held one is fully rewritten", async () => {
		const { writeLock } = await import(join(REPO, "scripts/hooks/harness-autoupdate.mjs"));
		const f = makeFixture("0.1.110");
		expect(() => writeLock(join(f.home, ".harness-update.lock.1"), "r+", { pid: 4242 })).toThrow(); // gen 1 superseded (deleted) by another hook's gen 2
		expect(lockFiles(f.home)).toEqual([]);
		const held = join(f.home, ".harness-update.lock.3");
		writeFileSync(held, JSON.stringify({ ts: 1, pad: "x".repeat(200) }));
		writeLock(held, "r+", { pid: 4242 });
		expect(JSON.parse(readFileSync(held, "utf8"))).toMatchObject({ pid: 4242 }); // truncated: still valid JSON
	});

	test("real spawnWorker on a generation reclaimed before the pid write: no resurrected lock, the orphan worker never installs", async () => {
		const { maybeUpdate, DEFAULT_DEPS } = await import(join(REPO, "scripts/hooks/harness-autoupdate.mjs"));
		const f = makeFixture("0.1.110");
		const lostGen = Object.assign(() => {}, { gen: 7 }); // won gen 7, then stalled: another hook reclaimed and deleted it
		const o = { kimiHome: f.home, env: { ...process.env, ...f.env }, shimDir: f.suite, platform: "linux", quiet: true };
		expect(maybeUpdate(o, { ...DEFAULT_DEPS, lock: () => lostGen })).toBe("error");
		await sleep(2_600); // the worker waits 2 s for its pid, then must give up
		expect(lockFiles(f.home)).toEqual([]);
		expect(installs(f)).toBe(0);
	});
});

describe("lone marketplace plugin", () => {
	/** A managed copy of ONE plugin (scripts only), as Kimi's plugin manager installs it: no suite package.json above. */
	function lonePlugin(name: string, base: string): string {
		const root = join(base, "managed", name);
		mkdirSync(root, { recursive: true });
		cpSync(join(REPO, "plugins", name, "scripts"), join(root, "scripts"), { recursive: true });
		return root;
	}

	test("a plugin with a SessionStart hook (core-guards) reaches the floor from 0.1.110", async () => {
		const f = makeFixture("0.1.110");
		const root = lonePlugin("core-guards", dirname(f.home));
		const shim = join(root, "scripts/kimi-hook-shim.mjs");
		expect(runShim(shim, f, "SessionStart", { KIMI_PLUGIN_ROOT: root }, "core").code).toBe(0);
		expect(await waitFor(() => existsSync(join(f.home, "harness-current")))).toBe(true);
		expect(answer(shim, f)).toEqual({ ver: FLOOR, dep: "staged" });
		expect(installs(f)).toBe(1);
	});
});
