# OpenStack-Helm (2026.2.0)

## Why it matters

OpenStack-Helm (OSH) runs OpenStack as Helm releases on a Kubernetes cluster you
already operate. You gain Kubernetes rolling updates and scheduling; you also
inherit two control planes to upgrade and debug. Kubernetes itself is out of
OSH scope (devops-kubernetes, devops-k8s-cluster).

## Tested combinations

From https://docs.openstack.org/openstack-helm/latest/readme.html (read 2026-11-10):

| OpenStack | Host OS | Image OS | Kubernetes |
|-----------|---------|----------|------------|
| 2025.2 Flamingo | Ubuntu Noble | Ubuntu Noble | >=1.33, <=1.35 |
| 2026.1 Gazpacho | Ubuntu Noble | Ubuntu Noble | >=1.33, <=1.35 |
| 2026.2 Hibiscus | Ubuntu Resolute | Ubuntu Resolute | >=1.33, <=1.35 |

Decision rule: run OSH only on a Kubernetes minor inside that range; a cluster on
1.36/1.37 is outside what OSH tests.

## Prerequisites (OSH install guide)

- Kubernetes cluster, `kubectl` and `helm` configured. The upstream `deploy-env` Ansible role builds a lab cluster only ("not production-ready").
- `openstack` namespace.
- External access: OSH charts **no longer ship Ingress templates**; expose services with Gateway API objects passed through `.Values.extraObjects` (examples in `values_overrides/<chart>/gateway.yaml`). OSH recommends Envoy Gateway + MetalLB. Legacy Ingress still works if you add the objects yourself.
- Ceph deployed and enabled for OSH (storage: devops-storage-backup).
- Helm repo and plugin:

```bash
helm repo add openstack-helm https://tarballs.opendev.org/openstack/openstack-helm
helm plugin install https://opendev.org/openstack/openstack-helm-plugin
```

Source: https://docs.openstack.org/openstack-helm/latest/install/before_starting.html,
https://docs.openstack.org/openstack-helm/latest/install/prerequisites.html.

## Values overrides by feature set

```bash
export OPENSTACK_RELEASE=2026.2
export FEATURES="${OPENSTACK_RELEASE} ubuntu_resolute"      # the docs example uses "2026.1 ubuntu_noble"
export OVERRIDES_DIR=$(pwd)/overrides
OVERRIDES_URL=https://opendev.org/openstack/openstack-helm/raw/branch/master/values_overrides
for chart in rabbitmq mariadb memcached openvswitch libvirt keystone heat glance cinder placement nova neutron horizon; do
  helm osh get-values-overrides -d -u ${OVERRIDES_URL} -p ${OVERRIDES_DIR} -c ${chart} ${FEATURES}
done
```

`helm osh get-values-overrides` looks up `<release>.yaml`, `<os>.yaml` and
`<release>-<os>.yaml` per chart. Check the `ubuntu_resolute` override files exist
for your charts before relying on the 2026.2 feature name (the docs page shows
the 2026.1 example).

## Deploy order

Backends first, then Keystone, then the rest; wait for pods between steps:

```bash
helm upgrade --install rabbitmq openstack-helm/rabbitmq --namespace=openstack \
  $(helm osh get-values-overrides -p ${OVERRIDES_DIR} -c rabbitmq ${FEATURES})
helm osh wait-for-pods openstack
# repeat for: mariadb, memcached, keystone, heat, glance, cinder, openvswitch, libvirt,
# placement, nova, neutron, horizon (libvirt waits for the Neutron agent pods)
```

The docs example sets `--set pod.replicas.server=1` on RabbitMQ and MariaDB:
that is a lab value. Production keeps three replicas for quorum.

Two override traps:
- Helm merges maps but **replaces lists**: two values files that both define `extraObjects` as a list silently keep only the last one. Use the map form.
- The docs Neutron example uses Open vSwitch (`openvswitch_agent`, `auto_bridge_add`); OVN on OSH needs the OVN chart and overrides - read the Neutron multiple-SDN spec in the OSH docs before choosing.

## Upgrades

OSH assumes every upgrade goes through Helm: chart templates, ConfigMaps/Secrets
(hash annotations trigger rolling updates) and image tags. Default rolling
update in charts: `max_unavailable: 1`, `max_surge: 3`, `revision_history: 3`
(https://docs.openstack.org/openstack-helm/latest/devref/upgrades.html).

Sequence per series:
1. Back up MariaDB (OSH docs: "Backing up a PVC", database troubleshooting pages) and the values files (git).
2. Re-download overrides for the new `OPENSTACK_RELEASE`, diff them.
3. `helm upgrade` backends, then Keystone, Placement before Nova, then the remaining charts; `helm osh wait-for-pods openstack` after each.
4. Watch PodDisruptionBudgets: rolling update values can conflict with them.

Rollback is `helm rollback <release> <revision>` for templates, but database
schema migrations are not rolled back - the DB backup remains the real rollback.

## Troubleshooting entry points

```bash
kubectl -n openstack get pods -o wide | grep -v -E 'Running|Completed'
kubectl -n openstack logs deploy/nova-scheduler --since=15m        # names depend on the chart
kubectl -n openstack get jobs | grep -v '1/1'                      # failed db-sync / bootstrap jobs
helm -n openstack history nova
```

## Not verified

- Existence of `ubuntu_resolute` values override files for every chart (feature name inferred from the 2026.2 Host OS column).
- Exact Deployment names inside each chart (`deploy/nova-scheduler` is an assumption; list with `kubectl get deploy`).
- OVN deployment steps on OSH.

## Sources

- https://docs.openstack.org/openstack-helm/latest/
- https://docs.openstack.org/openstack-helm/latest/install/openstack.html
- https://docs.openstack.org/openstack-helm/latest/install/kubernetes.html
- https://docs.openstack.org/openstack-helm/latest/devref/upgrades.html
- https://github.com/openstack/openstack-helm/tags
