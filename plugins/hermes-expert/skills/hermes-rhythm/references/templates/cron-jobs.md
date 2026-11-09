# Rhythm cron jobs - template

Ready-to-adapt commands for the chief's profile. Fill `<...>` from
`profile.yaml`. Flag meanings, defaults and edge cases are owned by
**hermes-cron** - check it (and `hermes cron create --help` on the installed
version) before running anything. Every flag below appears in the official
cron docs or CLI reference for 0.23.0.

Run as the chief's profile (`hermes -p <chief-profile> ...` or the profile's
alias). Dry run first: generate the list, show it to the owner, run only
after the go.

```bash
# Morning brief - a stale brief is useless: no catch-up
hermes -p <chief-profile> cron create "0 8 * * *" \
  "Morning brief. Read the registry, dossier READMEs and the board. Sections in this order: Urgent, Decisions waiting, Company, Private, Agenda. One-minute read. One proposed action per item." \
  --name "morning-brief" \
  --workdir <absolute workspace root holding .hermes.md> \
  --timezone <IANA zone> \
  --deliver <owner conversation target> \
  --catch-up off

# Pilot check - silent unless something is stuck or ready
hermes -p <chief-profile> cron create "every 2h" \
  "Pilot check. List blocked or overdue cards and finished deliverables. Chase blocked managers on their card. If nothing changed, reply with only [SILENT]." \
  --name "pilot-check" \
  --workdir <absolute workspace root> \
  --deliver <decisions channel target>

# Evening review
hermes -p <chief-profile> cron create "0 18 * * *" \
  "Evening review: Done, Left (next step + date), Waiting for you. No card list." \
  --name "evening-review" \
  --workdir <absolute workspace root> \
  --timezone <IANA zone> \
  --deliver <owner conversation target> \
  --continuity

# Weekly review
hermes -p <chief-profile> cron create "0 8 * * 1" \
  "Weekly review: client pipeline, invoices sent and unpaid, projects and promised dates, open private dossiers, goals of the week. Propose the three priorities." \
  --name "weekly-review" \
  --workdir <absolute workspace root> \
  --timezone <IANA zone> \
  --deliver <owner conversation target>

# Monthly dashboard
hermes -p <chief-profile> cron create "0 8 1 * *" \
  "Monthly dashboard: invoiced, unpaid with age, payroll and social charges, admin deadlines this month. Cite the source file of each figure; mark unconfirmed figures." \
  --name "monthly-dashboard" \
  --workdir <absolute workspace root> \
  --timezone <IANA zone> \
  --deliver <owner conversation target> \
  --reasoning-effort high
```

## Notes

- Attach domain skills with repeated `--skill <name>` if a ritual needs one.
- `--timezone` omitted = the profile `timezone:`.
- Private items in a company channel break the seal: if the decisions
  channel is shared, create a separate private brief job delivering to the
  owner's private conversation.
- After creation: `hermes cron list`, then `hermes cron doctor` (read-only
  health check, non-zero exit on issues), then `hermes cron run <name>` once
  to see a real output before the first scheduled fire.
- `cron.preflight` (default on) blocks a job with missing credentials,
  skills or delivery before any LLM call (`last_status: blocked_config`).

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron
- https://hermes-agent.nousresearch.com/docs/reference/cli-commands (`hermes cron`)
- https://hermes-agent.nousresearch.com/docs/user-guide/profiles (`-p`)
