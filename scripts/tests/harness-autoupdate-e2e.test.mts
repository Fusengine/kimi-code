/**
 * harness-autoupdate-e2e.test.mts — the SessionStart trigger through the real
 * shim (subprocesses, fake installer, no network): when it fires and when not.
 */
import { describe, expect, test } from "bun:test";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FLOOR, SHIM, answeredVersion, installs, makeFixture, runShim, sleep, waitFor } from "./harness-fixtures.mts";
import { burst, lockFiles } from "./harness-helpers.mts";

describe("shim end to end: trigger", () => {
	test("equal version at SessionStart: no install", async () => {
		const f = makeFixture(FLOOR);
		expect(runShim(SHIM, f, "SessionStart").code).toBe(0);
		await sleep(800);
		expect(installs(f)).toBe(0);
		expect(existsSync(join(f.home, "harness-current"))).toBe(false);
	});

	test("older at SessionStart: exactly one install, floor reached, hook still answers, lock released", async () => {
		const f = makeFixture("0.1.110");
		expect(runShim(SHIM, f, "SessionStart").code).toBe(0);
		expect(await waitFor(() => existsSync(join(f.home, "harness-current")))).toBe(true);
		expect(installs(f)).toBe(1);
		expect(answeredVersion(SHIM, f)).toBe(FLOOR);
		expect(await waitFor(() => lockFiles(f.home).length === 0)).toBe(true);
	});

	test("any other event leaves an old harness alone", async () => {
		const f = makeFixture("0.1.110");
		for (const ev of ["PreToolUse", "UserPromptSubmit", "PostToolUse", "SubagentStart", "Stop"]) runShim(SHIM, f, ev);
		await sleep(800);
		expect(installs(f)).toBe(0);
		expect(answeredVersion(SHIM, f)).toBe("0.1.110");
	});

	test("success clears an expired pause stamp", async () => {
		const f = makeFixture("0.1.110");
		const pause = join(f.home, ".harness-update-paused");
		writeFileSync(pause, JSON.stringify({ ts: Date.now() - 31 * 60_000 }));
		runShim(SHIM, f, "SessionStart");
		expect(await waitFor(() => existsSync(join(f.home, "harness-current")))).toBe(true);
		expect(await waitFor(() => !existsSync(pause))).toBe(true);
	});

	test("6 concurrent SessionStart shims (one per scope): one install only, all exit 0", async () => {
		const f = makeFixture("0.1.110");
		const runs = await burst(f, ["rules", "core", "carto", "lessons", "memory", "solid"], { INSTALL_SLEEP_MS: "600" });
		expect(runs.map((r) => r.code)).toEqual([0, 0, 0, 0, 0, 0]);
		expect(await waitFor(() => existsSync(join(f.home, "harness-current")))).toBe(true);
		expect(installs(f)).toBe(1);
	});
});
