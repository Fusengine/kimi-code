---
name: reverse-proxy
description: Choosing and configuring a reverse proxy - Traefik, Nginx, Caddy, HAProxy - TLS termination, HTTP/2 and HTTP/3, proxy headers, rate limiting, health checks
when-to-use: Putting services behind a proxy, picking the proxy, fixing wrong client IP/scheme, WebSockets, 502/504, enabling HTTP/3
keywords: Traefik, Nginx, Caddy, HAProxy, TLS termination, X-Forwarded-For, proxy_set_header, http2, http3, quic, limit_req, health check, trusted_proxies
priority: high
related: tls-acme.md, nftables-firewall.md, troubleshooting-order.md
---

# Reverse Proxy

**Load when:** a service is published over HTTP(S). Kubernetes ingress: `devops-kubernetes` (Gateway API); containers on a Docker host with labels: `devops-docker`.

## 1. Choose

| Need | Pick | Templates |
|------|------|-----------|
| Few services, automatic HTTPS, minimal config | **Caddy** (automatic HTTPS, `reverse_proxy`, health checks) | [Caddyfile](templates/Caddyfile) |
| Dynamic discovery (Docker labels, Kubernetes, file provider), middlewares | **Traefik** v3 | [traefik-static.yml](templates/traefik-static.yml), [traefik-dynamic.yml](templates/traefik-dynamic.yml) |
| Classic host, static sites + proxy, huge ecosystem, fine control | **Nginx** | [nginx-proxy.conf](templates/nginx-proxy.conf) |
| High-throughput L4/L7 load balancing, stick tables, advanced health checks | **HAProxy** (3.4 LTS) | [haproxy.cfg](templates/haproxy.cfg) |
| TCP/UDP load balancing (databases, SMTP) | HAProxy (`mode tcp`) or Nginx `stream` | pointer only |

Run exactly one proxy per public port. Do not stack proxies without declaring trust (section 3).

## 2. TLS termination

- Terminate at the proxy, plain HTTP to the backend on a private/loopback address. If the hop crosses an untrusted network, re-encrypt (HAProxy `server ... ssl verify required ca-file ...`, Nginx `proxy_pass https://`).
- Minimum TLS 1.2: Nginx `ssl_protocols TLSv1.2 TLSv1.3;`, Traefik `tls.options.<n>.minVersion: VersionTLS12`, HAProxy `bind ... ssl-min-ver TLSv1.2`. Grading and cipher audit: `security-headers` / `security-expert`.
- Certificates: [tls-acme.md](tls-acme.md). HAProxy wants cert + key in one PEM.
- HSTS only after HTTPS works everywhere for that name; a long `max-age` is hard to undo.

## 3. Proxy headers (the usual bug)

The backend must see the client IP and the original scheme/host.

| Header | Nginx | Caddy | Traefik | HAProxy |
|--------|-------|-------|---------|---------|
| Host | `proxy_set_header Host $host;` (default would be `$proxy_host`) | passed through unchanged | passed through | passed through |
| Client IP | `X-Real-IP $remote_addr`, `X-Forwarded-For $proxy_add_x_forwarded_for` | sets/augments `X-Forwarded-For` | sets `X-Forwarded-For` | `option forwardfor` |
| Scheme | `X-Forwarded-Proto $scheme` | sets `X-Forwarded-Proto` | sets `X-Forwarded-Proto` | `http-request set-header X-Forwarded-Proto https if { ssl_fc }` |

- Caddy ignores incoming `X-Forwarded-*` by default to prevent spoofing; behind a CDN or another proxy declare it with the global `servers { trusted_proxies static <CIDRs> }` (recommended over the per-proxy setting).
- Nginx: `proxy_set_header` directives are inherited from the previous level only if the current level defines none; redefining one in a `location` drops the server-level ones.
- The backend app must be told to trust the proxy (framework "trusted proxies" setting) and only from the proxy's address; trusting `X-Forwarded-For` from anywhere allows IP spoofing.
- WebSockets: Nginx needs `Upgrade` and `Connection` passed explicitly (hop-by-hop headers); `proxy_http_version 1.1` before nginx 1.29.7 (nginx.org websocket page).

## 4. HTTP/2 and HTTP/3

- Nginx: `listen 443 ssl; http2 on;` (nginx.org example for ngx_http_v2_module; needs ALPN, OpenSSL 1.0.2+); HTTP/3: `listen 443 quic reuseport;` + `listen 443 ssl;` + `add_header Alt-Svc 'h3=":443"; ma=86400';`, build with `--with-http_v3_module`; the nginx doc recommends the same port for h3 and https.
- HTTP/3 uses **UDP 443**: open it in the firewall (templates/nftables.conf has it). Without it clients silently fall back to h2.
- Caddy: HTTP/3 handled through the global `servers { protocols h1 h2 h3 }` option (default set not confirmed today). HAProxy: `alpn h2,http/1.1` on `bind`.

## 5. Rate limiting and health checks

| Proxy | Rate limit | Health check |
|-------|-----------|--------------|
| Nginx | `limit_req_zone $binary_remote_addr zone=perip:10m rate=10r/s;` + `limit_req zone=perip burst=20 nodelay;` | passive: `max_fails` / `fail_timeout` on `server`; active checks are an NGINX Plus feature (not verified) |
| Traefik | `rateLimit` middleware: `average`, `period` (default 1s), `burst` | `loadBalancer.healthCheck: {path, interval, timeout}` |
| Caddy | no built-in rate limiter in the standard distribution (plugin; not verified) | `health_uri`, `health_interval`, `health_timeout` (active); `max_fails`, `fail_duration` (passive) |
| HAProxy | stick table + `http-request track-sc0 src` + `deny if { sc_http_req_rate(0) gt N }` | `option httpchk` / `http-check`, `check` + `inter rise fall` on `server` |

Rate limiting by IP behind another proxy limits the proxy's IP unless the real client IP is restored first.

## 6. Applying changes (all graceful, all with a check first)

| Proxy | Check | Reload |
|-------|-------|--------|
| Nginx | `nginx -t` | `systemctl reload nginx` |
| Caddy | `caddy validate --config /etc/caddy/Caddyfile` | `caddy reload --config ...` or `systemctl reload caddy` |
| HAProxy | `haproxy -c -f /etc/haproxy/haproxy.cfg` | `systemctl reload haproxy` |
| Traefik | file provider `watch: true` hot-reloads the dynamic directory; static config needs a restart | `systemctl restart traefik` (brief connection reset: propose it) |

## Pitfalls

| Trap | Consequence |
|------|-------------|
| `proxy_pass http://app/;` vs without trailing slash | Path rewriting differs; test URLs with a query and a sub-path |
| Backend redirects to `http://` | Missing `X-Forwarded-Proto`; mixed content / redirect loops |
| 502 after deploy | Backend not listening on the address used; `ss -tlnp`, then `curl -v http://127.0.0.1:8080/healthz` from the proxy host |
| 504 | Upstream slow: check `proxy_read_timeout` (Nginx), backend load; not a network fault by default |
| HTTP-01 behind a blanket redirect | Challenge path must be served on port 80 before the redirect |
| Dashboard/API exposed | Traefik `api.insecure` is unauthenticated: never on a public interface |

## Verification

`curl -sv -o /dev/null https://app.example.com/ 2>&1 | grep -E 'HTTP/|subject|alt-svc'`; `curl --http3 -I https://app.example.com` (needs an HTTP/3-capable curl); check the app sees the real client IP in its log; `ss -tulpn | grep -E ':(80|443)\b'`.

## Sources (read 2026-11-10)

- nginx.org via Context7 `/websites/nginx_en`: ngx_http_proxy_module, ngx_http_v2_module, ngx_http_v3_module / quic.html, ngx_http_limit_req_module, websocket.html
- https://caddyserver.com/docs/caddyfile/directives/reverse_proxy , `/caddyfile/options`, `/caddyfile/directives/encode` via Context7 `/websites/caddyserver_caddyfile`
- Traefik v3.7.15 docs via Context7 `/traefik/traefik` (entryPoints, file provider, healthCheck, rateLimit, tls options)
- HAProxy docs via Context7 `/haproxy/docs` (bind ssl/alpn, redirect, stick-table actions, httpchk)
- Versions (endoflife.date API, 2026-11-10): Nginx mainline 1.31.8, 1.30.6 (1.29 EOL 2026-05-13); HAProxy 3.4.7 (LTS, EOL 2031-04-01), 3.3.17, 3.2.26 (LTS); Traefik 3.7.18 (GitHub releases feed; endoflife lists 3.7.17), 3.6 EOL 2026-08-16; Caddy 2.11.9

## Not verified

- Which nginx line is "stable" (even minor 1.30 assumed from nginx convention; nginx.org news page not read).
- Caddy `lb_policy` names, built-in HTTP/3 default, absence of a standard rate-limit module; NGINX Plus-only active checks.
- HAProxy `deny_status`, `http-check send`, `option forwardfor`, `stick-table ... store http_req_rate` in a frontend: standard syntax, individual lines not confirmed.
- nginx reload keeps old workers on a bad config (documented behaviour, page not read today).
- `curl --http3` availability depends on the curl build.
- Traefik's default `X-Forwarded-*` behaviour and `forwardedHeaders.trustedIPs` (table cell is from general knowledge); HAProxy `option forwardfor` only adds the header in `mode http`.
