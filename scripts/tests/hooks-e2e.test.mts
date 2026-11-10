/**
 * hooks-e2e.test.mts — Hook simulation suite, three layers.
 * 1. Static: known event, shim-pattern command, known scope, shim on disk.
 * 2. Simulated harness (hermetic): forwarding contract, exit passthrough,
 *    fail-open — on a scope+event covering subset. 3. Live (skip-safe).
 */
import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { collectHookRules, parseShimCommand, shimPath } from "../lib/hooks-e2e/collect";
import { runStaticChecks } from "../lib/hooks-e2e/static-checks";
import { selectRepresentative } from "../lib/hooks-e2e/subset";
import { synthesizePayload } from "../lib/hooks-e2e/payload";
import { forwardProblems, makeFakeHarnessHome, runShim } from "../lib/hooks-e2e/fake-harness";
import { liveHarnessCache, stageLiveHarness } from "../lib/hooks-e2e/live-stage";
import { liveSweep, runLiveRule, isDeny, additionalContextOrText } from "../lib/hooks-e2e/live-run";

const PLUGINS = resolve(import.meta.dir, "../../plugins");
const rules = await collectHookRules(PLUGINS);

describe("layer 1: static", () => {
	test("declared corpus is 88 rules across 22 plugins (71 suite rules + 17 lone-plugin `update` SessionStarts)", () => {
		expect(rules).toHaveLength(88);
		expect(new Set(rules.map((r) => r.pluginDir)).size).toBe(22);
	});
	test("every rule: known event, shim-pattern command, known scope, shim on disk", async () => {
		expect(await runStaticChecks(PLUGINS, rules)).toEqual([]);
	});
});

describe("layer 2: simulated harness", () => {
	const home = mkdtempSync(join(tmpdir(), "kimi-hooks-e2e-"));
	const recordPath = makeFakeHarnessHome(home);
	const { picked, scopes, events } = selectRepresentative(rules);

	test("subset covers every declared scope and event", () => {
		console.log(`  layer-2 subset: ${picked.length} rules · scopes=${[...scopes].sort().join(",")} · events=${events.size}`);
		expect(scopes.size).toBe(11);
		expect(events.size).toBe(13);
	});

	test("shim forwards argv/stdin/env and propagates exit codes 0 and 2", () => {
		const problems: string[] = [];
		for (const ref of picked) {
			const cmd = parseShimCommand(ref.hook.command)!; // static layer guarantees the pattern
			const payload = JSON.stringify(synthesizePayload(ref));
			const pluginRoot = join(PLUGINS, ref.pluginDir);
			const shim = shimPath(PLUGINS, ref.pluginDir);
			const tag = `${ref.pluginDir} [${ref.hook.event} ${ref.hook.matcher}]`;
			const base = { KIMI_CODE_HOME: home, KIMI_PLUGIN_ROOT: pluginRoot, FAKE_HARNESS_RECORD: recordPath };
			const ok = runShim(shim, cmd, payload, { ...base, FAKE_HARNESS_EXIT: "0" });
			if (ok.code !== 0) problems.push(`${tag}: exit-0 run gave ${ok.code}`);
			problems.push(...forwardProblems(ok, cmd, payload, pluginRoot, home).map((p) => `${tag}: ${p}`));
			const blocked = runShim(shim, cmd, payload, { ...base, FAKE_HARNESS_EXIT: "2" });
			if (blocked.code !== 2) problems.push(`${tag}: exit-2 run gave ${blocked.code}`);
		}
		expect(problems).toEqual([]);
	}, 120_000);

	test("fail-open: exit 0 and no record when the harness bin is absent", () => {
		const empty = mkdtempSync(join(tmpdir(), "kimi-hooks-e2e-nobin-"));
		const cmd = parseShimCommand(picked[0].hook.command)!;
		const run = runShim(shimPath(PLUGINS, picked[0].pluginDir), cmd, "{}", {
			KIMI_CODE_HOME: empty, KIMI_PLUGIN_ROOT: join(PLUGINS, picked[0].pluginDir),
			FAKE_HARNESS_RECORD: join(empty, "record.json"), HOME: empty,
		});
		expect(run.code).toBe(0);
		expect(run.stderr).toContain("harness bin not found");
		expect(run.record).toBeUndefined();
	});
});

describe("layer 3: live harness (skip-safe)", () => {
	test("every rule exits 0|2 with empty/JSON/plain-text stdout; targeted assertions hold", async () => {
		const cacheDir = liveHarnessCache();
		if (!(await stageLiveHarness(cacheDir))) return; // npm unreachable → skip, never fail
		for (const r of liveSweep(PLUGINS, cacheDir, rules)) expect(r.violations).toEqual([]);
		const rulesRef = rules.find((r) => r.pluginDir === "kimi-rules" && r.hook.event === "UserPromptSubmit")!;
		const sessionRef = rules.find((r) => r.pluginDir === "kimi-rules" && r.hook.event === "SessionStart")!;
		const guardRef = rules.find((r) => r.pluginDir === "core-guards" && r.hook.event === "PreToolUse")!;
		// Kimi discards SessionStart output (observation-only event), so the shim
		// writes nothing there.
		const injected = runLiveRule(PLUGINS, cacheDir, sessionRef, synthesizePayload(sessionRef));
		expect(additionalContextOrText(injected.stdout)).toBe("");
		// UserPromptSubmit is the only channel that reaches the model. Compaction
		// is the HARNESS's call (rulesInAgentsMd, >= 0.1.87): notice only when
		// AGENTS.md already carries the corpus, full corpus otherwise. This test
		// home has no AGENTS.md, so the corpus must flow — trimming it here would
		// leave the model with no rules at all. The shim forwards it verbatim.
		const prompted = runLiveRule(PLUGINS, cacheDir, rulesRef, synthesizePayload(rulesRef));
		expect(prompted.stdout).toContain("Response Language");
		expect(prompted.stdout).toContain("rules 00-08 injected");
		const rmrf = synthesizePayload(guardRef, { toolName: "Bash", toolInput: { command: "rm -rf /" } });
		const denied = runLiveRule(PLUGINS, cacheDir, guardRef, rmrf);
		expect(isDeny(JSON.parse(denied.stdout) as Record<string, unknown>)).toBe(true);
	}, 300_000);
});
