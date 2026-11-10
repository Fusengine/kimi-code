---
name: leak-prevention-response
description: Preventing and detecting committed secrets (gitleaks, trufflehog, pre-commit) and the response order when a secret leaks - revoke and rotate first, history rewrite is not remediation
when-to-use: Setting up secret scanning, a scanner reports a finding, a secret was pasted in Git/chat/logs/an image, or an identity (age, kubeconfig, token) is exposed
keywords: gitleaks, trufflehog, pre-commit, secret scanning, leaked secret, revoke, rotate, git history rewrite, baseline, allowlist, betterleaks
priority: critical
related: rotation-lifecycle.md, destructive-secret-ops.md, secrets-lifecycle.md
---

# Leak Prevention, Detection and Response

**Load when:** configuring scanners or reacting to an exposed secret. Auditing an application's code for vulnerabilities and organisation-wide secret-scanning programmes belong to `security-expert`; this file is the operator's day-to-day layer.

## Scanners (status checked 2026-11-10)

| Tool | Version | Notes |
|------|---------|-------|
| gitleaks | v8.30.1 | Config in TOML (licence not read); modes `git`, `dir`, `stdin`; the maintainer states it is **feature complete, security patches only**, with focus moving to a successor project named Betterleaks. Still fine to run; plan to re-evaluate |
| trufflehog | v3.99.8 | AGPL-3.0; classifies 800+ secret types and can **verify** whether a secret is live by contacting the provider |

- Sub-commands for gitleaks v8.19+: `git`, `dir`, `stdin` (`detect`/`protect` are deprecated and hidden). `--redact` masks secrets in output (always use it in agent sessions). `-c`/`GITLEAKS_CONFIG`/`.gitleaks.toml` select config. Exit code 1 on leaks (`--exit-code` changes it). `--baseline-path` ignores known findings; `.gitleaksignore` and `gitleaks:allow` comments suppress single findings.
- Config: `[extend] useDefault = true` keeps the built-in rules; `[[allowlists]]` (v8.25+) with `description`, `paths`, `regexes`, `stopwords`, `targetRules`. `useDefault` and `path` cannot be combined. Template: [templates/gitleaks.toml](templates/gitleaks.toml). Keep allowlists narrow (a path or a rule, never a global regex that hides real findings).
- trufflehog `--results=verified` **sends the candidate secret to the provider's API**. Run it only where the user has agreed that finding may be transmitted; otherwise use unverified results.

```bash
gitleaks dir --redact --no-banner .          # working tree, values masked
gitleaks git --redact --no-banner .          # full history, values masked
trufflehog git <repo-url> --results=verified # form from the README quick start; only after the user agrees to provider-side verification
```

### Pre-commit and CI

- Pre-commit: repo `https://github.com/gitleaks/gitleaks`, hook id `gitleaks`, pin `rev:` to a release tag (`v8.30.1`), `pre-commit install`. `SKIP=gitleaks git commit` bypasses it: reserve for a reviewed false positive, never a habit.
- Run the same scan in CI on every pull request and on a schedule over full history; a pre-commit hook is client-side and optional.
- Also keep out of Git by design: `.env*`, `*.key`, age identity files, kubeconfigs, `*.tfstate`, backup archives (`.gitignore` + scanner path rules).

## Response order (a leaked secret is already compromised)

1. **Contain**: find what the secret unlocks (system, scope, owner) and when it was exposed. Do not paste it anywhere else to "check".
2. **Revoke at the issuer**: disable/delete the credential (provider console or API, Vault `lease revoke`/token revoke, database `ALTER USER`, deploy-key removal). Dynamic credentials: revoke the lease and fix the policy that exposed it.
3. **Rotate**: issue a replacement, distribute it through the proper channel, restart/reload consumers ([rotation-lifecycle.md](rotation-lifecycle.md)).
4. **Verify revocation**: a test client attempts the old credential and fails (never by echoing it). Check issuer-side logs/audit for use between exposure and revocation.
5. **Scope the blast radius**: audit logs for the credential's activity; widen the response if misuse is seen (escalate to the user / security-expert).
6. **Clean up exposure**: remove from the working tree; only then consider history rewrite and cache purges (below).
7. **Fix the cause**: add the scanner rule, move the secret into the store, add a runbook line.
8. **Record**: timeline, scope, actions, residual risk ([templates/leaked-secret-response.md](templates/leaked-secret-response.md)).

### History rewrite is not remediation

- Rewriting history (for example `git filter-repo`, BFG) does not remove copies in clones, forks, CI caches, pull-request refs, hosting-provider caches, mirrors or already-scraped data. Assume the secret is public the moment it was pushed.
- It also invalidates every collaborator's clone and is a force-push: **destructive**, owner approval required ([destructive-secret-ops.md](destructive-secret-ops.md)).
- Do it after rotation, when it still reduces casual exposure or satisfies policy, and ask the hosting provider to purge cached views if they offer it.

## Sources (read 2026-11-10)

- https://raw.githubusercontent.com/gitleaks/gitleaks/master/README.md (warning banner, pre-commit, commands, flags)
- Context7 `/gitleaks/gitleaks/v8.30.1` (config: extend, allowlists, targetRules)
- https://raw.githubusercontent.com/trufflesecurity/trufflehog/main/README.md (head: licence, verification, quick start)
- https://github.com/gitleaks/gitleaks/releases/latest ; https://github.com/trufflesecurity/trufflehog/releases/latest

## Not verified

- The successor project "Betterleaks" (named in the gitleaks README banner): not evaluated.
- `git filter-repo` / BFG usage and hosting-provider purge procedures (GitHub sensitive-data removal): not read today; the points on clones/forks/caches are general knowledge.
- gitleaks licence file and trufflehog `git` subcommand flags beyond the README quick start.
- Detection coverage for Vault/OpenBao tokens or age identities in the default ruleset: not checked (add custom rules and test them on a synthetic placeholder).
