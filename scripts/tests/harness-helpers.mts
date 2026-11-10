/**
 * harness-helpers.mts — process-level helpers shared by the harness auto-update
 * e2e tests (parallel shim bursts, lock-file listing).
 */
import { readdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { SHIM, payload, type Fixture } from "./harness-fixtures.mts";

/** Lock generation files currently in the home (`.harness-update.lock[.N]`). */
export function lockFiles(home: string): string[] {
	return readdirSync(home).filter((n) => n.startsWith(".harness-update.lock"));
}

export interface ShimExit { code: number | null; stderr: string }

/** Run one shim per scope in parallel (Kimi runs one SessionStart shim per scope concurrently). */
export function burst(f: Fixture, scopes: string[], extra: Record<string, string> = {}, event = "SessionStart"): Promise<ShimExit[]> {
	const env = { ...(process.env as Record<string, string>), ...f.env, ...extra };
	return Promise.all(scopes.map((scope) => new Promise<ShimExit>((done) => {
		const p = spawn("bun", [SHIM, scope], { env, stdio: ["pipe", "ignore", "pipe"] });
		let stderr = "";
		p.stderr.on("data", (c) => (stderr += c));
		p.stdin.end(payload(event));
		p.on("close", (code) => done({ code, stderr }));
	})));
}
