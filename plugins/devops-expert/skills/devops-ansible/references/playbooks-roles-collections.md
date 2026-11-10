---
name: playbooks-roles-collections
description: Playbook and project layout, role directory structure and reuse (roles, include_role, import_role), collections and FQCN, ansible-galaxy and requirements.yml for roles and collections, signature verification, Jinja2 templating rules
when-to-use: Creating a project, a role or a template; installing or pinning collections; deciding import versus include
keywords: playbook, role, include_role, import_role, collection, FQCN, ansible-galaxy, requirements.yml, template, jinja2, meta/main.yml, defaults, vars
priority: high
related: inventory-variables.md, idempotency-handlers-errors.md, testing-lint-molecule.md
---

# Playbooks, Roles, Collections

**Load when:** creating or restructuring Ansible content. Templates: [role-skeleton](templates/role-skeleton/tasks/main.yml), [requirements.yml](templates/requirements.yml), [ansible.cfg](templates/ansible.cfg).

## Playbook layout

`playbooks/site.yml` only imports tier playbooks; each tier playbook targets a group and applies roles. Keep plays short, named, and free of inline business logic (that belongs in roles).

```yaml
- name: Web tier
  hosts: web
  become: true
  roles:
    - role: example_service
      vars: { example_service_port: 8080 }
```

Order inside a play: `pre_tasks` -> handlers flush -> `roles` -> `tasks` -> `post_tasks`; roles listed in `roles:` run before `tasks:`, and their `meta/main.yml` dependencies run first.

## Role structure (docs, read 2026-11-10)

| Path | Purpose |
|------|---------|
| `tasks/main.yml` | the tasks |
| `handlers/main.yml` | handlers imported into the play |
| `defaults/main.yml` | very low precedence variables (the role's API) |
| `vars/main.yml` | high precedence variables (internal constants) |
| `templates/`, `files/` | Jinja2 templates and static files |
| `meta/main.yml` | dependencies and optional Galaxy metadata (required only to upload a standalone role) |

- Variables from `vars/` and `defaults/` enter play scope unless `public` is disabled on `include_role`/`import_role`.
- `import_role` is static (same behaviour as `roles:`); `include_role` is dynamic (evaluated at run time, in order with other tasks). Tags and `when` on an `include_role` apply to the include itself; use `apply:` or tag the inner tasks to filter inside.
- `tasks_from:` selects another task file, e.g. `include_role: { name: x, tasks_from: apt.yml }`, a clean way to split by OS family.
- Nested directories under `defaults/` and `vars/` are read alphabetically.

## Collections and FQCN

Always write the fully qualified collection name: `ansible.builtin.copy`, `community.general.ufw`. FQCN avoids name clashes and is required by ansible-lint's `production` profile (`fqcn` rule). In playbooks you may also declare a `collections:` search list, but FQCN is clearer.

```bash
ansible-galaxy collection install -r collections/requirements.yml     # pinned install
ansible-galaxy collection install community.general --upgrade          # move to the latest (deliberate)
ansible-galaxy collection list                                        # what is installed, from which path
```

Install path: the first writable entry of the configured collections paths, or `-p ./collections`; the `-p` value must be one of the configured paths or Ansible will not find the collection. Version syntax: `ns.name:==1.0.0`, `'ns.name:>=1.0.0,<2.0.0'`.

**Signature verification** (only for collections from a distribution server that signs): `--keyring <file>` enables GnuPG verification; `--signature <url|file>` adds signatures; `signatures:` key in `requirements.yml`; by default one valid signature suffices (`--required-valid-signature-count`); `--disable-gpg-verify` turns it off (avoid). Git, directory and tarball sources are not signature-verified.

### requirements.yml

```yaml
roles:
  - name: example.role           # galaxy role: exact version; ranges are not supported for roles
    version: "1.9.6"
collections:
  - name: community.general
    version: ">=14.0.0,<15.0.0"
```

The file may `include:` other requirement files in large projects. Install roles with `ansible-galaxy install -r requirements.yml` (roles and collections can share one file under `roles:` / `collections:`). Pin Git sources with a commit hash or tag, never a branch name, in production.

## Jinja2 templating rules

- Templates (`.j2`) go through `ansible.builtin.template`; set `owner`, `group`, `mode`, and use `validate:` for configs that have a syntax checker (`validate: nginx -t -c %s` style) so a bad file never replaces a good one; `backup: true` keeps the previous copy.
- A value starting with `{{` must be quoted in YAML: `dest: "{{ app_dir }}/conf"`.
- No `{{ }}` inside `when:`, `changed_when:`, `failed_when:` (these are already expressions; ansible-lint flags `no-jinja-when`).
- Use filters (`default`, `combine`, `join`, `bool`) instead of shell post-processing; give every optional variable a `default()` or a role default.
- Secrets in templates: set `no_log: true` on the task and `diff: false` so check/diff mode does not print them.

## Project hygiene

- `ansible.cfg` in the project root sets `inventory`, `roles_path`, collections path, forks, pipelining ([performance-tuning.md](performance-tuning.md)).
- One reusable role per concern; environment differences live in inventory vars, not in `when:` ladders inside roles.
- Document each role's `defaults/main.yml` variables with comments; they are the role's public interface.
- Run `ansible-lint` and `ansible-playbook --syntax-check` in CI ([testing-lint-molecule.md](testing-lint-molecule.md)).

## Sources (read 2026-11-10)

- https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_using_playbooks.html
- https://docs.ansible.com/projects/ansible/latest/galaxy/user_guide.html
- https://docs.ansible.com/projects/lint/profiles/ (fqcn and no-jinja-when rules)
- https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html (`collections_path`, `roles_path`, config file search order)

## Not verified

- `template` options `validate` and `backup` and the `apply:` keyword of `include_role` (standard documented options, not re-read on their module pages today).
- Config-page defaults were read from the docs build "latest" (2.21 line): `collections_path` (ini key, `[defaults]`) defaults to `~/.ansible/collections:/usr/share/ansible/collections` and `roles_path` to `~/.ansible/roles:/usr/share/ansible/roles:/etc/ansible/roles`; confirm with `ansible-config dump` on 2.22.
- Role dependencies syntax in `meta/main.yml` beyond the sentence that dependencies run first.
- Whether `meta/argument_specs.yml` validation exists/behaves as expected in 2.22 (not read).
