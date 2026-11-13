import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

/** Shared fixtures for shim-confirm*.test.mts: fake harness bin, fake KIMI_CODE_HOME, shim runner. */
export const SHIM = resolve(import.meta.dir, "../hooks/kimi-hook-shim.mjs");
export const PAYLOAD = JSON.stringify({
	hook_event_name: "PreToolUse",
	session_id: "s",
	cwd: "/tmp",
	tool_input: { command: "rm -rf x" },
});
export const PREFIX = "[downgraded from ask — Kimi permission mode ";

/** Expected downgrade prefix for a resolved `mode`. */
export const downgradedFor = (mode: string): string => `${PREFIX}${mode} has no interactive approval] `;

/** Fake harness bin: drains stdin, prints $FAKE_STDOUT verbatim. */
export const FAKE_BIN = `process.stdin.resume();process.stdin.on("end",()=>{
process.stdout.write(process.env.FAKE_STDOUT ?? "")});`;

export const confirmDeny = JSON.stringify({
	hookSpecificOutput: {
		hookEventName: "PreToolUse",
		permissionDecision: "deny",
		permissionDecisionReason: "[CONFIRM] Dangerous command DELETE requires approval",
	},
});
export const blockedDeny = JSON.stringify({
	hookSpecificOutput: {
		hookEventName: "PreToolUse",
		permissionDecision: "deny",
		permissionDecisionReason: "[BLOCKED] rm -rf / is never allowed",
	},
});
export const allowOut = JSON.stringify({
	hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "allow" },
});

/** Fresh KIMI_CODE_HOME with the fake harness; `config` written as config.toml when given. */
export function makeHome(config?: string): string {
	const home = mkdtempSync(join(tmpdir(), "kimi-shim-confirm-"));
	const binDir = join(home, "node_modules/@fusengine/harness/dist/cli");
	mkdirSync(binDir, { recursive: true });
	writeFileSync(join(binDir, "bin.mjs"), FAKE_BIN);
	if (config !== undefined) writeFileSync(join(home, "config.toml"), config);
	return home;
}

/** Run a shim copy against `home`, the fake harness printing `fakeStdout`. */
export function run(home: string, fakeStdout: string, shim = SHIM) {
	const proc = spawnSync("bun", [shim, "core"], {
		input: PAYLOAD,
		env: { ...(process.env as Record<string, string>), KIMI_CODE_HOME: home, FAKE_STDOUT: fakeStdout },
		encoding: "utf8",
	});
	return { code: proc.status, stdout: proc.stdout, stderr: proc.stderr };
}

/** permissionDecisionReason of a forwarded deny envelope. */
export function reasonOf(stdout: string): string {
	return JSON.parse(stdout).hookSpecificOutput.permissionDecisionReason;
}
