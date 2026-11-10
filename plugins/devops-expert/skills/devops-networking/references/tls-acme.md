---
name: tls-acme
description: TLS certificates with ACME - choosing certbot, acme.sh, lego or the proxy's built-in ACME; HTTP-01 vs DNS-01, wildcard, staging, renewal, revocation
when-to-use: Issuing, renewing or debugging certificates; choosing the challenge type; wildcard or internal-host certificates
keywords: ACME, Let's Encrypt, certbot, acme.sh, lego, HTTP-01, DNS-01, wildcard, staging, renew, deploy-hook, revoke
priority: high
related: reverse-proxy.md, dns.md, troubleshooting-order.md, safe-network-changes.md
---

# TLS and ACME

**Load when:** a certificate must be obtained, renewed or replaced. Revocation and deletion are irreversible: show the exact effect first ([safe-network-changes.md](safe-network-changes.md)).

## 1. Choose the client

| Situation | Choice |
|-----------|--------|
| Traefik or Caddy in front | Use their built-in ACME (Traefik `certificatesResolvers`, Caddy automatic HTTPS); no second client on the same names |
| Nginx / Apache / HAProxy on a classic host | **certbot** (`nginx` or `webroot` plugin, DNS plugins), or **lego** / **acme.sh** if you want a single static binary / shell script |
| Wildcard, or host not reachable on port 80 | DNS-01 with a provider plugin (certbot DNS plugin, lego `--dns <provider>`, Caddy/Traefik DNS challenge) |
| Many hosts, central issuance | lego or certbot on one host, deploy with a hook; or one wildcard on a DMZ proxy |

## 2. Challenge types

| | HTTP-01 | DNS-01 |
|-|---------|--------|
| Needs | Port 80 reachable from the Internet to the host being validated | API credentials for the DNS zone (or a delegated `_acme-challenge` zone) |
| Wildcard | No | **Yes, the only way** with Let's Encrypt (certbot docs) |
| Works for internal-only hosts | No | Yes (record is public, host is not) |
| Risk | Port 80 must stay open; redirect must not break `/.well-known/acme-challenge/` | DNS API token in the host: scope it to TXT records of one zone, file mode 600 |
| Propagation | None | Wait for the TXT record; Traefik exposes `dnsChallenge.delayBeforeCheck` and `resolvers`; disabling the propagation check is flagged "NOT RECOMMENDED" (rate-limit risk) |

Traefik's resolver also offers TLS-ALPN-01 (`tlsChallenge`).

## 3. certbot

```bash
certbot certonly --webroot -w /var/www/acme -d app.example.com --dry-run   # test against staging, nothing stored
certbot certonly --webroot -w /var/www/acme -d app.example.com             # real issuance
certbot certificates                                                       # list lineages, expiry, paths
certbot renew --dry-run                                                    # test the renewal path (staging)
certbot renew --deploy-hook "systemctl reload nginx"                       # hook runs only after a successful renewal
```

- Files land in `/etc/letsencrypt/live/<name>/` (`fullchain.pem`, `privkey.pem`); point servers at these paths, never copy them.
- `--pre-hook` / `--post-hook` run around every renewal attempt; `--deploy-hook` only after success. `--dry-run` skips deploy hooks unless `--run-deploy-hooks`.
- Authenticators: `nginx`, `apache`, `webroot`, `standalone` (needs free port 80), DNS plugins, `manual` (no auto-renewal without hook scripts).
- Automatic renewal is set by the distribution package (timer or cron); verify with `systemctl list-timers | grep -i certbot` (not read today).

## 4. lego (v5 line) and acme.sh

```bash
# lego: wildcard via DNS-01 (credentials as environment variables of the chosen provider)
CLOUDFLARE_EMAIL=... CLOUDFLARE_API_KEY=... lego run --dns cloudflare -d 'example.org' -d '*.example.org'
```

Command shape from the lego v5.6.0 docs (`lego run --dns <provider> -d <domain>`); `--email` appears in other provider examples. Renewal subcommand and flags: read https://go-acme.github.io/lego/ for your version before scripting (the fetch tool returned only a redirect today). acme.sh is a pure-shell client (3.1.6; release tags signed from 3.1.6 on); its issue/deploy commands were not read today.

## 5. Safe defaults

1. **Staging first**: `https://acme-staging-v02.api.letsencrypt.org/directory` (Traefik `caServer`, Caddy `acme_ca`, certbot `--dry-run`/`--staging`). Production has rate limits: https://letsencrypt.org/docs/rate-limits/ (not read today).
2. One ACME client per name. Two clients competing for the same hostname produce validation races.
3. Persist ACME state: Traefik `acme.json` (mode 600, on a volume), Caddy's data dir, `/etc/letsencrypt`. Losing it forces re-issuance and burns rate limit.
4. Reload, do not restart, after renewal (`nginx -s reload` / `systemctl reload`); test the chain with `openssl s_client` (below).
5. Monitor expiry independently of the renewer (`devops-observability`); renewal failures are silent until the cert expires.

## 6. Checking a served certificate

```bash
openssl s_client -connect app.example.com:443 -servername app.example.com </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates -ext subjectAltName
openssl s_client -connect app.example.com:443 -servername app.example.com -showcerts </dev/null | head -40   # chain
curl -vI https://app.example.com 2>&1 | grep -E 'SSL|subject|expire|issuer|HTTP/'
```

`-servername` sets SNI; without it a multi-site proxy serves the default certificate and misleads you.

## 7. Revocation and deletion (exact effect)

| Command | Effect |
|---------|--------|
| `certbot revoke --cert-name X` (or `--cert-path`) | Revokes at the CA; add the same `--staging`/`--server` flag used at issuance; use only on key compromise; clients holding it get errors |
| `certbot delete --cert-name X` | Irreversible; deletes lineage files; does NOT revoke; services referencing `live/X` break on next reload |
| Deleting `acme.json` / account key | Loses issued certs and the ACME account; re-issue counts against rate limits |

Propose with ACTION / EFFECT / PROOF; issue and deploy the replacement before revoking.

## Sources (read 2026-11-10)

- https://eff-certbot.readthedocs.io/en/stable/using.html (plugin table, hooks, revoke, delete) via Context7 `/websites/eff-certbot_readthedocs_io_en_stable`; certbot 5.9.0 (https://github.com/certbot/certbot/releases.atom, 2026-10-29)
- https://letsencrypt.org/docs/challenge-types/ (updated 2026-02-12; "if unsure go with the client default or HTTP-01")
- Traefik ACME reference in Context7 `/traefik/traefik` v3.7.15 (caServer, keyType, dnsChallenge options)
- lego v5.6.0 (2026-10-28, https://github.com/go-acme/lego/releases.atom) via Context7 `/go-acme/lego`; acme.sh 3.1.6 (2026-09-20)

## Not verified

- Let's Encrypt rate-limit numbers and certificate lifetime policy (page not read); ZeroSSL/other CAs.
- lego `renew` flags and acme.sh command syntax; certbot's timer unit name per distro.
- `openssl x509 -ext` availability on old OpenSSL (needs 1.1.1+; not checked).
- Context7 IDs: certbot `/certbot/certbot` and `/websites/eff-certbot_readthedocs_io_en_stable`, lego `/go-acme/lego`, Traefik `/traefik/traefik` (resolved today).
