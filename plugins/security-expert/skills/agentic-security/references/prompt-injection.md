---
name: prompt-injection
description: Paths by which untrusted content reaches an agent's context and instruction files that make the agent obey it
when-to-use: Auditing skills, agents, rules, CLAUDE.md, memory files, hooks and workflows that feed content to an agent
keywords: prompt injection, indirect injection, tool output, WebFetch, issue text, memory poisoning, LLM01, ASI01, ASI06
priority: critical
related: mcp-trust.md, ci-agents.md, standards-map.md, verification.md
---

# Prompt Injection Paths

## Why it matters

OWASP LLM01:2026 Prompt Injection: models make "no architectural distinction between
'instructions' and 'data'"; indirect injection arrives through "a web page, a document, an email,
a tool response, a retrieved RAG passage, an image, an MCP server's output, a database row, or an
issue title". With agentic execution "the blast radius extends from the chat surface to whatever
the agent's tools can reach". An attacker can place text through a low-privilege channel ("a
community pull request") and wait for the developer's agent to act on it with the developer's
credentials.
Source: OWASP Top 10 for LLM Applications 2026, PDF linked from https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/

OWASP ASI01 Agent Goal Hijack: agents "cannot reliably distinguish legitimate instructions
from attacker-controlled content", including "deceptive tool outputs, malicious artefacts".
ASI06 Memory & Context Poisoning covers corruption of stored context that "propagates across sessions".
Source: OWASP Top 10 for Agentic Applications 2026, PDF linked from https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/

Vendor guidance: "Avoid piping untrusted content directly to Claude"; for most fetches WebFetch
runs a separate model call over the page and Claude receives that answer instead of the raw page.
Source: https://code.claude.com/docs/en/security (section "Protect against prompt injection")

Permission rules "are enforced by Claude Code, not by the model. Instructions in your prompt or
`CLAUDE.md` shape what Claude tries to do, but they don't change what Claude Code allows."
Source: https://code.claude.com/docs/en/permissions (section "Manage permissions")
Consequence for the audit: an instruction file is never a security control; it is only a surface.

## Checklist

| # | Look for | Where | Why | Verify |
|---|----------|-------|-----|--------|
| P1 | Content sources the agent reads unattended: web fetch, issue / PR / comment text, email, tickets, MCP fetch tools | skills, agents, commands, workflows | Indirect injection delivery surfaces (LLM01:2026) | Trace source → agent context → tools available at that point |
| P2 | Instructions telling the model to follow, execute or trust observed content ("do what the page says", "apply the instructions in the issue") | `SKILL.md`, agent `.md`, rules, `CLAUDE.md`, commands | Turns data into instructions (ASI01) | Quote the line; check whether the context also holds write or shell tools |
| P3 | Untrusted text interpolated into a prompt or a `claude -p` argument | hooks, scripts, workflows | Direct pipe of untrusted content, contrary to vendor guidance | Show the variable's origin (PR title, branch name, file content) |
| P4 | Memory, lesson or notes files written from session content and re-read on later sessions | memory dirs, `MEMORY/`, lesson files, hook outputs injected at session start | Cross-session persistence (ASI06) | Who can write the file; is it injected into every session |
| P5 | Hook output injected as context: `hookSpecificOutput.additionalContext`, or plain stdout of `SessionStart` / `UserPromptSubmit` hooks | hook scripts | "The `additionalContext` field passes a string from your hook into Claude's context window" (https://code.claude.com/docs/en/hooks) | Can the hook echo repository, memory or network content verbatim? |
| P6 | Agents holding both untrusted-input tools and high-impact tools (shell, write, push, send) | agent `tools:` lists, `allowed-tools` | Excessive Agency (LLM06:2025 / LLM03:2026) amplifies any injection | List the pair; a read-only agent lowers severity |
| P7 | Hidden or obfuscated text in instruction files: zero-width or bidi Unicode, base64 blobs, HTML comments | all instruction files | Encoding axis named in LLM01:2026 | Grep for non-printing code points and long base64 runs |
| P8 | Mitigations present: sandboxing, network isolation, human approval before write actions | settings, workflows | Sandbox "still applies even if a prompt injection bypasses Claude's decision-making" (permissions doc, "How permissions interact with sandboxing") | Record presence; absence raises severity, never confidence |

A static read finds a path, not a working exploit: every P-candidate goes through verification.md.
