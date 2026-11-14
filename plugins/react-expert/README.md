# fuse-react

Expert React 19 development with TanStack Router, TanStack Form, Zustand, Testing Library, and shadcn/ui.

## Agent

- **react-expert** - Expert React developer

## Skills

| Skill | Description |
|-------|-------------|
| solid-react | SOLID principles for React 19 with modular architecture |
| react-19 | React 19 features: `use()`, `useOptimistic`, `useActionState`, custom hooks patterns |
| react-tanstack-router | File-based routing with type-safe search params |
| react-state | State management with Zustand and Jotai |
| react-forms | TanStack Form with Zod validation |
| react-testing | Testing Library with Vitest |
| react-shadcn | shadcn/ui components with TanStack Form integration |
| react-i18n | react-i18next for internationalization |

## Architecture

```
src/
├── modules/
│   ├── cores/
│   │   ├── shadcn/components/ui/
│   │   ├── lib/
│   │   ├── hooks/
│   │   └── stores/
│   └── [feature]/
│       ├── components/
│       └── src/
│           ├── interfaces/
│           ├── services/
│           ├── hooks/
│           └── stores/
├── routes/
└── main.tsx
```

## Installation

Run inside Kimi Code. This installs the whole Fusengine suite, which includes this plugin:

```
/plugins install https://github.com/fusengine/kimi-code
```

Then run the setup (hooks + API keys + MCP servers), and `/plugins reload` (or start a new session):

```
~/.kimi-code/plugins/managed/fusengine/setup.sh        # macOS / Linux
~\.kimi-code\plugins\managed\fusengine\setup.ps1       # Windows
```

## Usage

The agent activates when working with React projects (without Next.js).
