# Error Budget Policy: <service name>

Structure follows the SRE Workbook example policy. Numbers marked (example) are that example's; set your own and get the product owner's signature.

Owner: <product owner / CTO>      Approved: <date>      Review: <date>
SLO document: <link to filled slo-definition.md>

## Service overview

<What the service is, how often backend and client releases ship, what this policy covers.>

## Goals

- Protect customers from repeated SLO misses.
- Provide an incentive to balance reliability with other features.

## Non-goals

This policy is not a punishment for missing an SLO. Halting change is undesirable; the policy gives the team permission to focus on reliability when the data says reliability is the priority.

## Budget definition

Error budget = 1 - SLO = <0.1%> over the window of <4 weeks (example) / 30 days>. With <1,000,000> requests in the window the budget is <1,000> errors.

## SLO miss policy

- At or above SLO: releases (including data changes) follow the normal release policy.
- Budget exceeded for the preceding window: halt all changes and releases except P0 issues and security fixes until the service is back within SLO.
- Reliability work is mandatory when: a code bug or procedural error caused the service itself to exceed the budget; a postmortem shows a hard dependency that can be softened; miscategorized errors hid budget consumption.
- Feature work may continue when: the cause was a company-wide or network problem outside the team; a dependency owned by another team that has frozen its own releases; the budget was consumed by out-of-scope traffic (load tests, penetration testers); miscategorized errors consumed budget with no user impact.

## Outage policy

- A single incident that consumes more than <20% (example)> of the budget over the window requires a postmortem with at least one P0 action item addressing the root cause.
- A single class of outage that consumes more than <20% (example)> of the budget over a quarter requires a P0 item in the next quarterly plan.

## Freeze and exception procedure

- Freeze starts: <automatically when the budget report shows < 0% remaining | decided by owner>.
- Who may grant an exception to ship during a freeze: <name/role>; the exception is recorded here with reason, scope and expiry.
- Lifting the freeze: budget back within SLO, or an exception recorded. A lift is a production decision with the go of the policy owner.

## Escalation

Disagreement about the calculation of the budget or about the required actions is escalated to <CTO / named role> who decides.

## Reporting

Budget remaining is reported <weekly> to <audience> from <dashboard link>.

## Exceptions log

| Date | Change shipped during freeze | Reason | Approved by | Expiry |
|------|------------------------------|--------|-------------|--------|
