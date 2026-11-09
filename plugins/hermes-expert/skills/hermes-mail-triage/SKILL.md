---
name: hermes-mail-triage
description: Use when a Hermes Agent must sort an owner's mailboxes - who writes, what they want, where it goes; bulk/newsletter detection, sender authenticity (SPF/DKIM/DMARC alignment), public blocklists, scam and phishing heuristics, learning each sender from the owner's corrections, a deliberate ignore list, and the rule that nothing is moved, marked read or deleted without the owner's ok. Not for email adapter setup or multi-mailbox wiring (hermes-gateways) or sending (hermes-outbound, hermes-security).
---


<objective>
A triage pipeline that reads mail on a schedule, classifies by questions
rather than keywords, runs a mechanical check on the raw message before any
"newsletter / ad / spam / phishing" verdict, proposes a numbered list, and
moves nothing until the owner answers "ok all" or "ok except ...". Hermes
provides the scheduler and mail access; the triage logic, sender memory and
the never-move-alone rule are patterns this skill defines.
</objective>

# Hermes Mail Triage

## Freshness check

Before writing or changing any Hermes config, run `hermes --version` and
`hermes update --check`, then read
https://github.com/NousResearch/hermes-agent/releases/latest. If the installed
or latest version is newer than 0.23.0, read every release note since 0.23.0
("Upgrade notes" first) and adjust. Never apply guidance from this skill to a
newer version without that check.

## Native vs pattern

| Piece | Status in 0.23.0 | Where |
|-------|------------------|-------|
| Reading a mailbox | Native: email adapter (IMAP/SMTP, **one account per adapter per profile**) or the bundled Himalaya email skill (terminal `himalaya` CLI) | [mailbox-topology.md](references/mailbox-topology.md), hermes-gateways |
| Several mailboxes in one agent | **Not documented as native** - several profiles, or Himalaya / an MCP mail tool with several accounts | [hermes-gateways #several-mailboxes](../hermes-gateways/references/messaging-adapters.md#several-mailboxes) |
| Running every N hours | Native: `hermes cron` (`every 2h`) | hermes-cron |
| Sender authentication for **conversations** with the agent | Native in the email adapter (acts only on an authenticated `From:`) | hermes-gateways |
| Bulk / SPF-DKIM-DMARC / blocklist / scam verdict for **triage** | **Pattern** - a script on the raw message | [sender-checks.md](references/sender-checks.md) |
| Sender memory, ignore list, "never moves alone" | **Pattern** | [learning-guardrails.md](references/learning-guardrails.md) |

## Pipeline at a glance

1. Fetch new messages (read-only), skip senders on the ignore list.
2. Mechanical check on the raw message ([templates/sender-check.md](references/templates/sender-check.md)).
3. Three questions: **who writes**, **what do they want**, **where does it go**
   ([pipeline.md](references/pipeline.md)).
4. Urgent (< 48 h, client blocked, money waiting) → immediate alert to the chief.
5. Numbered proposal list ([templates/triage-report.md](references/templates/triage-report.md));
   nothing new → `[SILENT]`.
6. Apply moves only after "ok all" / "ok except n, m".
7. Store each confirmed sender → category → folder.

## Critical rules

1. **Nothing is moved, marked read or deleted without the owner's ok.** No
   answer → nothing moves.
2. **When the mechanical check and the model's reading disagree, the check
   wins** for bulk/spam/phishing verdicts.
3. **Phishing: never click, never reply, never load remote content.**
4. **A reply stays in the folder of the first message** so the thread stays whole.
5. **One mailbox per email adapter per profile** - design the profiles
   around it (hermes-gateways).
6. **Triage never sends.** Replies go through hermes-outbound.

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/email (adapter, authenticated sender, Himalaya skill)
- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron (`every 2h`, `[SILENT]`)
- https://www.rfc-editor.org/rfc/rfc8601 (Authentication-Results header)
- https://www.rfc-editor.org/rfc/rfc2369 (List-Unsubscribe) · https://www.rfc-editor.org/rfc/rfc8058 (one-click unsubscribe)
