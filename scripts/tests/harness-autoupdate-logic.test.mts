/**
 * harness-autoupdate-logic.test.mts — maybeUpdate decisions with injected deps
 * (no fs, no spawn): steady-state cost, pause, lock, notes, floor discovery.
 */
import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { FLOOR } from "./harness-fixtures.mts";

const { maybeUpdate } = await import(resolve(import.meta.dir, "../hooks/harness-autoupdate.mjs"));

const NOW = 1_700_000_000_000;
type Files = Record<string, unknown>;

/** Injected deps over an in-memory fs; counts successful reads, locks, spawns, stamps and notes. */
function fakeDeps(files: Files, lockFree = true) {
	const c = { reads: 0, locks: 0, spawns: 0, pauses: 0, released: 0, order: [] as string[], logs: [] as string[] };
	return {
		c,
		deps: {
			readFile: (p: string) => {
				if (!(p in files)) throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
				c.reads++;
				return JSON.stringify(files[p]);
			},
			now: () => NOW,
			lock: () => { c.locks++; return lockFree ? Object.assign(() => { c.released++; }, { gen: 1 }) : null; },
			spawnWorker: () => { c.spawns++; c.order.push("spawn"); },
			writePause: () => { c.pauses++; c.order.push("pause"); },
			log: (_home: string, line: string) => { c.logs.push(line); },
		},
	};
}

const opts = { kimiHome: "/h", env: { KIMI_PLUGIN_ROOT: "/s" } as Record<string, string>, shimDir: "/s/scripts/hooks", platform: "linux" };
const floorFile = { "/s/package.json": { fusengine: { harnessMinVersion: FLOOR } } };
const legacy = (v: string) => ({ "/h/node_modules/@fusengine/harness/package.json": { version: v } });
const stamp = (ageMin: number) => ({ "/h/.harness-update-paused": { ts: NOW - ageMin * 60_000 } });

describe("maybeUpdate decision logic", () => {
	test("equal version: nothing, no lock/spawn, at most 2 successful reads", () => {
		const { c, deps } = fakeDeps({ ...floorFile, ...legacy(FLOOR) });
		expect(maybeUpdate(opts, deps)).toBe("current");
		expect(c).toMatchObject({ reads: 2, locks: 0, spawns: 0, pauses: 0, logs: [] });
	});
	test("newer version: nothing", () => {
		const { c, deps } = fakeDeps({ ...floorFile, ...legacy("0.2.0") });
		expect(maybeUpdate(opts, deps)).toBe("current");
		expect(c.spawns + c.locks).toBe(0);
	});
	test("numeric comparison (0.1.9 < 0.1.115)", () => {
		const { c, deps } = fakeDeps({ ...floorFile, ...legacy("0.1.9") });
		expect(maybeUpdate(opts, deps)).toBe("spawned");
		expect(c.spawns).toBe(1);
	});
	test("older: one lock, the stamp BEFORE the one spawn", () => {
		const { c, deps } = fakeDeps({ ...floorFile, ...legacy("0.1.110") });
		expect(maybeUpdate(opts, deps)).toBe("spawned");
		expect(c).toMatchObject({ locks: 1, spawns: 1, pauses: 1 });
		expect(c.order).toEqual(["pause", "spawn"]); // a worker that dies at any point is not relaunched
	});
	test("pointer layout wins over the legacy dir", () => {
		const { c, deps } = fakeDeps({ ...floorFile, ...legacy("0.1.100"), "/h/harness-current/package.json": { version: FLOOR } });
		expect(maybeUpdate(opts, deps)).toBe("current");
		expect(c.spawns).toBe(0);
	});
	test("unknown installed version (no package.json): nothing", () => {
		const { c, deps } = fakeDeps({ ...floorFile });
		expect(maybeUpdate(opts, deps)).toBe("unknown");
		expect(c.spawns).toBe(0);
	});
	test("no floor discoverable: nothing", () => {
		const { c, deps } = fakeDeps({ ...legacy("0.1.1") });
		expect(maybeUpdate(opts, deps)).toBe("nofloor");
		expect(c.spawns).toBe(0);
	});
	test("lone plugin (no package.json up the tree): the floor comes from harness-floor.json beside the shim", () => {
		const lone = { kimiHome: "/h", env: { KIMI_PLUGIN_ROOT: "/m/p" } as Record<string, string>, shimDir: "/m/p/scripts", platform: "linux" };
		const floor = { "/m/p/scripts/harness-floor.json": { harnessMinVersion: FLOOR } };
		const stale = fakeDeps({ ...floor, ...legacy("0.1.110") });
		expect(maybeUpdate(lone, stale.deps)).toBe("spawned");
		const ok = fakeDeps({ ...floor, ...legacy(FLOOR) });
		expect(maybeUpdate(lone, ok.deps)).toBe("current");
		expect(ok.c.reads).toBe(2); // steady state stays at two reads
	});
	test("pause: 10 min old stamp blocks, 31 min old does not, env window honoured", () => {
		const base = { ...floorFile, ...legacy("0.1.110") };
		let f = fakeDeps({ ...base, ...stamp(10) });
		expect(maybeUpdate(opts, f.deps)).toBe("paused");
		expect(f.c.spawns).toBe(0);
		f = fakeDeps({ ...base, ...stamp(31) });
		expect(maybeUpdate(opts, f.deps)).toBe("spawned");
		f = fakeDeps({ ...base, ...stamp(10) });
		expect(maybeUpdate({ ...opts, env: { ...opts.env, FUSE_ENSURE_DEPS_BACKOFF_MIN: "5" } }, f.deps)).toBe("spawned");
	});
	test("lock held elsewhere: no spawn", () => {
		const { c, deps } = fakeDeps({ ...floorFile, ...legacy("0.1.110") }, false);
		expect(maybeUpdate(opts, deps)).toBe("locked");
		expect(c.spawns).toBe(0);
	});
});

describe("maybeUpdate notes", () => {
	test("win32 with an older harness: no update, a note naming both versions and setup.ps1", () => {
		const { c, deps } = fakeDeps({ ...floorFile, ...legacy("0.1.110") });
		expect(maybeUpdate({ ...opts, platform: "win32" }, deps)).toBe("unsupported");
		expect(c.spawns + c.locks).toBe(0);
		expect(c.logs).toHaveLength(1);
		expect(c.logs[0]).toContain("0.1.110");
		expect(c.logs[0]).toContain(FLOOR);
		expect(c.logs[0]).toContain("setup.ps1");
	});
	test("win32 with a current harness: silent", () => {
		const { c, deps } = fakeDeps({ ...floorFile, ...legacy(FLOOR) });
		expect(maybeUpdate({ ...opts, platform: "win32" }, deps)).toBe("current");
		expect(c.logs).toEqual([]);
	});
	test("paused: a note naming both versions", () => {
		const { c, deps } = fakeDeps({ ...floorFile, ...legacy("0.1.110"), ...stamp(1) });
		expect(maybeUpdate(opts, deps)).toBe("paused");
		expect(c.logs[0]).toContain("0.1.110");
		expect(c.logs[0]).toContain(FLOOR);
	});
	test("a note shown within the back-off window suppresses the paused / win32 reminders", () => {
		const paused = fakeDeps({ ...floorFile, ...legacy("0.1.110"), ...stamp(1) });
		const shown = { ...paused.deps, shownRecently: () => true };
		expect(maybeUpdate(opts, shown)).toBe("paused");
		const win = fakeDeps({ ...floorFile, ...legacy("0.1.110") });
		expect(maybeUpdate({ ...opts, platform: "win32" }, { ...win.deps, shownRecently: () => true })).toBe("unsupported");
		expect(paused.c.logs.length + win.c.logs.length).toBe(0);
	});
	test("spawn failure: back-off stamp + note naming both versions + lock released", () => {
		const { c, deps } = fakeDeps({ ...floorFile, ...legacy("0.1.110") });
		const failing = { ...deps, spawnWorker: () => { throw new Error("spawn ENOENT"); } };
		expect(maybeUpdate(opts, failing)).toBe("error");
		expect(c.pauses).toBe(1);
		expect(c.released).toBe(1);
		expect(c.logs[0]).toContain("0.1.110");
		expect(c.logs[0]).toContain(FLOOR);
	});
});
