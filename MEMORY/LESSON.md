- [2026-07-30 21:15] Assumed the deployed per-plugin shim was the executed one → the live session kept the old plugin snapshot; `/plugins reload` (not `/reload`) is required before trusting a hook behavior change
- [2026-07-31 10:05] rsync --delete after a partial migration deleted 22 design-ref files (elysian had MOVED to `_artistic/`, which the migrator skips) → before any mirror-delete, resolve every "Only in source" entry first; never dismiss one uninspected
- [2026-07-31 10:40] Declared "0 residuals" twice from grep output piped to `head` → truncated proof = no proof; a verification scan must end with a COUNT over the full result set, never a truncated sample
- [2026-11-10 13:26] Harness floor bump → live hook layer kept "cache hit" on stale tmp harness (0.1.113), suite green on old binary → after any floor bump prove live layer runs floor version (cached package.json version), never trust "cache hit"; plugin update ≠ harness update, only setup.sh restages

