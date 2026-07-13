# Sarvenix — Judge Pretest Shot Manifest

Run: sarvenix-run-20260713T060816Z-ea14ce74
Sandbox seeded: 2026-07-13T06:08:16Z
Frozen evidence commit: f5d9667

Each row maps to a screenshot file, the judging category it serves, and the exact claim it proves.
Status: STATIC = generated from frozen data; MANUAL-PENDING = requires authenticated Slack session.

---

| # | File | Status | Demo timestamp | Judging category | Claim proved |
|---|------|--------|----------------|-----------------|--------------|
| 01 | 01-app-home.png | STATIC | 0:00 | Best UX | App Home shows system readiness, first-step guidance, and per-source health |
| 02 | 02-primary-channel-seed.png | MANUAL-PENDING | 0:10 | Technical | Real Slack message with run ID exists in the live sandbox primary channel |
| 03 | 03-ask-question.png | MANUAL-PENDING | 0:42 | Best UX | User mentions @Sarvenix with a natural-language question in the seeded channel |
| 04 | 04-ask-loading-reaction.png | MANUAL-PENDING | 0:44 | Best UX | Hourglass reaction appears immediately on the question — processing is acknowledged |
| 05 | 05-ask-response-citations.png | MANUAL-PENDING | 0:55 | Technical + Most Innovative | Block Kit response includes answer, evidence-derived confidence, and three deep-link citations |
| 06 | 06-citation-slack-opened.png | MANUAL-PENDING | 1:05 | Technical | Slack citation link opens the real #migration-decisions channel messages |
| 07 | 07-citation-github-opened.png | STATIC | 1:12 | Technical | GitHub Issue #14 is real, open, and contains the referenced decision rationale |
| 08 | 08-citation-jira-opened.png | STATIC | 1:18 | Technical | Jira MIGRATE-16 is real, in-progress, and linked to the same decision chain |
| 09 | 09-backup-channel-seed.png | MANUAL-PENDING | 1:22 | Technical | Backup Slack channel exists with its own independent decision chain |
| 10 | 10-proactive-alert.png | MANUAL-PENDING | 1:28 | Most Innovative | Sarvenix detects a semantic conflict without being mentioned and posts a verified alert |
| 11 | 11-impact-radius.png | STATIC | 1:45 | Most Innovative | Impact radius traversal shows affected decisions, artifacts, owners, depth, and freshness |
| 12 | 12-resolve-dialog.png | MANUAL-PENDING | 2:08 | Best UX | Human-confirmation modal is required before the decision graph is updated |
| 13 | 13-resolution-confirmed.png | MANUAL-PENDING | 2:18 | Technical + Best UX | Conflict resolved, graph updated, GitHub and Jira unchanged — confirmation in channel |
| 14 | 14-degraded-partial-result.png | STATIC | 2:25 | Technical | When GitHub is unavailable, Sarvenix answers with reduced confidence and discloses the gap |
| 15 | 15-evaluation-report.png | STATIC | 2:42 | Technical | 104-scenario evaluation: citation precision 100%, contradiction precision 100%, latency p50 1130ms |
| 16 | 16-benchmark-report.png | STATIC | 2:44 | Technical | Controlled benchmark: Sarvenix 1,193ms median vs manual 89,078ms; corpus and limitations disclosed |
| 17 | 17-architecture-diagram.png | STATIC | 2:46 | Technical | System architecture shows RTS, MCP services, Neo4j graph, grounding, and adversarial critic |
| 18 | 18-quality-gate-proof.png | STATIC | 2:50 | Technical | 7 packages, 8 suites, 16 tests, 104 scenarios, 0 vulnerabilities, freeze validator passed |

---

## Manual-pending shots — live sandbox details

These eight shots require your authenticated Slack session in workspace SANDBOX_SLACK_WORKSPACE_ID.
The sandbox is live. All channel names, message text, and mention targets below are exact.

| Shot | Channel | Action |
|------|---------|--------|
| 02 | #sarvenix-primary-ea14ce74 | Open channel; scroll to seed message; screenshot |
| 03 | #sarvenix-primary-ea14ce74 | Type "@Sarvenix why did we use the regional connection pool for primary?" and press Enter; screenshot before sending |
| 04 | #sarvenix-primary-ea14ce74 | Screenshot immediately after sending — hourglass reaction will appear within 2 seconds |
| 05 | #sarvenix-primary-ea14ce74 | Screenshot the Block Kit response when it appears |
| 06 | #sarvenix-primary-ea14ce74 | Click the Slack citation link in the response; screenshot the opened channel |
| 09 | #sarvenix-backup-ea14ce74 | Open channel; scroll to seed message; screenshot |
| 10 | #sarvenix-primary-ea14ce74 or #sarvenix-backup-ea14ce74 | Type "I'm thinking we should use a single global connection pool — simpler to manage." without mentioning @Sarvenix; screenshot the proactive alert reply |
| 12–13 | Same channel | Click "Resolve prior decision"; screenshot the modal; click "Confirm Resolution"; screenshot the acknowledgement |

See docs/Sarvenix-Manual-Capture-Guide.md for the complete step-by-step recording procedure.
