/**
 * shipped-modules.test.mts — every shipped copy of the hook modules must be
 * byte-identical to its source in scripts/hooks/ (26 plugins + core-overrides).
 * Also guards the shell idiom that locates the harness bin in both layouts.
 */
import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { REPO } from "./harness-fixtures.mts";

const MODULES = ["kimi-hook-shim.mjs", "harness-autoupdate.mjs", "harness-update-worker.mjs"];
const pluginDirs = readdirSync(join(REPO, "plugins"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

describe("shipped hook modules", () => {
	for (const m of MODULES) {
		test(`${m}: every copy is byte-identical to scripts/hooks/${m}`, () => {
			const source = readFileSync(join(REPO, "scripts/hooks", m), "utf8");
			const copies = [...pluginDirs.map((d) => join(REPO, "plugins", d, "scripts", m)), join(REPO, "core-overrides/kimi-rules/scripts", m)];
			const bad = copies.filter((c) => !existsSync(c) || readFileSync(c, "utf8") !== source);
			expect(bad).toEqual([]);
			expect(copies.length).toBe(27);
		});
	}
});

describe("shipped floor (lone marketplace plugins have no suite package.json)", () => {
	test("every scripts/harness-floor.json carries the package.json floor", () => {
		const floor = (JSON.parse(readFileSync(join(REPO, "package.json"), "utf8")) as { fusengine: { harnessMinVersion: string } }).fusengine.harnessMinVersion;
		const copies = [...pluginDirs.map((d) => join(REPO, "plugins", d, "scripts")), join(REPO, "core-overrides/kimi-rules/scripts")].map((d) => join(d, "harness-floor.json"));
		const bad = copies.filter((c) => !existsSync(c) || (JSON.parse(readFileSync(c, "utf8")) as { harnessMinVersion?: string }).harnessMinVersion !== floor);
		expect(bad).toEqual([]);
		expect(copies.length).toBe(27);
	});
});

/** The one-line idiom, identical in every doc that calls the harness CLI directly. */
const IDIOM = 'bun "$(test -f "${KIMI_CODE_HOME:-$HOME/.kimi-code}/harness-current/dist/cli/bin.mjs" && echo "${KIMI_CODE_HOME:-$HOME/.kimi-code}/harness-current" || echo "${KIMI_CODE_HOME:-$HOME/.kimi-code}/node_modules/@fusengine/harness")/dist/cli/bin.mjs"';
const DOCS = [
	"plugins/security-expert/commands/scan.md",
	"plugins/security-expert/skills/security-scan/SKILL.md",
	"plugins/security-expert/rules/apex-workflow.md",
	"plugins/security-expert/agents/security-expert.md",
	"plugins/changelog-watcher/skills/changelog-scan/SKILL.md",
];

describe("harness path idiom in docs", () => {
	test("each doc uses the identical idiom and no bare legacy / KIMI_PLUGIN_ROOT path", () => {
		for (const d of DOCS) {
			const text = readFileSync(join(REPO, d), "utf8");
			expect(text).toContain(IDIOM);
			expect(text).not.toMatch(/bun "?\$\{KIMI_CODE_HOME:-\$HOME\/\.kimi-code\}\/node_modules/);
			expect(text).not.toContain("${KIMI_PLUGIN_ROOT}/../node_modules");
		}
	});

	/** Run the idiom (with `echo` as the node) in a temp home: prints the bin path it resolved. */
	function resolved(home: string): string {
		const cmd = IDIOM.replace(/^bun /, "echo ");
		const r = spawnSync("bash", ["-c", cmd], { env: { ...process.env, KIMI_CODE_HOME: home, HOME: home }, encoding: "utf8" });
		return r.stdout.trim();
	}
	const bin = (home: string, rel: string): void => {
		mkdirSync(join(home, rel, "dist/cli"), { recursive: true });
		writeFileSync(join(home, rel, "dist/cli/bin.mjs"), "");
	};

	test("legacy-only layout resolves the node_modules bin; with harness-current it prefers the pointer", () => {
		const legacyOnly = mkdtempSync(join(tmpdir(), "idiom-legacy-"));
		bin(legacyOnly, "node_modules/@fusengine/harness");
		expect(resolved(legacyOnly)).toBe(join(legacyOnly, "node_modules/@fusengine/harness/dist/cli/bin.mjs"));
		const both = mkdtempSync(join(tmpdir(), "idiom-both-"));
		bin(both, "node_modules/@fusengine/harness");
		bin(both, "harness-current");
		expect(resolved(both)).toBe(join(both, "harness-current/dist/cli/bin.mjs"));
	});
});
