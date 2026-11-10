# PromQL Essentials and Pitfalls

**Load when:** writing dashboard queries, alert expressions or recording rules, or debugging "the graph looks wrong".

## Counters, gauges, rates

| Need | Use | Not |
|------|-----|-----|
| Per-second rate of a counter, for alerts and recording rules | `rate(x_total[5m])` | `irate` |
| Spiky per-second rate for a zoomed-in graph | `irate(x_total[5m])` (uses the **last two points only**) | alerting on it |
| Total increase over a window | `increase(x_total[1h])` | `rate * 3600` by hand |
| Trend of a gauge | `deriv(g[1h])`, `predict_linear(g[6h], 24*3600)` | `rate` on a gauge |

- `rate` handles counter resets and **extrapolates** to the window edges, so `increase` over short windows can return non-integers.
- The range must contain at least two samples; use a range of several scrape intervals (rule of thumb: 4x) so one missed scrape does not blank the result.
- `rate` of a metric that mixes float and native-histogram samples in the window is dropped with a warn annotation; the same rule applies to `irate`.
- Apply `rate` first, then aggregate: `sum by (job) (rate(x_total[5m]))`, never `rate(sum(x_total)[5m])` (a reset in one series corrupts the sum).

## Aggregation and joins

- `by (...)` keeps the listed labels; `without (...)` drops them. Prefer `without` in recording rules so new labels survive.
- Vector matching: `a / on (instance) b`, `a * on (instance) group_left (version) info_metric`. Many-to-one without `group_left` errors with "multiple matches".
- Ratios: divide **after** rate and aggregation on both sides, with the same grouping: `sum by (job)(rate(errors_total[5m])) / sum by (job)(rate(requests_total[5m]))`.
- Missing data: `up == 0` fires on a failed scrape; a metric that disappears needs `absent(metric{job="x"})`; `absent_over_time(...)` for gaps. An alert on `sum(...) < 1` stays silent when the series is gone.
- Use `unless`, `and`, `or` for set logic (see `HostFilesystemFillingUp` in [rules-alerts.yml](templates/rules-alerts.yml)).

## Histograms

**Classic histogram** (`_bucket{le=...}`, `_sum`, `_count`):

```
histogram_quantile(0.95, sum by (job, le) (rate(http_request_duration_seconds_bucket[5m])))
```

`le` MUST stay in the `by` clause; without it the result is wrong or empty. Accuracy is bounded by bucket boundaries: the quantile is interpolated inside a bucket, so put boundaries around your SLO threshold. Quantiles cannot be averaged or summed across instances: aggregate buckets, then compute the quantile.

**Native histogram** (opt-in, `scrape_native_histograms: true`, see [prometheus-config.md](prometheus-config.md)): no `le`, no `_bucket`:

```
histogram_quantile(0.95, sum by (job) (rate(http_request_duration_seconds[5m])))
histogram_fraction(0, 0.2, rate(http_request_duration_seconds[1h]))   # share of requests <= 200 ms
histogram_avg(rate(http_request_duration_seconds[5m]))
```

`rate` on a native histogram yields a histogram; `histogram_count` / `histogram_sum` extract components. A selector can mix classic and native series as long as names do not collide. During a migration, `convert_classic_histograms_to_nhcb` converts classic histograms to native histograms with custom buckets, and `always_scrape_classic_histograms` keeps the classic series alongside.

## Pitfalls checklist

1. Wrong `rate` window (shorter than 2 scrapes) gives empty graphs.
2. `irate` in an alert flaps on every spike.
3. `avg` of per-instance percentages is not the fleet percentage: sum numerators and denominators.
4. Label churn (pod names, build IDs) multiplies series; aggregate them away in recording rules.
5. Grafana `$__rate_interval` is the right range variable for `rate` in dashboards; a fixed `[5m]` ignores the dashboard's resolution.
6. `offset` and `@` modifiers apply to the selector, not to the whole expression.
7. Staleness: a series stops being returned 5 minutes after its last sample by default lookback; `last_over_time(x[1h])` bridges gaps deliberately.
8. Unquoted UTF-8 metric names need `--enable-feature=promql-unquoted-utf8-names`; otherwise quote them: `{"http.server.duration"}`.

## Sources (read 2026-11-10)

- https://raw.githubusercontent.com/prometheus/prometheus/v3.16.0/docs/querying/functions.md (`rate`, `irate`, `histogram_quantile`, `histogram_fraction` sections)
- https://raw.githubusercontent.com/prometheus/prometheus/v3.16.0/docs/feature_flags.md (UTF-8 names flag)
- https://raw.githubusercontent.com/prometheus/prometheus/v3.16.0/docs/configuration/configuration.md (native histogram settings)

## Not verified

- Items 5-7 and the join syntax (`group_left`, `absent_over_time`, `last_over_time`, the 5-minute lookback) are standard PromQL/Grafana behavior not re-read from the pages above today.
- `histogram_avg` exists in functions.md (heading seen) but its argument semantics were not read.
- The "4x scrape interval" figure is a rule of thumb.
- The quoted-name form `{"http.server.duration"}` (only the unquoted form under the feature flag appears in the page read).
- Quantile interpolation behavior is described from the Prometheus histograms practice page, which was not fetched today.
