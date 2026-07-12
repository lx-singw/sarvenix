# Sarvenix

**Institutional memory that serves the answer before you ask.**

Sarvenix is a proactive Slack agent that reconstructs the “why” behind decisions across Slack, GitHub, and Jira. It answers with exact evidence, creates private return-from-OOO briefs, detects conflicts before teams repeat settled work, and keeps resolution under human control.

## Core experiences

- **Ask:** mention Sarvenix to trace a decision across requester-visible Slack channels and live read-only GitHub/Jira evidence.
- **Catch Up:** run `/sarvenix-catchup` for a private brief of decisions, actions, and risks.
- **Serve:** receive rate-limited, adversarially verified contradiction alerts with decision lineage and a confirmed resolution action.

## Trust model

Sarvenix preserves canonical source links, exposes confidence and partial-source failures, treats retrieved text as untrusted data, keeps external integrations read-only, supports channel mute controls, and redacts sensitive logging fields. Historical graph data can be seeded for a demo, but production evidence is never silently replaced with fixtures.

## Verified quality gate

```bash
npx jest --runInBand
npm run build
npm audit --omit=dev --audit-level=high
```

Current verified result: 7 workspace packages build, 8 suites and 16 tests pass, 104 evaluation scenarios validate across 8 categories, and the production dependency audit reports 0 vulnerabilities. Product-accuracy metrics remain intentionally unpublished until live sandbox outputs are scored.

## Submission and architecture

- [Concise judge architecture](docs/Sarvenix-Judge-Architecture.md)
- [Three-minute demo script](docs/Sarvenix-Demo-Script.md)
- [Devpost submission copy](docs/Sarvenix-Devpost-Submission.md)
- [Judging evidence matrix](docs/Sarvenix-Judging-Evidence.md)
- [Rehearsal and judge runbook](docs/Sarvenix-Rehearsal-Runbook.md)
- [Full architecture](ARCHITECTURE.md)
- [Detailed product documentation](docs/)
