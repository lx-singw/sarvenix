# Sarvenix — Judging Evidence Matrix

Use this as the recording checklist and as the source of truth for every submission claim. Replace `TBD` timestamps after the final recording; do not claim unverified metrics.

| Target | Judge-visible proof | Recording timestamp | Implementation evidence | Automated proof |
|---|---|---:|---|---|
| First Place: complete Slack agent | Ask, Catch Up, proactive Serve, and resolution run in one workspace | TBD | `apps/slack-app/src/index.ts` | Full build and test gate |
| First Place: real integrations | Open an actual Slack message, GitHub artifact, and Jira issue from answer links | TBD | `modes/ask-mode/evidence-resolver.ts`; `services/mcp-github`; `services/mcp-jira` | Ask citation suite |
| Best UX: immediate feedback | Hourglass reaction appears while Ask is processing | TBD | `apps/slack-app/src/index.ts` | Manual Slack sandbox check |
| Best UX: concise hierarchy | Answer first, confidence second, evidence and actions after | TBD | `delivery/block-kit-formatters.ts` | Block Kit contract suite |
| Best UX: human control | Mute, dismiss, involve owner, feedback, and confirmed resolution controls | TBD | `apps/slack-app/src/index.ts`; formatter actions | Block Kit contract suite |
| Best UX: graceful degradation | Disconnect one source; answer names it and lowers confidence | TBD | `modes/ask-mode/index.ts`; `evidence-resolver.ts` | Ask partial-evidence test path |
| Most Innovative: proactive memory | New proposal triggers a verified prior-decision conflict without mention | TBD | `modes/serve-mode/**` | Contradiction and false-positive suites |
| Most Innovative: decision lineage | Alert shows prior decision, owner, exact source, decision ID, and semantic match | TBD | `formatServeModeAlert` | Block Kit contract suite |
| Most Innovative: closed loop | Confirm “Resolve prior decision”; graph conflict links are removed | TBD | `resolveDecisionConflict` in knowledge graph client | Build plus manual sandbox proof |
| Technical: requester permissions | Ask searches only channels returned by the requester's Slack conversations | TBD | `getAccessibleChannelIds` in Ask Mode | Ask suite |
| Technical: grounded synthesis | Sources are untrusted data; unsupported facts and fabricated links are prohibited | N/A | `modes/ask-mode/synthesis.ts` | Code review evidence |
| Technical: live MCP | Missing credentials return unavailable errors, never fake data | N/A | GitHub/Jira MCP `index.ts` | Build and source inspection |
| Technical: security | TLS verification remains enabled; logging recursively redacts sensitive keys | N/A | `lib/logger.ts`; no TLS override | Dependency audit |
| Technical: quality | Seven workspace packages compile | N/A | Monorepo build | `npm run build` |
| Technical: regression gate | Eight suites and sixteen tests pass | N/A | `tests/e2e/**` | `npx jest --runInBand` |
| Technical: evaluation foundation | 104 versioned scenarios validate across eight adversarial categories | N/A | `tests/evaluation/corpus.json`; `scripts/run-evaluation.ts` | `npm run eval:validate` |
| Technical: reliability | Deterministic idempotency keys, enforced timeouts, circuit breaking, and structured telemetry | N/A | `lib/reliability.ts`; `lib/telemetry.ts` | Measurement foundation suite |
| Technical: source boundaries | Repository/project allowlists, endpoint validation, and redacted provider errors | N/A | GitHub/Jira resource clients; `shared-types/authorization.ts` | Build and source inspection |
| Most Innovative: impact radius | Show affected decisions, artifacts, owners, path depth, freshness, and partial-result status | TBD | `calculateImpactRadius`; `formatImpactRadius` | Build plus live sandbox proof |
| Most Innovative: temporal truth | Decision lifecycle events distinguish proposed, implemented, superseded, reopened, and resolved truth | TBD | lifecycle contracts and graph queries | Build plus sandbox lineage proof |
| Most Innovative: counterfactual preview | Preview evidence-backed downstream impact without claiming certainty | TBD | `agent/counterfactual-preview.ts` | Innovation safeguards suite |
| Best UX: onboarding and health | App Home explains first steps, source readiness, permissions, and safe failure behavior | TBD | `formatAppHome`; `formatSystemState` | Block Kit contract plus sandbox proof |
| Technical: dependency health | Zero production dependency vulnerabilities at current audit | N/A | Lockfile | `npm audit --omit=dev --audit-level=high` |
| Potential impact | Demonstrate one avoided repeat investigation and explain the reusable pattern | TBD | Demo narrative | Judge observation |

## Current verified baseline

- Build: 7 successful packages out of 7.
- Tests: 8 passing suites, 16 passing tests.
- Evaluation corpus: 104 validated scenarios across 8 categories.
- Production dependency audit: 0 vulnerabilities.
- Product accuracy metrics: pending scored live outputs. The corpus foundation is complete, but no precision, recall, latency, or time-saved number may be claimed until generated from recorded results.

## Claims that require live recording proof

1. Slack links open content visible to the judge account.
2. GitHub and Jira links open real sandbox artifacts.
3. A source outage produces an honest partial answer.
4. A proactive alert appears without mentioning Sarvenix.
5. Resolution updates the graph and suppresses the same open conflict.
6. Channel mute stops indexing/proactive behavior as documented.

## Final submission rule

Every factual statement must point to one of: a visible demo moment, a source file, a passing automated check, or a clearly labeled design/future item. Anything else is removed or rewritten as an aspiration.
