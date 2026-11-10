# Plan-only tests for module-skeleton.tf (save both in one module directory as main.tf and main.tftest.hcl).
# `command = plan` never creates infrastructure; the default (`apply`) would. Run: tofu test
# Docs: https://opentofu.org/docs/cli/commands/test/

variables {
  name        = "web"
  environment = "dev"
  nics        = [{ bridge = "vmbr0" }]
}

run "defaults_produce_expected_name" {
  command = plan

  assert {
    condition     = output.full_name == "dev-web"
    error_message = "full_name must be <environment>-<name>."
  }

  assert {
    condition     = output.tags["managed-by"] == "opentofu"
    error_message = "the managed-by tag is missing."
  }
}

run "prod_enables_protection" {
  command = plan

  variables {
    environment = "prod"
  }

  assert {
    condition     = output.protect == true
    error_message = "prod must request destroy protection."
  }
}

run "rejects_unknown_environment" {
  command = plan

  variables {
    environment = "test"
  }

  expect_failures = [
    var.environment,
  ]
}

run "rejects_zero_cpu" {
  command = plan

  variables {
    cpu_cores = 0
  }

  expect_failures = [
    var.cpu_cores,
  ]
}

# For modules that create resources, add a mocked provider so plans need no platform access, for example:
# mock_provider "proxmox" {}
# then assert on planned values only (computed attributes such as ids need mock_resource defaults).
