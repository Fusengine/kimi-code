---
name: api-token-least-privilege
description: pveum sequence for a least-privilege automation user, custom role, resource pool, privilege-separated API token with expiry, and its verification
keywords: pveum, role add, pool add, acl modify, user token add, privsep, expire, PVEAPIToken, token permissions
---

# Template: Least-Privilege API Token

## Usage

For automation (CI, IaC provider, provisioning scripts) that creates and manages VMs inside one resource pool. Commands and flags from https://pve.proxmox.com/pve-docs/pveum.1.html (docs 9.2.13). Privilege names from the same page. Trim the privilege list to what the tool actually calls (each API method lists its required permissions in https://pve.proxmox.com/pve-docs/api-viewer/).

## Variables

```bash
USER=automation@pve
TOKEN=ci
ROLE=CI_Provision            # custom roles must not start with "PVE"
POOL=ci-pool
STORE=local-lvm              # storage the automation may allocate on
TPL=9000                     # template VMID it may clone
EXPIRE=$(date -d "+90 days" +%s)
```

## Sequence

```bash
pveum user add $USER --comment "CI provisioning (no password login needed)"
pveum role add $ROLE --privs "VM.Allocate VM.Clone VM.Audit VM.PowerMgmt VM.Config.Disk VM.Config.CPU VM.Config.Memory VM.Config.Network VM.Config.Cloudinit VM.Config.Options Datastore.AllocateSpace Datastore.Audit"
pveum pool add $POOL --comment "Guests owned by CI"

# user grants (a privsep token can never exceed its user)
pveum acl modify /pool/$POOL     --users $USER --roles $ROLE
pveum acl modify /storage/$STORE --users $USER --roles PVEDatastoreUser
pveum acl modify /vms/$TPL       --users $USER --roles PVETemplateUser

# token: privilege-separated (default), expiring
pveum user token add $USER $TOKEN --privsep 1 --expire $EXPIRE --comment "CI pipeline"
#   -> prints the secret ONCE: store it in the secret manager, never in the repo or CI logs

# token grants (same paths, possibly narrower roles)
pveum acl modify /pool/$POOL     --tokens "$USER!$TOKEN" --roles $ROLE
pveum acl modify /storage/$STORE --tokens "$USER!$TOKEN" --roles PVEDatastoreUser
pveum acl modify /vms/$TPL       --tokens "$USER!$TOKEN" --roles PVETemplateUser
```

Network bridge or SDN VNet access needs `SDN.Use` ("access SDN vnets and local network bridges"); grant it on the matching SDN path once confirmed (see Not verified).

## Use

```bash
curl -fsS -H "Authorization: PVEAPIToken=$USER!$TOKEN=<secret>" \
  https://<node>:8006/api2/json/pools/$POOL
```

## Verification

```bash
pveum user token permissions $USER $TOKEN                 # effective rights tree
pveum user token permissions $USER $TOKEN --path /pool/$POOL
pveum acl list | grep -E "$USER|$TOKEN"
```

Negative test: the same token must get HTTP 403 on a path outside the grants (for example `GET /api2/json/nodes/<node>/qemu/<vmid-outside-pool>/config`).

## Rotation and revocation

```bash
pveum user token modify $USER $TOKEN --regenerate 1       # 9.2: new secret, ACLs kept; old secret dies now
pveum user token delete $USER $TOKEN                      # revoke (propose first: automation breaks)
```

## Not verified

- The exact ACL path for `SDN.Use` on local bridges: the API schema accepts zone `localnetwork` and SDN paths of the form `/sdn/zones/{zone}/{vnet}`, but no documented example ties them together; check `pveum user token permissions` after granting and test a clone with a NIC on the bridge.
- The minimal privilege set of any specific third-party tool (Terraform/OpenTofu provider, Ansible modules): read the tool's docs; this role is a starting point.
- `date -d` is GNU date syntax (Debian node), not valid on macOS.
