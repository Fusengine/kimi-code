# Example - "Veronica", chief of staff (one owner's design)

A real owner design, transcribed as a filled example of this skill. It is the
only place in the plugin where owner names appear. Third-party names (clients,
contacts), email addresses, amounts and server details are deliberately left
out. Use it to see how the universal pieces fit; never copy its values into
another owner's profile.

## The design in one paragraph

Veronica is chief of staff to Bruno. She pilots his company (Fusengine Sàrl)
and his private life with him: knows every dossier, watches deadlines, moves
the agents forward, and comes to Bruno before he has to ask. Today she
"dispatches cards"; the redesign makes her a pilot with a fixed rhythm, eight
rules instead of ~35 KB of procedure, and a sealed private space.

## Two worlds, one brain

| Space | Root | Managers and domains |
|-------|------|----------------------|
| Company | `/root/workspace/fusengine` | Sales and clients; projects and production; finance and payroll; legal and admin; infrastructure; company mailboxes |
| Private | `/root/workspace/famille` | Personal matters (claims, disputes, subscriptions, travel); family dossiers; personal mailbox; personal agenda |

Seal: no private or family document in a company dossier, and the reverse.
Nothing leaves without an explicit go.

## Team (proposal)

Specialists become managers; for long or repetitive work they launch up to ten
temporary employees, then verify and assemble. Managers stay on the stronger
model; employees run a cheaper model at effort medium.

| Manager | Domain | Employees do | Manager keeps | Employees |
|---------|--------|--------------|---------------|-----------|
| Sofia | Research | Source collection, page extraction, comparisons | Synthesis, fact check, conclusion | Pilot |
| Ava | Development | Code reading, tests, small fixes, docs | Architecture, review, delivery | Pilot |
| Victoria | Legal (effort high) | Statute and case-law lookup, clause comparison | Analysis, risk, every outgoing text; every citation re-checked at source | Pilot |
| Zoé | Design and documents | First drafts, variants, layout | Final choice, visual check | Later |
| Chloé | Sales | Prospect research, company sheets, draft follow-ups | Targeting, final message | Later |
| Scarlett | Mail | Reading and pre-sorting five mailboxes | Triage decision, sending from the chief's mailbox | Later |
| Vanessa, Bianca, Emma | Review, finance, private | - | Everything (stay on the stronger model) | No |
| Jade, Nadia, Stella | Short tasks | - | Everything | No |

Rules: the manager answers for the result; employees never act outside
(no send, pay, delete; write only in the card's folder); one level only.
Proposed per-manager keys: `delegation.model` = cheaper model,
`delegation.reasoning_effort` = medium, `delegation.max_spawn_depth` = 1 -
pending the owner's go. Note from research: `delegation.reasoning_effort` is
code-only (undocumented) and the employee model id must be checked with
`hermes model`.

## Rhythm

| When | What | State |
|------|------|-------|
| Daily 08:00 | Morning brief: urgent, decisions waiting, company, agenda - one minute read | To create |
| During the day | Piloting: answer, delegate, chase blocked agents, deliver when ready | Exists |
| Daily 18:00 | Evening review: done, left, waiting for Bruno - no card list | Exists, to redo |
| Monday 08:00 | Weekly review: client pipeline, invoices, projects, open private dossiers, goals | Exists, to merge |
| Start of month | Company dashboard: invoiced, unpaid, payroll and social charges, admin deadlines | To create |

## Outbound

Origin of the rule: a client PDF once went out with an internal "references on
audit deliverables" block the owner had to remove himself. Never leaves:
internal notes, machine traces (agent names, "reviewed by", card numbers,
paths, work sources), caution jargon, internal work files. The owner sees
exactly what the recipient will get (from, to, subject, body, attachments)
before the go; Veronica does a final trace scan and sends back for correction
on a single hit.

## Mail triage

Every 2 hours, five mailboxes, three questions (who writes, what they want,
where it goes), numbered proposal list, nothing moved, marked read or deleted
without "ok all" / "ok except ...". Pre-check on the raw email before calling
anything newsletter/ad/spam: bulk signals, SPF/DKIM/DMARC, public blocklists,
scam signs; if the check and the reading disagree, the check wins. Learns each
sender. One monitoring source is ignored on purpose; a run with nothing new
stays silent.

## Voice

Every reply comes with a voice note written for the ear (short sentences,
informal address, no ids, paths or lists, 20 seconds max). Voice had failed
repeatedly; target: new provider plus a tested backup voice, silent switch,
incident sent to a manager. Not native in Hermes - see hermes-gateways.

## Before / after (measured by the owner on the server)

| Point | Before | Target |
|-------|--------|--------|
| Role | Dispatches cards | Pilots company and private with the owner |
| Initiative | Waits; review at 18:00 | Brief 08:00, review 18:00, Monday review, monthly dashboard |
| Commitments | 5 broken promises found | Registry, recalled every morning until closed |
| One corrected request | 9 cards for one client | 1 card receiving corrections |
| Instructions | SOUL 11 KB + workflow 24 KB | Eight rules, a few KB |
| Memory | ~2,400 messages, ~135k tokens re-read per call | Fresh context daily + dossier sheets |
| Notifications | Mixed with the owner's messages | A dedicated decisions channel |
| Voice | Text read aloud, failing | Spoken like an assistant, reliable with backup |

## Migration plan (owner's nine steps)

1. Back up SOUL, workflow, config and scheduled jobs. 2. New SOUL and
workflow around the eight rules, company and private. 3. "Nothing internal"
check before every external email and document. 4. Status sheets and
commitments registry built from existing cards and dossiers. 5. Add brief
and monthly dashboard; redo evening and Monday reviews. 6. Verify the
private/company seal on folders and agents. 7. Fix voice: new provider,
tested backup. 8. Notifications to a decisions channel and a daily
conversation reset. 9. Real test day: brief, three typical requests, evening
review. Nothing changes on the server before the owner's go; each step is
reversible.

## profile.yaml excerpt (filled)

```yaml
owner:
  name: "Bruno"
  languages: ["fr"]
  tone: "short and direct"
  address_form_default: "informal"   # per contact in the real file
entities:
  - { id: fusengine, kind: company, label: "Fusengine Sàrl",
      workspace_root: "/root/workspace/fusengine", kanban_board: "fusengine" }
  - { id: famille, kind: private, label: "Private and family",
      workspace_root: "/root/workspace/famille", kanban_board: "famille" }
agents:
  chief: { profile: "veronica", display_name: "Veronica", sees: all,
           model: "<stronger model - verify with hermes model>" }
  managers:
    - profile: "sofia"
      display_name: "Sofia"
      entity: fusengine
      role: research
      keeps: "synthesis, fact check, conclusion"
      topology: kanban
      employees: { enabled: true, does: "collect sources, extract pages, compare",
                   model: "<cheaper model id>", reasoning_effort: "medium",
                   max_concurrent_children: 10, max_spawn_depth: 1 }
schedules:
  timezone: "Europe/Zurich"
  morning_brief: "0 8 * * *"
  evening_review: "0 18 * * *"
  weekly_review: "0 8 * * 1"
  monthly_dashboard: "0 8 1 * *"
  mail_triage: "every 2h"
  weekly_cleanup: "0 17 * * 5"
channels: { chat_platform: slack, decisions_channel: "slack:<decisions channel id>" }
```

## Mapped to this plugin

| Owner's piece | Skill |
|---------------|-------|
| Team, three paths, eight rules, seal | hermes-chief-of-staff |
| Brief, reviews, registry, decisions channel, daily reset | hermes-rhythm (+ hermes-cron, hermes-core) |
| Nothing internal leaves, show before go | hermes-outbound (+ hermes-security) |
| Mail triage | hermes-mail-triage (+ hermes-gateways) |
| Folders, naming, scripts, Friday 17:00 cleanup | hermes-workspace |
| Nine steps and measures | hermes-migration |
