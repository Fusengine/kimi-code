---
name: backup-logical-physical
description: pg_dump, pg_dumpall and pg_restore (logical) versus pg_basebackup, incremental backups and pg_combinebackup (physical), when each is the right tool, and what a dump does not capture
when-to-use: Copying one database to another host, taking a pre-migration safety dump, seeding a replica, scripting a base backup without pgBackRest, or deciding logical vs physical
keywords: pg_dump, pg_restore, pg_dumpall, pg_basebackup, pg_combinebackup, pg_verifybackup, summarize_wal, custom format, directory format, logical backup
priority: high
related: backup-pitr-pgbackrest.md, major-upgrades.md, replication-streaming-logical.md, destructive-actions.md
---

# Logical and Physical Backup Tools

**Load when:** choosing how to copy PostgreSQL data. For disaster recovery with PITR use [backup-pitr-pgbackrest.md](backup-pitr-pgbackrest.md); this file covers the built-in tools around it. Where backups are stored and the 3-2-1 rule: `devops-storage-backup`.

## Which tool

| Need | Tool | Why |
|------|------|-----|
| Whole-cluster disaster recovery, PITR | physical + WAL archive (pgBackRest, CNPG plugin) | Restores the exact files and replays WAL |
| Seed a streaming replica | `pg_basebackup` | Official tool, `-R` writes the standby setup |
| Move one database, a few tables, or cross-major | `pg_dump` + `pg_restore` | Logical; independent of file layout and major version |
| Safety net before a risky migration | `pg_dump -Fc` of the affected schema, plus a pgBackRest restore point | Fast to restore a few tables |
| Roles and tablespaces | `pg_dumpall --globals-only` | `pg_dump` dumps one database and does not include cluster-wide roles |

`pg_dump` takes a consistent snapshot without blocking readers or writers, but the PostgreSQL manual itself says that, except in simple cases, it is generally not the right choice for taking regular backups of production systems. A dump has no PITR, restores slowly on large data, and omits roles unless you dump globals.

## pg_dump / pg_restore

- Formats: plain SQL (`-Fp`), **custom** (`-Fc`: compressed, selectable, supports parallel restore) and **directory** (`-Fd`: the only format that supports **parallel dump** with `-j`). Prefer `-Fd -j N` for large databases and `-Fc` for small ones.
- Run `pg_dump` with the **newest** client version available when targeting a newer server; restore with `pg_restore -j N` into an empty, correctly versioned database.
- `pg_restore --clean --if-exists` drops objects before recreating them: that is an overwrite of the target database - use it only on a database you intend to replace ([destructive-actions.md](destructive-actions.md)). `--single-transaction` makes the restore all-or-nothing (incompatible with parallel jobs).
- Always restore into a **new database name** first, check counts and constraints, then switch the application.
- Extensions must exist (same or compatible version) on the target; check `\dx` on both sides.
- Dump credentials come from `PGPASSFILE` or a service file, not from the command line.

```bash
pg_dump  "host=db1 dbname=appdb user=backup" -Fd -j 4 -f /backup/appdb.dir     # read-only on the source
pg_dumpall "host=db1 user=backup" --globals-only -f /backup/globals.sql        # roles and tablespaces
pg_restore -l /backup/appdb.dir | head                                        # list contents, writes nothing
createdb  -h db2 appdb_restore_test                                           # change: new empty database
pg_restore -h db2 -d appdb_restore_test -j 4 /backup/appdb.dir                # change: loads into the NEW database
```

## pg_basebackup

Takes a physical copy of a running cluster over the replication protocol. Needs a role with `REPLICATION` and a matching `pg_hba.conf` line ([postgres-roles-auth.md](postgres-roles-auth.md)). Useful options: `-D` target directory, `-X stream` (include the WAL needed for consistency), `-c fast` (immediate checkpoint instead of a spread one, otherwise the tool looks idle for a while), `-R` (`--write-recovery-conf`: creates `standby.signal` and appends connection settings to `postgresql.auto.conf`, for building a replica), `-Ft` (tar). The target directory must be empty. `pg_verifybackup` checks a backup against its manifest.

**Incremental (PostgreSQL 17+)**: set `summarize_wal = on` on the source (default off; runs the WAL summarizer, works on a primary or a standby), take a full base backup, then `pg_basebackup --incremental=<previous backup_manifest>`. Relation files become smaller incremental files; non-relation files are copied whole. To restore, `pg_combinebackup` reconstructs a synthetic full backup from the chain: list the backups oldest to newest and write to a new directory with `-o`. Every backup in the chain must be kept. Without a WAL archive this is not PITR; for PITR use pgBackRest.

## Barman

Pointer: Barman is a separate backup server for PostgreSQL ([backup-pitr-pgbackrest.md](backup-pitr-pgbackrest.md) explains the choice). Version and CLI not verified today.

## Sources

- https://www.postgresql.org/docs/18/app-pgdump.html , app-pgrestore.html , app-pg-dumpall.html , app-pgbasebackup.html , app-pgcombinebackup.html (read 2026-11-10; formats, `--clean`, `--globals-only`, `--write-recovery-conf`, `pg_verifybackup`)
- https://www.postgresql.org/docs/18/runtime-config-wal.html (`summarize_wal`, default off)
- Context7 `/websites/postgresql`: "Making an Incremental Backup" (`pg_basebackup --incremental`), `pg_combinebackup` description

## Not verified

- The incremental-backup feature is described for the version 18 manual; that it first appeared in 17 is from general knowledge (check the 17 release notes).
- Exact `pg_basebackup -X`/`-c` option wording was not re-read on the page today (the extract did not return those paragraphs); they are long-standing options.
- Parallel-dump behaviour with `--single-transaction` and snapshot options (`--snapshot`) were not read.
