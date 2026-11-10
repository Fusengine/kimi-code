# Release model, SLURP and upgrade paths

## Why it matters

OpenStack ships two coordinated releases a year (spring `YYYY.1`, autumn
`YYYY.2`). Upgrades are only tested along specific paths; leaving them means
running untested schema migrations on production data.

## Series status on 2026-11-10

Source: https://releases.openstack.org/ and
https://raw.githubusercontent.com/openstack/releases/master/data/series_status.yaml

| Series | Name | SLURP | Status | Released | Next phase |
|--------|------|-------|--------|----------|------------|
| 2027.1 | Indri | yes | development | planned 2027-03-24 | maintained 2027-03-24 |
| **2026.2** | **Hibiscus** | no | **maintained (current)** | 2026-09-30 | end of life, estimated 2028-04-26 |
| 2026.1 | Gazpacho | **yes** | maintained | 2026-04-01 | unmaintained, estimated 2027-10-27 |
| 2025.2 | Flamingo | no | maintained | 2025-10-01 | end of life, estimated 2027-04-28 |
| 2025.1 | Epoxy | yes | unmaintained | 2025-04-02 | end of life TBD |
| 2024.2 | Dalmatian | no | end of life (2026-04-29) | 2024-10-02 | - |

Deployment tools for those series (deliverable files in
https://opendev.org/openstack/releases/src/branch/master/deliverables, read 2026-11-10):

| Tool | 2026.2 Hibiscus | 2026.1 Gazpacho |
|------|-----------------|-----------------|
| Kolla-Ansible | 23.0.0 (branch `stable/2026.2`) | 22.2.0 |
| OpenStack-Ansible | **not released yet** (trailing deliverable, no version in the file) | 33.1.0 |
| OpenStack-Helm | tag 2026.2.0 (versions follow the series) | tag 2026.1.0 |
| python-openstackclient | 10.3.1 | 9.0.1 |

Kolla-Ansible and OpenStack-Ansible are "trailing" deliverables: they ship
weeks after the coordinated release. On 2026-11-10 an OpenStack-Ansible shop
cannot be on 2026.2 yet.

## SLURP: what is actually guaranteed

From the TC resolution
https://governance.openstack.org/tc/resolutions/20220210-release-cadence-adjustment.html:

- Every other release is a **SLURP** (Skip Level Upgrade Release Process) release; currently the `.1` releases (2025.1, 2026.1, 2027.1).
- Upgrades are tested between **adjacent** releases and between **two consecutive SLURP** releases.
- **Non-SLURP → non-SLURP is not tested**; from a non-SLURP release the only path is the next release (a SLURP).
- Jumping more than one SLURP cycle (SLURP A → SLURP E) still needs the intermediate SLURP (C) as a step.
- Deprecations and removals happen only in SLURP releases, so a skipped non-SLURP release never carries a required change - but read its release notes anyway (OpenStack-Ansible asks for it explicitly).
- The community supports the latest SLURP and the one before it.

## Decision rules

| You run | Want yearly upgrades | Want every release |
|---------|----------------------|--------------------|
| 2025.1 Epoxy (unmaintained) | → 2026.1 Gazpacho (skip-level) now | → 2025.2 → 2026.1 → 2026.2 |
| 2025.2 Flamingo | → 2026.1 Gazpacho (adjacent), then 2027.1 | → 2026.1 → 2026.2 |
| 2026.1 Gazpacho | stay, → 2027.1 Indri when released (skip-level) | → 2026.2 Hibiscus |
| 2026.2 Hibiscus | only → 2027.1 Indri (adjacent) | → 2027.1 |

- New cloud today: 2026.2 if Kolla-Ansible or OpenStack-Helm, 2026.1 if OpenStack-Ansible (2026.2 not released). Prefer a SLURP (2026.1) if the team can only absorb one upgrade a year.
- Never stay on an `unmaintained` series without saying so: no more coordinated fixes.

## Upgrade discipline (any tool)

1. Read the release notes of the target series **and** of any skipped series (upgrade notes first).
2. Run [pre-upgrade-checklist.md](templates/pre-upgrade-checklist.md): healthy services, backups, config diff.
3. Upgrade the deployment tool first, then infrastructure (MariaDB, RabbitMQ), then OpenStack services. Nova requires Placement to be upgraded before any Nova service (https://docs.openstack.org/nova/2026.2/admin/upgrades.html).
4. Nova readiness check before restarting on new code: `nova-status upgrade check` - exit 0 all good, 1 warning (may be OK), 2 failure (stop), 255 unexpected error (https://docs.openstack.org/nova/2026.2/cli/nova-status.html).
5. Nova supports N and N-2 `nova-compute` coexistence since 2023.1; the conductor refuses to start next to an older compute - finish compute upgrades before the next series.
6. Nova does not support database downgrade: the DB backup is the only rollback.

Per-tool commands: [kolla-ansible.md](kolla-ansible.md),
[openstack-ansible.md](openstack-ansible.md), [openstack-helm.md](openstack-helm.md).

## RabbitMQ is the usual skip-level trap

- Kolla-Ansible: RabbitMQ upgrades are restricted to one minor version at a time unless the path is listed in `rabbitmq_allowed_upgrades` (default allows 3.13 → 4.0/4.1/4.2 and 4.0 → 4.1/4.2); an invalid path fails in the `rabbitmq-version-check` task. A SLURP upgrade may need an intermediate RabbitMQ upgrade first (https://docs.openstack.org/kolla-ansible/2026.2/reference/message-queues/rabbitmq.html).
- OpenStack-Ansible 2026.1: RabbitMQ must be 3.13 or later before the infrastructure upgrade, and mirrored (HA) queues must be migrated to quorum queues first (https://docs.openstack.org/openstack-ansible/2026.1/admin/upgrades/major-upgrades.html).

## Verify after an upgrade

```bash
openstack versions show                 # API versions per service
openstack compute service list          # every service up, new version on all hosts
nova-status upgrade check               # inside the nova-api container / host
openstack server create ...             # canary instance on each AZ, then delete after the user's go
```

## Not verified

- The OpenStack-Ansible 2026.2 release date (not announced in the deliverable file; "I don't know").
- Exact Kolla-Ansible 23.0.0 publication date (final release commit in openstack/releases on 2026-10-13).

## Sources

- https://releases.openstack.org/
- https://releases.openstack.org/hibiscus/index.html
- https://governance.openstack.org/tc/resolutions/20220210-release-cadence-adjustment.html
- https://opendev.org/openstack/releases (deliverables/hibiscus, deliverables/gazpacho)
- https://github.com/openstack/openstack-helm/tags
