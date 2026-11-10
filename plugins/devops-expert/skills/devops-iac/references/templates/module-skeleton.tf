# Reusable module skeleton: typed, described and validated inputs, locals, documented outputs.
# It declares no provider block and no resource, so `tofu test` (main.tftest.hcl) runs fully offline.
# Add resources of one provider below, declaring it in required_providers with a minimum version only.

terraform {
  required_version = ">= 1.11.0"
}

variable "name" {
  type        = string
  description = "Short guest name, lowercase letters, digits and dashes."

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,30}$", var.name))
    error_message = "name must start with a letter and contain only lowercase letters, digits and dashes (2 to 31 characters)."
  }
}

variable "environment" {
  type        = string
  description = "Deployment environment."

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod."
  }
}

variable "cpu_cores" {
  type        = number
  description = "vCPU count."
  default     = 2

  validation {
    condition     = var.cpu_cores >= 1 && var.cpu_cores <= 32 && floor(var.cpu_cores) == var.cpu_cores
    error_message = "cpu_cores must be a whole number between 1 and 32."
  }
}

variable "memory_mb" {
  type        = number
  description = "Memory in MiB."
  default     = 2048

  validation {
    condition     = var.memory_mb >= 512 && var.memory_mb % 256 == 0
    error_message = "memory_mb must be at least 512 and a multiple of 256."
  }
}

variable "nics" {
  type = list(object({
    bridge  = string
    vlan_id = optional(number)
  }))
  description = "Network interfaces; the first entry is the primary NIC."

  validation {
    condition     = length(var.nics) >= 1
    error_message = "at least one NIC is required."
  }

  validation {
    condition     = alltrue([for n in var.nics : n.vlan_id == null ? true : (n.vlan_id >= 1 && n.vlan_id <= 4094)])
    error_message = "vlan_id must be between 1 and 4094 when set."
  }
}

variable "extra_tags" {
  type        = map(string)
  description = "Additional tags merged over the defaults."
  default     = {}
}

locals {
  full_name = "${var.environment}-${var.name}"
  tags = merge(
    { environment = var.environment, managed-by = "opentofu" },
    var.extra_tags,
  )
  protect = var.environment == "prod" # feed lifecycle.prevent_destroy of module resources (dynamic since OpenTofu 1.12)
}

output "full_name" {
  description = "Environment-prefixed guest name."
  value       = local.full_name
}

output "tags" {
  description = "Effective tags."
  value       = local.tags
}

output "protect" {
  description = "True when destroy protection should be enforced by the resources of this module."
  value       = local.protect
}
