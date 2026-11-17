/**
 * hooks-config.ts — Global hook activation in $KIMI_HOME/config.toml.
 * Plugin hooks only fire once the plugin is installed; this step bootstraps
 * the core guards immediately via global [[hooks]] between idempotent
 * markers. When the managed plugin copy appears (after /plugins install),
 * the block is REMOVED on the next setup run — plugin hooks take over.
 */
import { dirname, join } from "node:path";
import { existsSync, readdirSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import type { InstallContext, InstallStepResult } from "../../../src/interfaces/index.ts";
import { START, buildBlock, mergeIntoConfig, stripFromConfig } from "./hooks-block";
import { info, plan } from "./ui";

/** Module the shim imports by relative path: deployed under the same name beside it. */
const SHIM_SIBLING = "kimi-permission-mode.mjs";

/** Shim source: repo scripts/hooks copy, else any plugin's bundled copy. */
function shimSource(ctx: InstallContext): string | null {
	const primary = join(ctx.repoRoot, "scripts", "hooks", "kimi-hook-shim.mjs");
	if (existsSync(primary)) return primary;
	for (const dir of readdirSafe(ctx.pluginsRoot)) {
		const candidate = join(ctx.pluginsRoot, dir, "scripts", "kimi-hook-shim.mjs");
		if (existsSync(candidate)) return candidate;
	}
	return null;
}

function readdirSafe(dir: string): string[] {
	try {
		return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
	} catch {
		return [];
	}
}

/** Deploy the shim, write the global block (or remove it when the plugin owns hooks). */
export async function installHooks(ctx: InstallContext): Promise<InstallStepResult> {
	const res: InstallStepResult = { name: "installHooks", status: "ok", notes: [] };
	const configPath = join(ctx.kimiHome, "config.toml");
	const pluginOwns = existsSync(join(ctx.kimiHome, "plugins", "managed", "fusengine"));
	if (ctx.dryRun) {
		plan(pluginOwns ? "remove global hooks block (plugin covers it)" : "write 5 global [[hooks]] into config.toml");
		res.notes.push(pluginOwns ? "plugin detected — block removed" : "5 rules");
		return res;
	}
	const shim = shimSource(ctx);
	if (!shim) {
		res.status = "fail";
		res.notes.push("kimi-hook-shim.mjs not found in repo or plugins");
		return res;
	}
	const sibling = join(dirname(shim), SHIM_SIBLING);
	if (!existsSync(sibling)) {
		res.status = "fail";
		res.notes.push(`${SHIM_SIBLING} missing next to ${shim} (the shim imports it)`);
		return res;
	}
	await mkdir(join(ctx.kimiHome, "hooks"), { recursive: true });
	await copyFile(shim, join(ctx.kimiHome, "hooks", "fusengine-hook-shim.mjs"));
	await copyFile(sibling, join(ctx.kimiHome, "hooks", SHIM_SIBLING));
	const current = existsSync(configPath) ? await readFile(configPath, "utf8") : "";
	const next = pluginOwns ? stripFromConfig(current) : mergeIntoConfig(current, buildBlock(ctx));
	await writeFile(configPath, next);
	res.notes.push(pluginOwns ? "plugin active — global block removed" : "5 rules + shim deployed");
	info(pluginOwns ? "plugin owns hooks — global block removed" : "global hooks → config.toml");
	return res;
}
