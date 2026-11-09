# Sender check - template script

Mechanical check on one raw message, run before any newsletter / ad / spam /
phishing verdict (rules in [sender-checks.md](../sender-checks.md)). Python 3
standard library only. Save as `<scripts_root>/mail-sender-check/check.py`
with a one-line `README.md` (hermes-workspace). Export each message as
`.eml` read-only (e.g. with the Himalaya skill) and pass the file.

- `--authserv-id`: the exact id your receiving server writes first in its
  `Authentication-Results` header; any other topmost header → `unknown`.
- `--platforms`: data file of sending-platform domains (one per line), so
  the owner can extend it without touching code.
- `--dnsbl`: query blocklists; only through your own resolver. Refused
  queries (Spamhaus `127.255.255.x`, URIBL/SURBL `127.0.0.1`) are reported
  as `check-failed`, never as `listed`.

```python
#!/usr/bin/env python3
"""Mechanical sender check on a raw email (.eml). Prints JSON signals + a suggested verdict.

Usage: check.py --authserv-id mx.example.net [--platforms platforms.txt] [--dnsbl] FILE.eml
"""
import argparse
import ipaddress
import json
import re
import socket
import sys
from email import policy
from email.parser import BytesParser
from email.utils import parseaddr
from html.parser import HTMLParser
from pathlib import Path

SHORTENERS = {"bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly", "rebrand.ly", "cutt.ly"}
IP_ZONES = ["zen.spamhaus.org", "bl.spamcop.net"]
DOMAIN_ZONES = ["dbl.spamhaus.org", "multi.surbl.org", "multi.uribl.com"]


class Links(HTMLParser):
    """Collect (href, visible text) pairs from the HTML body."""

    def __init__(self):
        super().__init__()
        self.links, self._href, self._text = [], None, []

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self._href, self._text = dict(attrs).get("href", ""), []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag == "a" and self._href is not None:
            self.links.append((self._href, "".join(self._text).strip()))
            self._href = None


def host(url: str) -> str:
    m = re.match(r"(?i)^[a-z][a-z0-9+.-]*://([^/:?#]+)", url.strip())
    return m.group(1).lower() if m else ""


def domain_of(addr: str) -> str:
    return parseaddr(addr)[1].rpartition("@")[2].lower()


def aligned(a: str, b: str) -> bool:
    return bool(a and b) and (a == b or a.endswith("." + b) or b.endswith("." + a))


def auth_results(msg, authserv_id: str) -> dict:
    headers = msg.get_all("Authentication-Results") or []
    if not headers or str(headers[0]).split(";")[0].strip().lower() != authserv_id.lower():
        return {"status": "unknown"}
    top = str(headers[0]).lower()
    res = {k: (re.search(rf"\b{k}=(\w+)", top) or [None, "none"])[1] for k in ("dmarc", "spf", "dkim")}
    res["dkim_d"] = (re.search(r"header\.d=([\w.-]+)", top) or [None, ""])[1]
    res["spf_from"] = (re.search(r"smtp\.mailfrom=[^@\s;]*@?([\w.-]+)", top) or [None, ""])[1]
    return res


def listed(name: str, zone: str) -> str:
    try:
        answer = socket.gethostbyname(f"{name}.{zone}")
    except OSError:
        return "clean"
    # Spamhaus 127.255.255.x and URIBL/SURBL 127.0.0.1 mean "query refused", not "listed"
    refused = answer.startswith("127.255.255.") or answer == "127.0.0.1"
    return "check-failed" if refused else "listed"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--authserv-id", required=True)
    ap.add_argument("--platforms", type=Path, help="one sending-platform domain per line")
    ap.add_argument("--dnsbl", action="store_true", help="query public blocklists (own resolver only)")
    ap.add_argument("eml", type=Path)
    a = ap.parse_args()
    msg = BytesParser(policy=policy.default).parse(a.eml.open("rb"))
    from_dom = domain_of(str(msg.get("From", "")))
    platforms = set()
    if a.platforms:
        platforms = {l.strip().lower() for l in a.platforms.read_text().splitlines() if l.strip() and not l.startswith("#")}
    raw_hdrs = " ".join(f"{k}: {v}" for k, v in msg.items()).lower()
    strong = [h for h in ("List-Unsubscribe", "List-Id") if msg.get(h)]
    if str(msg.get("Precedence", "")).lower() in ("bulk", "list"):
        strong.append("Precedence")
    weak = [h for h in ("List-Unsubscribe-Post", "Feedback-ID") if msg.get(h)]
    weak += [k for k in msg.keys() if k.lower().startswith("x-campaign")]
    weak += [p for p in platforms if p in raw_hdrs]
    auth = auth_results(msg, a.authserv_id)
    authentic = auth.get("dmarc") == "pass" or (
        auth.get("status") != "unknown" and auth.get("dmarc") in ("none", "temperror")
        and ((auth["spf"] == "pass" and aligned(auth["spf_from"], from_dom))
             or (auth["dkim"] == "pass" and aligned(auth["dkim_d"], from_dom))))
    forged = auth.get("dmarc") == "fail"
    body = msg.get_body(preferencelist=("html",))
    parser = Links()
    if body:
        parser.feed(body.get_content())
    scam = []
    for href, text in parser.links:
        shown = host(text) if "://" in text else ""
        if shown and shown != host(href):
            scam.append(f"link text {shown} -> {host(href)}")
        if host(href) in SHORTENERS:
            scam.append(f"shortener {host(href)}")
    if "xn--" in from_dom:
        scam.append("punycode sender domain")
    reply_dom = domain_of(str(msg.get("Reply-To", "")))
    if reply_dom and not aligned(reply_dom, from_dom):
        scam.append(f"reply-to {reply_dom} != from {from_dom}")
    lists = {}
    if a.dnsbl:
        ips = re.findall(r"\[(\d{1,3}(?:\.\d{1,3}){3})\]", str((msg.get_all("Received") or [""])[0]))
        for ip in ips[:1]:
            if ipaddress.ip_address(ip).is_global:
                rev = ".".join(reversed(ip.split(".")))
                lists.update({f"{ip}@{z}": listed(rev, z) for z in IP_ZONES})
        for d in {from_dom, *(host(h) for h, _ in parser.links)} - {""}:
            lists.update({f"{d}@{z}": listed(d, z) for z in DOMAIN_ZONES})
    bulk = bool(strong) or len(weak) >= 2
    if forged or "listed" in lists.values() or (scam and not authentic) or len(scam) >= 2:
        verdict = "phishing" if scam else "spam"
    elif bulk and authentic:
        verdict = "bulk-authentic"
    elif authentic and not scam:
        verdict = "legitimate"
    else:
        verdict = "uncertain"
    print(json.dumps({"from_domain": from_dom, "bulk_strong": strong, "bulk_weak": weak, "auth": auth,
                      "authentic": authentic, "scam_signals": scam, "blocklists": lists,
                      "suggested_verdict": verdict}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

## Tested behaviour

| Input | suggested_verdict |
|-------|-------------------|
| `List-Unsubscribe` + One-Click, `dmarc=pass` from the pinned server | `bulk-authentic` (Newsletter if seen before, else Ad) |
| `dmarc=fail`, `Reply-To` on another domain, link text `https://bank…` → shortener | `phishing` |
| `Authentication-Results` written by another authserv-id | `uncertain` (auth `unknown`) |
| `--dnsbl` through a public resolver | Spamhaus/URIBL entries `check-failed` |

The model reads `suggested_verdict` plus the signals; when its own reading
disagrees with a spam/phishing/bulk verdict, the check wins. The script
only reads the file - it never moves, flags or deletes mail.
