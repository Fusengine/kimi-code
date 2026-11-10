---
name: install-repositories
description: Proxmox VE 9.x release facts, support lifecycle, and APT repository setup (enterprise, no-subscription, test, Ceph)
when-to-use: Installing a node, fixing apt errors, choosing a repository, or stating which PVE/PBS/Ceph version is current or EOL
keywords: pveversion, pve-enterprise, pve-no-subscription, pve-test, deb822, proxmox.sources, ceph.sources, Trixie, EOL
priority: high
related: upgrade-migration.md, cluster-quorum.md
---

# Installation and Repositories

**Load when:** a node is being installed, `apt update` fails (401 on enterprise), a repository must be chosen, or a version/EOL claim is needed.

## Versions as verified on 2026-11-10

| Product | Current | Facts | Source |
|---------|---------|-------|--------|
| Proxmox VE | **9.2** (released 2026-05-21) | Debian 13.5 Trixie, kernel 7.0 default, QEMU 11.0, LXC 7.0, ZFS 2.4, Ceph Squid 19.2.3 / Tentacle 20.2.1 | https://pve.proxmox.com/wiki/Roadmap |
| PVE 9.2 arm64 | released 2026-08-05 | NVIDIA Grace / Vera officially; UEFI+ACPI only; no live migration across architectures; subscription keys are per architecture | https://pve.proxmox.com/wiki/Roadmap , https://pve.proxmox.com/wiki/Package_Repositories |
| PVE 9 lifecycle | first release 2025-08, EOL **tba** | Supported at least as long as Debian security supports the base (about 3 years) | https://pve.proxmox.com/wiki/FAQ |
| PVE 8 lifecycle | **EOL 2026-08** (Debian 12 EOL 2026-07) | Any PVE 8 node is out of support: plan the 8 to 9 upgrade | https://pve.proxmox.com/wiki/FAQ |
| Proxmox Backup Server | **4.2** (released 2026-04-29) | Debian 13.4, kernel 7.0, ZFS 2.4.1; PBS 4 EOL TBA; PBS 3 EOL 2026-08 | https://pbs.proxmox.com/wiki/Roadmap , https://pbs.proxmox.com/docs/faq.html |
| Ceph on PVE 9 | Tentacle 20.2 recommended (est. EOL 2027-11); Squid 19.2 est. EOL 2026-09 | Since 9.2, fresh installs default to Tentacle; existing clusters stay on their release | https://pve.proxmox.com/wiki/Package_Repositories , Roadmap |

Reference documentation build read: `version 9.2.13, Thu Sep 24 2026` (header of every man page under https://pve.proxmox.com/pve-docs/).

Before advising, re-read the Roadmap page: if a release newer than 9.2 exists, read its "Known Issues & Breaking Changes" first.

## Repository decision

| Situation | Repository | Component |
|-----------|-----------|-----------|
| Production with a subscription on every node (same level on all nodes) | `https://enterprise.proxmox.com/debian/pve` | `pve-enterprise` |
| Lab, homelab, no subscription | `http://download.proxmox.com/debian/pve` | `pve-no-subscription` (not recommended for production) |
| Testing new features only | `http://download.proxmox.com/debian/pve` | `pve-test` (renamed from `pvetest` in 9.0) |

The Debian base repositories (`trixie trixie-updates` + `trixie-security`, components `main non-free-firmware`) are always required in addition.

Since Debian 13, `apt` complains about the legacy one-line `sources.list` format. Use deb822 `.sources` files; `apt modernize-sources` migrates them (answer `n` first to preview; it keeps `.list.bak` copies).

## Files (deb822, PVE 9)

```text
# /etc/apt/sources.list.d/pve-enterprise.sources   (shipped enabled)
Types: deb
URIs: https://enterprise.proxmox.com/debian/pve
Suites: trixie
Components: pve-enterprise
Signed-By: /usr/share/keyrings/proxmox-archive-keyring.gpg

# /etc/apt/sources.list.d/proxmox.sources          (no-subscription)
Types: deb
URIs: http://download.proxmox.com/debian/pve
Suites: trixie
Components: pve-no-subscription
Signed-By: /usr/share/keyrings/proxmox-archive-keyring.gpg
```

Without a subscription, disable the enterprise entry by adding `Enabled: no` to its stanza instead of deleting it. Ceph uses `/etc/apt/sources.list.d/ceph.sources` with `URIs: https://enterprise.proxmox.com/debian/ceph-tentacle` (component `enterprise`) or `http://download.proxmox.com/debian/ceph-tentacle` (component `no-subscription`).

Source: https://pve.proxmox.com/wiki/Package_Repositories

## Install on top of plain Debian 13

Only the keyring step is documented on the repository page:

```bash
wget https://enterprise.proxmox.com/debian/proxmox-archive-keyring-trixie.gpg \
  -O /usr/share/keyrings/proxmox-archive-keyring.gpg
sha256sum /usr/share/keyrings/proxmox-archive-keyring.gpg
# expected: 136673be77aba35dcce385b28737689ad64fd785a797e57897589aed08db6e45
```

A plain-Debian install that pulled `linux-image-amd64` must remove it before a dist-upgrade (`apt remove linux-image-amd64`), otherwise apt proposes removing `proxmox-ve` (https://pve.proxmox.com/wiki/Upgrade_from_8_to_9). The ISO installer is the default path; on RAID controllers using `megaraid_sas`, the 9.2 ISO kernel 7.0.2-6 has a known issue: install from the 9.1 ISO, then upgrade (Roadmap, 9.2 known issues).

## Verification

```bash
pveversion                      # pve-manager version of this node
apt update && apt policy        # no 401, only the intended repositories listed
pvesubscription get             # subscription status (enterprise repo access)
```

A 401 on the enterprise repository after a subscription change: `pvesubscription update --force`, then `apt update`.

## Pitfalls

- Mixing `bookworm` and `trixie` suites on one node: never; every Proxmox and Debian entry must use the same suite.
- Leaving both enterprise and no-subscription enabled without a key: apt errors on every update.
- Recommending Ceph Squid for new clusters: its estimated EOL (2026-09) has passed; use Tentacle.
- Calling PVE 8 "supported": it reached EOL in 2026-08.

## Not verified

- The `-v` (verbose package list) flag of `pveversion`: not present in the documentation pages fetched (no `pveversion.1.html` man page exists at the docs root); use `pveversion` plus `apt policy`, or confirm with `pveversion --help` on the node.
- The exact PVE 9 EOL date: the FAQ still says "tba".
