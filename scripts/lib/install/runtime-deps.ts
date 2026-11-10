/**
 * runtime-deps.ts — Stage @fusengine/harness under $KIMI_HOME/node_modules so
 * plugin hooks resolve dist/cli/bin.mjs exactly where kimi-hook-shim.mjs looks.
 * Source: the npm registry (`bun add @fusengine/harness`), the package's
 * canonical distribution. $FUSENGINE_HARNESS_SRC (local dir) exists ONLY for
 * hermetic tests. No dependency on any other CLI's installation.
 */
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { exists, readJsonSafe } from "../fs-exists";
import { harnessSpec } from "./harness-version";
import type { InstallContext, InstallStepResult } from "../../../src/interfaces/index.ts";
import { info, plan } from "./ui";

const REL_BIN = join("dist", "cli", "bin.mjs");
const PKG = "@fusengine/harness";

/** package.json version of a staged harness dir; null when absent. */
async function stagedVersion(dir: string): Promise<string | null> {
	const pkg = await readJsonSafe<{ version?: string }>(join(dir, "package.json"));
	return pkg?.version ?? null;
}

/** Installs the harness from npm into ctx.kimiHome via bun (full dep closure). */
async function installFromNpm(ctx: InstallContext): Promise<InstallStepResult> {
	const res: InstallStepResult = { name: "installRuntimeDeps", status: "ok", notes: [] };
	const spec = `${PKG}@${await harnessSpec(ctx.repoRoot)}`;
	if (ctx.dryRun) {
		plan(`bun add ${spec} + bun update ${PKG} (cwd=${ctx.kimiHome})`);
		res.notes.push(`from npm: ${spec}`);
		return res;
	}
	const pkgJson = join(ctx.kimiHome, "package.json");
	if (!(await exists(pkgJson))) {
		await mkdir(ctx.kimiHome, { recursive: true });
		await writeFile(pkgJson, JSON.stringify({ name: "kimi-code-home", private: true }, null, 2));
	}
	const run = spawnSync("bun", ["add", spec], { cwd: ctx.kimiHome, stdio: "pipe", encoding: "utf8" });
	if (run.status !== 0) {
		res.status = "fail";
		res.notes.push(`bun add ${spec} failed: ${(run.stderr || run.stdout || "").trim().slice(0, 200)}`);
		return res;
	}
	// `bun add` honors the lockfile when the range is already satisfied —
	// `bun update` moves the staged copy to the newest version within it.
	const up = spawnSync("bun", ["update", PKG], { cwd: ctx.kimiHome, stdio: "pipe", encoding: "utf8" });
	if (up.status !== 0) {
		res.status = "fail";
		res.notes.push(`bun update ${PKG} failed: ${(up.stderr || up.stdout || "").trim().slice(0, 200)}`);
		return res;
	}
	const bin = join(ctx.kimiHome, "node_modules", ...PKG.split("/"), REL_BIN);
	if (!(await exists(bin))) {
		res.status = "fail";
		res.notes.push(`${REL_BIN} missing after npm install`);
		return res;
	}
	res.notes.push(`npm: ${spec}`);
	info(`harness staged from npm → ${dirname(bin)}`);
	return res;
}

/** Test-only path: copy from a local dir ($FUSENGINE_HARNESS_SRC). */
async function installFromLocal(ctx: InstallContext, src: string): Promise<InstallStepResult> {
	const res: InstallStepResult = { name: "installRuntimeDeps", status: "ok", notes: [] };
	const dest = join(ctx.kimiHome, "node_modules", ...PKG.split("/"));
	const [srcV, destV] = [await stagedVersion(src), await stagedVersion(dest)];
	if (destV && srcV === destV && (await exists(join(dest, REL_BIN)))) {
		res.status = "skip";
		res.notes.push(`already at ${destV}`);
		return res;
	}
	if (ctx.dryRun) {
		plan(`copy ${src} → ${dest}${srcV ? ` (v${srcV})` : ""}`);
		res.notes.push(`from ${src}`);
		return res;
	}
	await mkdir(dirname(dest), { recursive: true });
	await cp(src, dest, { recursive: true });
	if (!(await exists(join(dest, REL_BIN)))) {
		res.status = "fail";
		res.notes.push(`${REL_BIN} missing after copy`);
		return res;
	}
	res.notes.push(`local: v${srcV ?? "?"}`);
	info(`harness ${srcV ?? "?"} staged → ${dest}`);
	return res;
}

/** Entry point: npm by default, local dir only under the test override. */
export async function installRuntimeDeps(ctx: InstallContext): Promise<InstallStepResult> {
	const src = process.env.FUSENGINE_HARNESS_SRC;
	const res = src && (await exists(join(src, "package.json"))) ? await installFromLocal(ctx, src) : await installFromNpm(ctx);
	// A fresh setup stage owns the legacy dir again: drop the SessionStart auto-update
	// pointer (harness-current) so it can never shadow the version just staged.
	if (res.status !== "fail" && !ctx.dryRun) await rm(join(ctx.kimiHome, "harness-current"), { force: true });
	return res;
}
