# Sarvenix — Devpost Submission

## Tagline

**Institutional memory that serves the answer before you ask.**

## Inspiration

The reason behind an engineering decision rarely lives in one place. A Slack thread contains the debate, Jira contains the final status, and GitHub contains the implementation detail that changed the outcome. Teams lose hours reconstructing that chain, repeat rejected work, and lose institutional knowledge when people change teams.

Sarvenix makes that fragmented reasoning useful inside the place where teams already work: Slack.

## What it does

Sarvenix is a proactive Slack agent with three focused modes:

- **Ask:** Mention Sarvenix with a question such as “Why did we abandon this migration?” It searches only Slack channels the requester can access, follows linked GitHub and Jira artifacts, and returns one concise answer with exact deep-link citations and an evidence-derived confidence level.
- **Catch Up:** `/sarvenix-catchup` produces a private return-from-OOO brief organized into decisions, action items, risks, and source links.
- **Serve:** Sarvenix evaluates new decisions against the decision graph. When a proposal conflicts with a prior decision, it posts a rate-limited, in-thread alert only after a second adversarial verification pass. A human can inspect the evidence, involve the prior owner, dismiss the alert, mute the channel, or resolve the old decision.

## Why it is different

Most workplace agents are reactive retrieval interfaces. Sarvenix reconstructs **decision lineage** and can intervene before a team repeats a documented mistake. Its central unit is not a document or message—it is a decision connected to people, channels, PRs, tickets, rationale, and later outcomes.

The proactive behavior is deliberately constrained. Sarvenix is read-only in external systems, uses human-confirmed graph resolution, respects channel mute controls, applies daily alert limits, exposes uncertainty, and never presents unavailable integrations as live evidence.

## How we built it

- Slack Bolt for events, mentions, slash commands, App Home, reactions, and Block Kit interactions
- Slack Real-Time Search for live, requester-scoped workspace evidence
- GitHub and Jira MCP services using read-only authentication and canonical source links
- Neo4j decision graph for provenance, semantic relationships, contradictions, and resolution state
- Claude-based extraction, synthesis, confidence reasoning, and an independent adversarial critic
- TypeScript monorepo with shared contracts, bounded retries, structured redacted logging, and Block Kit contract tests

The Ask pipeline treats every retrieved message, PR, and ticket as untrusted data. The model is explicitly prohibited from obeying instructions embedded in sources, inventing missing facts, or replacing canonical links. When a source fails, the answer remains usable but names the missing system and lowers confidence.

## Challenges

The hardest challenge was making proactive behavior trustworthy. High recall is easy; posting confidently incorrect alerts in a real team is unacceptable. We addressed this with semantic candidate retrieval, a separately prompted skeptical critic, per-channel rate limits, clear confidence language, reversible feedback, and a human-confirmed resolution loop.

The second challenge was cross-system provenance. GitHub and Jira return different schemas and Slack permissions are user-specific. Sarvenix normalizes evidence into a common contract while preserving exact URLs and limits Slack retrieval to channels visible to the requester.

## Accomplishments

- Live Slack, GitHub, and Jira evidence replaces production mock fallbacks
- Exact deep-link citations are preserved through synthesis and Slack rendering
- Ask answers communicate confidence, source coverage, and degraded-source status
- Serve alerts expose semantic match strength and prior decision identity
- Resolution actions update decision state only after explicit confirmation
- TLS verification is enabled; structured logs redact secret-like fields
- Current quality gate: **7 packages build, 6 suites pass, 10 tests pass, and production dependency audit reports 0 vulnerabilities**

These numbers describe the current repository quality gate, not a claim of production-scale accuracy. Alert precision and groundedness need a larger labeled pilot corpus before we publish statistically meaningful product metrics.

## What we learned

Agent UX is policy made visible. Citations, confidence, loading feedback, mute controls, and honest partial-failure copy are not cosmetic—they determine whether people trust an agent enough to use it. We also learned that MCP is most valuable when paired with a relationship model: tools retrieve facts, while the graph explains how those facts form a decision history.

## What is next

Next we will validate contradiction precision on an organically grown workspace, add workspace-admin retention controls, calibrate alert thresholds from feedback, and expand MCP coverage based on pilot demand. Write actions will remain opt-in and explicitly human-confirmed.

## Privacy and security

Sarvenix uses read-only GitHub and Jira access, restricts Slack search to requester-visible channels, avoids storing full message bodies in the graph, redacts sensitive log fields, and supports channel-level ingestion and alert muting. It does not autonomously edit Slack, GitHub, or Jira content.

## Built for

Slack Agent Builder Challenge — New Slack Agent, Best UX, Most Innovative Slack Agent, and Best Technological Implementation.
