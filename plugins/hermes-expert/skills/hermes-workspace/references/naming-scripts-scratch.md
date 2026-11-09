# Naming, scripts and scratch

## Naming

| Item | Pattern | Example |
|------|---------|---------|
| Dossier | `YYYY-MM_subject` | `2026-10_annual-billing-claim` |
| Deliverable | `YYYY-MM-DD_subject_vN.ext` | `2026-10-14_billing-report_v2.pdf` |
| Internal note | `travail/<topic>.md` | `travail/call-notes.md` |
| Script folder | `<verb-object>` kebab-case | `payslip-generate/` |

Rules: lowercase, hyphens, no spaces or accents in folder names (scripts and
shells handle them badly); the date is when the version was produced; `vN`
increments on every change shown to someone, and the previous version moves to
`archives/`; never put `final`, `current`, `latest`, `now` or a "draft - not
validated" marker in a name (the version says it); the recipient-facing file name
can differ (hermes-outbound) - it is exported fresh, never renamed in place.

## Scripts live apart

The workspace holds documents only. Each script gets:

```
<scripts_root>/<script-name>/
├── README.md     one line: what it does; then usage
└── <code files>
```

- Reusable → stays, with its README.
- One-shot → moved to `archives/to-delete/` once used; it does not stay
  among scripts.
- A script that sends, pays or deletes is a **locked** script: only callable
  after the owner's go (hermes-security, hermes-outbound).
- Scheduled scripts can run as no-agent cron jobs (script only, stdout
  delivered, zero LLM) - hermes-cron.

## Scratch lives outside

Temporary files - screenshots, JSON dumps, drafts, downloads - go to
`<scratch_root>/<card-id>/`, never into the workspace.

Hermes already provides disposable places:

- A per-profile scratch directory (`TMPDIR`) under the Hermes home that is
  pruned after 24 h idle (configuration docs, terminal section).
- Kanban `scratch` workspaces, deleted when the task completes; only files
  declared as artifacts are kept (kanban docs).

Use them, or a scratch root you define in `profile.yaml`; either way the
workspace never receives temporary files.

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/configuration (terminal, scratch)
- https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban (scratch workspaces, artifacts)
- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron (no-agent mode)
