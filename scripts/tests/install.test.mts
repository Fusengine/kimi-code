/**
 * install.test.mts — End-to-end installer tests against a synthetic repo and
 * a fake KIMI_CODE_HOME (tmp dirs). Dry-run must write nothing to the home;
 * --yes must materialize AGENTS.md fences, harness, agents and mcp.json,
 * idempotently. The last test guards the real repo's marketplace.json.
 */
import { beforeAll, describe, expect, test } from "bun:test";
import { existsSync, lstatSync, mkdirSync, readFileSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { INSTALLER, makeHarness, makeRepo, runInstaller, tmp, write } from "./install-fixtures.mts";

const root = tmp("kimi-install-");
const repo = join(root, "repo");
const home = join(root, "home");
const harness = join(root, "harness");

const agentsMd = () => readFileSync(join(home, "AGENTS.md"), "utf8");
const mcpServers = (h: string) => JSON.parse(readFileSync(join(h, "mcp.json"), "utf8")).mcpServers;

beforeAll(() => {
	makeRepo(repo);
	makeHarness(harness);
});

describe("install-kimi", () => {
	test("dry-run prints the plan and writes nothing to KIMI_CODE_HOME", () => {
		const r = runInstaller(home, repo, harness, []);
		expect(r.code).toBe(0);
		expect(r.out).toContain("DRY-RUN");
		expect(r.out).toContain("WOULD");
		expect(existsSync(home)).toBe(false);
	});

	test("--yes installs AGENTS.md fences, harness, agents, resolved MCP", () => {
		write(join(home, ".env"), "FAKE_TOKEN=tok123\n");
		write(join(home, "config.toml"), '[[hooks]]\nevent = "Stop"\ncommand = "echo mine"\n');
		symlinkSync("/nonexistent-auto-update-target", join(home, "harness-current")); // stale auto-update pointer
		const r = runInstaller(home, repo, harness, ["--yes"]);
		expect(r.code).toBe(0);
		expect(r.out).toContain("Installed state verified");
		expect(agentsMd()).toContain("<!-- fusengine:kimi-rules:start -->");
		expect(agentsMd()).toContain("<!-- fusengine:kimi-rules:end -->");
		expect(agentsMd()).toContain("Always test.");
		expect(agentsMd()).toContain("# Fake Global Template");
		expect(agentsMd()).not.toContain("# Fake Repo Instructions");
		expect(existsSync(join(home, "node_modules/@fusengine/harness/dist/cli/bin.mjs"))).toBe(true);
		expect(() => lstatSync(join(home, "harness-current"))).toThrow(); // setup stage drops the pointer
		expect(existsSync(join(home, "agents", "fake-agent.md"))).toBe(true);
		const servers = mcpServers(home);
		expect(servers["fake-stdio"].command).toBe("npx");
		expect(servers["fake-stdio"].type).toBeUndefined();
		expect(servers["catalog-stdio"].command).toBe("npx");
		expect(servers["catalog-stdio"]._description).toBeUndefined();
		expect(servers["fake-http"].url).toBe("https://example.com/mcp?key=tok123");
		expect(servers["fake-http"].type).toBeUndefined();
		// harness config: FUSE_HARNESS_REFS wired to the solid refs dir
		const dotenv = readFileSync(join(home, ".env"), "utf8");
		expect(dotenv).toContain("FUSE_HARNESS_REFS=");
		expect(dotenv).toContain("solid-generic/references");
		// global hooks: fusengine block added, user hook preserved
		const cfg = readFileSync(join(home, "config.toml"), "utf8");
		expect(cfg).toContain("# >>> fusengine hooks >>>");
		expect(cfg).toContain('command = "echo mine"');
		expect(existsSync(join(home, "hooks", "fusengine-hook-shim.mjs"))).toBe(true);
		const market = JSON.parse(readFileSync(join(repo, "marketplace.json"), "utf8"));
		expect(market.version).toBe("2");
		expect(market.plugins.map((p: { id: string }) => p.id)).toEqual(["fuse-fake-one", "kimi-rules"]);
		expect(market.plugins[0].source).toBe("./plugins/fake-one");
	});

	test("second --yes run is idempotent (no duplicate servers or fences)", () => {
		const r = runInstaller(home, repo, harness, ["--yes"]);
		expect(r.code).toBe(0);
		expect(Object.keys(mcpServers(home)).sort()).toEqual(["catalog-stdio", "fake-http", "fake-stdio"]);
		expect(agentsMd().match(/<!-- fusengine:kimi-rules:start -->/g)).toHaveLength(1);
		expect(agentsMd().match(/<!-- fusengine:kimi-rules:end -->/g)).toHaveLength(1);
		const cfg = readFileSync(join(home, "config.toml"), "utf8");
		expect(cfg.match(/# >>> fusengine hooks >>>/g)).toHaveLength(1);
	});

	test("global hooks block is removed once the managed plugin owns hooks", () => {
		mkdirSync(join(home, "plugins", "managed", "fusengine"), { recursive: true });
		const r = runInstaller(home, repo, harness, ["--yes"]);
		expect(r.code).toBe(0);
		const cfg = readFileSync(join(home, "config.toml"), "utf8");
		expect(cfg).not.toContain("# >>> fusengine hooks >>>");
		expect(cfg).toContain('command = "echo mine"');
	});

	test("server whose required API key is missing is skipped with a warning", () => {
		const home2 = tmp("kimi-install-home2-");
		const r = runInstaller(home2, repo, harness, ["--yes"]);
		expect(r.code).toBe(0);
		expect(r.out).toContain("missing FAKE_TOKEN");
		expect(r.out).toContain("https://example.com/key");
		expect(Object.keys(mcpServers(home2))).toEqual(["catalog-stdio", "fake-stdio"]);
	});

	test("interactive prompt saves the key to .env and installs the server", () => {
		const home3 = tmp("kimi-install-home3-");
		const r = runInstaller(home3, repo, harness, ["--yes"], { FUSENGINE_FORCE_PROMPT: "1" }, "tok999\n");
		expect(r.code).toBe(0);
		expect(r.out).toContain("1 API key(s) required");
		const dotenv = readFileSync(join(home3, ".env"), "utf8");
		expect(dotenv).toContain("FAKE_TOKEN=tok999");
		expect(mcpServers(home3)["fake-http"].url).toBe("https://example.com/mcp?key=tok999");
	});

	test("real repo dry-run regenerates marketplace.json with 26 entries", () => {
		const proc = spawnSync("bun", [INSTALLER], { encoding: "utf8" });
		expect(proc.status).toBe(0);
		expect(`${proc.stdout}\n${proc.stderr}`).toContain(">=0.1.115");
		const market = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "marketplace.json"), "utf8"));
		expect(market.plugins).toHaveLength(26);
	});
});
