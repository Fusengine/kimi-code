/**
 * live-stage.ts — Layer 3 staging: the REAL @fusengine/harness from npm,
 * installed into a tmp cache dir via the installer's installRuntimeDeps.
 * Cache reuse: a present bin (matching the FUSENGINE_HARNESS_VERSION pin when
 * set, else not below the package.json harness floor) skips the npm fetch.
 * Network failure → warn + false, and the live layer skips instead of failing
 * the suite.
 */
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { exists, readJsonSafe } from "../fs-exists";
import { harnessFloor, versionLt } from "../install/harness-version";
import { installRuntimeDeps } from "../install/runtime-deps";
import type { InstallContext } from "../../../src/interfaces/index.ts";

const REPO_ROOT = resolve(import.meta.dir, "..", "..", "..");
const BIN_REL = join("node_modules", "@fusengine", "harness", "dist", "cli", "bin.mjs");

/** Shared cache location so repeated suite runs reuse one npm install. */
export function liveHarnessCache(): string {
	return join(tmpdir(), "fusengine-test-harness");
}

/** Staged version in the cache dir; null when absent. */
async function cachedVersion(cacheDir: string): Promise<string | null> {
	const pkg = await readJsonSafe<{ version?: string }>(
		join(cacheDir, "node_modules", "@fusengine", "harness", "package.json"),
	);
	return pkg?.version ?? null;
}

/**
 * True when cacheDir already holds a usable harness: bin present AND either
 * the staged version equals $FUSENGINE_HARNESS_VERSION (pin set) or it is not
 * below the repo harness floor (no pin). A stale cache is a miss, so the live
 * layer never silently tests an older harness after a floor bump.
 */
export async function isCacheHit(cacheDir: string, repoRoot: string = REPO_ROOT): Promise<boolean> {
	if (!(await exists(join(cacheDir, BIN_REL)))) return false;
	const staged = await cachedVersion(cacheDir);
	const pin = process.env.FUSENGINE_HARNESS_VERSION;
	if (pin) return staged === pin;
	const floor = await harnessFloor(repoRoot);
	return staged !== null && !(floor !== null && versionLt(staged, floor));
}

/** True when the real harness is ready in cacheDir; false = skip the live layer. */
export async function stageLiveHarness(cacheDir: string, repoRoot: string = REPO_ROOT): Promise<boolean> {
	if (await isCacheHit(cacheDir, repoRoot)) {
		console.log(`  live harness: cache hit (v${await cachedVersion(cacheDir)}) → ${cacheDir}`);
		return true;
	}
	// Force the npm path even if the caller's env points at a local copy.
	const saved = process.env.FUSENGINE_HARNESS_SRC;
	delete process.env.FUSENGINE_HARNESS_SRC;
	try {
		const ctx: InstallContext = {
			dryRun: false, skipEnv: false, skipMcp: false, verbose: false,
			kimiHome: cacheDir, repoRoot: cacheDir, pluginsRoot: cacheDir,
		};
		const res = await installRuntimeDeps(ctx);
		if (res.status === "fail") {
			console.warn(`  live harness staging failed (npm) — skipping live layer: ${res.notes.join("; ")}`);
			return false;
		}
		console.log(`  live harness: installed from npm → ${cacheDir}`);
		return true;
	} finally {
		if (saved !== undefined) process.env.FUSENGINE_HARNESS_SRC = saved;
	}
}
