---
name: inventory-variables
description: Static and dynamic inventory, groups and ranges, multiple sources, group_vars and host_vars, the 22-level variable precedence list and the rules for where to put a variable
when-to-use: Writing or reviewing an inventory, debugging "why does this variable have that value", splitting environments
keywords: inventory, yaml, ini, group_vars, host_vars, children, ungrouped, range, dynamic inventory, keyed_groups, precedence, extra vars, hash_behaviour
priority: high
related: playbooks-roles-collections.md, vault-secrets.md, safe-run-protocol.md
---

# Inventory and Variables

**Load when:** touching inventory files, `group_vars/`, `host_vars/`, or a variable that "has the wrong value". Template: [inventory.yml](templates/inventory.yml).

## Inventory formats

INI and YAML are built in; any inventory plugin can add formats and sources (cloud APIs, Proxmox, OpenStack). Two groups always exist: `all` (every host) and `ungrouped` (hosts with no other group).

```yaml
# inventories/production/hosts.yml
all:
  children:
    web:
      hosts:
        web[01:03].example.net:        # numeric range; stride: web[01:09:2]
    db:
      hosts:
        db01.example.net:
          ansible_host: 10.0.20.11
  vars:
    ansible_user: deploy
```

- Child groups are declared with `children:` (YAML) or the `:children` suffix (INI). A host or group defined twice is the same entity.
- Several sources can be passed at once (`-i a.yml -i b.yml`), or put in a directory; mixed static and dynamic files in one directory are merged. Within one directory, files load in order, so later files win on conflicting group variables - name files with numeric prefixes (`01-openstack.yml`, `03-static`).
- Prefer **one inventory directory per environment** (`inventories/production`, `inventories/staging`) so variables of one environment cannot leak into another.

## Dynamic inventory

Use **inventory plugins** (maintained path); inventory scripts still work through the `script` plugin. A plugin is configured by a small YAML file:

```yaml
# inventory/dynamic.yml (example from the Molecule docs; collection amazon.aws must be installed)
plugin: amazon.aws.aws_ec2
regions:
  - us-east-1
filters:
  "tag:Environment": "test"
keyed_groups:
  - key: tags.Name
    prefix: tag
```

For Proxmox use `community.proxmox` and for OpenStack `openstack.cloud` inventory plugins; their option names come from `ansible-doc -t inventory <fqcn>` for the installed version (not read here). Verify with `ansible-inventory -i <src> --graph` before running any play against the result. Caching of inventory plugins is configured separately ([performance-tuning.md](performance-tuning.md)).

## group_vars and host_vars

```
inventories/production/
├── hosts.yml
├── group_vars/
│   ├── all.yml          # or all/ directory: main.yml + vault.yml
│   └── web.yml
└── host_vars/
    └── db01.example.net.yml
```

- Child groups override parent groups; host variables override group variables. If two groups at the same level set the same variable, the last one loaded wins.
- A variables file can be a directory: Ansible reads every file in it alphabetically. Use `group_vars/all/main.yml` plus `group_vars/all/vault.yml` ([vault-secrets.md](vault-secrets.md)).
- Hash variables are **replaced**, not merged, by default (`hash_behaviour=replace`); switching to `merge` is a global behaviour change - avoid it, use `combine` filters explicitly.

## Variable precedence (least to greatest, docs list read 2026-11-10)

1. Command-line values (for example `-u my_user`; not variables)
2. Role defaults (`defaults/main.yml`)
3. Inventory file or script group vars
4. Inventory `group_vars/all`
5. Playbook `group_vars/all`
6. Inventory `group_vars/*`
7. Playbook `group_vars/*`
8. Inventory file or script host vars
9. Inventory `host_vars/*`
10. Playbook `host_vars/*`
11. Host facts and cached `set_fact`
12. Play `vars`
13. Play `vars_prompt`
14. Play `vars_files`
15. Role `vars` (`vars/main.yml`)
16. Block vars
17. Task vars
18. `include_vars`
19. Registered vars and `set_fact`
20. Role (and `include_role`) params
21. `include` params
22. Extra vars (`-e`) - always win

Consequences:
- Put tunable defaults in **role defaults**; a role that must not be overridden uses `vars/main.yml`.
- Put geography and behaviour (region, environment, endpoints) in inventory group vars; map roles to hosts with groups.
- `-e` beats everything, including `set_fact`: never use it for routine configuration, only for one-off overrides that you will state in the report.
- `ansible_user` set as a host var overrides `ansible_ssh_user` set as a group var.
- When a value surprises you: `ansible -i <inv> <host> -m ansible.builtin.debug -a 'var=the_var'` shows the final value for that host; `ansible-inventory -i <inv> --host <host>` shows inventory-level vars only (command names not re-read today).

## Naming

Prefix role variables with the role name (`nginx_worker_processes`) so they cannot collide across roles; ansible-lint enforces `var_naming_pattern` (default `^[a-z_][a-z0-9_]*$`) and can check loop variable prefixes ([testing-lint-molecule.md](testing-lint-molecule.md)).

## Sources (read 2026-11-10)

- https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_dynamic_inventory.html
- https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- https://docs.ansible.com/projects/molecule/ansible-native/ (dynamic plugin example)

## Not verified

- `ansible-inventory --graph/--host` and `ansible -m debug` flags (standard CLI, not re-read on a docs page today).
- Required file name suffix for plugin config files (some plugins demand names such as `*.aws_ec2.yml`): check the plugin page.
- Option names of the Proxmox and OpenStack inventory plugins.
- INI-format syntax details beyond `:children` and ranges.
