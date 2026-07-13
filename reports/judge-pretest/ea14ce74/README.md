# Sarvenix — Judge Pretest Package

Run: sarvenix-run-20260713T060816Z-ea14ce74
Sandbox seeded: 2026-07-13T06:08:16Z
Frozen evidence commit: f5d9667
Branch: v0/motheolulama-9318-eee40da7

## Purpose

This folder contains every judge-facing asset for the competition submission. Every screenshot, report, and manifest in this folder directly maps to a claim in docs/Sarvenix-Judging-Evidence.md. Do not modify these files after the freeze.

## Folder structure

```
ea14ce74/
  README.md                     — this file
  screenshots/                  — judge-facing stills, one per demo step
    01-app-home.png
    02-primary-channel-seed.png
    03-ask-question.png
    04-ask-loading-reaction.png
    05-ask-response-citations.png
    06-citation-slack-opened.png
    07-citation-github-opened.png
    08-citation-jira-opened.png
    09-backup-channel-seed.png
    10-proactive-alert.png
    11-impact-radius.png
    12-resolve-dialog.png
    13-resolution-confirmed.png
    14-degraded-partial-result.png
    15-evaluation-report.png
    16-benchmark-report.png
    17-architecture-diagram.png
    18-quality-gate-proof.png
  reports/
    acceptance-primary.json     — copy of reports/live/PRIMARY/acceptance.json
    acceptance-backup.json      — copy of reports/live/BACKUP/acceptance.json
    evaluation.json             — copy of reports/evaluation/latest.json
    benchmark.json              — copy of reports/benchmark/latest.json
  CAPTURE-STATUS.md             — which shots are automated vs manual pending
```

## Screenshot status key

- AUTOMATED — captured by automated tooling, no manual action needed.
- MANUAL-PENDING — requires an authenticated Slack session; see Sarvenix-Manual-Capture-Guide.md.
- STATIC — generated from frozen data, no live interaction needed.
