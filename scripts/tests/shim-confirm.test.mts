import { describe, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { SHIM, allowOut, blockedDeny, confirmDeny, downgradedFor, makeHome, reasonOf, run } from "./shim-confirm-fixtures.mts";

describe("kimi-hook-shim [CONFIRM] deny by permission mode", () => {
	test("manual: suppressed (Kimi prompts), exit 0, empty stdout", () => {
		const r = run(makeHome('default_permission_mode = "manual"\n'), confirmDeny);
		expect(r.code).toBe(0);
		expect(r.stdout).toBe("");
	});

	test("manual with comments, single quotes and tables below: still suppressed", () => {
		const cfg = "# top\ndefault_model = 'm'\ndefault_permission_mode = 'manual' # ask\n[loop_control]\ndefault_permission_mode = \"yolo\"\n";
		const r = run(makeHome(cfg), confirmDeny);
		expect(r.code).toBe(0);
		expect(r.stdout).toBe("");
	});

	test("yolo: deny forwarded with downgrade prefix and the [CONFIRM] text kept", () => {
		const r = run(makeHome('default_permission_mode = "yolo"\n'), confirmDeny);
		expect(r.code).toBe(0);
		const reason = reasonOf(r.stdout);
		expect(reason.startsWith(downgradedFor("yolo"))).toBe(true);
		expect(reason).toContain("[CONFIRM] Dangerous command DELETE");
		expect(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision).toBe("deny");
	});

	test("auto: forwarded", () => {
		const r = run(makeHome('default_permission_mode = "auto"\n'), confirmDeny);
		expect(reasonOf(r.stdout).startsWith(downgradedFor("auto"))).toBe(true);
	});

	// Kimi 2.5.2 never reads default_yolo at runtime: only `kimi migrate` (main.mjs:299854-299935) maps a
	// kimi-cli config's default_yolo into default_permission_mode. A stale key must not cause a false block.
	test("lone default_yolo = true: ignored by Kimi at runtime -> manual -> suppressed", () => {
		const r = run(makeHome("default_yolo = true\n"), confirmDeny);
		expect(r.code).toBe(0);
		expect(r.stdout).toBe("");
	});

	test("default_yolo = true next to yolo mode: mode key decides -> forwarded", () => {
		const r = run(makeHome('default_permission_mode = "yolo"\ndefault_yolo = true\n'), confirmDeny);
		expect(reasonOf(r.stdout).startsWith(downgradedFor("yolo"))).toBe(true);
	});

	test("config without any mode key: Kimi defaults to manual (main.mjs:506429) -> suppressed", () => {
		const r = run(makeHome('default_model = "m"\n'), confirmDeny);
		expect(r.code).toBe(0);
		expect(r.stdout).toBe("");
	});

	test("missing config.toml: absent key -> manual -> suppressed", () => {
		const r = run(makeHome(), confirmDeny);
		expect(r.code).toBe(0);
		expect(r.stdout).toBe("");
	});

	test("garbage config: forwarded with mode unknown", () => {
		const r = run(makeHome("\u0000\u0001 not toml {{{ ???\n"), confirmDeny);
		expect(reasonOf(r.stdout).startsWith(downgradedFor("unknown"))).toBe(true);
	});

	test("unreadable config (config.toml is a directory): forwarded with mode unknown", () => {
		const home = makeHome();
		mkdirSync(join(home, "config.toml"));
		const r = run(home, confirmDeny);
		expect(reasonOf(r.stdout).startsWith(downgradedFor("unknown"))).toBe(true);
	});

	test("[BLOCKED] deny under manual: forwarded unchanged", () => {
		const r = run(makeHome('default_permission_mode = "manual"\n'), blockedDeny);
		expect(r.stdout).toBe(blockedDeny);
	});

	test("[BLOCKED] deny under yolo: forwarded unchanged (no prefix)", () => {
		const r = run(makeHome('default_permission_mode = "yolo"\n'), blockedDeny);
		expect(r.stdout).toBe(blockedDeny);
	});

	test("allow output under yolo: unchanged", () => {
		const r = run(makeHome('default_permission_mode = "yolo"\n'), allowOut);
		expect(r.stdout).toBe(allowOut);
	});
});

describe("kimi-hook-shim required sibling (kimi-permission-mode.mjs)", () => {
	const REPO = resolve(import.meta.dir, "../..");
	const siblings = [...readFileSync(SHIM, "utf8").matchAll(/^import .* from "\.\/([^"]+)";$/gm)].map((m) => m[1]);

	test("the shim statically imports kimi-permission-mode.mjs and installShims copies every static sibling", () => {
		expect(siblings).toEqual(["kimi-permission-mode.mjs"]);
		const copier = readFileSync(join(REPO, "scripts/apply-core-overrides.ts"), "utf8");
		for (const s of siblings) expect(copier).toContain(`"${s}"`);
	});

	test("a shipped plugin copy (scripts/ dir copied as installed) still downgrades a yolo [CONFIRM]", () => {
		const root = mkdtempSync(join(tmpdir(), "kimi-shim-copy-"));
		cpSync(join(REPO, "plugins/core-guards/scripts"), join(root, "scripts"), { recursive: true });
		const r = run(makeHome('default_permission_mode = "yolo"\n'), confirmDeny, join(root, "scripts/kimi-hook-shim.mjs"));
		expect(r.code).toBe(0);
		expect(reasonOf(r.stdout).startsWith(downgradedFor("yolo"))).toBe(true);
	});
});
