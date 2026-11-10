---
name: config-secrets
description: Consuming ConfigMaps and Secrets in workloads, update semantics, rollout on change, Secret handling rules
when-to-use: Wiring configuration or credentials into pods, config changes not picked up, reviewing Secret exposure
keywords: configmap, secret, envFrom, volume mount, subPath, immutable, encryption at rest, checksum annotation
priority: high
related: rbac-serviceaccounts.md, kubectl-safe-ops.md
---

# Config and Secrets (usage)

**Load when:** passing configuration or credentials to a workload, or a changed value does not reach the pods.
Where secret values come from (SOPS, Vault/OpenBao, External Secrets) is devops-secrets; this file covers how pods consume them.

## Facts that drive the decisions (verified)

| Fact | Consequence |
|------|-------------|
| Secrets are stored **unencrypted** in etcd by default; anyone with etcd access can read them | Encryption at rest is a cluster setting (devops-k8s-cluster); base64 in YAML is encoding, not protection |
| Anyone allowed to create a Pod in a namespace can mount any Secret of that namespace | RBAC on `pods` create is effectively Secret read - namespace = trust boundary |
| ConfigMap data is limited to 1 MiB | Large files go to a volume or an image, not a ConfigMap |
| Mounted ConfigMap/Secret volumes are refreshed by the kubelet on its periodic sync | Files change eventually, the app must re-read them |
| Values consumed as **env vars are not updated**; a pod restart is required | Env-based config needs a rollout on change |
| A **`subPath`** mount never receives updates | Avoid `subPath` for config that changes |
| `immutable: true` (stable since v1.21) on ConfigMaps and Secrets | Protects against accidental edits and cuts kubelet watch load; change = new object |

## Decision rules

1. Non-sensitive settings → ConfigMap; credentials, tokens, keys, certificates → Secret. Never put a credential in a ConfigMap, an env literal in the manifest, or an image.
2. Prefer **volume mounts** for Secrets over env vars: env vars leak into crash dumps, `/proc/<pid>/environ`, child processes and debug output.
3. Choose one update model and state it:
   - **Immutable + versioned name** (`app-config-v7`): a change creates a new object and the Deployment references it → automatic rollout, trivial rollback. Best default.
   - **Mutable + checksum annotation** on the pod template (`checksum/config: <sha256>`), computed by the packaging tool (devops-gitops-packaging) → rollout when content changes.
   - **Mutable, live reload**: only if the app watches its files; no `subPath`.
4. Mark optional references explicitly (`optional: true`) - otherwise a missing key keeps the pod in `CreateContainerConfigError`.

## Consumption patterns

```yaml
spec:
  containers:
    - name: app
      envFrom:
        - configMapRef: { name: app-config-v7 }        # non-sensitive only
      env:
        - name: DB_USER
          valueFrom:
            secretKeyRef: { name: db-credentials, key: username }
      volumeMounts:
        - name: db-credentials
          mountPath: /var/run/secrets/db
          readOnly: true
  volumes:
    - name: db-credentials
      secret:
        secretName: db-credentials
        defaultMode: 0400
```

## Handling rules for the agent

- Never `kubectl get secret -o yaml`, `-o json`, `describe` with values, or `base64 -d` a value into the conversation or a log. To check presence and keys only:

```bash
kubectl --context "$CTX" -n "$NS" get secret db-credentials -o jsonpath='{.data}' | jq 'keys'
```

- Never write a real value in a manifest committed to Git; generate Secrets from the secret store (devops-secrets).
- Creating a Secret by hand is a last resort; if the user insists, read the value from a file with restricted permissions (`kubectl create secret generic ... --from-file=`) rather than a command-line literal that lands in shell history, and use `--dry-run=client -o yaml` only into an encrypted pipeline, never to stdout in the chat.
- Redact values before quoting any manifest, event or log.

## Pitfalls

| Symptom | Cause | Fix |
|---------|-------|-----|
| `CreateContainerConfigError` | Missing ConfigMap/Secret or key | `kubectl describe pod` → event names the missing ref |
| New value not seen | Env var or `subPath` | Roll out, or switch to a plain volume mount |
| Rollback restores old code but new config | Mutable shared ConfigMap | Versioned immutable names |
| Secret readable by a team that should not | They can create pods in the namespace | Split namespaces; tighten RBAC |

## Verification

```bash
kubectl --context "$CTX" -n "$NS" get pod "$POD" -o jsonpath='{.spec.containers[*].envFrom}{"\n"}{.spec.volumes}'
kubectl --context "$CTX" -n "$NS" exec "$POD" -c app -- ls -l /var/run/secrets/db   # names and modes, never cat
```

## Sources (read 2026-11-10)

- https://kubernetes.io/docs/concepts/configuration/configmap/
- https://kubernetes.io/docs/concepts/configuration/secret/

## Not verified

- The exact kubelet refresh delay for mounted ConfigMaps/Secrets (depends on sync period and cache TTL; not quantified here).
- `jq` availability on the operator machine (any JSON tool that prints only keys works).
- The env-var leak paths listed in rule 2 are general Linux behaviour, not taken from the Kubernetes page.
