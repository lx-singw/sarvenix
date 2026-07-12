# Sarvenix Evaluation and Controlled Benchmark Methodology

## Purpose

This methodology separates repository quality, evaluation readiness, agent accuracy, and impact. Sarvenix publishes only values calculated from retained artifacts; an unscored corpus is never described as accuracy evidence.

## Evaluation corpus

The versioned corpus contains 104 scenarios across eight categories: grounded answers, insufficient evidence, conflicting sources, superseded decisions, permission denial, prompt injection, true contradictions, and semantic false positives. Every scenario declares expected answerability, sources, citation requirements, confidence, abstention behavior, and permission-denial behavior.

## Live scoring procedure

1. Reset the dedicated Slack, GitHub, Jira, and graph sandboxes.
2. Seed only the disclosed historical decision chain.
3. Execute each scenario through the deployed agent with a correlation ID.
4. Retain normalized outputs, citations, source-health states, tool latency, and alert outcomes.
5. Score outputs against the versioned expectations.
6. Generate JSON and Markdown reports with the commit SHA, corpus version, runtime configuration, and timestamp.
7. Reject the report if scenarios are missing, duplicated, or executed against fixture fallback data.

## Metrics

- **Citation precision:** supported citations divided by all returned citations.
- **Citation coverage:** supported factual claims with citations divided by all factual claims requiring citations.
- **Unsupported-claim rate:** unsupported factual claims divided by all factual claims.
- **Groundedness:** supported factual claims divided by all factual claims.
- **Contradiction precision:** verified true contradictions divided by all emitted contradiction alerts.
- **Contradiction recall:** detected true contradictions divided by all labeled true contradictions.
- **False-alert rate:** false alerts divided by all non-contradictory candidates.
- **Correct abstention:** insufficient or denied scenarios where Sarvenix declines to guess.
- **Outage recovery:** outage scenarios returning an honest partial result without fabricated evidence.
- **Latency:** median and p95 duration measured from accepted Slack event to final response.

## Controlled impact benchmark

No participant study is claimed. The benchmark compares two reproducible procedures over the same labeled tasks:

- **Manual baseline:** search Slack, GitHub, and Jira independently, then write the rationale and citations.
- **Sarvenix:** ask the equivalent question and verify the returned evidence.

For each run, record task ID, procedure, duration, correctness, citation correctness, systems opened, failure state, and notes in JSON Lines. Run `npm run benchmark -- <file>` to produce an aggregate report. Report limitations prominently: the operator knows the system, sandbox data is controlled, and timing results do not represent independent-user research.

## Acceptance thresholds

Thresholds are frozen before the final scored run. Recommended release gates are: zero fabricated canonical URLs, zero restricted-source disclosure, zero fixture fallback in production, correct abstention on every permission-denied scenario, and no regression from the previous accepted report. Numerical product thresholds should be set only after a dry run reveals realistic variance.

## Reproducibility and claims

Generated reports live under `reports/` and are CI artifacts rather than committed source. Submission claims must cite the report artifact, commit SHA, and run date. If a metric cannot be reproduced, remove it from the submission.
