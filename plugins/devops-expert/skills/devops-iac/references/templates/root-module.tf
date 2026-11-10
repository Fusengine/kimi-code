# Root module skeleton: pinned tool and providers, S3-compatible (MinIO) backend with native locking.
# Split into versions.tf / backend.tf / providers.tf / variables.tf in a real project.
# Credentials: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY from the environment (secret store), never here.
# Pair with encryption.tf (OpenTofu only). Review: enable bucket versioning before the first apply.

terraform {
  required_version = ">= 1.11.0"

  required_providers {
    proxmox = {
      source  = "bpg/proxmox"
      version = "~> 0.121.0" # 0.x provider: minor versions may break; bump in its own change
    }
  }

  backend "s3" {
    bucket = "tfstate"
    key    = "live/prod/compute/terraform.tfstate" # unique per root module
    region = "us-east-1"                           # dummy value for non-AWS stores

    endpoints = {
      s3 = "https://minio.example.internal:9000"
    }

    use_path_style = true
    use_lockfile   = true # needs conditional-write support on the server: test it

    skip_credentials_validation = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_s3_checksum            = true # only if the store rejects checksum headers
  }
}

variable "pve_endpoint" {
  type        = string
  description = "Proxmox VE API URL, for example https://pve.example.internal:8006/."
}

variable "pve_api_token" {
  type        = string
  description = "API token in the form user@realm!tokenid=secret, supplied via TF_VAR_pve_api_token."
  sensitive   = true
}

provider "proxmox" {
  endpoint  = var.pve_endpoint
  api_token = var.pve_api_token
}

output "state_key" {
  description = "Backend key of this root module, to eyeball the environment before an apply."
  value       = "live/prod/compute/terraform.tfstate"
}
