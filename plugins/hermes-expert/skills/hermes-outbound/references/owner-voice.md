# The owner's voice

An outgoing message should read as if the owner wrote it: same length, same
directness, same way of addressing each person. Recipients notice a change
of voice faster than a change of content.

## Inputs (from profile.yaml)

| Field | Use |
|-------|-----|
| `owner.tone` | Default register (e.g. short and direct) |
| `owner.languages` | Default language; a contact's language overrides it |
| `owner.address_form_default` | Informal or formal (tu/vous, du/Sie, first name/surname) |
| `owner.contacts[].address_form` | Per-contact override - always wins |
| `owner.signature` | Exact signature block, copied verbatim |

When a contact is not in the list, look at the last message the owner sent
to that person and mirror it. No previous message and no rule → formal, and
add the contact to the decision ("Formal address with <contact> - keep?").

## Writing rules

- Short and clear; the ask or the answer in the first two lines.
- One message, one purpose.
- No filler openings or closings the owner never uses.
- Numbers, dates and amounts exact; currency and date format of the
  recipient's country.
- Corrections of tone by the owner become memory (USER profile), so the next
  draft already follows them.

## Learning the voice

At setup or migration, collect 10-20 messages the owner actually sent
(company and private separately) and extract: typical length, greeting,
closing, address form per contact, phrases the owner uses to say no. Store
the extract in the relevant profile's memory or in a skill - not in the
plugin.

## Voice notes are a different channel

If replies also go out as voice notes, that is speech for the owner, not
outbound text for third parties: written for the ear, short, no ids or
paths. Provider setup and the backup-voice pattern belong to
hermes-gateways.
