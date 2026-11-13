/**
 * kimi-permission-mode.mjs — deny classification for kimi-hook-shim.mjs (its
 * required sibling: same bytes next to every shim copy; the shim imports it).
 *
 * On permissionDecisionReason: "[BLOCKED]" (rm -rf /, force-push) → forwarded
 * verbatim. "[CONFIRM]" (git/install/rm) → SUPPRESSED (Kimi's own permission
 * prompt asks) ONLY when the mode configured in $KIMI_CODE_HOME/config.toml is
 * `manual` (absent key = manual, as Kimi does). In every other case — yolo,
 * auto, unreadable or unparsable config, empty KIMI_CODE_HOME, ambiguous or
 * unknown value — the deny is FORWARDED (fail closed) with the reason prefixed
 * "[downgraded from ask — Kimi permission mode <mode> has no interactive
 * approval]", because those modes never prompt and a suppressed deny would run
 * the command silently. A hook deny is honored in every mode.
 * Residual limits (the hook payload carries no mode): when config says manual,
 * print mode (-p forces auto), subagents (created in auto), the --yolo/--auto
 * flags and in-session mode switches are invisible, so a suppressed [CONFIRM]
 * still runs unprompted there.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Parse the harness stdout as JSON.
 * @param stdout - Raw harness stdout.
 * @returns The parsed value, or undefined when it is plain text.
 */
export function asJson(stdout) {
	try { return stdout.startsWith("{") ? JSON.parse(stdout) : undefined; } catch { return undefined; }
}

/**
 * True when the harness output is a confirmation-class denial (not a hard block).
 * @param stdout - Raw harness stdout.
 * @returns Whether it is a `deny` whose reason contains "[CONFIRM]".
 */
export function isConfirmDeny(stdout) {
	const hso = asJson(stdout)?.hookSpecificOutput;
	return hso?.permissionDecision === "deny"
		&& typeof hso.permissionDecisionReason === "string"
		&& hso.permissionDecisionReason.includes("[CONFIRM]");
}

/**
 * Kimi's configured permission mode: top-level keys of $KIMI_CODE_HOME/config.toml
 * (before the first [table]); minimal `key = "value" | true` line parse, no dependency.
 * Kimi camelCases every top-level key with `/_([a-z])/g` (main.mjs:70625), so
 * `default_permission_mode`, `defaultPermissionMode`, `default_permissionMode`… all
 * set the mode (main.mjs:230941): keys are normalized the same way, and two keys that
 * normalize to the mode key are ambiguous → unknown (stricter than Kimi's last-wins).
 * Absent key = "manual": Kimi 2.5.2 uses `config.defaultPermissionMode ?? "manual"`
 * (main.mjs:506429). `default_yolo` is ignored: the runtime never reads it; only the
 * explicit `kimi migrate` command maps a kimi-cli config's `default_yolo` into
 * `default_permission_mode` (main.mjs:299854-299935).
 * @param kimiHome - $KIMI_CODE_HOME as Kimi sees it; "" (set but empty) means a relative config.toml in Kimi, so unknown.
 * @returns "manual" | "auto" | "yolo", or "unknown" on an odd value, a duplicate key, an unparsable line or an unreadable file (missing file = absent key = manual).
 */
export function kimiPermissionMode(kimiHome) {
	if (kimiHome === "") return "unknown";
	let text;
	try { text = readFileSync(join(kimiHome, "config.toml"), "utf8"); }
	catch (e) { return e?.code === "ENOENT" ? "manual" : "unknown"; }
	const top = new Map();
	for (const raw of text.split(/\r?\n/)) {
		const line = raw.trim();
		if (line === "" || line.startsWith("#")) continue;
		if (line.startsWith("[")) break;
		const m = line.match(/^([A-Za-z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s#"'[{][^\s#]*))\s*(?:#.*)?$/); // bare value never opens a multi-line string/array/inline table (that would hide later keys)
		if (!m) return "unknown";
		const key = m[1].replaceAll(/_([a-z])/g, (_, ch) => ch.toUpperCase());
		if (top.has(key)) return "unknown"; // duplicate (raw or via two spellings)
		top.set(key, m[2] ?? m[3] ?? m[4]);
	}
	const mode = top.get("defaultPermissionMode") ?? "manual";
	return mode === "manual" || mode === "auto" || mode === "yolo" ? mode : "unknown";
}

/**
 * Harness deny stdout with its reason prefixed by the downgrade notice for `mode`.
 * @param stdout - Harness stdout already proven a confirmation deny by {@link isConfirmDeny}.
 * @param mode - Result of {@link kimiPermissionMode} (never "manual" here).
 * @returns The re-serialized deny envelope.
 */
export function downgradedDeny(stdout, mode) {
	const parsed = asJson(stdout);
	const hso = parsed.hookSpecificOutput;
	hso.permissionDecisionReason = `[downgraded from ask — Kimi permission mode ${mode} has no interactive approval] ${hso.permissionDecisionReason}`;
	return JSON.stringify(parsed);
}
