/**
 * harness-update-scope.test.mts — the dedicated `update` shim scope: a lone
 * plugin that has hooks but no SessionStart of its own gets one (`... update`)
 * so it reaches the harness floor, while the suite root manifest is untouched.
 */
import { describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { FLOOR, REPO, SHIM, answer, installs, makeFixture, runShim, sleep, waitFor } from "./harness-fixtures.mts";
import { collectHookRules, parseShimCommand } from "../lib/hooks-e2e/collect";
import { checkRule } from "../lib/hooks-e2e/static-checks";

const PLUGINS = join(REPO, "plugins");
const NO_HOOK_PLUGINS = ["astro-expert", "commit-pro", "devops-expert", "prompt-engineer"];
const rules = await collectHookRules(PLUGINS);
const dirs = readdirSync(PLUGINS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
const withHooks = [...new Set(rules.map((r) => r.pluginDir))];

describe("manifests", () => {
	test("every plugin that declares hooks has a SessionStart; the 4 hook-less plugins (incl. devops-expert) stay hook-less", () => {
		expect(withHooks).toHaveLength(22);
		for (const p of withHooks) expect(rules.some((r) => r.pluginDir === p && r.hook.event === "SessionStart")).toBe(true);
		expect(dirs.filter((d) => !withHooks.includes(d)).sort()).toEqual(NO_HOOK_PLUGINS);
	});
	test("17 plugins carry exactly one `update` SessionStart with a small timeout", () => {
		const updates = rules.filter((r) => parseShimCommand(r.hook.command)?.scope === "update");
		expect(updates).toHaveLength(17);
		expect(new Set(updates.map((r) => r.pluginDir)).size).toBe(17);
		for (const u of updates) {
			expect(u.hook.event).toBe("SessionStart");
			expect(u.hook.timeout).toBeLessThanOrEqual(10);
		}
	});
	test("the suite root manifest is untouched: no `update` entry, still 71 hooks", () => {
		const root = JSON.parse(readFileSync(join(REPO, ".kimi-plugin/plugin.json"), "utf8")) as { hooks: { command: string }[] };
		expect(root.hooks.filter((h) => parseShimCommand(h.command.replace("scripts/hooks/", "scripts/"))?.scope === "update")).toEqual([]);
		expect(root.hooks).toHaveLength(71);
	});
});

describe("static check", () => {
	test("scope `update` is accepted on SessionStart only", () => {
		const ref = (event: string) => ({ pluginDir: "x", pluginName: "x", hook: { event, matcher: "", command: 'bun "${KIMI_PLUGIN_ROOT}/scripts/kimi-hook-shim.mjs" update' } });
		expect(checkRule(ref("SessionStart"))).toEqual([]);
		expect(checkRule(ref("PreToolUse")).join(" ")).toContain("update");
	});
});

describe("scope update", () => {
	test("PreToolUse is an immediate no-op: the harness is never spawned", () => {
		const f = makeFixture("0.1.110");
		const spawnLog = join(dirname(f.home), "spawns.log");
		const r = runShim(SHIM, f, "PreToolUse", { SPAWN_LOG: spawnLog }, "update");
		expect(r.code).toBe(0);
		expect(r.stdout).toBe("");
		expect(existsSync(spawnLog)).toBe(false);
	});
	test("SessionStart runs the update but never spawns the harness", async () => {
		const f = makeFixture("0.1.110");
		const spawnLog = join(dirname(f.home), "spawns.log");
		expect(runShim(SHIM, f, "SessionStart", { SPAWN_LOG: spawnLog }, "update").code).toBe(0);
		expect(await waitFor(() => existsSync(join(f.home, "harness-current")))).toBe(true);
		expect(installs(f)).toBe(1);
		expect(existsSync(spawnLog)).toBe(false);
	});
});

describe("lone plugin without a SessionStart of its own", () => {
	test("react-expert alone reaches the floor by running the SessionStart command its manifest declares", async () => {
		const f = makeFixture("0.1.110");
		const root = join(dirname(f.home), "managed", "react-expert");
		mkdirSync(root, { recursive: true });
		cpSync(join(PLUGINS, "react-expert/scripts"), join(root, "scripts"), { recursive: true });
		const starts = rules.filter((r) => r.pluginDir === "react-expert" && r.hook.event === "SessionStart");
		for (const s of starts) {
			const cmd = parseShimCommand(s.hook.command)!;
			runShim(join(root, "scripts/kimi-hook-shim.mjs"), f, "SessionStart", { KIMI_PLUGIN_ROOT: root }, cmd.scope);
		}
		await sleep(starts.length > 0 ? 0 : 1500); // nothing declared = nothing runs: give a stray update time to show up
		expect(await waitFor(() => existsSync(join(f.home, "harness-current")), starts.length > 0 ? 20_000 : 500)).toBe(true);
		expect(answer(join(root, "scripts/kimi-hook-shim.mjs"), f)).toEqual({ ver: FLOOR, dep: "staged" });
	});
});
