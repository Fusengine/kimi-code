# Sender checks on the raw message

A model reading a well-made phishing mail sees a polite bank. Headers do not
lie the same way. Run these checks on the raw message (RFC 5322 source)
before any newsletter / ad / spam / phishing verdict; if the check and the
reading disagree, the check wins. Script: [templates/sender-check.md](templates/sender-check.md).

## 1. Bulk mail?

| Strength | Signal |
|----------|--------|
| Strong (one is enough) | `List-Unsubscribe` header (RFC 2369), `List-Id` header (RFC 2919), `Precedence: bulk` or `list` |
| Weak (two needed) | `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (RFC 8058), a campaign/feedback id header (e.g. `Feedback-ID`, `X-Campaign*`), a known sending platform in `Received`/`Return-Path`/`X-Mailer` (Mailchimp, Brevo, SendGrid, Substack, ...) |

Keep the platform list in a data file the owner can extend, not in code.

## 2. Is the sender who it claims?

Read the **topmost** `Authentication-Results` header written by the
receiving server (RFC 8601) - lower ones can be forged by the sender.

- `dmarc=pass` → the visible `From:` domain is authenticated.
- No DMARC result: `spf=pass` with `smtp.mailfrom` aligned to the `From:`
  domain, or `dkim=pass` with `header.d` aligned to it.
- `fail` on DMARC, or neither SPF nor DKIM aligned → treat as forged.
- No `Authentication-Results` from your server → "unknown", never "pass".

Pin the authserv-id of your own mail server so a forged header from outside
is ignored. The Hermes email adapter does the same for agent conversations
(`EMAIL_AUTHSERV_ID` / `platforms.email.authserv_id`, email docs) - reuse the
same value.

## 3. Known to public blocklists?

| What | List (DNS zone) |
|------|-----------------|
| Sending IP | Spamhaus ZEN `zen.spamhaus.org`, SpamCop `bl.spamcop.net` |
| Domains in links / sender | Spamhaus DBL `dbl.spamhaus.org`, SURBL `multi.surbl.org`, URIBL `multi.uribl.com` |
| URLs | URLhaus (abuse.ch) - HTTP API, requires an Auth-Key |

Caveats (verified on the providers' pages):
- Spamhaus answers `127.255.255.254` to queries sent through public/open
  resolvers, `127.255.255.252` for a typo in the zone name and
  `127.255.255.255` for excessive queries. URIBL and SURBL answer
  `127.0.0.1` when the query is refused/blocked. Treat these answers as
  "check failed", never as "listed". Query through your own resolver or a
  Spamhaus DQS key.
- Each list has its own usage terms (free tier limits); read them before
  enabling.

## 4. A scam?

- Imitated brand: display name of a bank, a big platform or an authority,
  sent from an unrelated domain.
- Look-alike domain: one edit away from a known domain, digit/letter swaps,
  extra words (`<brand>-secure-login.tld`), punycode (`xn--`).
- Link text shows one address, `href` goes elsewhere.
- Link shorteners hiding the destination.
- `Reply-To` domain differs from the `From:` domain.
- Urgency + payment or credentials request.

Any two scam signals, or one with failed authentication → Phishing.

## Order of verdict

Blocklist hit or failed auth → Spam/Phishing. Else bulk → Newsletter or Ad
(seen before = Newsletter). Else Legitimate. Too few signals → Uncertain.

## Sources

- https://www.rfc-editor.org/rfc/rfc8601 · https://www.rfc-editor.org/rfc/rfc7489 (DMARC alignment)
- https://www.rfc-editor.org/rfc/rfc2369 · https://www.rfc-editor.org/rfc/rfc2919 · https://www.rfc-editor.org/rfc/rfc8058
- https://www.spamhaus.org/faqs/dnsbl-usage/ (return codes, public resolvers)
- https://urlhaus-api.abuse.ch/ (Auth-Key)
- https://uribl.com/refused.shtml · https://www.surbl.org/guidelines (127.0.0.1 = blocked)
- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/email (authserv-id)
