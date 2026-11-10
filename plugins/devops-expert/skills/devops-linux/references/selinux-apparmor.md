---
name: selinux-apparmor
description: Operating SELinux (RHEL family) and AppArmor (Debian/Ubuntu) - reading denials, fixing labels, ports, booleans and profile modes
when-to-use: A service fails with permission denied although Unix permissions look right, or a non-default path/port is introduced
keywords: SELinux, getenforce, semanage fcontext, restorecon, setsebool, semanage port, ausearch, audit2allow, AppArmor, aa-status, aa-complain, apparmor_parser
priority: high
related: systemd-hardening-resources.md
---

# SELinux and AppArmor (operation)

**Load when:** "permission denied" with correct owner/mode, a service moved to a non-default path or port,
or a profile blocks an application. Policy audits and benchmarks belong to `security-expert`.

Sources (read 2026-11-10): SELinux userspace man pages at https://github.com/SELinuxProject/selinux
(`python/semanage/semanage-fcontext.8`, `semanage-port.8`, `semanage-boolean.8`, `semanage-permissive.8`,
`policycoreutils/setfiles/restorecon.8`, `policycoreutils/setsebool/setsebool.8`,
`libselinux/man/man8/getenforce.8`, `python/audit2allow/audit2allow.1`),
https://github.com/linux-audit/audit-userspace/blob/master/docs/ausearch.8,
https://documentation.ubuntu.com/server/how-to/security/apparmor/.

## Decision Rules

1. Denial suspected -> **read the log first**, do not change modes.
2. Wrong label on a custom path -> `semanage fcontext` + `restorecon` (never `chcon` as the fix - a relabel undoes it).
3. Service on a non-default port -> `semanage port -a`.
4. Documented behaviour switch exists -> boolean (`setsebool -P`).
5. Only then, and only for a vendor gap -> local module from `audit2allow`, reviewed line by line.
6. Diagnosing one domain -> `semanage permissive -a <domain_t>` (that domain only), never `setenforce 0` host-wide.

Detect which MAC is active: `getenforce` (SELinux) / `aa-status` (AppArmor). Ubuntu installs and loads
AppArmor by default (Ubuntu docs); Debian uses AppArmor and RHEL family SELinux - confirm on the host.

## SELinux - Read the Denial

```bash
getenforce                                              # Enforcing | Permissive | Disabled
ausearch -m avc,user_avc,selinux_err,user_selinux_err -i -ts recent   # last 10 minutes
ls -Z /srv/www; ps -eZ | grep httpd                     # file and process contexts
```

## SELinux - Fix

```bash
# Custom content path for a web server (example from semanage-fcontext(8))
semanage fcontext -a -t httpd_sys_content_t "/web(/.*)?"
restorecon -R -v /web

# Label a tree like an existing one
semanage fcontext -a -e /home /home1 && restorecon -R -v /home1

# Non-default port
semanage port -a -t http_port_t -p tcp 81
semanage port -l | grep http_port_t

# Boolean - persistent across reboot only with -P
setsebool -P httpd_can_sendmail on
semanage boolean -l -C                                 # locally changed booleans

# Preview a relabel without changing anything
restorecon -R -n -v /web
```

Local module (last resort, review the generated `.te` before loading):

```bash
ausearch -m avc -ts recent | audit2allow -M local_myapp   # writes local_myapp.te / .pp
# review local_myapp.te, then: semodule -i local_myapp.pp
```

## AppArmor (Debian/Ubuntu)

```bash
aa-status                                  # loaded profiles and their modes
journalctl -k -b | grep -i apparmor        # DENIED lines name the profile and path
aa-complain /path/to/bin                   # log instead of block (diagnosis only)
aa-enforce /path/to/bin                    # back to enforcing
apparmor_parser -r /etc/apparmor.d/profile.name   # reload after editing
```

Local additions go in the profile's `local/` include (if the profile ships one) instead of the vendor file.
Disable one profile (documented method): link it into `/etc/apparmor.d/disable/` and unload with
`apparmor_parser -R /etc/apparmor.d/profile.name`.

## Destructive / Risky Operations

| Command | Exact effect | Rule |
|---------|--------------|------|
| `setenforce 0` | whole host permissive until reboot or `setenforce 1` | diagnosis only, minutes, with the owner's go; prefer per-domain permissive |
| SELINUX=disabled in `/etc/selinux/config` | removes MAC at next boot; files created meanwhile get no label | never as a fix |
| `semodule -i` of an `audit2allow` module | permanently widens policy | review the `.te`, propose, wait for the go |
| `restorecon -R -F /` | resets every label including customised user/role/range | scope to the path at issue |
| AppArmor profile disabled | the confined program runs unconfined | name the profile and reason, wait for the go |

## Verification

```bash
ls -Z /web | head; restorecon -R -n -v /web     # no output = labels already correct
ausearch -m avc -ts recent                       # no new denials after retest
aa-status | grep -A2 'profiles are in enforce mode'
```

## Pitfalls

- `chcon` used as a fix - lost on the next relabel or `restorecon`
- `setsebool` without `-P` - reverts at reboot
- `audit2allow` run on every denial - grants the attack along with the bug

## Not verified

- `semodule -i`, `chcon`, `ls -Z`/`ps -eZ` were not re-read at a man page this session
- The AppArmor `local/` include convention varies by profile - check the profile's `include` lines
- RHEL docs (docs.redhat.com) returned Access Denied; RHEL-specific guidance was not cross-checked there
- Default MAC per distro (Debian AppArmor, RHEL SELinux enforcing) and the relabel needed after re-enabling SELinux
- `restorecon -F` resets user/role/range as well as type (from restorecon(8)); `-R -F /` scope advice is practice
