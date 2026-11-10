## Project Detection -> Domain Agent

Scan: plugin agents (paths injected at SessionStart — never hardcode marketplace paths) + `~/.kimi-code/agents/*.md` + `.agents/agents/*.md`

| Project Indicator | Agent |
|-------------------|-------|
| `next.config.*`, `app/layout.tsx` | `nextjs-expert` |
| `astro.config.*`, `src/pages/*.astro` | `astro-expert` |
| `composer.json` + `artisan` | `laravel-expert` |
| `composer.json` WITHOUT artisan file | `php-expert` |
| `@tanstack/react-start` in package.json, `tanstackStart()` in vite.config.* | `tanstack-start-expert` |
| `package.json` + React | `react-expert` |
| `tsconfig.json` with NO framework config (no next/astro/vite-react/tanstackStart) | `typescript-expert` |
| `Package.swift`, `*.xcodeproj` | `swift-expert` |
| `Cargo.toml` | `rust-expert` |
| `go.mod` | `go-expert` |
| `tailwind.config.*` | `tailwindcss-expert` |
| `components.json`, `@radix-ui/*` | `shadcn-ui-expert` |
| Infrastructure repo: `*.tf` / `*.tofu` roots, `ansible.cfg` or `playbooks/` + `inventory/`, `Chart.yaml`, `kustomization.yaml`, `*.pkr.hcl`, `.sops.yaml`, or a repo whose main content is Kubernetes manifests (a lone `Dockerfile` or `docker-compose.yml` inside an application repo does NOT route here) | `devops-expert` |
| Custom `~/.kimi-code/agents/*.md` | Use matching custom agent |
| **No match** | `coder` (built-in) |

Priority: Custom > Framework (Next.js > Astro > Laravel > TanStack Start > React) > Language (TypeScript, PHP, Swift, Rust, Go) > UI library > Infrastructure (`devops-expert`, lowest tier: framework and language experts always win) > `coder`
Right agent for each task: route by this table (COORDINATOR PATH 5); never the generic `coder` or another generic agent when a domain expert exists.
