---
name: replication-streaming-logical
description: PostgreSQL streaming (physical) replication, replication slots and their disk risk, synchronous replication, lag checks, and logical replication with its limits and failover behaviour
when-to-use: Adding or rebuilding a replica, a replica falling behind, WAL filling the disk because of a slot, planning synchronous commit, or choosing logical replication for migration or a partial copy
keywords: streaming replication, replication slot, max_slot_wal_keep_size, wal_status, synchronous_standby_names, hot_standby_feedback, primary_conninfo, standby.signal, logical replication, publication, subscription, pg_stat_replication
priority: high
related: ha-patroni.md, major-upgrades.md, monitoring-queries.md, destructive-actions.md
---

# Replication: Streaming and Logical

**Load when:** replicas, lag, slots or logical replication are involved. Failover automation is [ha-patroni.md](ha-patroni.md); do not hand-promote a Patroni or CloudNativePG member.

## Streaming (physical) replication

A standby replays the primary's WAL byte for byte: same major version, same architecture, whole cluster. It is the base of HA, read scaling and the safe copy for major upgrades via promotion only within the same major.

Build a standby (each step a change; the data directory must be empty):
1. On the primary: a `REPLICATION` role, a `pg_hba.conf` `replication` line for the standby address, `max_wal_senders` and `max_replication_slots` high enough (defaults 10 and 10 in 18), `wal_level` at least `replica` (default).
2. On the standby: `pg_basebackup -h primary -U replicator -D <empty datadir> -X stream -R -c fast` (or a pgBackRest `restore --type=standby`), which creates `standby.signal` and `primary_conninfo` in `postgresql.auto.conf`.
3. Create the slot first if you use one (`SELECT pg_create_physical_replication_slot('standby1');`) and set `primary_slot_name`.
4. Start the standby and verify on the primary: `SELECT application_name, state, sync_state, replay_lag FROM pg_stat_replication;` and on the standby `SELECT pg_is_in_recovery();`.

`hot_standby` is on by default, so a standby serves read queries. `hot_standby_feedback = on` prevents query cancellations caused by cleanup records but can bloat the primary: choose consciously. `primary_conninfo` takes a libpq connection string; keep the password in `.pgpass`, not in the string.

## Slots: the disk-fill trap

A replication slot makes the primary keep WAL until the consumer has it. A standby or subscriber that is down or abandoned makes `pg_wal` grow until the disk is full and the primary stops. Defences:
- `max_slot_wal_keep_size` (default -1 = unlimited). Set a finite cap: a slot that falls behind it loses WAL and the standby can no longer resume (it must be rebuilt). `pg_replication_slots.wal_status` reports `reserved`, `extended`, `unreserved` or `lost`.
- `idle_replication_slot_timeout` (PostgreSQL 18, default 0 = disabled) invalidates slots that stay inactive longer than the duration.
- Alert on slot lag and inactive slots ([monitoring-queries.md](monitoring-queries.md)) and on free space of the WAL volume.
- **Deleting a slot is irreversible for that consumer** and is in [destructive-actions.md](destructive-actions.md). Patroni and CloudNativePG manage their own slots: do not drop theirs.

## Synchronous replication

`synchronous_standby_names` lists the standbys that must confirm before commit returns (with `synchronous_commit` at its level). It trades availability for zero data loss: if the only synchronous standby is unreachable, writes hang. Use a quorum list (`ANY 1 (a, b, c)`) rather than a single name, and let Patroni (`synchronous_mode`) or CloudNativePG manage it in HA setups. Asynchronous replication (default) can lose the last transactions on failover; measure with `replay_lag` and WAL positions.

## Lag checks (read-only)

```sql
-- on the primary
SELECT application_name, state, sync_state,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS replay_bytes,
       write_lag, flush_lag, replay_lag
FROM pg_stat_replication;
-- on a standby
SELECT now() - pg_last_xact_replay_timestamp() AS replay_delay, pg_is_in_recovery();
```

`replay_lag` is the time between flushing WAL locally and the standby reporting it applied. Standby delay measured from the last replayed transaction is misleading on an idle primary.

## Logical replication

Publications on the source, subscriptions on the target, row changes decoded from WAL. Needs `wal_level = logical` and enough `max_replication_slots` for subscriptions plus table synchronisation. Works across major versions and for a subset of tables. Limits to plan around:
- **Schema and DDL are not replicated**: create the schema on the subscriber first (`pg_dump --schema-only`) and apply every later DDL on both sides in a safe order.
- **Sequence values are not replicated**: the subscriber's sequences keep their start values; set them (`setval`) before switching writers to the subscriber.
- Large objects and some other objects are not replicated (see the restrictions page); every replicated table needs a replica identity (a primary key, or `REPLICA IDENTITY FULL` at higher cost).
- The subscription's slot lives on the publisher and holds WAL like any slot; a stalled subscriber fills the publisher's disk. `DROP SUBSCRIPTION` on a live subscription also drops the remote slot unless detached first; do that deliberately.
- **Failover**: with `failover = true` on the subscription and `sync_replication_slots = on` on the physical standby (default off), the logical slot is synchronised to the standby so subscribers resume from the new primary after promotion. Without it, a failover breaks logical replication. Patroni can also keep permanent slots through failover (`slots` in the dynamic configuration).
- `pg_createsubscriber` converts a physical standby into a logical replica (shown in the manual as `pg_createsubscriber -D <datadir> -P "host=foo" -d hr -d finance`).

Use for: online major upgrade ([major-upgrades.md](major-upgrades.md)), migrating a subset, feeding analytics. Do not use as a substitute for backups or HA.

## Sources

- https://www.postgresql.org/docs/18/runtime-config-replication.html (`max_slot_wal_keep_size`, `idle_replication_slot_timeout`, `sync_replication_slots`, `hot_standby_feedback`, `primary_conninfo`, `primary_slot_name`, `synchronous_standby_names`; read 2026-11-10)
- https://www.postgresql.org/docs/18/warm-standby.html , monitoring-stats.html (`replay_lag`), view-pg-replication-slots.html (`wal_status`), logical-replication-config.html (`wal_level = logical`), logical-replication-restrictions.html (schema, sequences), logical-replication-failover.html (read 2026-11-10)
- Context7 `/websites/postgresql`: `pg_createsubscriber` example, `max_slot_wal_keep_size`; Patroni dynamic configuration (`slots`)

## Not verified

- The behaviour of `DROP SUBSCRIPTION` regarding the remote slot and the exact replica-identity requirements were not re-read on the restrictions page today; check https://www.postgresql.org/docs/18/sql-dropsubscription.html before running it.
- That synchronous quorum syntax `ANY n (...)` is accepted in 18 was not shown in the extracted text (the page was read only up to the opening paragraph).
