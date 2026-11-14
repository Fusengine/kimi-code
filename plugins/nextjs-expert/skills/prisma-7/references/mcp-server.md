---
name: mcp-server
description: Prisma MCP Server for AI assistants and LLM integration
when-to-use: Kimi integration, AI-powered schema exploration, Prisma Postgres management from an agent
keywords: mcp, ai-assistants, kimi, llm-integration, server
priority: high
requires: /plugins/nextjs-expert/skills/prisma-7/references/installation.md
related: /plugins/nextjs-expert/skills/prisma-7/references/prisma-ai.md, /plugins/nextjs-expert/skills/prisma-7/references/github-copilot.md
---

# Prisma MCP Server

Prisma ships two MCP servers. There is no `@prisma/mcp-server` npm package (it returns 404 on the registry); use one of the forms below.

Sources: https://www.prisma.io/docs/ai/tools/mcp-server (remote server) and a real stdio handshake plus a real Kimi Code 2.6.1 connection test (local server), both run against the forms shown here.

| Server | How to start | Needs |
|--------|--------------|-------|
| Local (Prisma 7.x only) | `npx -y prisma@7 mcp` | a Prisma project (tools take `projectCWD`) |
| Remote | `https://mcp.prisma.io/mcp` (Streamable HTTP) | Prisma account, one-time OAuth login |

The local `mcp` command exists only in Prisma 7.x. An unpinned `npx prisma mcp` resolves to the current `latest` (8.0.0-rc.33 when checked) and fails with `[CLI.UNKNOWN_COMMAND] No command registered for 'mcp'`. Always pin `prisma@7`.

## Setup in Kimi Code

Add the servers to `$KIMI_CODE_HOME/mcp.json` (default `~/.kimi-code/mcp.json`), merged into the existing `mcpServers` object, then start a new session:

```json
{
  "mcpServers": {
    "prisma-local": { "command": "npx", "args": ["-y", "prisma@7", "mcp"] },
    "prisma-remote": { "url": "https://mcp.prisma.io/mcp" }
  }
}
```

For the remote server run `/mcp-config login prisma-remote` once (OAuth with your Prisma account, then pick a workspace). Until then Kimi reports `prisma-remote requires OAuth`.

Other MCP clients use the same two entries; clients that only speak stdio can reach the remote server with `npx -y mcp-remote https://mcp.prisma.io/mcp`.

## Local server tools (verified)

`tools/list` against `prisma@7` (server `Prisma` 7.10.1) returned exactly these, each taking `projectCWD` (the project's top-level directory):

- `migrate-status` - runs `prisma migrate status`
- `migrate-dev` - runs `prisma migrate dev`; also takes `name` (a descriptive migration name)
- `Prisma-Studio` - opens Prisma Studio

Without a `prisma/schema.prisma` under `projectCWD`, `migrate-status` answers `Error: Could not find Prisma Schema that is required for this command.`

## Remote server tools

Managed Prisma Postgres operations (databases, backups, connection strings, SQL execution, schema introspection) plus Compute and Object Storage management. After connecting, ask the agent to "List the Prisma tools" for the current list; the docs page above is the reference.

Tools that change or delete resources can cause data loss: check the target workspace and resources before approving a call.

## Sample prompts

- "Check my migration status." (local)
- "Create a migration named add-post-status." (local)
- "Show me a list of all the databases in this workspace." (remote)
- "Show me all available backups of my database." (remote)

## Troubleshooting

### Local server does not connect

```bash
# Waits silently on stdin (a stdio MCP server); an UNKNOWN_COMMAND error means the pin is missing
npx -y prisma@7 mcp
```

If you see `UNKNOWN_COMMAND`, the `prisma@7` pin is missing from the entry's `args`.

### Remote server says it requires OAuth

Run `/mcp-config login prisma-remote` in Kimi Code and complete the browser login.

### Schema changes not reflected

```bash
npx prisma generate
```

---
