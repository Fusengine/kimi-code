/**
 * harness-autoupdate-notes.test.mts — back-off stamp and the one-line note:
 * written before the install, shown once per session by the `rules` shim only,
 * dropped when the update succeeds.
 */
import { describe, expect, test } from "bun:test";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FLOOR, SHIM, answeredVersion, installs, makeFixture, runShim, sleep, waitFor } from "./harness-fixtures.mts";
import { burst } from "./harness-helpers.mts";

const SCOPES = ["rules", "core", "carto", "lessons", "memory", "solid"];

describe("back-off stamp", () => {
	test("exists BEFORE the install starts (a SIGKILLed worker is not relaunched), cleared on success", async () => {
		const f = makeFixture("0.1.110");
		runShim(SHIM, f, "SessionStart", { INSTALL_SLEEP_MS: "1500" });
		expect(await waitFor(() => installs(f) === 1)).toBe(true);
		expect(existsSync(join(f.home, ".harness-update-paused"))).toBe(true);
		expect(await waitFor(() => existsSync(join(f.home, "harness-current")))).toBe(true);
		expect(await waitFor(() => !existsSync(join(f.home, ".harness-update-paused")))).toBe(true);
	});

	test("failed install keeps the stamp; the next SessionStart spawns nothing", async () => {
		const f = makeFixture("0.1.110");
		const env = { INSTALL_FAIL: "1" };
		runShim(SHIM, f, "SessionStart", env);
		expect(await waitFor(() => existsSync(join(f.home, ".harness-update.log")))).toBe(true); // written once the install failed
		expect(existsSync(join(f.home, ".harness-update-paused"))).toBe(true);
		expect(installs(f)).toBe(1);
		expect(answeredVersion(SHIM, f)).toBe("0.1.110"); // live tree untouched
		runShim(SHIM, f, "SessionStart", env);
		await sleep(800);
		expect(installs(f)).toBe(1);
	});
});

describe("one-line note", () => {
	test("names both versions and is printed once per session (6 parallel shims, only `rules` speaks)", async () => {
		const f = makeFixture("0.1.110");
		runShim(SHIM, f, "SessionStart", { INSTALL_FAIL: "1" });
		expect(await waitFor(() => existsSync(join(f.home, ".harness-update.log")))).toBe(true);
		const first = await burst(f, SCOPES);
		expect(first.filter((r) => r.stderr.includes("0.1.110") && r.stderr.includes(FLOOR)).length).toBe(1);
		const second = await burst(f, SCOPES); // next session: one reminder while the pause is active
		expect(second.filter((r) => r.stderr.includes("0.1.110") && r.stderr.includes("paused")).length).toBe(1);
		expect(runShim(SHIM, f, "PreToolUse").stderr).not.toContain("0.1.110"); // other events print nothing
	});

	test("a successful update drops a pending reminder (no false 'paused' note next session)", async () => {
		const f = makeFixture("0.1.110");
		const log = join(f.home, ".harness-update.log");
		writeFileSync(log, "harness 0.1.110 is older than the required 0.1.115; auto-update is paused\n"); // from a racing `rules` shim
		runShim(SHIM, f, "SessionStart", {}, "core"); // quiet shim: does not consume it
		expect(await waitFor(() => existsSync(join(f.home, "harness-current")))).toBe(true);
		expect(await waitFor(() => !existsSync(log))).toBe(true);
	});
});
