/**
 * subset.ts — Greedy set cover: pick the smallest walk through the sorted
 * rule list that exercises every scope AND every event at least once. Used
 * by layer 2 so the deep shim assertions run on a representative subset
 * instead of all 65 rules (layer 3 runs everything).
 */
import type { HookRuleRef } from "../../../src/interfaces/index.ts";
import { parseShimCommand } from "./collect";

/** Pick rules covering all scopes + events; also returns what was covered. */
export function selectRepresentative(rules: HookRuleRef[]): {
	picked: HookRuleRef[];
	scopes: Set<string>;
	events: Set<string>;
} {
	const scopes = new Set<string>();
	const events = new Set<string>();
	const picked: HookRuleRef[] = [];
	for (const ref of rules) {
		const cmd = parseShimCommand(ref.hook.command);
		if (!cmd) continue; // static layer reports it; nothing to simulate here
		if (cmd.scope === "update") continue; // shim-only scope: never reaches the harness, so no forwarding contract to assert
		const coversScope = !scopes.has(cmd.scope);
		const coversEvent = !events.has(ref.hook.event);
		if (coversScope || coversEvent) {
			picked.push(ref);
			scopes.add(cmd.scope);
			events.add(ref.hook.event);
		}
	}
	return { picked, scopes, events };
}
