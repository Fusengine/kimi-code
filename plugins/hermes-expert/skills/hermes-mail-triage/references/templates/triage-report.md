# Triage report - template

Delivered by the triage cron job to the decisions channel (hermes-rhythm).
Nothing new → the job replies with only `[SILENT]`. Urgent items are also
sent to the chief at once, not only in this batch.

```markdown
Mail triage · <date> <time> · <n> new in <mailbox labels>

Urgent
1. [<mailbox>] <sender> - <what they want> (<deadline>) → <manager>, <folder>

To file - known senders
2. [<mailbox>] <sender> - <category> → <folder>
3. ...

To file - new senders (your call is remembered)
4. [<mailbox>] <sender> (<who they are, source of the lookup>) - <category>? → <folder>

Newsletters / ads
5. <sender> - newsletter → Newsletters
6. <sender> - unsolicited ad (bulk, never seen) → Ads/<sender>/<YYYY-MM>

Spam / phishing
7. <sender> - phishing: <signals, e.g. dmarc=fail, look-alike domain>. Not opened, no click.

Uncertain
8. <sender> - <why> → To-sort

Answer "ok all" or "ok except 4, 7" (or "4 → Billing"). Nothing moves before that.
```

## Rules

- Numbers are stable for the answer; a new run renumbers.
- Each line names the destination folder exactly as it will be used.
- Phishing lines never contain a clickable link from the message.
- After the owner's answer, the apply step reports: moved n, kept m,
  remembered k senders.
