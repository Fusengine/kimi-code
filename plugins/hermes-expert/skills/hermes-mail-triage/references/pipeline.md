# Triage pipeline - three questions

Keyword rules break on the first unusual subject line. Three questions,
answered in order, generalise: the request decides the category, the
category decides who acts.

## 1. Who writes?

A person or a machine? On whose behalf? Look up, in this order:

1. The sender memory (previous confirmed triage).
2. An existing thread already filed.
3. The owner's client/contact list (from the workspace).
4. The sender's domain on the web (company site, registry).

Nothing found → "unknown". The owner decides once; the answer is stored
forever (learning-guardrails.md).

## 2. What do they want?

A reply, a payment, a quote, an intervention, or nothing. The request gives
the category; the category names the manager who acts.

**Urgent** = due within 48 h, a client blocked, or money waiting → alert the
chief immediately, do not wait for the batch report.

## 3. Where does it go?

One folder per correspondent, grouped by family, then year and month, e.g.
`<family>/<correspondent>/<YYYY>/<MM>`. A reply goes to the folder of the
first message of its thread.

## Category table (adapt the managers and folders in profile.yaml)

| Category | What it is | Who acts | Folder family |
|----------|-----------|----------|---------------|
| Support | Outage, access, usage question | Support manager | Clients |
| Billing | Invoice, quote, reminder, payment | Finance manager | Clients or suppliers |
| Prospect | Request for offer, new contact | Sales manager | By correspondent |
| Legal | Contract, dispute, formal notice, authority | Legal manager | By correspondent |
| Administration | Tax, social insurance, pension fund, municipality | Finance or legal | Administration |
| Licences | Subscription, renewal, hosting | Finance if an amount is due | Licences-subscriptions |
| Bank | Statement, payment received, card | Finance manager | Bank-finance |
| Notification | A tool writing on its own: monitoring, backup, platform | Nobody | Automations |
| Information | Confirmation, receipt, status - nothing to do | Nobody | Correspondent's folder |

## Verdict table (after the mechanical check)

| Verdict | When | Destination |
|---------|------|-------------|
| Newsletter | Bulk, authentic sender, owner subscribed (seen before) | Newsletters |
| Unsolicited ad | Bulk, authentic sender, never seen | Ads / sender / month |
| Spam | On a blocklist, failed authentication, or flagged spam by the provider | Spam |
| Phishing | Imitated brand, look-alike domain, deceptive link | Spam + alert in the report; never click or reply |
| Legitimate | Authentic, no suspicious signal | The reading decides the category above |
| Uncertain | Not enough signals | To-sort folder; the owner decides |

## Private vs company

A private mailbox is triaged by a private profile into private folders; a
company mailbox by a company profile. A message that belongs to the other
space is flagged to the chief, never filed across (hermes-chief-of-staff,
partition.md).
