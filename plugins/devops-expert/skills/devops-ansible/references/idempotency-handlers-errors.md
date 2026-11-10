---
name: idempotency-handlers-errors
description: Writing idempotent tasks, changed_when and failed_when, handlers (notify, listen, flush_handlers, force_handlers), block/rescue/always, ignore_errors versus ignore_unreachable, any_errors_fatal, tags
when-to-use: Writing tasks that use command/shell, designing restart-on-change, handling failures in a play, using tags
keywords: idempotent, changed_when, failed_when, handler, notify, listen, flush_handlers, force_handlers, block, rescue, always, ignore_errors, any_errors_fatal, tags
priority: high
related: safe-run-protocol.md, testing-lint-molecule.md, playbooks-roles-collections.md
---

# Idempotency, Handlers, Error Handling

**Load when:** a task uses `command`/`shell`/`raw`, a service must restart when config changes, or a failure path must be designed. Template: [site-rolling-update.yml](templates/site-rolling-update.yml).

## Idempotency contract

A play is idempotent when a second run reports `changed=0`. Molecule checks exactly this (`idempotence` step, [testing-lint-molecule.md](testing-lint-molecule.md)).

1. Prefer a native module (`ansible.builtin.package`, `template`, `service`, `lineinfile`, `file`, `user`, ...) over `command`/`shell`; the module compares state and reports `changed` correctly. ansible-lint (`command-instead-of-module`, `command-instead-of-shell`) flags the rest.
2. If `command`/`shell` is unavoidable, make it guarded and honest:
   ```yaml
   - name: Initialise the application database once
     ansible.builtin.command: /opt/app/bin/initdb
     args:
       creates: /var/lib/app/.initdb-done      # skipped when the file exists
     register: initdb
     changed_when: "'initialised' in initdb.stdout"
   ```
   `creates`/`removes` are `command` options; `changed_when` decides what counts as a change and therefore whether handlers fire. Rule `no-changed-when` is in the lint `shared` profile.
3. `state: present` for packages in production. `state: latest` (lint rule `package-latest`, `safety` profile) makes every run a potential upgrade.
4. File modes as strings (`"0640"`), explicit `owner`/`group` (`risky-file-permissions`, `risky-octal`).

## changed_when and failed_when

```yaml
- name: Check pending migrations
  ansible.builtin.command: /opt/app/bin/migrate --plan
  register: plan
  changed_when: false                       # read-only command never "changes"
  failed_when: plan.rc not in [0, 3]        # rc 3 = nothing to do (example)
```

- Both take expressions, not `{{ }}`. A **list** of `failed_when` conditions is joined with `and` (all must be true); use one string with `or` for "any".
- `changed_when: false` on every read-only probe keeps recaps honest.

## Handlers

- A handler runs once, at the end of the play section (`pre_tasks`, `roles`/`tasks`, `post_tasks`), even if notified many times, and only when a notifying task reported `changed`.
- `listen:` lets several handlers subscribe to one topic ("restart web services"); `listen` topics cannot contain templates.
- `ansible.builtin.meta: flush_handlers` runs notified handlers now - use it before a verification task that depends on the restart.
- **If a later task fails, handlers notified earlier do not run on that host** by default; the config is changed but the service is not restarted. Fix with `force_handlers: true` (play), `--force-handlers`, or `force_handlers = True` in `ansible.cfg`; or run `flush_handlers` from a `rescue` section. Unreachable hosts still cannot run handlers.
- ansible-lint rule `no-handler` flags tasks gated on `when: x.changed` that should be handlers.

## Failure handling

| Tool | Does | Careful |
|------|------|---------|
| `ignore_errors: true` | continue after a *failed* task | does not cover undefined variables, connection failures, syntax errors; hides real faults (lint `ignore-errors` in `shared` profile) |
| `ignore_unreachable: true` | continue after UNREACHABLE | the host stays in the play for later tasks |
| `meta: clear_host_errors` | re-activate hosts marked unreachable | |
| `failed_when` | redefine failure | preferred to `ignore_errors` |
| `any_errors_fatal: true` | one failure stops the play on all hosts, after finishing that task in the current batch | play or block level; recoverable with `rescue` |
| `max_fail_percentage: N` | abort when MORE than N% of a batch fail | per `serial` batch; "exceeded, not equaled" (serial 4, stop at 2 failures -> 49) |

### block / rescue / always

```yaml
- name: Upgrade with rollback path
  block:
    - ansible.builtin.include_role: { name: example_service, tasks_from: upgrade.yml }
  rescue:
    - name: Restore the previous config and restart
      ansible.builtin.include_role: { name: example_service, tasks_from: rollback.yml }
    - name: Keep the host marked failed so the batch gate sees it
      ansible.builtin.fail:
        msg: "upgrade failed on {{ inventory_hostname }}, rolled back"
  always:
    - name: Record the outcome
      ansible.builtin.debug:
        msg: "finished {{ inventory_hostname }}"
```

- `rescue` runs only after a **failed** task in the block; invalid task definitions and unreachable hosts trigger neither `rescue` nor `always`.
- If `rescue` succeeds, Ansible reverts the failed status: the host counts as fine and does **not** count toward `max_fail_percentage` / `any_errors_fatal`, though the recap still shows a failure. End `rescue` with `ansible.builtin.fail` when the batch gate must still trip.
- Tags: selection by `--tags` supersedes block logic; a tagged task in `block` without the tag on `rescue`/`always` leaves those out.

## Tags

`--tags`, `--skip-tags`, `--list-tags`. Reserved: `always` (runs unless explicitly skipped), `never` (runs only when named), `tagged`, `untagged`, `all`. A tag on `include_role`/`include_tasks` applies to the include only, not the inner tasks; tag the inner tasks or use `apply:`. Tags narrow *which tasks* run; they are not an authorization boundary: state them in every ACTION block ([safe-run-protocol.md](safe-run-protocol.md)).

## Sources (read 2026-11-10)

- https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html
- https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_blocks.html
- https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html
- https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tags.html
- https://docs.ansible.com/projects/lint/profiles/

## Not verified

- `command` options `creates`/`removes` and the `fail` module `msg` option (standard, not re-read on their module pages today).
- Exact handler execution points with `import_role`/`include_role` handlers in 2.22.
- Behaviour of `ignore_unreachable` combined with `serial` and `max_fail_percentage`.
