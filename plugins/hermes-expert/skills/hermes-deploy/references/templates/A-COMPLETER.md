# `A-COMPLETER.md` - template ("to complete")

One per profile, at `company/profiles/<name>/A-COMPLETER.md`: the values only
the owner can give (accounts, SLAs, scopes, decisions). `deploy.sh` prints all
of them at the end of every run, so nothing owed is silently forgotten. The
agent never fills a line itself and never puts a secret value here - for a
credential, write the `.env` NAME and where the owner sets it.

```markdown
# <Name> - values expected from <owner> (one line = one value)
- <value 1, e.g. service hours> : ...
- <value 2, e.g. scope of support> : ...
- <credential> : set <ENV_VAR_NAME> in the profile .env (never here)
- <decision> : ...
```

A line the owner answered moves into `MEMORY.seed.md`, the profile skill or
`config.yaml`, then leaves this file.
