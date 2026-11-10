---
name: ha-patroni
description: PostgreSQL high availability with Patroni and an etcd DCS - architecture, leader race and TTL rule, failover versus switchover, split-brain protections (leader lock, watchdog, failsafe, synchronous mode), patronictl operations and which are destructive
when-to-use: Building or operating a Patroni cluster on VMs, planning maintenance on a node, handling a failed primary, or deciding between Patroni and CloudNativePG
keywords: patroni, patronictl, etcd3, DCS, leader lock, ttl, loop_wait, retry_timeout, switchover, failover, reinit, pause, watchdog, failsafe_mode, synchronous_mode, split brain
priority: critical
related: replication-streaming-logical.md, backup-pitr-pgbackrest.md, postgres-on-kubernetes-cnpg.md, destructive-actions.md, templates/patroni.yml
---

# High Availability with Patroni

**Load when:** a PostgreSQL cluster on VMs or bare metal must fail over automatically. On Kubernetes prefer an operator ([postgres-on-kubernetes-cnpg.md](postgres-on-kubernetes-cnpg.md)); do not run Patroni and CloudNativePG on the same data. Version: Patroni **4.1.5** (2026-08-12), tested against PostgreSQL 14.24 to 18.6.

## Architecture

Each node runs Patroni, which starts and manages PostgreSQL. The cluster state lives in a **DCS** (distributed configuration store): etcd (v3 API, config section `etcd3`), Consul, ZooKeeper/Exhibitor or the Kubernetes API. The **leader lock** in the DCS names the one member allowed to run as primary. Clients reach the primary through HAProxy or a VIP that health-checks Patroni's REST API (`/primary`, `/replica`, `/health`; `/metrics` for Prometheus - exporter side: `devops-observability`), or through a libpq multi-host string. Backups and PITR still come from pgBackRest ([backup-pitr-pgbackrest.md](backup-pitr-pgbackrest.md)); Patroni can bootstrap replicas from it with custom methods.

The DCS needs its own odd-sized cluster (3 members minimum for fault tolerance) on separate failure domains and fast disks. etcd operation: `devops-k8s-cluster` covers etcd lifecycle; its version and the Patroni-specific etcd options were not re-verified here.

## Timing rule

`ttl` (default 30, min 20) is the time before an automatic failover starts when the leader stops renewing; `loop_wait` (default 10); `retry_timeout` (default 10, min 3) is how long DCS or network trouble is tolerated before the leader demotes itself. Constraint: **`loop_wait + 2 * retry_timeout <= ttl`**. Change them with `patronictl edit-config` (dynamic, stored in the DCS), never per node by hand, and test the failover time afterwards. `maximum_lag_on_failover` (default 1048576 bytes) excludes replicas lagging more than that from the leader race.

## Failover vs switchover

| | switchover | failover |
|---|-----------|----------|
| Use | Healthy cluster, planned (maintenance, upgrade) | Cluster unhealthy: no leader, or no synchronous standby available |
| Effect | Orderly demotion of the old leader, chosen replica promoted | Forced promotion of a candidate; docs warn it **can lose data** depending on how up to date the candidate is |
| Command | `patronictl -c /etc/patroni/patroni.yml switchover <cluster> --leader <name> --candidate <name>` | `patronictl -c ... failover <cluster> --candidate <name>` |
| Gate | Proposal + go, after `patronictl list` shows all members streaming with ~0 lag | ACTION/EFFECT/PROOF/WAIT-FOR-GO ([destructive-actions.md](destructive-actions.md)) |

Automatic failover is the **leader race**: when the leader lock expires every node checks whether it is the best candidate (including REST calls to peers); the first to take the lock promotes itself and the others follow. Tags per node: `nofailover: true` (or `failover_priority: 0`) keeps a node out of the race (use for a delayed or reporting replica); nodes with more receive/replay LSN win regardless of priority.

## Split-brain protections

1. **Leader lock**: a node may run as primary only if it can update the lock in the DCS; if the update fails it demotes. Hence DCS health is part of database availability.
2. **Watchdog** (`watchdog.mode`: `off`, `automatic`, `required`; device `/dev/watchdog`): with `required` a node does not become leader unless the watchdog is armed, so a frozen Patroni process cannot leave a stale primary. `safety_margin` sits between watchdog trigger and lock expiry. Needs kernel watchdog support (`devops-linux`).
3. **DCS failsafe mode** (`failsafe_mode`, dynamic config, default false): if the DCS is down but all known members acknowledge the leader through `POST /failsafe`, the primary keeps running instead of demoting; if one member does not answer, it demotes. Trade-off: availability during a DCS outage versus a stricter safety check; decide consciously.
4. **Synchronous mode** (`synchronous_mode: true` or `quorum`, with `synchronous_node_count` default 1, `synchronous_mode_strict`): commits wait for a standby so a failover to it loses no committed data; strict mode blocks writes when no synchronous standby exists. `primary_stop_timeout` interacts with it (SIGKILL after the timeout).
5. **pg_rewind**: `use_pg_rewind: true` lets the old leader rejoin as a replica without a full copy; requires data checksums and/or `wal_log_hints = on`. (initdb in 18 enables checksums by default.)
6. **Permanent slots** (`slots` in the dynamic config) are preserved across failover; replication slots with `wal_status=lost` are dropped by Patroni since 4.1.4.

Never promote PostgreSQL by hand (`pg_ctl promote`, `pg_promote()`) on a Patroni member while the DCS shows another leader: that creates two primaries. Never stop Patroni "to restart Postgres": bouncing PostgreSQL without Patroni can cause failovers; use `patronictl restart`.

## Operations map

| Command | Reads/writes | Note |
|---------|--------------|------|
| `patronictl list`, `history`, `show-config` | read-only | Always first |
| `patronictl edit-config <cluster> --set key=value` | writes the DCS config for the whole cluster | Show the diff; some parameters restart members (`pending restart` column) |
| `patronictl restart <cluster> <member>` | restarts PostgreSQL | One member at a time, replicas first |
| `patronictl pause` / `resume` | disables/enables automatic failover | A paused cluster does not fail over: always `resume` and record who paused it |
| `patronictl switchover` | planned role change | Brief write interruption |
| `patronictl failover` | forced promotion | Destructive: possible data loss |
| `patronictl reinit <cluster> <member>` | rebuilds a replica from the leader | Discards that replica's data; never on the leader |
| `patronictl remove <cluster>` | deletes the cluster's state from the DCS | Interactive; destroys Patroni's cluster information |

Rolling OS or minor upgrades: `pause`-free approach is preferred (restart replicas, switchover, restart the old leader); major upgrades: [major-upgrades.md](major-upgrades.md). Template: [templates/patroni.yml](templates/patroni.yml).

## Sources

- https://patroni.readthedocs.io/en/latest/releases.html (4.1.5 notes, compatibility with PostgreSQL 14.24-18.6; read 2026-11-10)
- Patroni docs via raw GitHub (read 2026-11-10): `docs/dynamic_configuration.rst` (ttl, loop_wait, retry_timeout, rule, `failsafe_mode`, `synchronous_node_count`, `slots`, `primary_stop_timeout`), `docs/yaml_configuration.rst` (etcd3 section, `watchdog`, `nofailover`, `failover_priority`, `use_pg_rewind`, bin_dir), `docs/faq.rst` (leader race, pause, REST endpoints), `docs/dcs_failsafe_mode.rst`, `docs/patronictl.rst` (failover/switchover/reinit/remove/pause descriptions)
- Context7 `/patroni/patroni`: patronictl examples for switchover, failover, reinit, remove, `edit-config`

## Not verified

- Which etcd versions Patroni 4.1.5 supports and etcd cluster sizing/latency guidance (Patroni docs name `etcd3`; etcd operation itself was not fetched).
- HAProxy/VIP configuration and REST endpoint semantics (`/primary`, `/replica`) beyond the FAQ's mention of `/metrics` and `/patroni`.
- Exact `patronictl reinit` data-directory handling beyond "rebuilds a standby"; and Debian/RHEL packaging (Patroni via PGDG or pip).
