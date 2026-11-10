---
name: mongodb-pointers
description: One-line operational pointers for MongoDB (backup, replica set, upgrades, destructive commands) with no in-depth coverage, and the rule for what to do when a MongoDB task arrives
when-to-use: A task involves MongoDB and the agent needs the safe entry points and the official sources, not a full runbook
keywords: MongoDB, mongodump, mongorestore, replica set, rs.status, oplog, WiredTiger, sharding, dropDatabase
priority: low
related: destructive-actions.md, redis-valkey-ops.md, mysql-mariadb-ops.md
---

# MongoDB: Pointers Only

**Load when:** MongoDB appears in the task. This skill does not cover MongoDB operations in depth; none of the statements below were verified against the MongoDB documentation today. Read the official manual for the server's exact version (https://www.mongodb.com/docs/manual/) before proposing anything, and state "not verified" for what you did not read.

| Topic | Pointer (to verify at the manual) |
|-------|-----------------------------------|
| Backup | `mongodump` / `mongorestore` (logical, small data); filesystem snapshots with journaling for larger data; the manual's "Backup Methods" page lists the supported ones. A backup counts only after a restore test |
| HA | A replica set (primary + secondaries, election on failure); read `rs.status()` and `rs.conf()` first (read-only). Odd number of voting members |
| Sharding | Separate chapter in the manual; treat as a specialist operation |
| Upgrades | Version-by-version; read the release notes and the feature compatibility version rules of the manual before moving |
| Destructive | `db.dropDatabase()`, `db.collection.drop()`, `deleteMany({})`, `rs.reconfig(..., {force: true})`, removing replica set members, `mongorestore --drop`: all go through ACTION / EFFECT / PROOF / WAIT-FOR-GO in [destructive-actions.md](destructive-actions.md) |
| Licence | Check the server's licence for your use (the licence changed in the past); not verified here |
| Kubernetes | Operators exist from several vendors; none evaluated here |

If MongoDB is the main task, tell the user this skill covers it only as pointers and proceed read-only, source-cited, with a restore-tested backup before any change.

## Sources

- https://www.mongodb.com/docs/manual/ (named as the starting point; not fetched in this session)

## Not verified

- Everything in the table above is general knowledge; no MongoDB page was fetched. Versions, licence, supported backup methods and operator status are unknown.
