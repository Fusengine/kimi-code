# Leaked secret response checklist

Copy per incident. Never write the secret value in this file, the ticket or the chat; refer to it by
name, path, key ID, fingerprint or the first/last characters only if the owner agrees.

```
Incident:            <ID>            Opened (UTC): <timestamp>      Owner: <name>
Secret:              <name / system / type>         Issuer: <system that honours it>
Exposure:            <where: repo+commit, chat, log, image, ticket>   First exposed (UTC): <timestamp>
Exposure visibility: <private repo | public repo | public image | chat | unknown>
```

## 1. Contain (minutes)
- [ ] What does the secret unlock (systems, data, permissions)? Written down: ______
- [ ] Is the exposure still live (repo public, image pullable, log shipped)? Restrict access now (make private, pause pipeline) - reversible actions only
- [ ] Do not paste the secret anywhere to "test" it

## 2. Revoke at the issuer (before any cleanup)
- [ ] Credential disabled/deleted at the issuer: ______ (time UTC)
- [ ] Vault/OpenBao: lease/token revoked (`vault lease revoke <lease-id>`), policy gap noted
- [ ] If it was an age identity / kubeconfig / signing key: treat every secret it could open as exposed (list in section 4)
- [ ] ACTION / EFFECT / PROOF / WAIT-FOR-GO written for any bulk revocation (destructive-secret-ops.md)

## 3. Rotate
- [ ] New credential issued through the store; consumers updated; reload/restart done
- [ ] Rotation runbook followed: runbooks/rotation-<secret>.md
- [ ] Test client: new credential works, old one fails (values read from files, not typed)

## 4. Scope the blast radius
- [ ] Issuer audit/access logs reviewed from first exposure to revocation: suspicious use? yes / no / unknown
- [ ] Other secrets reachable with it (same SOPS recipients, same Vault token policies): rotated? ______
- [ ] Escalated to the user / security-expert if misuse is suspected

## 5. Clean up exposure
- [ ] Removed from the working tree and from artifacts (images deleted by their owner, logs purged by policy)
- [ ] Git history rewrite considered ONLY after rotation, with the owner's explicit go (force-push); hosting-provider cache purge requested if available
- [ ] Clones/forks/CI caches assumed to retain the secret

## 6. Prevent recurrence
- [ ] Scanner rule or allowlist change (templates/gitleaks.toml); pre-commit hook active on the repo
- [ ] Secret moved into the store (SOPS/ESO/Vault); `.gitignore` updated
- [ ] Runbook or doc updated

## 7. Record
Timeline (UTC), actions, evidence references (commit IDs, lease IDs, audit entries), residual risk, follow-ups with owners.
