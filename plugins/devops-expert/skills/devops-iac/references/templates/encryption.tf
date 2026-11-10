# OpenTofu-only state and plan encryption. Terraform rejects this block: never run Terraform on this root.
# Source: https://opentofu.org/docs/language/state/encryption/
#
# Before enabling on an existing state: tofu state pull > backup.tfstate (kept elsewhere), back up the passphrase.
# Supply the passphrase from the environment: export TF_VAR_state_passphrase=... (secret store), at least 16 characters.
# Step 1 (migration): apply once with the fallback below. Step 2: delete the fallback blocks, set enforced = true, apply again.
# Never rename the key provider or the methods after the first encrypted write.

variable "state_passphrase" {
  type      = string
  sensitive = true
}

terraform {
  encryption {
    key_provider "pbkdf2" "main" {
      passphrase = var.state_passphrase
    }

    method "aes_gcm" "main" {
      keys = key_provider.pbkdf2.main
    }

    # Migration only: lets OpenTofu read the existing unencrypted state/plan.
    method "unencrypted" "migrate" {}

    state {
      method = method.aes_gcm.main
      fallback {
        method = method.unencrypted.migrate
      }
      # enforced = true # enable after the migration, with the fallback removed
    }

    plan {
      method = method.aes_gcm.main
      fallback {
        method = method.unencrypted.migrate
      }
      # enforced = true
    }
  }
}
