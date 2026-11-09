# Install and update

## Install

| Platform | Command |
|----------|---------|
| Linux / macOS / WSL2 | `curl -fsSL https://hermes-agent.nousresearch.com/install.sh \| bash` |
| Windows (native) | `iex (irm https://hermes-agent.nousresearch.com/install.ps1)` |
| Desktop (macOS/Windows) | bundled package from the official site |
| Docker | image `nousresearch/hermes-agent` |

- The POSIX script needs Git, curl, tar and SHA-256 utilities; it downloads its
  own pinned `uv` and installs through the Hermes package manager (`hermes pm`),
  which pins Python, Node.js, ripgrep and FFmpeg.
- First-party installs run on **Python 3.14** (`pyproject.toml` accepts `>=3.11,<3.15`).
- Only download from official domains: `hermes-agent.nousresearch.com`,
  `github.com/NousResearch`, Docker Hub `nousresearch/hermes-agent`.

After install:

```bash
source ~/.bashrc      # or ~/.zshrc
hermes setup          # full wizard
hermes setup --portal # one-login path: Nous Portal provider + Tool Gateway
hermes model          # provider + model only
hermes tools          # enabled tools
hermes gateway setup  # messaging platforms
```

`hermes: command not found` -> reload the shell or check `PATH`
(non-sudo installs: `export PATH="$HOME/.local/bin:$PATH"`).
Missing options after an update -> `hermes config check`, then `hermes config migrate`.

## Update owner depends on the install kind

| Installation | Update method |
|--------------|---------------|
| Managed source checkout | `hermes update` |
| macOS bundled app / MSIX | the Desktop Update control |
| Docker | pull the image, recreate the container with the same data mount |
| Nix | update the flake/profile and rebuild |
| Termux | `pkg update && pkg upgrade hermes-agent` |

`hermes doctor` reports the installation provenance.

## Channels (source installs)

Since v0.22.0 a source checkout tracks the **stable** channel: the latest
published `vX.Y.Z` release, never a prerelease or a commit on `main`.

```bash
hermes update                        # move to the latest stable release
hermes update --check                # preview only: no code, deps or restarts
hermes update --plan                 # read-only fleet plan (services, supervisors, versions)
hermes update --set-channel main     # follow every commit on main (saved)
hermes update --set-channel stable   # back to releases only (saved)
hermes update --channel main         # one run against main, nothing saved
hermes update --backup               # full pre-update backup of HERMES_HOME
```

The channel choice is stored per install under `update.installs` in
`config.yaml` (Hermes writes it; do not hand-edit). Moving to an older release
is a labelled rollback and is never done without asking.

## Update-related config keys

| Key | Default | Meaning |
|-----|---------|---------|
| `updates.check` | `true` | passive update notices; `false` silences them (explicit `--check` still works) |
| `updates.pre_update_backup` | `quick` | `quick` / `full` / `off` snapshot before each update |
| `updates.backup_keep` | `5` | number of pre-update zips kept |
| `updates.non_interactive_local_changes` | `stash` | `stash` or `discard` local source edits on non-interactive updates |
| `updates.parked_branch_strategy` | unset | `update_in_place` merges main into a deliberate custom branch |

## What an update does

1. Pre-update snapshot per profile (`state-snapshots/`: config.yaml, .env,
   auth.json, cron jobs, pairing).
2. Syntax validation before and after the move, automatic rollback if a
   startup file fails to parse.
3. Stops every gateway from this install, then restarts exactly that set on
   the new code (bots are offline during the window).
4. Detects new config options and prompts to add them.
5. Writes a receipt to `~/.hermes/logs/update_receipts/` (`latest.json`) and
   mirrors output to `~/.hermes/logs/update.log` (`hermes logs update`).

The passive check asks GitHub at most once per 24 h; `hermes update --check`
bypasses that cache.

## Post-update validation

```bash
git status --short   # run inside the Hermes source checkout (source installs only)
hermes doctor
hermes --version
hermes gateway status
hermes pm status
```

A dirty tree after an update means local edits were reapplied: inspect before
continuing.

## Sources

- https://hermes-agent.nousresearch.com/docs/getting-started/installation
- https://hermes-agent.nousresearch.com/docs/getting-started/updating
- https://raw.githubusercontent.com/NousResearch/hermes-agent/main/cli-config.yaml.example (`updates:` block)
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.22.0 (stable channels)
