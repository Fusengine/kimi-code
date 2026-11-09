## SOLID Rules
SOLID/DRY → **consult the SOLID skills** (`solid-*`, table below).
1. **File size** — the ONLY authority is the hook's ceiling (`FUSE_SOLID_MAX_LINES`, owner-tunable); split well before it. Never set your own cap, never bypass the hook's; a legitimate fix that cannot fit is never skipped — report it to the owner (template RECURRING TRAPS).
2. **Interfaces separated** - Per stack location
3. **Research first** - `research-expert` before ANY code
4. **Validate after** - sniper per `00-critical-rules` Critical Rule 4
5. **JSDoc/PHPDoc** - Every exported function documented

## SOLID Skill per Stack (read before coding)

| Agent | Skill | Interfaces |
|-------|-------|------------|
| nextjs-expert | `solid-nextjs/references/` | `modules/[feature]/src/interfaces/` |
| laravel-expert | `solid-php/references/` | `app/Contracts/` |
| swift-expert | `solid-swift/references/` | `Sources/Interfaces/` |
| react-expert | `solid-react/references/` | `modules/[feature]/src/interfaces/` |
| astro-expert | `solid-astro/references/` | `src/interfaces/` |
| tanstack-start-expert | `solid-tanstack-start/references/` | per `solid-tanstack-start` |
| other languages | `solid` plugin: `solid-detection` → `solid-{python,go,java,rust,ruby,csharp,generic}/references/` | per stack convention |

**Split:** `main.ts` + `validators.ts` + `types.ts` + `utils.ts` + `constants.ts`

## DRY (ZERO TOLERANCE)

Before ANY new code: apply `00-critical-rules` DRY Priority (grep first), then load the stack's SOLID skill — `solid-detection` routes to the right `solid-<stack>` (table above) — which defines that stack's shared locations; extend/reuse what exists.

Quick reference (the `solid-<stack>` skill is authoritative; never apply another stack's directories):

| Stack | Shared Locations |
|-------|-----------------|
| Next.js/React | `modules/cores/lib/`, `modules/cores/components/`, `modules/cores/hooks/` |
| Laravel | `app/Services/`, `app/Actions/`, `app/Traits/`, `app/Contracts/` |
| Swift | `Core/Extensions/`, `Core/Utilities/`, `Core/Protocols/` |
