# SLO Definition: <service name> - <SLO name>

Status: draft | approved | retired      Owner (decides trade-offs): <product owner or CTO>
Service owner team: <team>              Approved by / date: <names, date>
Next review: <date>                     Version: <n>

## 1. Service and users

- Service: <what it is, one sentence>
- Users whose happiness is measured: <who>
- Critical user journeys (max 5): <list>
- Component type: request-driven | pipeline | storage
- Architecture sketch and critical dependencies: <link>

## 2. SLI

- SLI specification (what matters to users, independent of measurement):
  <ratio of good events to total events, for example "valid HTTP requests that return non-5xx in under 400 ms / all valid HTTP requests">
- Good event: <definition>
- Valid (total) event: <definition, with exclusions>
- SLI implementation (measurement point): <Gateway metrics | server log | blackbox probe | client telemetry>
- Known blind spots of this implementation: <what it misses>
- Aggregation: interval <e.g. 1 minute>, region/cluster <scope>, scrape frequency <s>

## 3. SLO

| Objective | Target | Window |
|-----------|--------|--------|
| Availability | <99.9%> | rolling 30 days |
| Latency (typical) | <90% faster than 100 ms> | rolling 30 days |
| Latency (tail) | <99% faster than 400 ms> | rolling 30 days |

- Error budget = 1 - SLO = <0.1%> = <43.2 min of full outage / N errors per M requests> per window.
- Excluded from the SLO (and how they are labeled): <load tests, penetration tests, planned maintenance>
- Relation to any SLA: <SLA target if any; SLO must be stricter>

## 4. Alerting

- Method: multiwindow, multi-burn-rate (references/burn-rate-alerting.md)
- Rules file: <path>, alerts: <names>
- Page conditions: 14.4x over 1h and 5m; 6x over 6h and 30m
- Ticket conditions: 3x over 24h and 2h (optional); 1x over 3d and 6h
- Runbook: <link>

## 5. Policy and ownership

- Error budget policy: <link to filled templates/error-budget-policy.md>
- Dashboard: <link>   Budget remaining report: <link / cadence>
- On-call rotation: <link>

## 6. Review log

| Date | Change | Reason | Approved by |
|------|--------|--------|-------------|
| <date> | initial version | | |
