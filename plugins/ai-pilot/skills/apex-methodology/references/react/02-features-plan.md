---
name: 02-features-plan
description: Create detailed implementation plan for React features
prev_step: references/react/01-analyze-code.md
next_step: references/react/03-execution.md
---

# 02 - Features Plan (React/Vite)

**Create detailed implementation plan (APEX Phase P).**

## When to Use

- After code analysis complete
- Before writing any code
- When scope is understood

---

## TaskCreate Planning

### React Feature Breakdown

```markdown
## Implementation Plan

### Task 1: Create interfaces (~20 lines)
- File: modules/[feature]/src/interfaces/[name].interface.ts
- Dependencies: None

### Task 2: Create hook (~30 lines)
- File: modules/[feature]/src/hooks/use[Name].ts
- Dependencies: Task 1

### Task 3: Create component (~50 lines)
- File: modules/[feature]/components/[Name].tsx
- Dependencies: Task 1, 2

### Task 4: Add tests (~40 lines)
- File: modules/[feature]/components/[Name].test.tsx
- Dependencies: Task 3
```

---

## File Size Planning

### React Component Limits

| Estimated Size | Action |
| --- | --- |
| Well within `FUSE_SOLID_MAX_LINES` | Single component OK |
| Logic mixed into JSX | Extract logic to a hook |
| Approaching `FUSE_SOLID_MAX_LINES` | MUST split (hook + component) |
| Over `FUSE_SOLID_MAX_LINES` | Split into multiple components |

### Split Strategy

```text
Large feature -> Split into:
├── [Name].tsx           (presentation)
├── use[Name].ts         (logic hook)
├── [Name].interface.ts  (types)
├── [Name]Item.tsx       (child component if needed)
└── [Name].test.tsx      (tests)
```

---

## Interface-First Design

### Create Interfaces FIRST

```typescript
// modules/users/src/interfaces/user.interface.ts

/** User entity. */
export interface User {
  id: string
  name: string
  email: string
}

/** UserCard component props. */
export interface UserCardProps {
  user: User
  onEdit?: (id: string) => void
}
```

### Location Rules

```text
- modules/[feature]/src/interfaces/
- NEVER in component files
- NEVER inline in hooks
```

---

## React Dependency Graph

```text
interfaces/[name].interface.ts
    |
hooks/use[Name].ts
    |
components/[Name].tsx
    |
components/[Name].test.tsx
```

---

## Plan Template

```markdown
# Feature: [Name]

## Overview
[1-2 sentence description]

## Tasks

### 1. Interfaces (~20 lines)
- [ ] Create modules/[feat]/src/interfaces/[name].interface.ts

### 2. Hook (~25 lines)
- [ ] Create modules/[feat]/src/hooks/use[Name].ts

### 3. Component (~45 lines)
- [ ] Create modules/[feat]/components/[Name].tsx

### 4. Tests (~40 lines)
- [ ] Create modules/[feat]/components/[Name].test.tsx

## File Structure
```
modules/[feature]/
├── components/[Name].tsx
└── src/
    ├── interfaces/[name].interface.ts
    └── hooks/use[Name].ts
```

## Estimated Total: ~130 lines (4 files)
```

---

## Validation Checklist

```text
[ ] TaskCreate plan created
[ ] Every task fits within `FUSE_SOLID_MAX_LINES`
[ ] Interfaces planned FIRST
[ ] Hooks separated from components
[ ] File splits pre-planned
[ ] Dependencies mapped
```

---

## Task Phase

Phase: `features-plan`. `.kimi-code/apex/` is harness state, read-only for agents and the lead: never create or write anything there. Kimi has no task-board sync: the lead tracks the phase in its `TodoList`; state the phase in your REPORT and keep tracking in the agents' REPORTs and `docs/decisions.md`.

---

## Next Phase

-> Proceed to `03-execution.md`
