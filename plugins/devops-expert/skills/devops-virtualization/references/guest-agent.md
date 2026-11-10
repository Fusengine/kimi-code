---
name: guest-agent
description: The QEMU guest agent (qemu-ga) with libvirt - the virtio channel, what it enables (IP lookup, clean shutdown, filesystem freeze for snapshots), the agent RPC allow/block lists, and the Incus equivalent
when-to-use: A snapshot with --quiesce fails, virsh domifaddr shows nothing, shutdown hangs, or a new image template is being built
keywords: qemu-ga, qemu-guest-agent, org.qemu.guest_agent.0, virtio-serial, fsfreeze, quiesce, domifaddr, guestinfo, domfsfreeze, incus-agent
priority: medium
related: snapshots-migration.md, libvirt-domains.md, virt-customize-builder.md, cloud-init-nocloud.md
---

# Guest Agent (qemu-ga)

**Load when:** host-to-guest coordination is needed. The agent is software inside the guest talking over a virtio-serial channel; without both halves nothing works.

## Host half: the channel

```xml
<channel type='unix'>
  <source mode='bind' path='/var/lib/libvirt/qemu/web01.agent'/>
  <target type='virtio' name='org.qemu.guest_agent.0' state='connected'/>
</channel>
```

With QEMU, the name `org.qemu.guest_agent.0` is what lets libvirt "interact with a guest agent installed in the guest, for actions such as guest shutdown or file system quiescing" (https://libvirt.org/formatdomain.html). `virt-install` adds the channel for libosinfo-known guests (Not verified for every OS); check with `virsh dumpxml <dom> | grep -A3 guest_agent`.

## Guest half: the daemon

Package name differs by distribution (commonly `qemu-guest-agent`; verify in the image's package manager). qemu-ga defaults: transport `virtio-serial`, device `/dev/virtio-ports/org.qemu.guest_agent.0`, config `etc/qemu/qemu-ga.conf` relative to its install prefix (https://www.qemu.org/docs/master/interop/qemu-ga.html). Install it in the image (virt-customize `--install`, Packer provisioner, or cloud-init `packages:`) and enable its service.

## What it enables (virsh)

| Capability | Command |
|------------|---------|
| IP addresses | `virsh domifaddr <dom> --source agent` |
| Guest facts | `virsh guestinfo <dom> --os --filesystem --interface` |
| Clean shutdown via agent | `virsh shutdown <dom> --mode agent` |
| Consistent disk snapshot | `virsh snapshot-create-as <dom> <n> --disk-only --quiesce --atomic` (fails when no agent) |
| Manual freeze / thaw | `virsh domfsfreeze <dom>` ... `virsh domfsthaw <dom>` |
| Guest clock | `virsh domtime <dom>` |
| Raw agent call | `virsh qemu-agent-command <dom> '{"execute":"guest-ping"}'` (verify command names in the qemu-ga reference first) |

`domfsfreeze` blocks writes inside the guest until thawed: never leave a guest frozen; always pair freeze with thaw in a script with a trap.

## Security and hooks

qemu-ga supports allowed and blocked RPC lists; defining an allow list "blocks all RPCs by default except the allowed list", a block list allows all except the list; both together block first, then allow, then block (qemu-ga reference). While filesystems are frozen only a safe set of RPCs is available. A fsfreeze hook script (`-F[path]`, called with `freeze`/`thaw`) lets databases flush before the freeze. Treat the agent channel as a root-capable path into the guest: restrict RPCs on sensitive guests.

## Incus equivalent

Incus VMs use `incus-agent`; images from the `images:` remote have it set up. For other VMs, attach it with `incus config device add <inst> agent disk source=agent:config` and run the documented install script in the guest (see [incus-core.md](incus-core.md)). The Incus agent relies on TLS certificates, so "the guest clock needs to be reasonably in sync with the host".

## Verification

```bash
virsh -c qemu:///system domifaddr <dom> --source agent     # returns addresses = channel + daemon OK
virsh -c qemu:///system qemu-agent-command <dom> '{"execute":"guest-ping"}'   # {"return":{}} expected
```

## Pitfalls

- Channel present but daemon not running: `domifaddr --source agent` errors; fix the guest service, not the host XML.
- `--quiesce` on a guest with a database: the database may still need its own flush hook for application-consistent state.
- Cloning a guest with the same `state` path name for the unix socket is fine (libvirt auto-generates paths when omitted); hand-written paths must be unique per guest.

## Sources

https://libvirt.org/formatdomain.html (channel), https://www.qemu.org/docs/master/interop/qemu-ga.html , https://libvirt.org/manpages/virsh.html , https://linuxcontainers.org/incus/docs/main/howto/instances_create/ (read 2026-11-10).

## Not verified

- `guest-ping` command name and the `{"return":{}}` reply (standard qemu-ga protocol; the reference page fetched lists options, not the command catalogue).
- Package and service names per distribution.
- `domfsthaw` argument syntax (the command is listed in the virsh man page; its section was not read).
