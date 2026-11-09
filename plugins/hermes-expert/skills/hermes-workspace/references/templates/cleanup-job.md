# Weekly cleanup job - template

One job per root, run as the chief's profile (or the profile that owns the
root). Flags: hermes-cron owns their meaning; every flag below is in the
official cron docs for 0.23.0. Show the command to the owner before
creating it.

```bash
hermes -p <chief-profile> cron create "0 17 * * 5" \
  "Weekly cleanup of this root, following .hermes.md. 1) Without asking, only reversible moves inside this root: file 00-inbox items whose dossier is obvious, move closed dossiers to archives/YYYY/, move one-shot scripts to archives/to-delete/. Report what moved. 2) List archives/to-delete/ (path, size, age, reason) and ask whether to delete. Never delete anything. If nothing moved and to-delete/ is empty, reply with only [SILENT]." \
  --name "weekly-cleanup-<root label>" \
  --workdir <absolute path of the root holding .hermes.md> \
  --timezone <IANA zone> \
  --deliver <decisions channel target>
```

## After the owner says go on the deletion list

Deletion is an irreversible action: the agent prepares and recommends the
list, the owner decides. Delete exactly the approved paths, only after the
owner's explicit go in the conversation, never anything else - same go gate
as sending (hermes-security). Not through the cron job.

## Checks

- `hermes cron list` shows the job with its workdir.
- `hermes cron run <name>` once, read the output, confirm nothing was
  deleted (`ls archives/to-delete/` before and after).
- `approvals.deny` covers `rm` / `find -delete` patterns, so the job cannot
  delete even under the chief's `approvals.cron_mode: approve`
  (hermes-security `approval-model.md`).

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron
- https://hermes-agent.nousresearch.com/docs/user-guide/security
