---
name: bash-scripting
description: Robust operational bash - strict mode and its blind spots, traps for cleanup, locking, idempotence, dry-run, shellcheck
when-to-use: Writing or reviewing any shell script that runs on a server, in a timer, or over SSH
keywords: set -euo pipefail, errexit, inherit_errexit, trap EXIT, trap ERR, mktemp, flock, shellcheck, SC2155, SC2086, idempotent
priority: high
related: systemd-units-journald.md
---

# Bash Scripting for Operations

**Load when:** a new script, a cron/timer job, or a review of an existing one.
Anything beyond ~200 lines of logic or with data structures: write it in Python/Go instead.

Sources (read 2026-11-10): GNU Bash Reference Manual 5.3 -
https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html,
https://www.gnu.org/software/bash/manual/html_node/The-Shopt-Builtin.html,
https://www.gnu.org/software/bash/manual/html_node/Bourne-Shell-Builtins.html (`trap`),
https://www.gnu.org/software/bash/manual/html_node/Bash-Variables.html; https://man7.org/linux/man-pages/man1/mktemp.1.html,
https://man7.org/linux/man-pages/man1/flock.1.html; https://www.shellcheck.net/wiki/SC2155, `SC2086`, `SC2164`.

---

## Strict Mode - What It Does and Does Not Do

```bash
set -Eeuo pipefail
shopt -s inherit_errexit   # bash >= 4.4
```

| Option | Effect (Bash manual) | Blind spot |
|--------|----------------------|------------|
| `-e` (errexit) | exit on a failing command | NOT triggered in `if`/`while`/`until` tests, any command of a `&&`/`\|\|` list except the last, or a pipeline element other than the last (without `pipefail`) |
| `-u` (nounset) | unset variable = error | use `${VAR:-}` for optional variables |
| `-o pipefail` | pipeline status = last non-zero status | `grep -q` closing early can make the producer fail with SIGPIPE |
| `-E` (errtrace) | ERR trap inherited by functions, command substitutions, subshells | without it an ERR trap misses errors inside functions |
| `inherit_errexit` | command substitution inherits `-e` | otherwise `x=$(false; echo ok)` succeeds |

`local x=$(cmd)` / `export x=$(cmd)` hide `cmd`'s status (SC2155): declare first, assign on the next line.

---

## Traps

- `trap cleanup EXIT` - runs when the shell exits, for any reason handled by bash: the one place for cleanup.
- `trap 'on_err $LINENO' ERR` - report the failing line; `BASH_COMMAND` holds the command being executed.
- Add `INT TERM` handlers that `exit` with 130/143 so EXIT cleanup still runs.

---

## Patterns

| Need | Pattern |
|------|---------|
| Temp files | `tmpdir=$(mktemp -d)` + `rm -rf -- "$tmpdir"` in the EXIT trap (guard: only if it is set and a directory) |
| Single instance | `exec 9>/run/lock/job.lock; flock -n 9 \|\| { echo "already running"; exit 0; }` (`-n` = fail instead of waiting) |
| Dry run | `DRY_RUN=1` default for destructive scripts; a `run()` wrapper that prints instead of executing |
| Idempotence | check state before acting (`id user`, `grep -q line file`, `systemctl is-enabled`) - safe to rerun |
| Quoting | quote every expansion `"$var"` (SC2086); arrays for argument lists `"${args[@]}"` |
| `cd` | `cd -- "$dir" \|\| exit 1` (SC2164) - or rely on `-e`, but be explicit in functions |
| Logging | to stderr with a timestamp; under systemd the journal captures it |
| Exit codes | 0 success, non-zero failure; document any special code (like `dnf check-update` uses 100) |

Template: [script-skeleton.sh](templates/script-skeleton.sh) - strict mode, traps, lock, dry-run, argument parsing.

---

## Remote Execution

- Read-only discovery first: `ssh host 'bash -s' < discover.sh`.
- Fleet: one canary host, check, then the rest - or hand over to devops-ansible for anything repeated.
- Never pipe an untrusted URL into a shell (`curl ... | bash`) on a server; download, read, checksum, then run.

---

## Destructive Operations Inside Scripts

| Construct | Risk | Rule |
|-----------|------|------|
| `rm -rf -- "$dir"/` | empty/unset `$dir` targets `/` | `-u` + `[[ -n $dir && -d $dir ]]` guard + `--`; default to dry-run |
| loops over `find ... -delete` | deletes more than intended | print the list first (`-print`), then propose |
| `> file` truncation | loses data on a wrong path | write to a temp file, `mv` atomically |

Scripts that delete or overwrite are shown to the owner with the dry-run output first.

---

## Verification

```bash
bash -n script.sh               # syntax only
shellcheck script.sh            # static analysis - zero warnings or each one justified inline
DRY_RUN=1 ./script.sh --target x   # behaviour preview
```

## Pitfalls

- Trusting `-e` inside `if myfunc; then` - errexit is disabled for the whole function body there
- `cmd | while read` modifying variables - the loop runs in a subshell; use `while ...; done < <(cmd)`
- Parsing `ls` output - use globs or `find -print0` with `read -d ''`

## Not verified

- macOS ships bash 3.2 (no `inherit_errexit`); the template guards it - server distros ship bash 5.x (not checked per release)
- The `while ... done < <(cmd)` and `find -print0` notes are standard bash behaviour, not re-read this session
- The `grep -q` + `pipefail` SIGPIPE interaction is general knowledge, not sourced this session
