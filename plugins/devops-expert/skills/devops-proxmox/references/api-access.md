---
name: api-access
description: Proxmox VE API automation and access control - pvesh, REST over 8006, pveum users/groups/roles/ACLs, privilege-separated API tokens, pools
when-to-use: Automating PVE (scripts, Terraform/Ansible credentials, monitoring), creating users or tokens, or auditing who can do what
keywords: pvesh, api2/json, PVEAPIToken, pveum, acl modify, role add, privsep, token, PVEAuditor, PVEVMAdmin, /vms, /pool, Permissions.Modify
priority: high
related: guests-qm-pct.md, backup-pbs.md
---

# API, `pvesh` and `pveum`

**Load when:** something must call the API (automation, IaC provider, monitoring exporter), a user/token/role is created, or permissions are audited. The Terraform/OpenTofu provider side belongs to skill `devops-iac`; secret storage of the token to `devops-secrets`.

Sources: https://pve.proxmox.com/pve-docs/pvesh.1.html , https://pve.proxmox.com/pve-docs/pveum.1.html , https://pve.proxmox.com/pve-docs/api-viewer/ (9.2.13).

## Three ways in, one API

All PVE CLI tools wrap the same REST API (JSON schema). `pvesh` calls it locally **without** the HTTPS server and only as root:

| pvesh | HTTP | Example |
|-------|------|---------|
| `pvesh get <path>` | GET | `pvesh get /nodes --output-format json` |
| `pvesh create <path>` | POST | `pvesh create /cluster/backup ...` |
| `pvesh set <path>` | PUT | `pvesh set /cluster/sdn` |
| `pvesh delete <path>` | DELETE | |
| `pvesh usage <path> -v` | schema | `pvesh usage cluster/options -v` |

Output: `--output-format json|json-pretty|text|yaml`, `--noborder`, `--noheader`, `--quiet`. Remote clients use `https://<node>:8006/api2/json/<path>`. Console endpoints (VNC/terminal) refuse API tokens and need user privileges.

## Least-privilege model

| Concept | Rule |
|---------|------|
| User | `name@realm` (`pam`, `pve`, LDAP/AD, OpenID). `root@pam` is unconfined: never hand its password to automation |
| Group | Grant to groups, not users |
| Role | A set of privileges; built-ins start with `PVE` (prefix reserved). Examples: `PVEAuditor` (read-only), `PVEVMUser`, `PVEVMAdmin`, `PVEDatastoreUser`, `PVESDNUser`, `PVETemplateUser` |
| ACL path | `/`, `/vms`, `/vms/{vmid}`, `/storage/{storeid}`, `/pool/{poolname}`, `/nodes/{node}`, `/access/groups`, `/access/realms/{realmid}` |
| Inheritance | `--propagate 1` default; deeper paths replace inherited ones; user permissions replace group ones; `NoAccess` cancels all |
| Token, privsep=1 (default) | Effective rights = intersection of the user's and the token's own ACLs |
| Token, privsep=0 | Same rights as the user: avoid unless the integration truly needs them |

Dangerous privileges to grant only deliberately: `Permissions.Modify`, `Sys.Modify`, `Sys.Console`, `VM.GuestAgent.Unrestricted`, `Datastore.Allocate`.

## Create a scoped automation identity

```bash
pveum user add automation@pve --comment "CI provisioning"
pveum role add CI_Provision --privs "VM.Allocate VM.Clone VM.Config.Disk VM.Config.CPU VM.Config.Memory VM.Config.Network VM.Config.Cloudinit VM.Config.Options VM.PowerMgmt VM.Audit Datastore.AllocateSpace Datastore.Audit"
pveum pool add ci-pool --comment "CI guests"
pveum acl modify /pool/ci-pool --users automation@pve --roles CI_Provision
pveum user token add automation@pve ci --privsep 1 --expire <epoch-seconds>
pveum acl modify /pool/ci-pool --tokens 'automation@pve!ci' --roles CI_Provision
pveum user token permissions automation@pve ci     # effective rights: verify, do not assume
```

The token secret is shown **once**. HTTP header: `Authorization: PVEAPIToken=automation@pve!ci=<uuid>`. Rotation without losing ACLs (9.2): `pveum user token modify automation@pve ci --regenerate 1` - every consumer of the old secret loses access immediately. A complete version with storage/bridge ACLs is in [templates/api-token-least-privilege.md](templates/api-token-least-privilege.md).

Which privileges an endpoint needs is listed per method in the API viewer (`["perm", <path>, [privs]]`).

## Destructive operations (propose, then the user's go)

| Command | Effect |
|---------|--------|
| `pveum user token delete <user> <tokenid>` | Revokes the token; automation using it fails at once |
| `pveum user delete <userid>` | Removes the user (its tokens stop working) |
| `pveum acl delete <path> --roles <r> --users/--groups/--tokens ...` | Removes the grant |
| `pveum acl modify / ... --roles Administrator` | Not destructive but cluster-wide full power: refuse without explicit owner request |

## Verification

```bash
pveum user permissions <userid>
pveum user token permissions <userid> <tokenid> --path /pool/ci-pool
curl -fsS -H "Authorization: PVEAPIToken=<user>!<id>=<secret>" https://<node>:8006/api2/json/version
```

A call outside the granted path must return 403.

## Pitfalls

- Tokens without `--expire`: abandoned automation keeps working (the docs recommend setting an expiry).
- Granting on `/` because "it works": use a pool or `/vms/{vmid}` and `/storage/{id}`.
- 9.0 removed `VM.Monitor` and added `VM.Replicate`; 9.2 requires `VM.PowerMgmt` to start a VM after create/restore/rollback in custom roles (https://pve.proxmox.com/wiki/Roadmap). Re-check custom roles after upgrades.
- Printing the token secret in logs or CI output: treat it as a password.

## Not verified

- The exact privilege set each third-party tool needs (Terraform/OpenTofu providers, exporters): read that tool's documentation; the role above is a starting point, not a verified minimum.
