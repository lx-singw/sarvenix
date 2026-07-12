# Sarvenix — Judge Demo and Rehearsal Runbook

## 1. Non-negotiable preflight

- Confirm the Slack judge workspace is the intended sandbox, not a personal or production workspace.
- Invite and validate access for the official judge accounts specified by the challenge.
- Confirm Sarvenix is installed and the bot is present in every channel used in the recording.
- Confirm the demo user can open every Slack, GitHub, and Jira citation.
- Confirm GitHub App access is read-only and restricted to the demo repository.
- Confirm Jira token access is read-only and restricted to the demo site/project.
- Confirm no token, private key, customer name, or private message appears on screen.
- Confirm `DEMO_MODE` is not used to impersonate live evidence. Seeded graph history is disclosed as seeded.

## 2. Quality gate

Run from the repository root:

```bash
npx jest --runInBand
npm run build
npm audit --omit=dev --audit-level=high
```

Expected verified baseline:

- 6 test suites pass.
- 10 tests pass.
- 7 workspace packages build.
- Production dependency audit reports 0 vulnerabilities.

Stop the recording if any gate fails.

## 3. Dependency readiness

Validate without printing secrets:

- Slack bot authentication succeeds.
- Slack Real-Time Search returns at least one result for the Ask scenario.
- Neo4j connectivity check succeeds and contains the seeded decision lineage.
- GitHub MCP opens the canonical PR or issue used in the story.
- Jira MCP opens the canonical issue used in the story.
- Reasoning and embedding providers respond within the demo window.

Keep one pre-verified backup question that uses different real artifacts. A backup is recovery, not a prerecorded fake response.

## 4. Seeded live scenario

Use a coherent scenario across systems:

1. A Slack thread records the original decision and rationale.
2. A real Jira sandbox issue records the resulting scope/status decision.
3. A real GitHub sandbox PR or issue records implementation evidence.
4. Neo4j contains references and short rationale snippets linking those artifacts.
5. A later Slack message proposes an incompatible decision.

The external artifacts are live. If the graph was seeded to represent historical ingestion, state that clearly in the submission.

## 5. Three-minute recording order

### 0:00–0:15 — Stakes

Show the three systems and say: “Teams do not lose documents; they lose the causal chain between them.”

### 0:15–0:42 — Catch Up

Run `/sarvenix-catchup`. Show the private, prioritized brief and open one exact Slack source.

### 0:42–1:22 — Ask

Ask why the demo decision changed. Let the processing indicator appear. Show the concise answer, confidence, source coverage, and exact Slack/GitHub/Jira links. Open GitHub and Jira briefly to prove they are real.

### 1:22–2:08 — Serve and lineage

Post the conflicting proposal from a second user. Show the proactive in-thread alert, prior owner, semantic match, decision ID, and exact evidence. Emphasize that an independent critic approved the alert and that no external action occurred automatically.

### 2:08–2:30 — Resolution and control

Use “Resolve prior decision,” show the confirmation dialog, then show the auditable resolution acknowledgement. Briefly show `/sarvenix mute` or the mute action.

### 2:30–2:48 — Architecture

Show the judge architecture diagram. Explain RTS permission scope, read-only MCP fan-out, the graph, confidence, critic, and human-controlled actions.

### 2:48–3:00 — Proof and close

Show the verified quality numbers. Close with: “Sarvenix turns fragmented tribal knowledge into decision memory—and serves it before the mistake repeats.”

## 6. Failure recovery

- **GitHub unavailable:** Do not restart silently. Show the partial-answer state and explain that confidence falls because a source is unavailable, then use the backup scenario if needed.
- **Jira unavailable:** Same rule; never substitute a fixture labeled as live.
- **RTS empty:** Verify the bot/user channel access and switch to the pre-verified backup question.
- **Serve does not trigger:** Verify channel mute state, rate limit, graph decision status, and similarity threshold. Reset only through the documented sandbox procedure.
- **Model timeout:** Keep the failure visible long enough to demonstrate honest error handling, then retry once.
- **Citation permission failure:** Stop using that artifact and fix judge permissions before recording.

## 7. Recording quality

- Record at a readable Slack zoom and hide unrelated sidebars/notifications.
- Use one pointer movement per proof; avoid frantic cursor movement.
- Keep the architecture view on screen for at least ten seconds.
- Avoid edits that imply an action was live when it was not.
- Add captions and verify product names, issue IDs, and code terms.
- Do not use emojis in narration as substitutes for status language; say “high confidence,” “action,” and “risk.”

## 8. Final review

- Replace all `TBD` timestamps in the judging matrix.
- Verify the Devpost text matches current code and measured results.
- Verify the video is within the challenge limit.
- Verify repository access and deployment links in a signed-out browser.
- Verify judge accounts can complete the primary path without team assistance.
- Keep a final copy of the exact commit, environment inventory, and sandbox reset state used for recording.
