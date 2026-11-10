---
name: object-storage-s3
description: S3-compatible self-hosted object storage - MinIO community status and maintained alternatives (Garage, SeaweedFS, Ceph RGW), bucket safety
when-to-use: Picking or reviewing a self-hosted S3 endpoint for backups or artifacts, or reacting to the MinIO repository status
keywords: s3, minio, aistor, garage, seaweedfs, rgw, bucket, object lock, versioning, agpl, apache
priority: high
related: storage-selection.md, ceph-architecture-deploy.md, restic.md, velero-kubernetes-backup.md
---

# S3-Compatible Object Storage

**Load when:** a backup tool or Kubernetes needs an S3 endpoint you host yourself.

## Status and licensing (read 2026-11-10)

| Product | Status today | License / terms | Fit |
|---------|-------------|-----------------|-----|
| **MinIO community** (`minio/minio`) | README banner: "THIS REPOSITORY IS NO LONGER MAINTAINED"; alternatives named are AIStor Free (free license, standalone) and AIStor Enterprise (commercial, distributed) | README states AGPL v3 for the repository; AIStor terms are separate | Do not start new deployments on the unmaintained repository; existing installs need a migration plan |
| **Garage** | Active project of Deuxfleurs; site describes a lightweight S3 store replicating each chunk across 3 zones, single binary | Not verified | Small multi-site clusters, backup target, static sites |
| **SeaweedFS** | Active, release 4.53; S3 API, POSIX filer, replication, cloud tiering | Apache-2.0 (LICENSE file read) | Many small files, mixed S3 + file use |
| **Ceph RGW** | Part of Ceph, tracks Ceph releases | LGPL (Ceph project); not re-verified | Already running Ceph; multi-tenant S3 |

Decision: if Ceph exists, use RGW. For a standalone cluster, evaluate Garage first for simplicity and SeaweedFS for scale and features. Check each project's release page and license text yourself before committing; this table is a snapshot.

## Bucket safety rules

| Rule | Why |
|------|-----|
| Dedicated access key per workload, least privilege (one bucket/prefix) | A leaked backup key must not read or delete other data |
| Versioning on backup buckets where the product supports it | Recovers overwritten objects |
| Object lock / retention (WORM) for the immutable copy | Ransomware cannot delete within the retention window; check the product supports it before relying on it |
| Server-side encryption does not replace client-side encryption | restic and Borg encrypt before upload; keep that |
| Lifecycle rules must not expire restic/Borg/Velero data | The tool owns retention; a bucket lifecycle rule corrupts the repository |
| TLS everywhere, endpoint not public | Credentials and data in transit |

Bucket deletion is destructive: see [backup-destructive-ops.md](backup-destructive-ops.md).

## Using the endpoint

- restic: `-r s3:https://HOST/BUCKET/PREFIX` with `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in the environment ([restic.md](restic.md)).
- Velero: a `BackupStorageLocation` with the AWS plugin and a custom `s3Url` ([velero-kubernetes-backup.md](velero-kubernetes-backup.md)).
- Proxmox Backup Server 4.2 lists an S3-compatible datastore as officially supported ([rclone-pbs-pointers.md](rclone-pbs-pointers.md)).

## Sources

- https://github.com/minio/minio and https://raw.githubusercontent.com/minio/minio/master/README.md (read 2026-11-10)
- https://github.com/seaweedfs/seaweedfs/releases/tag/4.53 and https://raw.githubusercontent.com/seaweedfs/seaweedfs/master/LICENSE (read 2026-11-10)
- https://garagehq.deuxfleurs.fr/ (read 2026-11-10)
- https://docs.ceph.com/en/latest/releases/ (read 2026-11-10)

## Not verified

- Garage license and current version: the download page did not render the release list and the Forgejo release page is behind an anti-bot challenge.
- Ceph RGW license wording and RGW object-lock support level: not read today.
- Object-lock support in Garage and SeaweedFS: not checked; confirm in each product's documentation before using it as the immutable copy.
- AIStor Free terms: only the README pointer was read, not the license.
- The restic `s3:` URL form is from memory of the restic docs; check the "preparing a new repository" page for your version.
