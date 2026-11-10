---
name: safe-run-protocol
description: How to run Ansible against real hosts - read-only discovery, syntax check, check and diff mode, --limit, canary, serial batches with max_fail_percentage, privilege escalation, and the catalogue of destructive plays and commands in ACTION / EFFECT / PROOF / WAIT-FOR-GO format
when-to-use: Before ANY ansible-playbook or ad-hoc command that is not purely read-only, and whenever state absent, reboot, a service stop/restart, a package removal or a wide become run is on the table
keywords: check mode, diff, limit, canary, serial, max_fail_percentage, become, reboot, state absent, extra vars, step, start-at-task, wait-for-go
priority: critical
related: idempotency-handlers-errors.md, vault-secrets.md, performance-tuning.md
---

# Safe Run Protocol

**Load when:** the agent is about to execute Ansible against anything real. Same pipeline as the rest of the plugin (discovery, dry run, one go, apply, verify, rollback). Template: [site-rolling-update.yml](templates/site-rolling-update.yml).

## Phase A - read-only discovery (changes nothing)

```bash
ansible --version                                           # core version, config file, python
ansible-galaxy collection list                              # installed collection versions
ansible-config dump --only-changed                          # effective non-default settings
ansible-inventory -i inventories/production --graph         # which hosts/groups the run can touch
ansible-playbook -i inventories/production playbooks/site.yml --syntax-check
ansible-lint                                                # when installed
ansible -i inventories/production web --limit web01 -m ansible.builtin.ping   # connectivity only
```

Stop and report instead of running when: the inventory resolves to more hosts than the request names, the target environment is ambiguous, the playbook has no `name:`d plays, `ansible-lint` reports `syntax-check`/`load-failure`, or a vault password is needed and not provided by the user.

## Phase B - prediction: check mode and diff mode

```bash
ansible-playbook -i inventories/production playbooks/site.yml --check --diff --limit web01
```

- `--check` runs modules in prediction mode; modules without check-mode support do not run and report nothing. **A clean check is not a guarantee** (later tasks may depend on earlier changes that did not happen, e.g. a package install a template needs).
- Per task: `check_mode: false` forces a real execution even under `--check` (use only for read-only probes); `check_mode: true` forces prediction. Guard with `when: not ansible_check_mode` or `ignore_errors: "{{ ansible_check_mode }}"` for tasks that cannot predict.
- `--diff` shows before/after for modules that support it (files, templates); it is large, so use it with `--limit` on one host. It can reveal secrets: set `diff: false` on such tasks.
- Show the user the changed-task list from the check output, not a summary of what you hope happens.

## Phase C - the user's go

One go covers one ACTION block: playbook, inventory, `--limit`, tags, extra vars, become scope, batch settings. Anything added later (another group, `--tags`, `-e`) gets a new block.

## Phase D - run: canary, then batches

1. **Canary**: `--limit <one host>` of the tier, then verify (Phase E).
2. **Batches** in the play: `serial: [1, 5, 10]` and `max_fail_percentage: 30` (a failure count must *exceed* the percentage of the batch to abort). `serial` limits the scope of failures to the batch.
3. `strategy: free` and large `forks` are for stateless fan-out only ([performance-tuning.md](performance-tuning.md)).
4. Snapshot or backup stateful targets first (VM snapshot via devops-proxmox/devops-openstack, database dump); a backup counts only once its existence is checked.
5. Keep `--limit` explicit even when the playbook names a group: the CLI limit is an intersection, never a widening.

## Phase E - verify, or roll back

Re-run the read-only checks plus the service-level probe (port open, endpoint status, replication state). Idempotence check: a second `--check --diff` on the changed hosts shows `changed=0`. Any failed check: stop, roll back to the last good state (snapshot, previous template via `backup: true`, previous role version), never stack a second fix on a broken host.

## Destructive and wide-impact operations

| Operation | Exact effect | Precondition before proposing |
|-----------|--------------|-------------------------------|
| `ansible-playbook` against an inventory group in production | Applies every non-skipped task to every host matched by both `hosts:` and `--limit`, up to `forks` hosts at once | Check + diff reviewed, canary done, backup, rollback path |
| Any task with `state: absent` (package, user, file, directory, mount, VM, volume, DNS record) | Removes the object; for `file` with a directory, its whole tree; for `user`, optionally its home (`remove`) | List what matches first with a read-only task; data backed up; dependents known |
| `ansible.builtin.reboot` | Reboots the host and waits for it to return; services stop, sessions drop, a host that does not come back fails the batch | Maintenance window, `serial: 1`, out-of-band console, redundancy for the tier |
| `ansible.builtin.service`/`systemd` `state: stopped` or `restarted` | Interrupts the service; connections drop | Load balancer drain, `serial`, health check after |
| `become` on a whole inventory (`-b` or `become: true` at play level) | Every task runs as root (or `become_user`) | Task list reviewed; least privilege for tasks that do not need root; `become` password never in the repo |
| `ansible.builtin.shell`/`command` with `rm`, `dd`, `mkfs`, `iptables -F`, `systemctl isolate` | Whatever the string does, on every host, with no state check | Prefer a module; show the exact line; run on one host |
| `-e` extra vars | Overrides every other variable source (level 22) | State every `-e` in the ACTION block |
| `--start-at-task`, `--step`, `--tags` | Skips tasks that set up what later tasks assume | Review the skipped part; never on production for the first run |
| `ansible-galaxy install --force` / `collection install --upgrade` | Replaces installed role/collection versions on the control node | Pin first; test in staging |
| `ansible-vault rekey` / `decrypt` | Changes key / writes plaintext secrets to disk | See [vault-secrets.md](vault-secrets.md) |
| `strategy: free`, `forks` raised | Hosts proceed independently and in parallel; ordering across hosts is lost | Stateless tier only |

### Proposal format (one block per action)

```
ACTION   ansible-playbook -i inventories/production playbooks/site.yml --limit web01 --tags config
         (become: true at play level; extra vars: none; vault id: prod@prompt)
EFFECT   templates /etc/example/service.conf on web01 (diff attached), notifies handler "restart example"
         -> service restarts once, ~5 s of dropped connections on web01 only
BLAST    1 host of 6 in group web; LB drains web01 in pre_tasks
PROOF    --check --diff output attached (1 changed task); ansible-lint clean; backup=true keeps the old file
WAIT-FOR-GO
```

```
ACTION   ansible-playbook -i inventories/production playbooks/decommission.yml --limit old-db02
         (task: ansible.builtin.package name=postgresql* state=absent; file /var/lib/postgresql state=absent)
EFFECT   uninstalls PostgreSQL and DELETES /var/lib/postgresql on old-db02: data unrecoverable without backup
BLAST    1 host; replica of db01 (replication slot must be dropped first)
PROOF    backup id and restore test logged; `pg_stat_replication` shows old-db02 detached; --check output attached
WAIT-FOR-GO
```

```
ACTION   ansible-playbook -i inventories/production playbooks/kernel.yml --limit web[01:06] (serial: 1, reboot task)
EFFECT   each host in turn reboots; ~90 s unavailable per host; batch aborts if more than 30% fail
BLAST    6 hosts, one at a time; the tier keeps 5 of 6 serving
PROOF    console access confirmed; --check run clean; rollback = boot previous kernel entry
WAIT-FOR-GO
```

## Sources (read 2026-11-10)

- https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_strategies.html
- https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html
- https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html (extra vars precedence)
- Context7 `/websites/ansible_projects_ansible` cross-check of `--check --diff --limit`, `serial` lists and `max_fail_percentage`

## Not verified

- `ansible-config dump --only-changed`, `ansible-inventory --graph` and `--list-hosts`/`--list-tasks` flags (standard CLI, not on a page read today).
- Effects of `ansible.builtin.reboot`, `file state: absent` and `user remove` (module pages not re-read today); confirm with `ansible-doc <fqcn>`.
- Which modules of the installed collections support check mode: `ansible-doc <fqcn>` lists `check_mode` support per module.
- Whether `--limit` can ever widen the target set (documented behaviour is an intersection with the play's `hosts:`; verify with `--list-hosts` before the run).
