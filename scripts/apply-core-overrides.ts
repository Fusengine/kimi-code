/**
 * Applies the hand-written K3 core over the mechanical migration output.
 * Run AFTER migrate + scrub:  bun run scripts/apply-core-overrides.ts
 *
 * - removes plugins/claude-rules (mechanical copy) and installs core-overrides/kimi-rules
 * - overwrites plugins/ai-pilot/agents/*.md with the hand-optimized versions
 * - ensures every plugin ships scripts/kimi-hook-shim.mjs
 */
import { cpSync, rmSync, existsSync, mkdirSync, copyFileSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OVR = join(ROOT, "core-overrides");
const PLUGINS = join(ROOT, "plugins");

/** Replaces the mechanical claude-rules plugin by the hand-written kimi-rules. */
function installKimiRules(): void {
  rmSync(join(PLUGINS, "claude-rules"), { recursive: true, force: true });
  rmSync(join(PLUGINS, "kimi-rules"), { recursive: true, force: true });
  cpSync(join(OVR, "kimi-rules"), join(PLUGINS, "kimi-rules"), { recursive: true });
  console.log("kimi-rules installed (claude-rules removed)");
}

/** Overwrites ai-pilot agents with the hand-optimized K3 versions. */
function installAiPilotAgents(): number {
  const src = join(OVR, "ai-pilot-agents");
  const dest = join(PLUGINS, "ai-pilot", "agents");
  mkdirSync(dest, { recursive: true });
  let n = 0;
  for (const f of readdirSync(src)) {
    if (f.endsWith(".md")) { copyFileSync(join(src, f), join(dest, f)); n++; }
  }
  console.log(`ai-pilot agents overwritten: ${n}`);
  return n;
}

/** `fusengine.harnessMinVersion` of the repo package.json (the single source of the harness floor). */
function harnessFloor(): string {
  return JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).fusengine.harnessMinVersion;
}

/** Ensures the hook shim is present inside every plugin directory. */
function installShims(): number {
  const shim = join(ROOT, "scripts", "hooks", "kimi-hook-shim.mjs");
  let n = 0;
  for (const d of readdirSync(PLUGINS, { withFileTypes: true })) {
    if (!d.isDirectory() || d.name.startsWith("_") || d.name.startsWith(".")) continue;
    const dir = join(PLUGINS, d.name, "scripts");
    mkdirSync(dir, { recursive: true });
    copyFileSync(shim, join(dir, "kimi-hook-shim.mjs"));
    for (const sibling of ["harness-autoupdate.mjs", "harness-update-worker.mjs"]) {
      copyFileSync(join(ROOT, "scripts", "hooks", sibling), join(dir, sibling));
    }
    // A lone marketplace plugin has no suite package.json: ship the harness floor beside the shim.
    writeFileSync(join(dir, "harness-floor.json"), `${JSON.stringify({ harnessMinVersion: harnessFloor() })}\n`);
    n++;
  }
  console.log(`shim deployed in ${n} plugins`);
  return n;
}

if (!existsSync(join(OVR, "kimi-rules"))) {
  console.error("core-overrides/kimi-rules missing — aborting");
  process.exit(1);
}
installKimiRules();
installAiPilotAgents();
installShims();
console.log("Core overrides applied. Run: bun run scripts/validate.ts");
