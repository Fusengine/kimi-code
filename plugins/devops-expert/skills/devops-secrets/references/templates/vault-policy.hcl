# Least-privilege policy for one application "CHANGE_ME_APP" (placeholders only).
# Policies are deny-by-default: anything not listed here is forbidden.
# Apply from Git through a pipeline, e.g.:  vault policy write app-CHANGE_ME_APP vault-policy.hcl
# KV v2: data lives under <mount>/data/..., metadata under <mount>/metadata/...

# Read the application's own static secrets (latest and versions), no write.
path "secret/data/apps/CHANGE_ME_APP/*" {
  capabilities = ["read"]
}

# List keys (key names are not filtered by policy: never encode secrets in names).
path "secret/metadata/apps/CHANGE_ME_APP/*" {
  capabilities = ["list", "read"]
}

# Dynamic database credentials for the application's role only.
path "database/creds/CHANGE_ME_APP-readwrite" {
  capabilities = ["read"]
}

# Explicitly forbid a sibling area even if a broader policy is attached later.
path "secret/data/apps/other-team/*" {
  capabilities = ["deny"]
}
