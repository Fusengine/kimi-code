---
name: users-sudo-ssh
description: Users and groups, sudoers drop-ins with visudo, sshd server drop-ins and ssh client config, with lock-out protection
when-to-use: Creating/locking accounts, granting sudo, changing sshd, setting up jump hosts
keywords: useradd, usermod, chage, userdel, sudoers.d, visudo, sshd_config.d, sshd -t, sshd -T, ProxyJump, ControlMaster
priority: high
related: selinux-apparmor.md
---

# Users, sudo and SSH

**Load when:** account lifecycle, sudo rights, or any sshd / ssh client change.

Sources (read 2026-11-10): https://man7.org/linux/man-pages/man8/useradd.8.html, `usermod.8`, `userdel.8`,
https://man7.org/linux/man-pages/man1/chage.1.html, https://www.sudo.ws/docs/man/sudoers.man/,
https://www.sudo.ws/docs/man/visudo.man/, https://man.openbsd.org/sshd_config, https://man.openbsd.org/sshd,
https://man.openbsd.org/ssh_config, https://documentation.ubuntu.com/server/how-to/security/openssh-server/.

## Lock-out Protocol (sshd, sudoers, PAM)

1. Open **two** root sessions; work in one, keep the other idle as the rollback path.
2. Back up: `cp -a /etc/ssh/sshd_config.d /root/sshd_config.d.bak.$(date +%F)`.
3. Write the drop-in, validate (`sshd -t`, `visudo -c`).
4. Reload (sshd re-reads its config on SIGHUP: `systemctl reload ssh` on Debian/Ubuntu, `sshd` on RHEL).
5. From a **third, new** connection, log in and `sudo -v`. Only then close the spare session.
6. Fail -> revert the file from the spare session, validate, reload.

## Users and Groups

| Task | Command |
|------|---------|
| Human user with home | `useradd -m -s /bin/bash -G <admingroup> alice` |
| Service account | `useradd -r -s /usr/sbin/nologin svc-app` (or `DynamicUser=` in the unit) |
| Add to group | `usermod -aG docker alice` - without `-a`, `-G` replaces all supplementary groups |
| Lock password | `usermod -L alice` (prefixes `!` to the hash; keys may still work - also expire: `chage -E 0 alice`) |
| Aging info | `chage -l alice` |
| Inspect | `id alice`, `getent passwd alice`, `getent group sudo` |

Admin group: `sudo` on Debian/Ubuntu, `wheel` on RHEL family (check `grep -E '^%(sudo|wheel)' /etc/sudoers`).

## sudo

- Main file `/etc/sudoers` includes `/etc/sudoers.d` (`@includedir`; `#includedir` is the form accepted by sudo before 1.9.1).
- Files in `sudoers.d` whose name **ends in `~` or contains a `.`** are skipped - `ops.conf` is silently ignored.
- Always edit through visudo: `visudo -f /etc/sudoers.d/ops`; check everything with `visudo -c`.
- Grant to groups, not users; list exact commands with absolute paths; avoid `NOPASSWD: ALL`.
- Commands that open a pager (`systemctl status`, `journalctl`) can spawn a shell from `less` - systemctl(1)
  recommends `--no-pager` or pager secure mode when granting them via sudo; the template forces `--no-pager`.

Template: [sudoers-ops](templates/sudoers-ops).

```bash
visudo -cf /etc/sudoers.d/ops && chmod 0440 /etc/sudoers.d/ops
visudo -c                          # whole tree, including every include
sudo -l -U alice                   # effective rights
```

## sshd (server)

Ubuntu ships `Include /etc/ssh/sshd_config.d/*.conf` at the very top of `sshd_config` (Ubuntu docs);
confirm on other distros with `grep -n '^Include' /etc/ssh/sshd_config`. Included files expand in
lexical order and for most keywords **the first obtained value wins**, so a low-numbered drop-in
overrides later files (check what else is in that directory - another drop-in may set the same key).

| Keyword | Hardened value | Note |
|---------|----------------|------|
| `PermitRootLogin` | `no` (or `prohibit-password`, the default) | |
| `PasswordAuthentication` | `no` | default is `yes` |
| `KbdInteractiveAuthentication` | `no` | `ChallengeResponseAuthentication` is its deprecated alias |
| `AuthenticationMethods` | `publickey` | |
| `AllowGroups` | `sshusers` | lock-out risk if your user is not in it |
| `MaxAuthTries` / `LoginGraceTime` | `3` / `30` | |
| `DisableForwarding` | `yes` on non-jump hosts | overrides all forwarding options |
| `PerSourcePenalties` | review defaults | recent OpenSSH only - check `sshd -T` |

Template: [sshd-10-hardening.conf](templates/sshd-10-hardening.conf).

```bash
sshd -t                                           # syntax + keys
sshd -T | grep -Ei 'permitrootlogin|passwordauth|allowgroups'   # effective config
sshd -T -C user=alice,host=x,addr=10.0.0.5        # effective config after Match blocks
```

## ssh (client) - `~/.ssh/config`

```text
Host bastion
    HostName bastion.example.net
    User ops
    IdentitiesOnly yes
    IdentityFile ~/.ssh/id_ed25519_ops
Host app-*
    ProxyJump bastion
    StrictHostKeyChecking accept-new
    ControlMaster auto
    ControlPath ~/.ssh/cm-%r@%h:%p
    ControlPersist 10m
    ServerAliveInterval 30
```

`accept-new` adds unknown host keys but refuses changed ones.

## Destructive Operations

| Command | Exact effect | Rule |
|---------|--------------|------|
| `userdel -r alice` | deletes the account, its home directory and mail spool; files elsewhere stay orphaned | archive the home first, propose, wait for the go |
| `usermod -G grp alice` (no `-a`) | removes every other supplementary group, sudo included | always `-aG` |
| sshd/sudoers change | can lock every admin out | lock-out protocol above |

## Not verified

- Exact contents of the distro-shipped `sshd_config.d/` (cloud images may add files) - list them on the host
- Ubuntu socket-activated `ssh.socket` behaviour on port changes - Ubuntu docs show `systemctl restart ssh.service`
- `sudo`/`wheel` group defaults - read `/etc/sudoers` on the host
