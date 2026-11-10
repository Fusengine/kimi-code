/**
 * live-stage.test.mts — hermetic checks for the live-harness cache policy.
 * No network: only fake cache dirs and a fake repo package.json.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isCacheHit } from "../lib/hooks-e2e/live-stage";

const PIN = "FUSENGINE_HARNESS_VERSION";
let saved: string | undefined;
beforeEach(() => { saved = process.env[PIN]; delete process.env[PIN]; });
afterEach(() => { if (saved === undefined) delete process.env[PIN]; else process.env[PIN] = saved; });

/** Fake repo whose package.json declares the given harness floor. */
function repoWithFloor(floor: string | null): string {
	const root = mkdtempSync(join(tmpdir(), "live-stage-repo-"));
	const pkg = floor ? { fusengine: { harnessMinVersion: floor } } : {};
	writeFileSync(join(root, "package.json"), JSON.stringify(pkg));
	return root;
}

/** Fake cache dir holding a harness bin + package.json at `version`. */
function cacheWith(version: string): string {
	const dir = mkdtempSync(join(tmpdir(), "live-stage-cache-"));
	const pkgDir = join(dir, "node_modules", "@fusengine", "harness");
	mkdirSync(join(pkgDir, "dist", "cli"), { recursive: true });
	writeFileSync(join(pkgDir, "dist", "cli", "bin.mjs"), "");
	writeFileSync(join(pkgDir, "package.json"), JSON.stringify({ version }));
	return dir;
}

describe("isCacheHit (floor policy)", () => {
	test("cached version below the floor is a miss", async () => {
		expect(await isCacheHit(cacheWith("0.1.113"), repoWithFloor("0.1.115"))).toBe(false);
	});
	test("numeric, not lexical, comparison (0.1.9 < 0.1.115)", async () => {
		expect(await isCacheHit(cacheWith("0.1.9"), repoWithFloor("0.1.115"))).toBe(false);
	});
	test("cached version equal to or above the floor is a hit", async () => {
		expect(await isCacheHit(cacheWith("0.1.115"), repoWithFloor("0.1.115"))).toBe(true);
		expect(await isCacheHit(cacheWith("0.1.120"), repoWithFloor("0.1.115"))).toBe(true);
	});
	test("no floor declared: any staged version is a hit", async () => {
		expect(await isCacheHit(cacheWith("0.1.1"), repoWithFloor(null))).toBe(true);
	});
	test("missing bin is a miss", async () => {
		const dir = mkdtempSync(join(tmpdir(), "live-stage-empty-"));
		expect(await isCacheHit(dir, repoWithFloor("0.1.115"))).toBe(false);
	});
	test("pin set: exact match only, floor ignored", async () => {
		process.env[PIN] = "0.1.113";
		expect(await isCacheHit(cacheWith("0.1.113"), repoWithFloor("0.1.115"))).toBe(true);
		expect(await isCacheHit(cacheWith("0.1.115"), repoWithFloor("0.1.115"))).toBe(false);
	});
});
