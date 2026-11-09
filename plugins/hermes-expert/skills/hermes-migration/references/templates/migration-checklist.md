# Migration checklist - template

Copy into the staging directory as `MIGRATION.md`. One go per step; record
the go (date, owner's words) next to each step.

```markdown
# Migration - <install label> - started <YYYY-MM-DD>

Hermes installed: <hermes --version> · latest: <hermes update --check>
Release notes read since 0.23.0: <list or "none newer">

## 0. Before measures                          go: n/a (read-only)
- [ ] prompt-size per profile saved
- [ ] insights / sessions stats saved
- [ ] failures counted from logs and cron doctor
- [ ] broken promises counted

## 1. Backup                                    go: <date, words>
- [ ] full backup zip, exit 0, path: <path>
- [ ] quick snapshot "pre-migration"
- [ ] cron lists per profile saved
- [ ] external workflow files copied

## 2. SOUL + .hermes.md                         go: <date, words>
- [ ] chief SOUL.md (eight rules, three paths)
- [ ] manager SOUL.md files
- [ ] .hermes.md per workspace root
- [ ] sessions refresh-prompts run
## 3. Outbound control                          go:
- [ ] go gate applied; direct send refused in test
- [ ] existing send mechanism audited (go only? account?) - or "none: owner decision"
## 4. Registry + status sheets                  go:
- [ ] registry built and confirmed by owner
- [ ] README per open dossier
## 5. Rhythm jobs                               go:
- [ ] brief, pilot, evening, weekly, monthly; cron doctor clean
## 6. Seal check                                go: n/a (read-only)
- [ ] .env names, boards, private markers, terminal.cwd - no crossing
## 7. Voice                                     go:
- [ ] primary + backup; forced failure tested
## 8. Decisions channel + daily reset           go:
- [ ] machine output moved; doctor shows no session_reset warning
## 9. Test day + after measures                 go:
- [ ] full day passed (test-day.md)
- [ ] measures table filled

Rollback point for every step: <backup path>
```
