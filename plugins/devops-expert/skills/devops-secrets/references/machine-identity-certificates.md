---
name: machine-identity-certificates
description: Machine identity and short-lived credentials - workload identity, projected ServiceAccount tokens, JWT vs Kubernetes auth trade-offs, SPIFFE/SPIRE pointer, certificates as secrets
when-to-use: Replacing a stored workload credential with identity, choosing how a pod or job authenticates, deciding where TLS private keys and CA keys live
keywords: workload identity, serviceaccount token, bound token, JWT auth, TokenReview, SPIFFE, SPIRE, SVID, certificate, private key, PKI, short-lived
priority: medium
related: vault-openbao-access.md, container-ci-ansible-secrets.md, rotation-lifecycle.md
---

# Machine Identity and Certificates

**Load when:** a workload needs to prove who it is. Principle: authenticate with **identity**, receive a **short-lived** credential, and store nothing long-lived. ACME clients, DNS challenges and TLS termination: `devops-networking`.

## Identity sources

| Source | What it proves | Used with |
|--------|----------------|-----------|
| Kubernetes projected ServiceAccount token | Pod + ServiceAccount in a namespace; bound to the pod, expiring (default behaviour since 1.21) | Vault/OpenBao `kubernetes` or `jwt` auth, ESO Kubernetes auth |
| CI OIDC token | A specific workflow/repo/environment | Cloud IAM or Vault/OpenBao JWT auth ([container-ci-ansible-secrets.md](container-ci-ansible-secrets.md)) |
| SPIFFE/SPIRE SVID | A workload attested by node and workload selectors | mTLS between services, JWT-SVIDs |
| Platform instance identity | A VM on a given platform | Not covered (cloud-specific) |

## Kubernetes tokens: trade-off to state

| Choice | Early revocation | Notes (Vault docs) |
|--------|------------------|--------------------|
| `kubernetes` auth (TokenReview) | Yes: Kubernetes revokes the token with the pod/ServiceAccount | Vault needs a reviewer identity; ESO needs `system:auth-delegator` |
| `jwt` auth with Kubernetes as OIDC provider | **No**: Vault verifies the signature with public keys, so a revoked token stays valid until expiry | Mitigate with short token TTLs; useful when Vault cannot call the Kubernetes API or one mount serves several clusters |

Never mount a ServiceAccount token into a pod that does not need it (`automountServiceAccountToken: false`, devops-kubernetes), and never copy a pod's JWT to another application.

## SPIFFE/SPIRE (pointer)

SPIRE implements the SPIFFE APIs: a server (signing authority and registry of registration entries) and an agent per node exposing the Workload API; it attests nodes and workloads and issues X.509-SVIDs and JWT-SVIDs per trust domain. Adopt it for service-to-service mTLS across heterogeneous platforms; it is a tier-0 system with its own key custody. Deploying it is out of scope here; read the SPIRE docs.

## Certificates as secrets

- The **private key** is the secret; the certificate is public. Generate keys on the host that uses them and never move them through chat, tickets or Git.
- Vault/OpenBao PKI engine: issue short TTL leaf certificates after authentication, so revocation is rarely needed; consumers fetch at startup and can keep the key in memory only ([vault-openbao-access.md](vault-openbao-access.md)).
- CA hierarchy: keep the root CA key offline; issuing CAs are intermediates; plan the intermediate's own expiry and rotation as a runbook ([templates/rotation-runbook.md](templates/rotation-runbook.md)).
- Public-facing certificates: ACME via the reverse proxy or cert-manager-style tooling (`devops-networking`); the ACME account key and DNS-provider tokens are secrets too: scope the DNS token to the one zone and one record type where the provider allows.
- Monitor expiry (`devops-observability`) rather than trusting renewal automation silently.
- Rotating a compromised CA key is a full re-issue event: treat it as an incident, not a rotation ([leak-prevention-response.md](leak-prevention-response.md)).

## Sources (read 2026-11-10)

- https://developer.hashicorp.com/vault/docs/auth/jwt/oidc-providers/kubernetes
- https://developer.hashicorp.com/vault/docs/auth/kubernetes
- https://developer.hashicorp.com/vault/docs/secrets/pki
- https://spiffe.io/docs/latest/spire-about/spire-concepts/

## Not verified

- SPIRE version, deployment on Kubernetes (SPIFFE CSI driver, controller manager) and federation: not read.
- cert-manager and its Vault issuer: not researched (cert-manager belongs to devops-networking / devops-k8s-cluster).
- Provider-specific DNS token scoping: provider-dependent, not verified.
- Kubernetes `TokenRequest` audiences and `expirationSeconds` for projected volumes: not read today.
