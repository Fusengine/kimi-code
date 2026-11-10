#!/usr/bin/env bun
/**
 * kimi-hook-shim.mjs — bridge between Kimi Code hooks and the Fusengine harness.
 * Kimi runs: bun "${KIMI_PLUGIN_ROOT}/scripts/kimi-hook-shim.mjs" <scope> [args]
 * The harness's NATIVE kimi adapter (>= 0.1.83) reads KIMI_CODE_HOME and
 * KIMI_PLUGIN_ROOT itself and returns denials as JSON on stdout (exit 0).
 *
 * Deny classification, on permissionDecisionReason: "[CONFIRM]" (git/install/rm)
 * → SUPPRESSED so Kimi's permission system prompts instead of dead-ending;
 * "[BLOCKED]" (rm -rf /, force-push) → forwarded verbatim. Fail-open on any
 * setup problem.
 *
 * Env: $KIMI_HOME/.env is overlaid ON TOP of the inherited environment (the
 * harness's loadDotenv never overrides, so shell pollution would win otherwise).
 *
 * Harness path: $KIMI_CODE_HOME/harness-current/ (atomic-switch pointer written
 * by harness-autoupdate.mjs) when present, else the legacy node_modules dir.
 * SessionStart asks the optional sibling harness-autoupdate.mjs to reach the
 * package.json floor; every other event is untouched.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const HARNESS_SUB = "dist/cli/bin.mjs";
const HARNESS_REL = `node_modules/@fusengine/harness/${HARNESS_SUB}`;

/**
 * Events whose return value Kimi consumes; every other one is observation-only
 * (fire and forget). CONTEXT_EVENT alone reaches the model — not SessionStart.
 */
const BLOCKABLE_EVENTS = new Set(["PreToolUse", "Stop", "UserPromptSubmit"]);
const CONTEXT_EVENT = "UserPromptSubmit";

/** Strip one matching pair of surrounding quotes from a raw .env value. */
function unquote(v) {
	const t = v.trim();
	return t.length >= 2 && t[0] === t.at(-1) && (t[0] === '"' || t[0] === "'") ? t.slice(1, -1) : t;
}

/** Parse $KIMI_HOME/.env (KEY=VALUE lines); {} when missing or unreadable. */
function loadKimiEnv(kimiHome) {
	const path = join(kimiHome, ".env");
	const env = {};
	if (!existsSync(path)) return env;
	try {
		for (const line of readFileSync(path, "utf8").split("\n")) {
			const m = line.trim().match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
			if (m) env[m[1]] = unquote(m[2]);
		}
	} catch { /* fail-open: unreadable .env leaves the inherited env as-is */ }
	return env;
}

function readStdin() {
	return new Promise((resolve) => {
		let data = "";
		process.stdin.setEncoding("utf8");
		process.stdin.on("data", (chunk) => (data += chunk));
		process.stdin.on("end", () => resolve(data));
		process.stdin.on("error", () => resolve(data));
	});
}

/** Parse the harness stdout as JSON; undefined when it is plain text. */
function asJson(stdout) {
	try { return stdout.startsWith("{") ? JSON.parse(stdout) : undefined; } catch { return undefined; }
}

/** True when the harness output is a confirmation-class denial (not a hard block). */
function isConfirmDeny(stdout) {
	const hso = asJson(stdout)?.hookSpecificOutput;
	return hso?.permissionDecision === "deny"
		&& typeof hso.permissionDecisionReason === "string"
		&& hso.permissionDecisionReason.includes("[CONFIRM]");
}

/** Rules scope: the corpus lives in the kimi-rules sub-plugin but kimi sets KIMI_PLUGIN_ROOT to the SUITE root — remap it there when its rules/ exists. */
function rulesScopeEnv(env) {
	const root = env.KIMI_PLUGIN_ROOT;
	if (!root) return env;
	const rulesPlugin = join(root, "plugins", "kimi-rules");
	return existsSync(join(rulesPlugin, "rules")) ? { ...env, KIMI_PLUGIN_ROOT: rulesPlugin } : env;
}

/** Parse the hook event name from the stdin payload; "" when unreadable. */
function eventNameOf(stdin) {
	try { return JSON.parse(stdin)?.hook_event_name ?? ""; } catch { return ""; }
}

/** Map Kimi's tool_input.path onto `file_path` (harness consumers no-op without it); payload unchanged on any parse problem. */
function normalizeToolInput(stdin) {
	try {
		const payload = JSON.parse(stdin);
		const ti = payload?.tool_input;
		if (ti && typeof ti === "object" && typeof ti.path === "string" && ti.file_path === undefined) {
			ti.file_path = ti.path;
			return JSON.stringify(payload);
		}
		return stdin;
	} catch { return stdin; }
}

/** Project cwd from the payload ("" if missing): Kimi runs hooks with cwd = PLUGIN ROOT, which would make cwd-sensitive gates (pre-commit sweep) check the suite, not the project. */
function payloadCwdOf(stdin) {
	try {
		const cwd = JSON.parse(stdin)?.cwd;
		return typeof cwd === "string" && cwd.length > 0 && existsSync(cwd) ? cwd : "";
	} catch { return ""; }
}

/** "AGENTS.md injected\n" when the natively-loaded instructions file is present. */
function agentsNote(scope, kimiHome) {
	const md = scope === "rules" ? join(kimiHome, "AGENTS.md") : "";
	return md !== "" && existsSync(md) && readFileSync(md, "utf8").trim() !== "" ? "AGENTS.md injected\n" : "";
}

/**
 * Adapt the harness stdout to what Kimi actually consumes.
 * Kimi never reads `hookSpecificOutput.additionalContext` (0 occurrences in the
 * 2.0.0 / 0.43.1 bundles); context reaches the model on UserPromptSubmit ONLY,
 * as plain stdout, so the envelope is UNWRAPPED there; deny envelopes are
 * forwarded verbatim; observation-only events drop context payloads.
 * @param stdout - Raw harness stdout.
 * @param scope - Plugin scope (argv[2]).
 * @param eventName - `hook_event_name` from the stdin payload.
 * @param kimiHome - $KIMI_CODE_HOME.
 * @returns What to write on stdout ("" writes nothing).
 */
function renderForKimi(stdout, scope, eventName, kimiHome) {
	if (!stdout) return "";
	const isContext = eventName === CONTEXT_EVENT;
	const parsed = asJson(stdout);
	const hso = parsed?.hookSpecificOutput;
	if (hso?.permissionDecision !== undefined) return stdout;
	const ctx = typeof hso?.additionalContext === "string" ? hso.additionalContext : undefined;
	const note = isContext ? agentsNote(scope, kimiHome) : "";
	if (ctx !== undefined) return isContext ? `${note}${ctx.trim()}\n` : "";
	if (!BLOCKABLE_EVENTS.has(eventName)) return "";
	return isContext && parsed === undefined ? `${note}${stdout.trimEnd()}\n` : stdout;
}

/**
 * SessionStart only: let the optional sibling updater move an older harness to the floor; never throws.
 * Kimi runs one SessionStart shim per scope in parallel; only the `rules` one speaks (prints/leaves notes).
 */
async function autoUpdate(kimiHome, scope) {
	try {
		const { maybeUpdate, takeLog } = await import("./harness-autoupdate.mjs");
		const speak = scope === "rules";
		const note = speak ? takeLog(kimiHome) : ""; // previous attempt's one-line problem note, shown once
		if (note) process.stderr.write(`kimi-hook-shim: ${note}\n`);
		maybeUpdate({ kimiHome, env: process.env, shimDir: import.meta.dirname, platform: process.platform, quiet: !speak });
	} catch { /* fail-open: no updater next to this shim (lone-file deploy) or it failed */ }
}

async function main() {
	const stdin = await readStdin();
	const kimiHome = process.env.KIMI_CODE_HOME || join(homedir(), ".kimi-code");
	const pointer = join(kimiHome, "harness-current", HARNESS_SUB);
	const bin = existsSync(pointer) ? pointer : join(kimiHome, HARNESS_REL);
	if (!existsSync(bin)) {
		process.stderr.write(`kimi-hook-shim: harness bin not found under ${kimiHome} — run scripts/install-kimi.ts (skipped)\n`);
		process.exit(0);
	}

	const scope = process.argv[2] || "core";
	const args = process.argv.slice(3);
	const eventName = eventNameOf(stdin);
	if (eventName === "SessionStart") await autoUpdate(kimiHome, scope);
	const payloadCwd = payloadCwdOf(stdin);
	const base = scope === "rules" ? rulesScopeEnv(process.env) : process.env;
	const child = spawnSync("bun", [bin, "hook", "kimi", scope, ...args], {
		input: normalizeToolInput(stdin),
		env: { ...base, ...loadKimiEnv(kimiHome) },
		cwd: payloadCwd || undefined,
		stdio: ["pipe", "pipe", "pipe"],
	});
	if (child.error) {
		process.stderr.write(`kimi-hook-shim: harness spawn failed: ${child.error.message}\n`);
		process.exit(0);
	}
	const stdout = (child.stdout ?? "").toString();
	const stderr = (child.stderr ?? "").toString();
	if (isConfirmDeny(stdout)) {
		process.stderr.write("kimi-hook-shim: confirmation-class deny suppressed — Kimi permission system will prompt instead\n");
		process.exit(0);
	}
	const out = renderForKimi(stdout, scope, eventName, kimiHome);
	if (out) process.stdout.write(out);
	if (stderr) process.stderr.write(stderr);
	process.exit(child.status ?? 0);
}

await main();
