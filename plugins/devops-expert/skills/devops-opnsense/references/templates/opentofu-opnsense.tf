# Provider is third party and pre-1.0 (breaking schema changes expected; its README says not for production).
# Credentials: export OPNSENSE_API_KEY and OPNSENSE_API_SECRET; never write them here.
terraform {
  required_providers {
    opnsense = {
      source  = "browningluke/opnsense"
      version = "~> 0.16"
    }
  }
}

provider "opnsense" {
  uri = "https://fw.example.net"
}

resource "opnsense_firewall_filter" "allow_https" {
  enabled     = true
  description = "Allow inbound HTTPS to the web server"

  interface = {
    interface = ["wan"]
  }

  filter = {
    action    = "pass"
    direction = "in"
    protocol  = "TCP"

    source = {
      net = "any"
    }

    destination = {
      net  = "192.0.2.10"
      port = "https"
    }

    log = true
  }
}
# Always: plan, review, then apply. A rule on the interface you manage through = lock-out format.
