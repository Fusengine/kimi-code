---
name: redis-valkey-ops
description: Redis and the Valkey fork in 2026 - licence and version status, choosing between them, persistence (RDB, AOF, none) and backing up, replication, Sentinel versus Cluster, memory and eviction policy, exposure and ACLs, FLUSHALL risk
when-to-use: Deploying or operating Redis or Valkey as cache, queue or store; deciding Redis vs Valkey; choosing persistence and HA; recovering after an accidental flush
keywords: Redis, Valkey, RDB, AOF, appendfsync, Sentinel, Cluster, maxmemory, maxmemory-policy, noeviction, allkeys-lru, replication, AGPLv3, FLUSHALL, protected mode, ACL
priority: medium
related: destructive-actions.md, mysql-mariadb-ops.md, mongodb-pointers.md, postgres-on-kubernetes-cnpg.md
---

# Redis and Valkey Operations

**Load when:** an in-memory key-value store is in the picture. First decide whether it must be durable at all: most Redis/Valkey uses are caches where loss is acceptable; stores that hold the only copy of data need a persistence and backup plan like any database.

## Status (checked 2026-11-10)

| | Redis Open Source | Valkey |
|---|-------------------|--------|
| Current | **8.10** on redis.io downloads; 8.12 is at RC2 (not for production) | Supported lines: **9.1** (9.1.3), **9.0** (9.0.7), **8.1** (8.1.11), **8.0** (8.0.12), **7.2** (7.2.15); 9.2.0-rc1 is a release candidate |
| Licence | Moved to SSPL/RSAL in March 2024; from **Redis 8** the OSI-approved **AGPLv3** is offered as an additional licence option (Redis blog, 2025-05-01) | Community-governed fork (ValkeyConf 2026 post title: "Nobody Owns Valkey"); foundation hosting and licence text were not re-read today |
| Notes | Redis 8 integrates former Redis Stack modules (JSON, time series, probabilistic types, query engine) and vector sets; AGPL has network-copyleft obligations: have the licence reviewed for your use | Valkey 9.x ships release notes per line on valkey.io; Kubernetes operator is young (blog: "road to 1.0") |

Decision: for a new self-hosted deployment where licence terms matter, Valkey is the conservative choice; use Redis 8 where its module features are required and the AGPL/commercial terms are accepted. Clients using the RESP protocol work with both, but module commands are Redis-specific. Do not mix versions across a replication group. Pin images by tag and digest (`devops-docker`).

## Persistence

| Mode | Behaviour | Loss window | Use |
|------|-----------|-------------|-----|
| **None** | pure cache | everything on restart | cache only |
| **RDB** | point-in-time snapshots at `save` intervals (e.g. `save 60 1000`); compact file; `fork()` can stall large datasets for ms to ~1 s | minutes | backup-friendly caches and stores that tolerate minutes of loss |
| **AOF** (`appendonly yes`) | logs every write; fsync policy `always`, `everysec` (default; lose at most ~1 s), `no`; background rewrite keeps it small; `valkey-check-aof` repairs a half-written tail | ~1 s with `everysec` | stores that need durability |
| **RDB + AOF** | both | ~1 s | common production choice |

Backups: an RDB file is never modified once produced (written under a temporary name and renamed atomically), so **copying it while the server runs is safe**; the documented practice is hourly snapshots in one directory and daily in another, pruned by `find`, copied off the host to a second site. Test restores: start a throwaway instance with the file and check `DBSIZE` and sample keys. Storage and offsite policy: `devops-storage-backup`. Replication is not a backup (a `FLUSHALL` replicates).

## Replication and HA

Replication is asynchronous leader-follower: replicas reconnect and partially resync, full resync creates a snapshot on the primary (memory and I/O spike). Clients can request acknowledgement with `WAIT`/`WAITAOF`, but that does **not** make it strongly consistent: acknowledged writes can still be lost in a failover.

| | Sentinel | Cluster |
|---|----------|---------|
| Purpose | HA for a **single** primary dataset: monitoring, notification, automatic failover, client discovery | Sharding across 16384 hash slots **plus** failover |
| Minimum | at least **three** Sentinel instances on independent failure domains; quorum set per monitored primary (e.g. `monitor mymaster ... 2`) | at least **three primaries** (recommended six nodes: three primaries + three replicas) |
| Choose when | dataset fits one node's memory, multi-key operations across all keys needed | dataset or throughput exceeds one node; keys can be partitioned (multi-key operations restricted to one slot) |
| Caveats | clients must be Sentinel-aware; Sentinel does not fix lost writes during partitions | can lose acknowledged writes (asynchronous replication, partitions); resharding is an operation to rehearse |

Failover drills belong in `devops-sre-ops`. On Kubernetes use the project's operator or a vetted chart; their maturity was not evaluated.

## Memory and eviction

Set `maxmemory` below the container/host limit with headroom for fork copy-on-write, replication buffers and fragmentation. `maxmemory-policy`: `noeviction` (writes refused at the limit; safest for stores, errors for caches), `allkeys-lru`/`allkeys-lfu` (cache), `volatile-*` (only keys with a TTL). Pick per role: a cache with `noeviction` fails under load; a store with `allkeys-lru` silently deletes data. Monitor `used_memory`, `evicted_keys`, `rdb_last_bgsave_status`, `aof_last_write_status`, replica offset lag (exporter wiring: `devops-observability`; both projects publish Prometheus guidance).

## Exposure and access

Never expose the port to untrusted networks. Without a password and with default binding, protected mode answers only loopback clients with an error; that is a safety net, not a design. Restrict by network, use TLS and ACL users with minimal command and key permissions, disable or rename dangerous commands via ACL (`FLUSHALL`, `FLUSHDB`, `CONFIG`, `DEBUG`, `KEYS`), keep passwords in `devops-secrets`.

## Destructive: FLUSHALL / FLUSHDB

They remove all keys (all databases / the current one) and replicate to replicas. ACTION / EFFECT / PROOF / WAIT-FOR-GO ([destructive-actions.md](destructive-actions.md)); PROOF includes `INFO replication` role, `DBSIZE`, the newest RDB timestamp. Recovery after an accident with AOF: if no AOF rewrite has run since, stop the server, remove the last (flush) command from the AOF file and restart; stop the AOF rewrite from running first. Otherwise only the last RDB.

## Sources

- https://redis.io/downloads/ (8.10), https://github.com/redis/redis/releases (8.12 RC2), https://redis.io/blog/agplv3/ (licence history, AGPLv3 from Redis 8), https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/ (read 2026-11-10)
- https://valkey.io/download/ (supported lines), https://valkey.io/topics/persistence/ , replication/ , sentinel/ , cluster-tutorial/ , lru-cache/ , security/ , https://valkey.io/blog/ (read 2026-11-10)

## Not verified

- Valkey licence terms and governance (not re-read); Redis 8 exact licence set beyond the blog's AGPL statement.
- Default value of `maxmemory-policy` in current versions and exact `save` defaults (check each version's shipped config).
- Redis-side persistence/Sentinel/Cluster behaviour is assumed identical to Valkey's documented behaviour except where stated; the Redis docs pages for them were not compared line by line.
- Kubernetes operators for either, Redis Software/Enterprise, Memurai.
