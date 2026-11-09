# Layout

A predictable tree lets any agent find a dossier without asking, and lets
the chief answer "where is X?" by reading a README instead of delegating a
search. Folder names below are a convention; keep whatever names the owner
already uses, but keep the shape.

## The chief root and its sync

```
<chief_root>/                 e.g. /root/workspace - one parent for both roots
├── .hermes.md                full filing reference + "where does it go?" table
├── script/<name>/            scripts_root: one folder per script + one-line README
├── <company>/   .hermes.md   company rules (+ outbound email rules)
└── <private>/   .hermes.md   private rules
```

When `<chief_root>` is synced to the owner's cloud drive (Nextcloud or
similar), say it in the first line of every `.hermes.md`: **everything written
there is seen by the owner** - which is why scratch, secrets and drafts never
land in it. Keep a sync-exclude list for what must not sync.

Each root's `.hermes.md` repeats the rules that apply there and points to the
chief root's file as the full reference; an agent whose cwd is a dossier
loads the nearest one (templates/hermes-md-filing.md).

**Never create a new top-level folder** (in `<chief_root>` or a root): no
table row fits → ask the chief, who asks the owner.

## Company root

```
<company>/
├── 00-inbox/                 received, not yet filed
├── dossiers/YYYY-MM_subject/ one matter = one dossier
│   ├── README.md             status, next action, deadline (template)
│   ├── pieces/               received documents, never modified
│   ├── travail/              internal notes, .md only
│   └── livrables/            YYYY-MM-DD_subject_vN.ext
├── clients/<client>/         code, docs, deliverables per client
├── admin/
│   ├── finance/              invoices, ledger, social insurance
│   ├── payroll/<person>/<YYYY>/
│   ├── legal/  sales/  strategy/  support/
│   └── management/           company cockpit, registry
├── knowledge/                SCHEMA.md, index.md, log.md, <sector>/, raw/, resolved/, drafts/
├── automation/               production services (docs, not scripts)
└── archives/
    ├── YYYY/                 closed dossiers
    └── to-delete/            waiting for the owner's approval
```

## Private root (mirrored, sealed)

```
<private>/
├── 00-inbox/
├── dossiers/YYYY-MM_subject/   same inner structure
├── documents/                  incl. the private cockpit
├── letters/   agenda/
└── archives/YYYY/   archives/to-delete/
```

Nothing from one root is ever copied, linked or attached into the other
(hermes-chief-of-staff, partition.md).

## Outside the document roots

```
<scripts_root>/<script-name>/   one folder per script + README.md
<scratch_root>/<card-id>/       temporary files, disposable
```

## Where does it go?

| What | Where |
|------|-------|
| A company matter | `<company>/dossiers/YYYY-MM_subject/` |
| Work for a client | `<company>/clients/<client>/` |
| Payslip | `<company>/admin/payroll/<person>/<YYYY>/` |
| Finance, legal, sales | `<company>/admin/...` |
| A private or family matter | `<private>/dossiers/YYYY-MM_subject/` |
| Not yet filed | `00-inbox/` of the right root |
| Reusable script | `<scripts_root>/<name>/` with a README |
| Temporary file | `<scratch_root>/<card-id>/` |
| Closed dossier | `archives/YYYY/` |
| Reusable knowledge | `<company>/knowledge/<sector>/` (templates/knowledge-schema.md) |
| Unsure company or private | Ask the chief - never invent a folder |

**Company or private - the criterion.** It touches a company, a partner, a
client, a supplier, or a work tool, account or subscription → **company**. It
touches the owner or the family in person (home, health, personal insurance,
private taxes, personal investments, private travel) → **private**. A dossier
and its cockpit entry always sit on the same side. Write this paragraph, with
the owner's own examples, in the chief root's `.hermes.md`.

## Moving folders: transition symlinks

When the layout changes, the old paths become symlinks to the new places so
nothing breaks (scripts, cards, owner bookmarks). List them in `.hermes.md` as
"transition symlinks - never create anything under them"; remove them only
with the owner, once nothing references them.

## Mail folders

Mailbox folders follow the triage categories (hermes-mail-triage), e.g.
`Clients/<correspondent>/<YYYY>/<MM>`. Attachments that matter are saved
into the dossier's `pieces/`, not left only in the mailbox.

## Git root and context files

`.hermes.md` is discovered up to the git root. Either make each root its own
git repository, or make sure each agent's working directory sits under the
directory holding `.hermes.md` with no other git root in between. Check on
the installed version with a test session started from a dossier folder.
