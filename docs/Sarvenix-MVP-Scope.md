# Sarvenix — MVP Scope Document

---

## 1. Purpose of This Document

This document defines exactly what ships in the hackathon-deadline build of Sarvenix, what's explicitly deferred, and why — so that engineering effort stays inside the boundary that produces a working, demoable, trustworthy product rather than a wide, shallow feature list. It is the single source of truth for "is this in scope" decisions during the build window.

---

## 2. MVP Definition

**Sarvenix MVP = a Slack agent that (a) answers cross-system "why" questions with cited, confidence-scored synthesis, and (b) proactively catches at least one class of real, demoable mistake (contradiction of a past decision) before a human has to.**

Everything in scope exists to make that sentence true and trustworthy on stage. Everything out of scope is valuable but not required to prove the core thesis: *institutional memory that serves before it's asked, and never overclaims.*

---

## 3. In-Scope Features (MVP)

### 3.1 Context Summariser — `/sarvenix-catchup`
- Slack slash command + automatic trigger on OOO → active status change.
- Queries RTS across the user's channels within their OOO time window.
- Produces a strict 3-bullet brief with severity tagging (🔴 needs action / 🟡 relevant / 🟢 FYI).
- **Why in MVP:** fastest path to a working, demoable feature; reuses RTS infra needed everywhere else; lowest-risk feature to build first and validate the pipeline.

### 3.2 Ask Mode — cited cross-system synthesis
- `@Sarvenix <question>` triggers RTS query → Knowledge Graph lookup → live MCP calls to GitHub/Jira → Gemini synthesis.
- Every claim in the answer is cited with a deep link back to its source (Slack message, PR comment, Jira ticket).
- **Why in MVP:** this is the core value proposition and the most demoable "wow, it actually traced that" moment.

### 3.3 Knowledge Graph (core schema)
- Nodes: `Decision`, `Person`, `Artifact` (PR / Ticket / Doc), `Channel`, `Topic`.
- Edges: `DISCUSSED_IN`, `RESOLVED_BY`, `CONTRADICTS`, `SUPERSEDES`, `REFERENCES`, `OWNED_BY`.
- Seeded with a representative dataset for the demo (stated honestly as such — see architecture doc §9).
- **Why in MVP:** everything else (contradiction detection, confidence scoring, provenance links) depends on this existing first.

### 3.4 Serve Mode — proactive contradiction & duplication detection
- Watches live channel activity for `Decision` entities that semantically match an existing graph node with `status: rejected/closed`.
- Posts an in-thread, non-blocking notice with citation and a clarifying question — never a correction.
- Rate-limited per channel per day; respects `/sarvenix mute`.
- **Why in MVP:** this is the single biggest differentiator against every reactive-only competing submission — cannot be cut.

### 3.5 Confidence Scoring
- Every Ask Mode answer and every Serve Mode alert is tagged High / Moderate / Low confidence based on how many independent sources agree.
- **Why in MVP:** cheap to build alongside the reasoning engine, and the single biggest lever for "trustworthy, not just confident" — directly de-risks the demo.

### 3.6 Adversarial Verification Pass
- Before any Serve Mode alert posts, a second, independently-scoped Gemini "critic" pass tries to disprove it.
- Only alerts that survive the critic pass are posted; rejected alerts are logged silently for tuning.
- **Why in MVP:** protects the demo from the worst failure mode (confidently wrong, live, in front of judges) and is a genuine, demonstrable multi-agent pattern.

### 3.7 Mute Controls & Rate Limiting
- `/sarvenix mute` per channel, respected at the ingestion layer (muted channels are never indexed, not just never alerted).
- Hard cap on proactive alerts per channel per day.
- **Why in MVP:** required guardrail — without this, Serve Mode reads as naive rather than production-minded, which costs Design points.

### 3.8 MCP Integrations (GitHub, Jira, Internal Docs) — read-only
- Real, live connections against demo/test instances of each system for the hackathon build.
- **Why in MVP:** this is literally the technology the track requires; also the substance behind every Ask Mode answer.

---

## 4. Explicitly Out of Scope (Post-MVP)

| Feature | Reason deferred |
|---|---|
| **Decision Half-Life** (staleness nudges on old decisions) | Requires a graph with real temporal density that a hackathon timeframe can't organically generate; a seeded demo graph can't convincingly demonstrate "this is 8 months old." |
| **Org-Chart-Aware Routing** | Depends on accurate `OWNED_BY` data built from real usage history; a thin demo dataset risks routing errors that undercut trust rather than build it. |
| **Admin Dashboard** | Valuable for the deployment/governance narrative in the written submission, but not required for the live agent loop to function or be demoed convincingly. A mockup is sufficient for the pitch. |

**Rule applied:** anything requiring either (a) a longer-lived graph than a hackathon can organically produce, or (b) usage history that doesn't exist yet, is Post-MVP by default — no exceptions, even for genuinely good ideas, because faking that data would be dishonest in the submission and fragile live.

---

## 5. Explicitly Not Planned (Non-Goals)

To keep scope honest, these are not "later" — they are deliberately not part of Sarvenix's product thesis at all:

- **Write access to any external system.** Sarvenix never edits, closes, or comments on a Jira ticket, PR, or doc on its own initiative. This is a permanent design boundary, not a staging decision — it's core to the trust story and the reduced security-review burden pitch.
- **General-purpose chatbot functionality.** Sarvenix does not answer questions unrelated to institutional context/decisions (e.g., "what's the weather," general coding help). Scope creep here dilutes the "institutional memory" positioning.
- **Real-time voice/huddle participation.** No huddle transcription, no voice interaction — text/thread-based only.

---

## 6. Build Sequencing (MVP only)

1. **RTS indexing + Context Summariser** — validates the ingestion pipeline works end-to-end before anything else is built on top of it.
2. **Knowledge Graph schema + seed data** — the dependency every later feature needs.
3. **Ask Mode synthesis** (GitHub + Jira MCP, no graph dependency yet — direct retrieval + Gemini synthesis) — can be built in parallel with the graph.
4. **Confidence scoring** — layered into the Ask Mode reasoning step as soon as multiple sources are being cross-referenced.
5. **Serve Mode contradiction detection** — depends on the graph being populated; build after step 2–3 are stable.
6. **Adversarial verification pass** — wrap around Serve Mode alerts before they're ever demoed live; do not skip even under time pressure.
7. **Mute controls / rate limiting** — implement alongside Serve Mode, not after — a proactive agent without guardrails is not demo-safe.

---

## 7. Definition of Done for the Hackathon Submission

MVP is considered complete and demo-ready when:

- [ ] `/sarvenix-catchup` returns a real, correctly-severity-tagged 3-bullet brief from live RTS data.
- [ ] `@Sarvenix <question>` returns a cited, confidence-scored answer synthesized from at least 2 live MCP sources.
- [ ] A seeded contradiction scenario reliably triggers a Serve Mode alert that survives the adversarial verification pass in the demo environment.
- [ ] A seeded non-contradiction (intentional revisit) scenario reliably does **not** trigger a false alert, or is caught and suppressed by the critic pass.
- [ ] `/sarvenix mute` demonstrably stops both alerts and indexing in a muted channel.
- [ ] Every citation in every answer resolves to a real, clickable source.

If any of these fail reliably in rehearsal, that feature does not go in the live demo cut — fall back to a recorded segment rather than risk a live failure in front of judges.
