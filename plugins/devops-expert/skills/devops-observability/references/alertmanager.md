# Alertmanager

**Load when:** designing the routing tree, grouping, inhibition, silences or receivers; debugging "no notification" or "too many notifications".

Template: [alertmanager.yml](templates/alertmanager.yml). Validate: `amtool check-config alertmanager.yml`. Test the tree offline:

```bash
amtool config routes test --config.file=alertmanager.yml --tree --verify.receivers=oncall-pager severity=page team=sre
```

(`--verify.receivers` makes amtool exit 1 on a mismatch, usable in CI.)

## Pipeline

Prometheus evaluates rules and sends alerts; Alertmanager deduplicates, **groups**, **inhibits**, **silences** and routes them to receivers. Alertmanager has no memory of the rules: it only sees label sets.

## Routing tree

- The top `route` matches every alert (no matchers). Children are tried in order; the first match wins unless `continue: true`.
- `receiver`, `group_by`, `group_wait`, `group_interval`, `repeat_interval` are inherited from the parent. `mute_time_intervals` and `active_time_intervals` are **not** inherited. Route `labels` merge parent to child.
- Use `matchers` (e.g. `severity = "page"`, `team =~ "a|b"`). `match` / `match_re` are deprecated.
- Defaults: `group_wait` 30s, `group_interval` 5m, `repeat_interval` 4h. `repeat_interval` is checked at each `group_interval` tick, so keep it a multiple of it.
- `group_by: ['...']` disables grouping (one notification per alert): only for very low volume.

## Grouping

Group by what a human would handle together: `[alertname, cluster, service]`. `group_wait` is the delay for the first notification of a new group: long enough for inhibiting alerts to arrive, short enough for paging. If an alert resolves before `group_wait` ends, nothing is sent (flap protection).

## Inhibition

An `inhibit_rules` entry mutes the **target** when a **source** alert is firing and both have equal values for the `equal` labels. Keep source and target matchers disjoint (an alert matching both sides cannot be inhibited by itself). Typical: node down mutes service alerts of the same `instance`; page-level mutes ticket-level for the same `alertname`+`cluster`. If a label in `equal` is absent on both sides, the rule applies.

## Silences

Silences are created in the UI/API or with `amtool silence add`, matched by label matchers, with a start/end and a comment. They are stored in Alertmanager (persist `--storage.path`) and replicated in a cluster.

```bash
amtool silence query --alertmanager.url=http://alertmanager:9093
amtool silence add alertname="HostMemoryExhausted" instance=~"web-0[12].*" --duration=2h --comment="planned resize" --author=me@example.com
amtool silence expire <ID>
```

Creating a broad silence (empty or `.*` matchers) or expiring all silences mutes or re-opens the whole pipeline: ACTION / EFFECT / PROOF / WAIT-FOR-GO in [observability-safe-ops.md](observability-safe-ops.md).

## Time intervals

Top-level `time_intervals:` define named windows (`times`, `weekdays` as `monday:friday`, `days_of_month`, `months`, `years`, `location`; UTC if no `location`). Reference them from a route with `mute_time_intervals` (silent during the window) or `active_time_intervals` (notify only during the window).

## Receivers

Built-in integrations in v0.35: email, Slack, PagerDuty, Opsgenie, VictorOps, webhook, Pushover, Telegram, Discord, Microsoft Teams, Webex, WeChat, Rocket.Chat, Mattermost, Jira, Amazon SNS, incident.io. `send_resolved` default differs per integration. Secrets: prefer the `*_file` variants (`slack_api_url_file`, `api_url_file`, `routing_key_file`, `url_file`) over inline values. Anything else goes through `webhook_configs` to a bridge.

## High availability

HA clustering is enabled by default. Point **every** Prometheus at **all** Alertmanager instances (do not load-balance them): the instances gossip and deduplicate.

## v0.35.0 breaking changes to know before upgrading

`--enable-feature=auto-gomemlimit` became `--auto-gomemlimit`; the event recorder (`eventrecorder`) now requires a `name` on every output and uses the `events/v2` schema; the deprecated `types` package was removed. Read the release notes before the bump.

## Sources (read 2026-11-10)

- https://raw.githubusercontent.com/prometheus/alertmanager/v0.35.0/docs/configuration.md
- https://raw.githubusercontent.com/prometheus/alertmanager/v0.35.0/README.md (amtool section)
- https://github.com/prometheus/alertmanager/releases/tag/v0.35.0 (2026-11-09)

## Not verified

- The full integration list is read from the config-reference headings (`*_config` sections); features per integration were not compared.
- "Point every Prometheus at all Alertmanagers" is the standard HA guidance; the HA page was not fetched today.
- `amtool silence add` flags `--duration`, `--comment`, `--author` were not confirmed against `amtool --help` of v0.35.0 (only the README examples were read).
- Gossip/cluster flags (`--cluster.*`) not checked.
