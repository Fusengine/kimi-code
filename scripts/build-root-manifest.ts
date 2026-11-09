/**
 * build-root-manifest.ts — Generate .kimi-plugin/plugin.json making the whole
 * repo ONE installable plugin (the obra/superpowers pattern): all plugins'
 * skills, commands and hooks aggregated under the `fusengine` namespace, so
 * `/plugins install https://github.com/fusengine/kimi-code` works directly.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PLUGINS = join(ROOT, "plugins");
const SHIM_REL = "scripts/hooks/kimi-hook-shim.mjs";

interface HookRule { event: string; matcher?: string; command: string; timeout?: number }
interface PluginManifest { name: string; hooks?: HookRule[] }

/** Aggregate skills/commands paths and hooks from every plugin manifest. */
function aggregate(): { skills: string[]; commands: string[]; hooks: HookRule[] } {
	const skills: string[] = [];
	const commands: string[] = [];
	const hooks: HookRule[] = [];
	for (const dir of readdirSync(PLUGINS).sort()) {
		const mPath = join(PLUGINS, dir, "kimi.plugin.json");
		if (!existsSync(mPath)) continue;
		const m: PluginManifest = JSON.parse(readFileSync(mPath, "utf8"));
		if (existsSync(join(PLUGINS, dir, "skills"))) skills.push(`./plugins/${dir}/skills/`);
		if (existsSync(join(PLUGINS, dir, "commands"))) commands.push(`./plugins/${dir}/commands/`);
		for (const h of m.hooks ?? []) {
			hooks.push({ ...h, command: `bun "\${KIMI_PLUGIN_ROOT}/${SHIM_REL}" ${h.command.split(" ").slice(2).join(" ")}`.replace(/\s+$/, "") });
		}
	}
	return { skills, commands, hooks };
}

const { skills, commands, hooks } = aggregate();
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const manifest = {
	name: "fusengine",
	version: pkg.version,
	description: "Fusengine agentic suite for Kimi Code (K3): 25 plugins, 211 skills, APEX workflow, harness-powered hooks",
	author: { name: "Fusengine", url: "https://github.com/fusengine" },
	homepage: "https://github.com/fusengine/kimi-code",
	repository: "https://github.com/fusengine/kimi-code",
	license: "MIT",
	keywords: ["agents", "apex", "solid", "design", "hooks", "fusengine"],
	skills,
	commands,
	hooks,
	// Sub-agents never see a hook's output: Kimi discards the return value of
	// SubagentStart. This file is the only channel into their system prompt —
	// it carries the hand-written APEX sub-agent preamble. The corpus rules are
	// NOT here: sub-agents already get them through the natively loaded AGENTS.md.
	systemPromptPath: "./plugins/ai-pilot/APEX-SUBAGENT.md",
	skillInstructions: "Kimi Code tool mapping for Fusengine skills and agents:\n- Task tool → Agent tool; TeamCreate → parallel Agent calls, or AgentSwarm when the owner turned swarm mode on; at most 6 agents concurrently.\n- WebFetch → FetchURL; TodoWrite → TodoList.\n- Skill tool references map to Kimi Code's native Skill tool.\n- Read/Write/Edit/Bash/Grep/Glob/WebSearch keep their native names.",
	interface: {
		displayName: "Fusengine Suite",
		shortDescription: "APEX workflow, domain experts, design pipeline, harness-enforced SOLID/DRY guards",
		developerName: "Fusengine",
		websiteURL: "https://github.com/fusengine/kimi-code",
	},
};

mkdirSync(join(ROOT, ".kimi-plugin"), { recursive: true });
writeFileSync(join(ROOT, ".kimi-plugin", "plugin.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`root manifest: ${skills.length} skill dirs, ${commands.length} command dirs, ${hooks.length} hooks`);
