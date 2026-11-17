/**
 * install-fixtures.mts — Synthetic repo/home builders for install.test.mts.
 * A fake repo (AGENTS.md + plugins/{fake-one,kimi-rules}) drives the
 * installer via KIMI_PLUGINS_ROOT; a fake harness satisfies runtime-deps.
 */
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

export const INSTALLER = resolve(import.meta.dir, "../install-kimi.ts");

export function tmp(prefix: string): string {
	return mkdtempSync(join(tmpdir(), prefix));
}

export function write(path: string, content: string): void {
	mkdirSync(resolve(path, ".."), { recursive: true });
	writeFileSync(path, content);
}

/** Minimal harness: package.json + dist/cli/bin.mjs. */
export function makeHarness(dir: string): void {
	write(join(dir, "package.json"), JSON.stringify({ name: "@fusengine/harness", version: "9.9.9-test" }));
	write(join(dir, "dist", "cli", "bin.mjs"), "// fake harness bin\n");
}

const FAKE_MCP = JSON.stringify({
	mcpServers: {
		"fake-stdio": { command: "npx", args: ["-y", "fake-mcp"] },
		"fake-http": {
			type: "http",
			url: "https://example.com/mcp?key=${FAKE_TOKEN}",
			requiresApiKey: true,
			apiKeyEnv: "FAKE_TOKEN",
			apiKeyUrl: "https://example.com/key",
		},
	},
});

const FAKE_CATALOG = JSON.stringify({
	mcpServers: {
		_comment: "catalog fixture",
		"catalog-stdio": { _description: "d", command: "npx", args: ["-y", "catalog-mcp"], type: "stdio" },
	},
});

/** Synthetic repo: AGENTS.md, one plugin (manifest+mcp+agent), kimi-rules. */
export function makeRepo(dir: string): void {
	write(join(dir, "AGENTS.md"), "# Fake Repo Instructions\n");
	write(join(dir, "scripts", "mcp", "mcp.json"), FAKE_CATALOG);
	const manifest = (name: string, display: string) =>
		JSON.stringify({ name, version: "0.0.1", description: "t", interface: { displayName: display } });
	write(join(dir, "plugins", "fake-one", "kimi.plugin.json"), manifest("fuse-fake-one", "Fake One"));
	write(join(dir, "plugins", "fake-one", "mcp.json.bak"), FAKE_MCP);
	write(join(dir, "plugins", "fake-one", "agents", "fake-agent.md"), "# Fake Agent\n");
	write(join(dir, "plugins", "fake-one", "skills", "solid-generic", "references", "ref.md"), "# Refs\n");
	write(join(dir, "plugins", "kimi-rules", "kimi.plugin.json"), manifest("kimi-rules", "Kimi Rules"));
	write(join(dir, "plugins", "kimi-rules", "rules", "00-test-rule.md"), "# Test Rule\n\nAlways test.");
	write(join(dir, "plugins", "kimi-rules", "templates", "KIMI.md.template"), "# Fake Global Template\n");
	write(join(dir, "plugins", "fake-one", "scripts", "kimi-hook-shim.mjs"), "// fake shim\n");
	write(join(dir, "plugins", "fake-one", "scripts", "kimi-permission-mode.mjs"), "// fake shim sibling\n");
}

/** Run the installer; FAKE_TOKEN is scrubbed unless passed in extraEnv. */
export function runInstaller(home: string, repo: string, harness: string, args: string[], extraEnv: Record<string, string> = {}, input = "") {
	const env: Record<string, string> = { ...(process.env as Record<string, string>) };
	delete env.FAKE_TOKEN;
	const proc = spawnSync("bun", [INSTALLER, ...args], {
		env: { ...env, KIMI_CODE_HOME: home, KIMI_PLUGINS_ROOT: join(repo, "plugins"), FUSENGINE_HARNESS_SRC: harness, ...extraEnv },
		input,
		encoding: "utf8",
	});
	return { code: proc.status, out: `${proc.stdout}\n${proc.stderr}` };
}
