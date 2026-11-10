---
name: backup-restore-api
description: OPNsense configuration backup and restore, REST API usage and automation (Ansible collection, Terraform provider)
when-to-use: Backing up, restoring, scripting or automating an OPNsense firewall
keywords: config.xml, history, API key secret, basic auth, reconfigure, oxlorg.opnsense, terraform-provider-opnsense
priority: high
related: safe-opnsense-changes.md, upgrade-rollback.md
---

# Backup, Restore, API, Automation

## Backup and restore (backups.html)
- System > Configuration > Backups: download (optional password, optional RRD data), restore complete or partial. Prefer a complete restore; partial restores "can lead to unexpected behavior".
- Restore on another machine with different NIC names: no automatic reboot, you are prompted to fix interface assignments. Console settings of the backup are NOT applied unless you untick "Exclude console settings from import".
- Defaults tool = factory reset then shutdown.
- History: each saved config is kept (count is configurable), diffs in unified format, revert per entry restarts no service (reboot may be needed).
- Restore/reset = lock-out format in safe-opnsense-changes.md. Store backups off-box, encrypted (`devops-secrets`, `devops-storage-backup`). Backup plugins (Git, Nextcloud, etc.): not verified.
- The live config file is `/conf/config.xml` (path not re-read today). Template: templates/config-backup.sh.

## REST API (development/api.html)
- URL: `https://<host>/api/<module>/<controller>/<command>/[<param1>/...]`. `GET` reads; `POST` creates, updates or executes; body and response are `application/json`.
- Auth: HTTP basic auth with API key as username and secret as password (curl `-u "$key:$secret"`). Create the key on a dedicated user with the minimum effective privileges (the key owner's ACL decides what is reachable).
- Find parameters by watching the GUI: it uses the same `/api/` calls (e.g. POST `core/service/search` with `{"current":1,"rowCount":7,"sort":{},"searchPhrase":""}`).
- Firewall aliases: controller `firewall/alias` offers `add_item`, `del_item`, `get_item`, `search_item`, `import`, `export`, `reconfigure` (core firewall API page).
- Pattern: read first (GET/search) -> write (POST add/set) -> apply (aliases and groups: POST `firewall/alias/reconfigure` or `firewall/group/reconfigure`; filter rules: POST `firewall/filter/apply`) -> read back. A write without the apply step stays unapplied. The apply step for interfaces is not verified; apply on interfaces/firewall is lock-out class and the API offers no automatic rollback.
- Templates: templates/api-calls.sh (credentials from environment variables only).

## Automation
| Route | Maintainer / state | Notes |
|-------|--------------------|-------|
| Ansible collection `oxlorg.opnsense` | O-X-L (repo github.com/O-X-L/ansible-opnsense; formerly ansibleguy) - third party, not OPNsense project | Uses the API via python `httpx` or `requests`; install `ansible-galaxy collection install oxlorg.opnsense`; module list not read |
| Terraform/OpenTofu provider `browningluke/opnsense` | Third party (browningluke); README: under active development, schemas break until v1.0, "not recommended ... in production"; README shows `~> 0.16` | Credentials via `OPNSENSE_API_KEY` / `OPNSENSE_API_SECRET`; uses core API; example resource `opnsense_firewall_filter` |
Treat both as pre-production helpers; apply with plan/check mode first (`devops-iac`, `devops-ansible`). Templates: templates/opentofu-opnsense.tf, templates/requirements.yml.

## Not verified
- Apply endpoints other than alias reconfigure; API key creation menu path; Ansible module names; Terraform provider latest version; backup plugins.

## Sources
- https://docs.opnsense.org/manual/backups.html (2026-11-10)
- https://docs.opnsense.org/development/api.html (2026-11-10)
- https://docs.opnsense.org/development/api/core/firewall.html (2026-11-10)
- https://github.com/O-X-L/ansible-opnsense (2026-11-10)
- https://github.com/browningluke/terraform-provider-opnsense (2026-11-10)
