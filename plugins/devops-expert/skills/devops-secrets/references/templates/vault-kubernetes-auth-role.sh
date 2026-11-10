#!/usr/bin/env bash
# REFERENCE ONLY - propose to the user, do not run as is. Placeholders only.
# Enables Kubernetes auth in Vault and defines one role. For OpenBao replace `vault` with `bao`.
# Source of the commands: Vault docs "Kubernetes - Auth Methods"
# (https://developer.hashicorp.com/vault/docs/auth/kubernetes), read 2026-11-10.
# No token, JWT or CA content appears here: files are referenced by path, 0600 where private.
# Not verified: the docs show `kubernetes_ca_cert=@ca.crt` and a literal token_reviewer_jwt; the
# `@file` form for token_reviewer_jwt is assumed to work the same way (check `vault write -h`).
# Lease renewal/revocation paths are intentionally absent from the policy: not read.
set -euo pipefail

: "${VAULT_ADDR:?set VAULT_ADDR to the Vault URL}"      # authenticate beforehand without echoing a token
K8S_HOST="https://CHANGE_ME_KUBERNETES_API:6443"
ROLE="CHANGE_ME_ROLE"
SA_NAME="CHANGE_ME_SERVICEACCOUNT"
SA_NAMESPACE="CHANGE_ME_NAMESPACE"
POLICY="app-CHANGE_ME_APP"          # policy from vault-policy.hcl

# 1. Enable the method (default path: kubernetes)
vault auth enable kubernetes

# 2. Configure how Vault reaches the Kubernetes API.
#    Choose ONE reviewer-token option from the Vault docs table (local token when Vault runs in the
#    cluster, client JWT as reviewer, long-lived reviewer token, or JWT auth instead).
#    Read the reviewer JWT from a file; never paste it on the command line.
vault write auth/kubernetes/config \
    token_reviewer_jwt=@"${REVIEWER_JWT_FILE:?path to reviewer JWT file, mode 0600}" \
    kubernetes_host="${K8S_HOST}" \
    kubernetes_ca_cert=@"${K8S_CA_FILE:?path to the cluster CA certificate}" \
    disable_iss_validation=true      # Kubernetes 1.21+ with auth mounts that predate Vault 1.9

# 3. Role: only this ServiceAccount in this namespace, short token lifetime.
vault write "auth/kubernetes/role/${ROLE}" \
    bound_service_account_names="${SA_NAME}" \
    bound_service_account_namespaces="${SA_NAMESPACE}" \
    policies="${POLICY}" \
    audience="CHANGE_ME_AUDIENCE" \
    ttl=1h

# 4. Verify (metadata only)
vault read "auth/kubernetes/role/${ROLE}"
