---
name: performance-tuning
description: Making Ansible runs faster and safer - forks, SSH pipelining and ControlPersist, fact gathering policy and fact caching, strategies (linear, free), throttle, run_once, interpreter discovery
when-to-use: A run is slow, a fleet is large, or you are choosing ansible.cfg defaults and a strategy
keywords: forks, pipelining, ControlPersist, gathering, smart, explicit, fact_caching, jsonfile, strategy free, throttle, run_once, interpreter_python
priority: medium
related: safe-run-protocol.md, idempotency-handlers-errors.md
---

# Performance Tuning

**Load when:** tuning `ansible.cfg` or diagnosing slow plays. Template: [ansible.cfg](templates/ansible.cfg). Measure first (a callback such as `profile_tasks` is optional; run time of the play before and after); speed settings never replace the safety gates in [safe-run-protocol.md](safe-run-protocol.md).

## Settings that matter

| Setting | Default (docs) | Effect and caveat |
|---------|----------------|-------------------|
| `forks` (`[defaults]`, `-f`, `ANSIBLE_FORKS`) | **5** | hosts processed in parallel; raise to what the control node CPU/RAM and the targets/bastion tolerate (the docs example uses 30). More forks widen blast radius: combine with `serial` for changes |
| `pipelining` (`[connection]` or `[defaults]`, `ANSIBLE_PIPELINING`) | **False** | pipes modules to the remote Python's stdin instead of copying a temp file: fewer SSH operations, "very significant" speed-up. Conflicts with `become` when `requiretty` is set in sudoers (disable `requiretty`); does not work for modules that transfer files (`copy` and similar); disabled if `ANSIBLE_KEEP_REMOTE_FILES` is on. Also removes the temp-file permission problem when becoming an unprivileged user |
| SSH multiplexing | per `ssh_args` | the Molecule docs show `ssh_args = -o ControlMaster=auto -o ControlPersist=60s` under `[ssh_connection]` |
| `gathering` | `implicit` | `implicit`: gather per play unless `gather_facts: false`; `explicit`: only when asked; `smart`: gather once per host per run, reusing the cache plugin. `smart` and `explicit` use the fact cache |
| `gather_facts: false` | per play | skip the `setup` step for plays that do not use `ansible_facts` |
| `strategy` | `linear` | `free` lets each host run to the end of the play independently |
| `interpreter_python` | `auto` | set a fixed path via `ansible_python_interpreter` for hosts where discovery is slow or wrong; `auto_silent` removes the warning |

## Fact caching

```ini
[defaults]
gathering = smart
fact_caching = jsonfile
fact_caching_connection = .cache/facts
fact_caching_timeout = 86400
```

- Fact caching is always on; exactly one cache plugin is active (`ANSIBLE_CACHE_PLUGIN`). Default is `memory` (this run only). `jsonfile` writes one JSON file per host; `fact_caching_timeout` defaults to 86400 s; `fact_caching_connection` is the directory (required for `jsonfile`).
- A playbook must never **require** a cache hit: a miss or a stale entry must not change the outcome. Facts about state that changes (services, packages) go stale; gather fresh facts before decisions that depend on them (`ansible.builtin.setup`).
- Inventory plugins have their own cache (`ANSIBLE_INVENTORY_CACHE_PLUGIN`, `cache_plugin` in the plugin config).
- Cached facts are host data: keep the directory out of the repo and out of shared volumes.

## Strategies and execution keywords

- `linear` (default): each task finishes on all hosts of the batch before the next task starts. `free`: no lockstep; fast, but hosts diverge in time. Use `free` only for stateless, independent tasks; never for rolling restarts where ordering across hosts matters.
- `serial`, `throttle`, `order`, `run_once` are keywords, not strategies:
  - `throttle: N` (task or block) caps workers for a CPU-heavy task or rate-limited API; it can lower, never raise, the limit set by `forks`/`serial`.
  - `run_once: true` runs the task on the first host of the batch and applies the result to all; with `serial` it runs once **per batch**. For once overall use `when: inventory_hostname == ansible_play_hosts_all[0]`. Add `delegate_to` to pick the host.
- `strategy: debug` is for interactive debugging, never for unattended runs.

## Other levers

- Fewer, bigger tasks: use module list arguments (`name: [a, b]`) instead of loops over `package`.
- Prefer `ansible.builtin.template`/`copy` over repeated `lineinfile` edits.
- Async/poll for long tasks (`async`, `poll`) - see the Not verified note.
- For thousands of hosts or many users, move runs to AWX/AAP or an EE-based runner ([ansible-vs-iac-awx.md](ansible-vs-iac-awx.md)).

## Sources (read 2026-11-10)

- https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html (`ANSIBLE_PIPELINING`, `DEFAULT_FORKS`, `DEFAULT_GATHERING`)
- https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_strategies.html
- https://docs.ansible.com/projects/ansible/latest/plugins/cache.html
- https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/jsonfile_cache.html
- https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html (pipelining and become)
- https://docs.ansible.com/projects/ansible/latest/reference_appendices/interpreter_discovery.html
- https://docs.ansible.com/projects/molecule/ansible-native/ (ControlPersist example)

## Not verified

- The `async`/`poll` semantics, `gather_subset`, and the `profile_tasks` callback (not read today).
- `ssh_args` default value (the template does not override it for that reason), `ANSIBLE_SSH_RETRIES`, connection `timeout`.
- Real speed-up figures: none measured; the docs only call pipelining "very significant".
- Whether the `[connection]` section key is honoured by every connection plugin (docs: "each connection plugin can override").
