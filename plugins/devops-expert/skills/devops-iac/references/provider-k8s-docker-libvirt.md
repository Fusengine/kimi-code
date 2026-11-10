---
name: provider-k8s-docker-libvirt
description: Kubernetes, Helm, Docker and libvirt providers - versions, authentication, schema changes (Helm v3, libvirt 0.9 rewrite) and when not to use IaC for workloads
when-to-use: Declaring cluster add-ons, Helm releases, Docker hosts or KVM guests in HCL, or upgrading these providers
keywords: hashicorp/kubernetes, hashicorp/helm, helm_release, kreuzwerker/docker, dmacvicar/libvirt, libvirt_domain, kubeconfig, bootstrap
priority: medium
related: layout-providers-lock.md, state-backends-encryption.md, provider-proxmox.md
---

# Kubernetes, Helm, Docker, libvirt providers

**Load when:** one of these providers is added, bumped or debugged. Workload manifests belong to `devops-kubernetes` and GitOps/Helm authoring to `devops-gitops-packaging`; Docker/Compose to `devops-docker`; libvirt/KVM internals and Packer to `devops-virtualization`.

## Versions (registry, 2026-11-10)

| Provider | Source | Version | Tier / date |
|----------|--------|---------|-------------|
| Kubernetes | `hashicorp/kubernetes` | 3.5.0 | official, 2026-11-05 |
| Helm | `hashicorp/helm` | 3.3.0 | official, 2026-09-02 |
| Docker | `kreuzwerker/docker` | 4.6.0 | community, 2026-09-01 |
| libvirt | `dmacvicar/libvirt` | 0.9.9 | community, 2026-08-30 |

## When to use IaC for Kubernetes

Use the providers for **bootstrap and platform add-ons**: the cluster's namespaces, the GitOps controller install (Flux/Argo CD), CRDs, a CNI or ingress Helm release. Application workloads belong in Git, reconciled by the GitOps controller (`devops-gitops-packaging`); two controllers owning one object is a fight.

## Kubernetes provider

```hcl
provider "kubernetes" {
  config_path    = "~/.kube/config"     # the provider does not read KUBECONFIG by default
  config_context = "prod-eu"            # always name the context explicitly
}
```

- Requires Terraform 1.0 or later (docs). Resources come in plain and `_v1` forms: read the docs page for the one you use.
- **Never create the cluster and the Kubernetes/Helm resources in the same module/apply**: provider blocks are evaluated before resources, producing intermittent errors (provider docs warning). Two roots: cluster, then add-ons; pass data via data sources.
- Credentials with exec plugins or tokens come from the environment; they land in the plan if passed as variables (encrypt plans).

## Helm provider (v3 schema)

The v3 provider moved to the Plugin Framework: blocks became attributes. Pin `~> 3.3` and rewrite v2 configs.

```hcl
provider "helm" {
  kubernetes = { config_path = "~/.kube/config" }       # was: kubernetes { ... }
}
resource "helm_release" "addon" {
  name       = "addon"
  repository = "<chart repository URL>"
  chart      = "<chart name>"
  version    = "<pinned chart version>"                 # always pin the chart
  set = [{ name = "replicaCount", value = "2" }]        # was: set { ... } blocks
}
```

`registry` blocks became `registries = [...]`; `set_list`/`set_sensitive` are lists of objects; v3 speaks plugin protocol 6 (Terraform 1.0+), 2.x stays for older Terraform. A release `destroy` uninstalls the chart and may delete PVC-backed data depending on the chart: treat `-/+` on `helm_release` as destructive. Chart repository URLs and versions: verify at the chart's own docs (not reproduced here).

## Docker provider

```hcl
provider "docker" { host = "unix:///var/run/docker.sock" }     # or "ssh://user@remote-host:22" with ssh_opts
resource "docker_image" "app" { name = "registry.example.internal/app:1.4.2" }
resource "docker_container" "app" { name = "app"  image = docker_image.app.image_id }
```

- Pin images by tag or digest, never `latest`. Remote hosts apply daemon defaults (for example log options) that show as diffs: use `lifecycle { ignore_changes = [...] }` for those attributes (provider docs).
- Registry credentials via `registry_auth`; the Docker config file is read from the machine running the tool, not the Docker host.
- IaC-managed containers on a long-lived host belong to a Compose/Quadlet workflow in many teams (`devops-docker`); use this provider when the Docker host itself is part of a larger Terraform graph (for example the VM it runs on).
- The 4.x provider documents "actions" (container exec, image import/save, system prune) for Terraform; availability in OpenTofu is **not verified**.

## libvirt provider (0.9 rewrite)

v0.9.0+ is a complete rewrite on the Plugin Framework that models the libvirt XML schema directly; v0.8.x and earlier live on a legacy branch. Do not assume a 0.8 configuration works on 0.9: resource arguments are different (XML-shaped nested objects).

```hcl
provider "libvirt" { uri = "qemu:///system" }      # also qemu+ssh://user@host/system, qemu+sshcmd://, qemu+tls://
resource "libvirt_domain" "example" {
  name = "example-vm"  type = "kvm"  memory = 512  memory_unit = "MiB"  vcpu = 1
  os = { type = "hvm"  type_arch = "x86_64"  type_machine = "q35" }
}
```

Resources: `libvirt_domain`, `libvirt_network`, `libvirt_pool`, `libvirt_volume` (README); `libvirt_cloudinit_disk` and `libvirt_combustion` appear in the registry docs list. Pools support `create`/`destroy` lifecycle-control objects marked experimental (they steer post-define and pre-undefine operations such as build, start, autostart and delete). Read https://registry.terraform.io/providers/dmacvicar/libvirt/latest/docs and `docs/schema-mapping.md` before writing disks, networks and cloud-init.

## Pitfalls

- All four: `terraform { required_providers }` pins and the lock file (`layout-providers-lock.md`); a major provider bump is its own change with a plan that must show no resource changes.
- libvirt URIs over SSH use the Go SSH library or the native `ssh` command (`sshcmd` honours `~/.ssh/config`).
- Secrets in Helm `set_sensitive` or container env vars are in state: encrypt state.

## Verification

```bash
tofu providers && tofu validate
tofu plan -out=tfplan -detailed-exitcode          # after a provider bump: exit 0
```

## Sources

- https://registry.terraform.io/v1/providers/hashicorp/kubernetes , .../hashicorp/helm , .../kreuzwerker/docker , .../dmacvicar/libvirt
- https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/index.md
- https://raw.githubusercontent.com/hashicorp/terraform-provider-helm/main/docs/guides/v3-upgrade-guide.md
- https://raw.githubusercontent.com/kreuzwerker/terraform-provider-docker/master/docs/index.md
- https://raw.githubusercontent.com/dmacvicar/terraform-provider-libvirt/main/README.md

## Not verified

- Chart repository URLs, chart names and versions (placeholders in the example).
- libvirt resource arguments beyond the README example (disks, networks, cloud-init).
- Kubernetes provider resource coverage for the cluster's Kubernetes version.
- OpenTofu support for Terraform "actions" exposed by the Docker provider.
