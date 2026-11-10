/**
 * harness-update-worker.test.mts — worker-side rules: prune keeps the version
 * replaced just before the current one, and the install override is test-only.
 */
import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const hooks = resolve(import.meta.dir, "../hooks");
const worker_mod = await import(join(hooks, "harness-update-worker.mjs"));
const { prune } = worker_mod;
const { installPlan } = await import(join(hooks, "harness-autoupdate.mjs"));

const DAY = 86_400_000;
const NOW = Date.now();

/** Home whose harness-versions/ holds the given dirs (name -> age in days); `current` is the pointer target. */
function homeWith(dirs: Record<string, number>, current: string): { home: string; versions: string } {
	const home = mkdtempSync(join(tmpdir(), "harness-prune-"));
	const versions = join(home, "harness-versions");
	const names = new Map<string, string>();
	for (const [label, ageDays] of Object.entries(dirs)) {
		const name = label.startsWith(".tmp") ? `${label}-${NOW - ageDays * DAY}` : `${label}-${NOW - ageDays * DAY}`;
		names.set(label, name);
		mkdirSync(join(versions, name, "node_modules/@fusengine/harness"), { recursive: true });
	}
	symlinkSync(join("harness-versions", names.get(current)!, "node_modules/@fusengine/harness"), join(home, "harness-current"));
	return { home, versions };
}

const labels = (versions: string): string[] => readdirSync(versions).map((n) => n.replace(/-\d{10,}$/, "")).sort();

describe("prune", () => {
	test("keeps the current version AND the one replaced just before it, however old; drops older ones", () => {
		const { home, versions } = homeWith({ v1: 9, v2: 8, v3: 6, v4: 5 }, "v4");
		prune(home, versions);
		expect(labels(versions)).toEqual(["v3", "v4"]);
	});
	test("a recently replaced version is kept even beyond the two newest", () => {
		const { home, versions } = homeWith({ v1: 0.5, v2: 0.4, v3: 0.3, v4: 0.2 }, "v4");
		prune(home, versions);
		expect(labels(versions)).toEqual(["v1", "v2", "v3", "v4"]);
	});
	test("stale stage dirs of dead workers go, a fresh one stays", () => {
		const { home, versions } = homeWith({ v1: 3, ".tmp-1": 3, ".tmp-2": 0.001 }, "v1");
		prune(home, versions);
		expect(labels(versions)).toEqual([".tmp-2", "v1"]);
	});
});

describe("worker lock ownership", () => {
	const { worker } = worker_mod;
	/** A home with a 0.1.110 legacy harness and an install command that fails (never reaches the network). */
	function staleHome(): string {
		const home = mkdtempSync(join(tmpdir(), "harness-worker-"));
		mkdirSync(join(home, "node_modules/@fusengine/harness"), { recursive: true });
		writeFileSync(join(home, "node_modules/@fusengine/harness/package.json"), JSON.stringify({ version: "0.1.110" }));
		process.env.FUSENGINE_TEST = "1";
		process.env.FUSENGINE_HARNESS_INSTALL_CMD = "exit 1";
		return home;
	}
	const dotfiles = (home: string): string[] => readdirSync(home).filter((n) => n.startsWith(".harness-update"));

	test("a superseded worker (its lock file is gone) never recreates it, never stamps, never installs", async () => {
		const home = staleHome();
		await worker(home, "0.1.115", "4");
		expect(dotfiles(home)).toEqual([]);
		expect(existsSync(join(home, "harness-versions"))).toBe(false);
	}, 10_000);

	test("a lock file holding another pid is left untouched", async () => {
		const home = staleHome();
		const lock = join(home, ".harness-update.lock.4");
		writeFileSync(lock, JSON.stringify({ ts: Date.now(), pid: process.pid + 1 }));
		await worker(home, "0.1.115", "4");
		expect(readFileSync(lock, "utf8")).toContain(String(process.pid + 1));
		expect(dotfiles(home)).toEqual([".harness-update.lock.4"]);
		expect(existsSync(join(home, "harness-versions"))).toBe(false);
	}, 10_000);

	test("a worker whose pid the hook recorded installs, then removes its own lock", async () => {
		const home = staleHome();
		const lock = join(home, ".harness-update.lock.4");
		writeFileSync(lock, JSON.stringify({ ts: Date.now(), pid: process.pid }));
		await worker(home, "0.1.115", "4"); // install fails (exit 1): note written, lock released
		expect(existsSync(lock)).toBe(false);
		expect(readFileSync(join(home, ".harness-update.log"), "utf8")).toContain("0.1.110 -> >=0.1.115");
	}, 10_000);
});

describe("installPlan", () => {
	const base = { FUSENGINE_HARNESS_INSTALL_CMD: "touch pwned" } as Record<string, string>;
	test("the custom command is ignored in production (no FUSENGINE_TEST): argv bun add, no shell", () => {
		const p = installPlan(base, "0.1.115");
		expect(p).toEqual({ cmd: "bun", args: ["add", "@fusengine/harness@>=0.1.115"], shell: false });
	});
	test("honoured only under FUSENGINE_TEST=1", () => {
		const p = installPlan({ ...base, FUSENGINE_TEST: "1" }, "0.1.115");
		expect(p).toEqual({ cmd: "touch pwned", args: [], shell: true });
	});
});
