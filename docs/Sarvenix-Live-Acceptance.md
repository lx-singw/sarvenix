# Sarvenix Live Sandbox Acceptance

## Automated command sequence

All live commands are explicit, local-only, sandbox-guarded, and write redacted artifacts under `reports/`.

1. Set `SARVENIX_SANDBOX_MODE=true` and run `npm run live:preflight`.
2. Preserve the printed run ID as `SARVENIX_RUN_ID`.
3. Run `npm run live:seed`, `npm run live:accept`, and `npm run live:adversarial`.
4. Run evaluation and benchmark scoring only with complete reviewed observation files.
5. Run `npm run live:reset` and verify the cleanup report.
6. Set `SARVENIX_EVIDENCE_URL` to the approved preview and run `npm run evidence:capture`.
7. Run `npm run competition:freeze` and the normal quality gate.

`npm run live:all` combines preflight, seed, causal acceptance, adversarial acceptance, and ownership-safe cleanup. It stops before provisioning when Jira, GitHub, Slack, or graph readiness fails.

## Required isolated resources

- Dedicated Slack workspace with judge, authorized, and restricted test users
- Dedicated GitHub repository installed with the read-only GitHub App
- Dedicated Jira project scoped by `JIRA_ALLOWED_PROJECT_KEYS`
- Dedicated Neo4j database or database namespace
- Production-like deployed Sarvenix endpoint with fixture demo mode disabled

## Preflight

1. Confirm `DEMO_MODE=false` and `SARVENIX_SANDBOX_MODE=true`.
2. Verify the configured Slack workspace ID, GitHub repository, and Jira project match the isolated resources.
3. Verify GitHub and Jira allowlists reject an out-of-scope resource.
4. Reset sandbox messages, artifacts, graph events, alert counters, and idempotency records.
5. Record deployment URL, commit SHA, corpus version, and operator.

## Acceptance sequence

### A. Live causal chain

1. Create the proposal and decision in Slack.
2. Create the linked Jira issue and GitHub pull request with matching identifiers.
3. Trigger ingestion and verify the graph stores the decision and lifecycle event.
4. Ask why the decision changed from the authorized user.
5. Open every Slack, GitHub, and Jira citation and verify the exact source.

### B. Permission denial

1. Place one supporting message in a restricted Slack channel.
2. Query as the user without access.
3. Verify no title, excerpt, person, or URL from the restricted source appears.
4. Attempt an out-of-allowlist GitHub repository and Jira project.
5. Verify denial is explicit but reveals no protected artifact content.

### C. Outage and rate limit

1. Disable Jira access or route the sandbox request to a controlled timeout.
2. Verify Ask returns available evidence, names Jira as unavailable, and lowers confidence.
3. Simulate a provider rate limit and verify the dedicated state copy.
4. Restore the provider and verify the circuit transitions back to healthy after its cooldown.

### D. Idempotency and retry

1. Replay the same Slack event and retry headers.
2. Verify one graph write, one final answer, and at most one proactive alert.
3. Repeat the confirmed resolution action.
4. Verify the graph transaction remains applied exactly once.

### E. Temporal lineage and impact

1. Record proposed, decided, implemented, superseded, and reopened lifecycle events.
2. Verify the lineage order and validity windows.
3. Generate impact radius and verify each returned item has a path, depth, freshness, and confidence.
4. Generate the counterfactual preview and verify every effect maps to a returned impact item.

### F. Governance

1. Mute a channel and verify indexing and proactive alerts stop according to policy.
2. Delete a source Slack message and run the deletion workflow.
3. Verify the graph no longer returns the removed evidence.
4. Exercise retention dry-run before destructive deletion.

## Evidence retained

Retain redacted request IDs, correlation IDs, normalized outputs, screenshots, exact source links, CI logs, and the generated evaluation/benchmark reports. Never retain access tokens or private source bodies in the submission archive.

## Pass condition

The run passes only when all exact links open for authorized users, restricted evidence remains undisclosed, retries are idempotent, partial failures are honest, lifecycle and impact paths are explainable, and no production fixture fallback is used.
