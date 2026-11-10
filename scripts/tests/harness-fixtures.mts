/**
 * harness-fixtures.mts — shared hermetic fixtures for the harness auto-update
 * tests: a fake KIMI_CODE_HOME with a legacy-layout harness, a fake suite root
 * declaring the floor, and a fake installer (no network, counts its calls).
 */
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

export const REPO = resolve(import.meta.dir, "../..");
export const SHIM = join(REPO, "scripts/hooks/kimi-hook-shim.mjs");
export const FLOOR = "0.1.115";

/** Fake harness bin: proves its package version, resolves a sibling dep, optionally lazy-imports a chunk. */
export const FAKE_BIN = `import { appendFileSync, readFileSync } from "node:fs";
import dep from "figures";
if (process.env.SPAWN_LOG) appendFileSync(process.env.SPAWN_LOG, "x\\n");
const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
let d = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (d += c));
process.stdin.on("end", async () => {
  if (process.env.LONG === "1") { await new Promise((r) => setTimeout(r, 2500)); await import("../chunk.mjs"); }
  process.stdout.write(JSON.stringify({ ver: pkg.version, dep }));
});
`;

/** Write a complete fake harness project (package + figures dep) under `<root>/node_modules`. */
export function writeHarnessTree(root: string, version: string): void {
	const pkg = join(root, "node_modules/@fusengine/harness");
	mkdirSync(join(pkg, "dist/cli"), { recursive: true });
	writeFileSync(join(pkg, "package.json"), JSON.stringify({ name: "@fusengine/harness", version }));
	writeFileSync(join(pkg, "dist/cli/bin.mjs"), FAKE_BIN);
	writeFileSync(join(pkg, "dist/chunk.mjs"), "export default 1;\n");
	const dep = join(root, "node_modules/figures");
	mkdirSync(dep, { recursive: true });
	writeFileSync(join(dep, "package.json"), JSON.stringify({ name: "figures", type: "module", main: "index.js" }));
	writeFileSync(join(dep, "index.js"), 'export default "legacy";\n');
}

/** Fake installer run by the worker (cwd = stage dir): counts calls, honours INSTALL_FAIL / INSTALL_SLEEP_MS. */
const FAKE_INSTALL = `import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
appendFileSync(process.env.COUNT_FILE, "x\\n");
if (process.env.INSTALL_FAIL === "1") process.exit(1);
const d = "node_modules/@fusengine/harness";
mkdirSync(d + "/dist/cli", { recursive: true });
mkdirSync("node_modules/figures", { recursive: true });
writeFileSync("node_modules/figures/package.json", '{"name":"figures","type":"module","main":"index.js"}');
writeFileSync("node_modules/figures/index.js", 'export default "staged";');
writeFileSync(d + "/dist/chunk.mjs", "export default 2;");
writeFileSync(d + "/dist/cli/bin.mjs", process.env.FAKE_BIN_SRC);
if (process.env.INSTALL_SLEEP_MS) await new Promise((r) => setTimeout(r, Number(process.env.INSTALL_SLEEP_MS)));
writeFileSync(d + "/package.json", JSON.stringify({ name: "@fusengine/harness", version: process.env.NEW_VERSION }));
`;

export interface Fixture {
	home: string;
	suite: string;
	count: string;
	env: Record<string, string>;
}

/** Fake home at `version` (legacy layout) + suite root with the floor + installer env. */
export function makeFixture(version: string | null, floor = FLOOR): Fixture {
	const base = mkdtempSync(join(tmpdir(), "harness-autoupdate-"));
	const home = join(base, "home");
	const suite = join(base, "suite");
	mkdirSync(home, { recursive: true });
	mkdirSync(suite, { recursive: true });
	writeFileSync(join(suite, "package.json"), JSON.stringify({ fusengine: { harnessMinVersion: floor } }));
	if (version) writeHarnessTree(home, version);
	const installer = join(base, "fake-install.mjs");
	writeFileSync(installer, FAKE_INSTALL);
	const count = join(base, "installs.log");
	const env: Record<string, string> = {
		KIMI_CODE_HOME: home,
		KIMI_PLUGIN_ROOT: suite,
		HOME: base,
		COUNT_FILE: count,
		NEW_VERSION: floor,
		FAKE_BIN_SRC: FAKE_BIN,
		FUSENGINE_TEST: "1", // the install command override is honoured only under this flag
		FUSENGINE_HARNESS_INSTALL_CMD: `bun ${installer}`,
	};
	return { home, suite, count, env };
}

/** Number of fake-installer invocations so far. */
export function installs(f: Fixture): number {
	return existsSync(f.count) ? readFileSync(f.count, "utf8").split("\n").filter(Boolean).length : 0;
}

export const payload = (event: string): string =>
	JSON.stringify({ hook_event_name: event, session_id: "s", cwd: "/tmp", tool_input: { command: "ls" } });

/** Run a shim copy once (sync) and return its code/stdout/stderr. */
export function runShim(shim: string, f: Fixture, event: string, extra: Record<string, string> = {}, scope = "rules") {
	const proc = spawnSync("bun", [shim, scope], {
		input: payload(event),
		env: { ...(process.env as Record<string, string>), ...f.env, ...extra },
		encoding: "utf8",
	});
	return { code: proc.status, stdout: proc.stdout, stderr: proc.stderr };
}

/** What the shim's harness answers ({ver, dep}: its package version and which `figures` it resolved); null on failure. */
export function answer(shim: string, f: Fixture): { ver: string; dep: string } | null {
	const r = runShim(shim, f, "PreToolUse");
	try { return JSON.parse(r.stdout) as { ver: string; dep: string }; } catch { return null; }
}

/** Version the shim's harness answers with; null on failure. */
export function answeredVersion(shim: string, f: Fixture): string | null {
	return answer(shim, f)?.ver ?? null;
}

/** Poll `cond` every 25 ms until true or `ms` elapsed. */
export async function waitFor(cond: () => boolean, ms = 20_000): Promise<boolean> {
	const end = Date.now() + ms;
	while (Date.now() < end) {
		if (cond()) return true;
		await new Promise((r) => setTimeout(r, 25));
	}
	return cond();
}

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
