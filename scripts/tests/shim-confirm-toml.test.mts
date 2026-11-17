import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { FAKE_BIN, PAYLOAD, SHIM, confirmDeny, downgradedFor, makeHome, reasonOf, run } from "./shim-confirm-fixtures.mts";

describe("kimi-hook-shim [CONFIRM] deny: config.toml key shapes", () => {
	const hidingShapes: Record<string, string> = {
		"multi-line basic string": 'notes = """\n[x]\n"""\ndefault_permission_mode = "yolo"\n',
		"multi-line literal string": "notes = '''\n[x]\n'''\ndefault_permission_mode = \"yolo\"\n",
		"multi-line array": 'notes = [\n["a"],\n]\ndefault_permission_mode = "yolo"\n',
		"inline table": 'notes = {\n}\ndefault_permission_mode = "yolo"\n',
	};
	for (const [name, cfg] of Object.entries(hidingShapes)) {
		test(`${name} before the mode key: forwarded with mode unknown (key cannot hide)`, () => {
			const r = run(makeHome(cfg), confirmDeny);
			expect(reasonOf(r.stdout).startsWith(downgradedFor("unknown"))).toBe(true);
		});
	}

	// Kimi 2.5.2 camelCases every top-level key (snakeToCamel /_([a-z])/g, main.mjs:70625) and reads defaultPermissionMode.
	const spellings: Record<string, [string, string]> = {
		camel_yolo: ['defaultPermissionMode = "yolo"\n', downgradedFor("yolo")],
		mixed_yolo: ['default_permissionMode = "yolo"\n', downgradedFor("yolo")],
		mixed2_yolo: ['defaultPermission_mode = "yolo"\n', downgradedFor("yolo")],
		camel_auto: ['defaultPermissionMode = "auto"\n', downgradedFor("auto")],
	};
	for (const [name, [cfg, prefix]] of Object.entries(spellings)) {
		test(`key spelling ${name}: Kimi reads it as the mode -> forwarded`, () => {
			expect(reasonOf(run(makeHome(cfg), confirmDeny).stdout).startsWith(prefix)).toBe(true);
		});
	}

	test("camelCase manual: still suppressed", () => {
		const r = run(makeHome('defaultPermissionMode = "manual"\n'), confirmDeny);
		expect(r.code).toBe(0);
		expect(r.stdout).toBe("");
	});

	test("two spellings of the mode key (manual then camel yolo): ambiguous -> forwarded unknown", () => {
		const cfg = 'default_permission_mode = "manual"\ndefaultPermissionMode = "yolo"\n';
		expect(reasonOf(run(makeHome(cfg), confirmDeny).stdout).startsWith(downgradedFor("unknown"))).toBe(true);
	});

	test("empty-but-set KIMI_CODE_HOME: Kimi reads a relative config.toml -> forwarded unknown", () => {
		const fakeHome = mkdtempSync(join(tmpdir(), "kimi-shim-emptyhome-"));
		const binDir = join(fakeHome, ".kimi-code/node_modules/@fusengine/harness/dist/cli");
		mkdirSync(binDir, { recursive: true });
		writeFileSync(join(binDir, "bin.mjs"), FAKE_BIN); // the shim's own harness lookup falls back to $HOME/.kimi-code
		const cwd = mkdtempSync(join(tmpdir(), "kimi-shim-emptycwd-"));
		writeFileSync(join(cwd, "config.toml"), 'default_permission_mode = "manual"\n'); // what Kimi would read relatively
		const proc = spawnSync("bun", [SHIM, "core"], {
			input: PAYLOAD,
			cwd,
			env: { ...(process.env as Record<string, string>), KIMI_CODE_HOME: "", HOME: fakeHome, FAKE_STDOUT: confirmDeny },
			encoding: "utf8",
		});
		expect(proc.status).toBe(0);
		expect(reasonOf(proc.stdout).startsWith(downgradedFor("unknown"))).toBe(true);
	});

	test("unknown mode value: forwarded with mode unknown", () => {
		const r = run(makeHome('default_permission_mode = "plan"\n'), confirmDeny);
		expect(reasonOf(r.stdout).startsWith(downgradedFor("unknown"))).toBe(true);
	});
});
