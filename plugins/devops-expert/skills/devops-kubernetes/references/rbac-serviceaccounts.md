---
name: rbac-serviceaccounts
description: Least-privilege RBAC, ServiceAccounts, token mounting, Pod Security Admission and the restricted securityContext
when-to-use: Granting a workload or a person API access, checking who can do what, hardening pod settings
keywords: rbac, role, rolebinding, clusterrole, serviceaccount, automountServiceAccountToken, auth can-i, pod security admission, securityContext
priority: high
related: config-secrets.md, network-policy.md
---

# RBAC, ServiceAccounts and Pod Security

**Load when:** a workload needs to call the API, a user needs access, a `Forbidden` error appears, or pod security settings must be written.
A full cluster security audit belongs to `security-expert`; this file is the operator's day-to-day.

## Decision rules

1. **One ServiceAccount per workload**, never `default`. Most apps never call the API: set `automountServiceAccountToken: false` (on the ServiceAccount or the pod spec) so no token is mounted.
2. **Namespaced first**: `Role` + `RoleBinding`. A `ClusterRole` bound with a **RoleBinding** stays namespaced - use that to reuse a rule set across namespaces. `ClusterRoleBinding` only for truly cluster-wide needs.
3. **Name resources and verbs exactly** - `resourceNames` when the workload touches one object; no `*` on verbs, resources or apiGroups.
4. **Dangerous grants need an explicit reason** (`rbac.authorization.k8s.io/v1` page): `escalate` and `bind` verbs on roles, `impersonate`, `create` on pods or workload controllers (it implies reading every Secret of the namespace), `get/list/watch` on secrets, `nodes/proxy`.
5. Humans get access through groups from the identity provider, bound to roles - not per-user bindings scattered across namespaces.

## Checking access (read-only)

```bash
kubectl --context "$CTX" auth whoami
kubectl --context "$CTX" -n "$NS" auth can-i --list --as=system:serviceaccount:"$NS":web
kubectl --context "$CTX" -n "$NS" auth can-i create pods --as=system:serviceaccount:"$NS":web
kubectl --context "$CTX" get rolebindings,clusterrolebindings -A -o wide | grep -w web
```

`--as` uses impersonation: the operator needs `impersonate` rights for it to work. A `no` from `can-i` is the proof that a grant is absent.

→ Template: [rbac-least-privilege.yaml](templates/rbac-least-privilege.yaml)

## Pod Security Admission (namespace labels)

Labels `pod-security.kubernetes.io/<MODE>: <LEVEL>` and `pod-security.kubernetes.io/<MODE>-version: <VERSION>` on the Namespace.
Modes: `enforce` (reject), `audit` (annotate audit log), `warn` (client warning). Levels: `privileged`, `baseline`, `restricted`.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: shop
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: v1.37
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/audit: restricted
```

Pinning `enforce-version` stops a control-plane upgrade from tightening the policy under running apps; bump it deliberately.
Introduce `restricted` with `warn` + `audit` first, read the warnings, then add `enforce` - and test with a server dry-run:

```bash
kubectl --context "$CTX" label --dry-run=server --overwrite ns shop pod-security.kubernetes.io/enforce=restricted
```

## The `restricted` securityContext (verified at the Pod Security Standards page)

| Field | Required value |
|-------|----------------|
| `allowPrivilegeEscalation` | `false` |
| `runAsNonRoot` | `true` (pod or container level) |
| `seccompProfile.type` | `RuntimeDefault` or `Localhost` |
| `capabilities.drop` | list that includes `ALL`; only `NET_BIND_SERVICE` may be added |
| volumes | no `hostPath`; only the allowed volume types |

Add on top (not required by the level, but cheap): `readOnlyRootFilesystem: true` with an `emptyDir` for `/tmp`, an explicit numeric `runAsUser`/`runAsGroup` so `runAsNonRoot` can be checked against images without a numeric `USER`.

## Pitfalls

| Symptom | Cause | Fix |
|---------|-------|-----|
| `forbidden: User "system:serviceaccount:ns:web" cannot list ...` | Missing Role rule or binding in that namespace | Add the narrowest rule; prove with `auth can-i` |
| Pod rejected `violates PodSecurity "restricted:..."` | Missing securityContext field | Message names each field; fix the manifest, not the label |
| `container has runAsNonRoot and image will run as root` | Image `USER` is root or non-numeric | Set `runAsUser` to the image's UID, or fix the image (devops-docker) |
| Token found in a pod that never calls the API | automount left on | `automountServiceAccountToken: false` |

## Verification

```bash
kubectl --context "$CTX" -n "$NS" get pod "$POD" -o jsonpath='{.spec.serviceAccountName}{" automount="}{.spec.automountServiceAccountToken}{"\n"}'
kubectl --context "$CTX" get ns "$NS" --show-labels | tr ',' '\n' | grep pod-security
```

## Sources (read 2026-11-10)

- https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- https://kubernetes.io/docs/concepts/security/pod-security-standards/
- https://kubernetes.io/docs/concepts/security/pod-security-admission/
- https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/ (`kubectl label --dry-run=server` to evaluate a level)

## Not verified

- The full list of volume types allowed by `restricted` (see the Pod Security Standards page before relying on a specific type).
- That `impersonate`, `nodes/proxy` belong on the dangerous list is general RBAC guidance; only `escalate`/`bind` were matched on the RBAC page today.
