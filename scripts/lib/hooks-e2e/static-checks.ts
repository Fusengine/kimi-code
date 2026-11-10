/**
 * static-checks.ts — Layer 1: validate every declared hook rule without
 * running anything. Event ∈ official Kimi enum, command matches the shim
 * pattern, scope ∈ the known scope set, and the plugin's shim exists on disk.
 * Returns human-readable violations; the test asserts the list is empty.
 */
import { join } from "node:path";
import { exists } from "../fs-exists";
import type { HookRuleRef } from "../../../src/interfaces/index.ts";
import { parseShimCommand, shimPath } from "./collect";
import { KIMI_EVENTS } from "./payload";

/** Scopes the harness router knows (superset of what plugins currently use). */
export const KNOWN_SCOPES = new Set([
	"core", "rules", "solid", "carto", "security", "changelog",
	"aipilot", "lessons", "seo", "memory", "tailwindcss",
	"update", // shim-only scope: SessionStart harness auto-update for lone plugins, never reaches the harness router
]);

/** Violations for one rule: bad event, off-pattern command, unknown scope. */
export function checkRule(ref: HookRuleRef): string[] {
	const tag = `${ref.pluginDir} [${ref.hook.event}${ref.hook.matcher ? ` ${ref.hook.matcher}` : ""}]`;
	const problems: string[] = [];
	if (!KIMI_EVENTS.has(ref.hook.event)) problems.push(`${tag}: unknown event '${ref.hook.event}'`);
	const cmd = parseShimCommand(ref.hook.command);
	if (!cmd) {
		problems.push(`${tag}: command does not match the shim pattern: ${ref.hook.command}`);
	} else if (!KNOWN_SCOPES.has(cmd.scope)) {
		problems.push(`${tag}: unknown scope '${cmd.scope}'`);
	} else if (cmd.scope === "update" && ref.hook.event !== "SessionStart") {
		problems.push(`${tag}: scope 'update' is only valid on SessionStart`);
	}
	return problems;
}

/** Layer 1 over the full rule set; shim existence checked once per plugin. */
export async function runStaticChecks(
	pluginsRoot: string,
	rules: HookRuleRef[],
): Promise<string[]> {
	const problems: string[] = [];
	const shimChecked = new Set<string>();
	for (const ref of rules) {
		problems.push(...checkRule(ref));
		if (shimChecked.has(ref.pluginDir)) continue;
		shimChecked.add(ref.pluginDir);
		if (!(await exists(shimPath(pluginsRoot, ref.pluginDir)))) {
			problems.push(`${ref.pluginDir}: scripts/kimi-hook-shim.mjs missing on disk`);
		}
	}
	return problems;
}
