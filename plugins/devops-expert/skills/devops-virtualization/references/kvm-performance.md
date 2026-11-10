---
name: kvm-performance
description: KVM/QEMU guest performance under libvirt - virtio devices, CPU model choice (host-model vs host-passthrough), hugepages, NUMA and vCPU/emulator/IOThread pinning, disk driver options, memory ballooning, with the migration trade-offs
when-to-use: A guest is slower than expected, a latency-sensitive or database workload is being placed, or a new guest template is being designed
keywords: virtio, host-passthrough, host-model, hugepages, memoryBacking, numatune, cputune, vcpupin, emulatorpin, iothreads, iothreadpin, cache none, discard unmap, queues, memballoon
priority: medium
related: libvirt-domains.md, pci-gpu-passthrough.md, snapshots-migration.md, guest-agent.md
---

# KVM Performance Settings (libvirt)

**Load when:** tuning a libvirt/KVM guest. Measure first (`virsh domstats`, in-guest tools, `devops-linux` perf-troubleshooting); apply one change at a time; keep the previous XML (`virsh dumpxml <dom> > before.xml`).

Reference: https://libvirt.org/formatdomain.html (read 2026-11-10; QEMU 11.1.3, libvirt 12.9.0).

## Decision rules

| Question | Choice | Why / trade-off |
|----------|--------|-----------------|
| Disk and NIC models | `virtio` (bus `virtio` or `scsi` controller `virtio-scsi`; NIC `<model type='virtio'/>`) | Paravirtual drivers; emulated e1000/IDE are slow. `virt-install --osinfo <id>` enables them for known OSes |
| CPU, one host, no migration | `<cpu mode='host-passthrough'/>` | Guest sees the host CPU; "cannot be reproduced on different hardware" |
| CPU, pool with live migration | `<cpu mode='host-model'/>` or a named model | `host-model` copies the host's model at start so the same XML works on different hosts; passthrough migration is "dangerous" unless hardware, QEMU, microcode and config are identical |
| Latency-sensitive / large RAM | hugepages + NUMA pinning | Fewer TLB misses; memory is reserved on the host (not overcommittable) |
| I/O-heavy disks | IOThreads, `cache='none'` | Separate event-loop thread per disk set |
| Memory elasticity | `<memballoon model='virtio'/>` | `virsh setmem --live` balloons a running guest (man page); the guest needs the virtio balloon driver |

## Hugepages

Guest side (XML):

```xml
<memoryBacking>
  <hugepages>
    <page size="1" unit="G" nodeset="0"/>
  </hugepages>
</memoryBacking>
```

Host side: pages must be reserved first, with kernel parameters (`hugepagesz=2M hugepages=512` example in the kernel doc) or at runtime via `/proc/sys/vm/nr_hugepages` (https://www.kernel.org/doc/html/latest/admin-guide/mm/hugetlbpage.html). Reserve before starting the guest; if the pool is too small the guest fails to start. Reserved pages are unavailable to everything else.

## NUMA and pinning

```xml
<vcpu>4</vcpu>
<cputune>
  <vcpupin vcpu='0' cpuset='2'/>   <vcpupin vcpu='1' cpuset='3'/>
  <vcpupin vcpu='2' cpuset='4'/>   <vcpupin vcpu='3' cpuset='5'/>
  <emulatorpin cpuset='0-1'/>
  <iothreadpin iothread='1' cpuset='0-1'/>
</cputune>
<numatune>
  <memory mode='strict' nodeset='0'/>
</numatune>
```

- The attribute is `vcpu=` on `<vcpupin>` (not `vcpuid`). `<emulatorpin>` and `<iothreadpin iothread= cpuset=>` keep QEMU's own threads off the vCPU cores.
- `<numatune><memory mode=... nodeset=.../>` modes: `interleave`, `strict`, `preferred`; `strict` fails the allocation instead of spilling to another node. QEMU driver only.
- Pick CPUs and nodes from the host topology (`lscpu`, `virsh nodeinfo`), keep the guest on one NUMA node when it fits, and do not pin to the CPUs that serve the host's own NIC/storage IRQs without checking.
- virt-install equivalents: `--cputune`, `--numatune`, `--iothreads`, `--memorybacking`, `--cpu` (man page).

## Disk driver options

```xml
<iothreads>2</iothreads>
<disk type='file' device='disk'>
  <driver name='qemu' type='qcow2' cache='none' discard='unmap' detect_zeroes='unmap' iothread='1'/>
  <source file='/srv/vm/images/db01.qcow2'/>
  <target dev='vda' bus='virtio'/>
</disk>
```

Verified attribute meanings (formatdomain): `cache` = default | none | writethrough | writeback | directsync | unsafe (`unsafe` ignores guest sync requests - never for data you care about); `io` = threads | native | io_uring; `discard` = unmap | ignore (lets TRIM free space in sparse files); `detect_zeroes` = off | on | unmap (CPU cost); `iothread` assigns the disk to one of the domain's IOThreads; `queues` sets virtio queue count.

## Applying and rolling back

```bash
virsh -c qemu:///system dumpxml <dom> > /root/<dom>.before.xml    # rollback copy
virsh -c qemu:///system shutdown <dom>                             # wait for shut off
virsh -c qemu:///system edit <dom>                                 # apply the XML change
virsh -c qemu:///system start <dom>
# rollback: virsh define /root/<dom>.before.xml   (guest shut off)
```

Fragment to copy: [templates/libvirt-domain-tuned.xml](templates/libvirt-domain-tuned.xml). Host CPU/IRQ isolation (`isolcpus`, tuned profiles) is `devops-linux` territory and was not verified here.

## Verification

```bash
virsh -c qemu:///system vcpupin <dom> ; virsh -c qemu:///system emulatorpin <dom>
virsh -c qemu:///system numatune <dom>
virsh -c qemu:///system domstats <dom> --block --iothread --cpu-total
grep -i huge /proc/meminfo          # HugePages_Free drops when the guest runs
```
Then re-run the workload benchmark and compare with the pre-change numbers; keep both in the report.

## Pitfalls

- `host-passthrough` plus live migration between non-identical hosts: the guest can crash or the migration is refused.
- Hugepages configured in XML without reserving them on the host: start failure. Reserving without using them: wasted RAM.
- Pinning two guests to the same cores silently halves both.
- `cache='unsafe'` or ignoring flushes can lose data on host crash.

## Not verified

- Recommended combinations of `io='native'` with `cache='none'` (general QEMU guidance, not read in the page fetched).
- Gains from any setting on your hardware: none measured here; always benchmark.
- `isolcpus`/tuned guidance (not fetched).
