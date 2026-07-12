# Sarvenix — Architecture Document
### Slack Agent Builder Challenge · Track: New Slack Agent

**On the name:** *Sarvenix* derives from **serve** + **-nix** (a network/systems suffix). The root is deliberate — this agent doesn't just retrieve information when asked, it actively *serves* context into a conversation before anyone requests it. The name argues the product's core differentiator before a single feature is explained.

---

## 1. Problem Statement

Large organizations fragment work across disconnected surfaces: code lives in GitHub, tasks live in Jira, decisions live in Google Docs, and the *reasoning behind decisions* lives buried in thousands of Slack messages across hundreds of channels. When someone needs to understand "why" something happened, they become a digital detective — manually stitching together a Slack thread, a closed Jira ticket, and a GitHub PR comment that all reference the same decision but were never linked.

Existing "AI search" tools solve half of this: they retrieve text. They don't reconstruct **causal chains** across systems, and they are entirely reactive — they wait to be asked, even when they already know something is about to go wrong (e.g., a team re-proposing work that was already killed for a documented reason).

**Why this is quantifiable, not just anecdotal:** industry surveys put full ramp-up for a new software engineer at <cite index="4-1,5-1">roughly three to nine months on average across companies of varying size</cite>, and separately, <cite index="12-1">62% of developers report spending more than 30 minutes a day searching for answers or context, with 25% spending over an hour daily</cite> — time that <cite index="10-1">for a 50-person engineering team adds up to an estimated 333–651 hours lost per week workspace-wide</cite>. Sarvenix's front-door feature (§4.6) directly targets that daily search-and-reconstruct tax, not just the one-time onboarding curve — a stronger, more specific impact claim than "reduces onboarding time" alone. *(Sources: Stack Overflow Developer Survey 2022; CodePath/Swimm engineer onboarding research.)*

**Why now:** this class of agent wasn't practically buildable a year ago. Reaching into GitHub, Jira, and internal docs safely from inside Slack used to mean writing and maintaining a bespoke integration per system. MCP standardizes that tool-access layer — it's the specific enabling technology that makes a single agent able to reason across three previously-siloed systems without becoming an integration-maintenance burden. This is a direct, honest answer to "why does this need MCP" rather than using it as a buzzword.

## 2. Core Concept

Sarvenix is a **living, cross-platform institutional memory** for a Slack workspace. It has two operating modes:

1. **Reactive (Ask Mode)** — answers questions by synthesizing across Slack, GitHub, and Jira with full provenance.
2. **Proactive (Serve Mode)** — continuously monitors live conversation and *intervenes* when it detects contradictions, duplicated effort, or moments where a newcomer/returning employee needs context they don't have.

The differentiator against every competing "context agent" submission: **Sarvenix speaks up before being asked.**

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                            SLACK WORKSPACE                          │
│  Channels · Threads · DMs · Huddles · Canvases                      │
└───────────────┬───────────────────────────────────┬─────────────────┘
                │ Events API (message, reaction,     │ Slash commands /
                │ member_joined_channel)             │ @Sarvenix mentions
                ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        SARVENIX ORCHESTRATION LAYER                    │
│  (Slack Bolt app · Agent runtime · Claude as reasoning engine)      │
│                                                                       │
│   ┌───────────────┐   ┌─────────────────┐   ┌────────────────────┐ │
│   │ Ingestion &    │   │ Reasoning /      │   │ Proactive          │ │
│   │ Indexing       │──▶│ Synthesis Engine │──▶│ Intervention Engine│ │
│   │ Pipeline       │   │ (Claude)         │   │                    │ │
│   └───────┬────────┘   └────────┬────────┘   └─────────┬──────────┘ │
└───────────┼─────────────────────┼──────────────────────┼────────────┘
            │                     │                        │
            ▼                     ▼                        ▼
┌───────────────────┐  ┌────────────────────┐  ┌─────────────────────┐
│ Real-Time Search   │  │ Knowledge Graph /   │  │ Delivery Layer       │
│ (RTS) API          │  │ Memory Store        │  │ (in-thread replies,  │
│ — live Slack index │  │ — entities, links,  │  │  DM briefs, Canvas   │
│                     │  │   provenance edges  │  │  summaries)          │
└───────────────────┘  └────────────────────┘  └─────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          MCP SERVER LAYER                           │
│  ┌────────────┐   ┌────────────┐   ┌──────────────────────┐        │
│  │ GitHub MCP │   │ Jira MCP   │   │ Internal Docs/DB MCP  │        │
│  │ Server     │   │ Server     │   │ Server (Google Docs,  │        │
│  │            │   │            │   │ Confluence, wikis)     │        │
│  └────────────┘   └────────────┘   └──────────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Component Breakdown

### 4.1 Ingestion & Indexing Pipeline

**Purpose:** Continuously convert raw, unstructured cross-platform activity into structured, linkable entities.

- **Slack side:** Subscribes to Events API (`message.channels`, `message.groups`, `reaction_added`, `member_joined_channel`). Every message is embedded and indexed via the RTS API for live semantic search.
- **GitHub side (via MCP):** Listens for PR opens/merges/comments, commit messages, and issue closures. Extracts entities: PR number, linked issue, author, files touched, and free-text rationale from comments.
- **Jira side (via MCP):** Listens for ticket status transitions, comments, and linked-issue relationships. Extracts entities: ticket ID, status history, assignee, resolution comment.
- **Normalization step:** All ingested events are passed through an entity-extraction prompt (Claude) that tags: *decision*, *rationale*, *actor*, *artifact reference* (ticket/PR/doc ID), and *timestamp*. This is what allows a Slack sentence, a Jira comment, and a GitHub PR review to be recognized as *the same event described three ways*.

### 4.2 Knowledge Graph / Memory Store

**Purpose:** Persist the relationships ingestion discovers so Sarvenix can trace causal chains instead of just keyword-matching.

- **Schema (graph model):**
  - Nodes: `Decision`, `Person`, `Artifact` (PR / Ticket / Doc), `Channel`, `Topic`
  - Edges: `DISCUSSED_IN`, `RESOLVED_BY`, `CONTRADICTS`, `SUPERSEDES`, `REFERENCES`, `OWNED_BY`
- **Example graph fragment** produced from the "legacy migration" scenario:

```
(Decision: "Drop legacy DB migration")
   ─DISCUSSED_IN→ (Channel: #dev-infra, msg_ts: 1719...)
   ─RESOLVED_BY→ (Artifact: Jira MIGRATE-412)
   ─REFERENCES→ (Artifact: GitHub PR #412)
   ─OWNED_BY→ (Person: Sarah Chen)
```
- **Storage:** Lightweight graph DB (e.g., Neo4j or a Postgres + pgvector hybrid for hackathon speed — nodes/edges in relational tables, semantic similarity via embeddings for fuzzy matching between differently-worded references to the same decision).
- **Why this matters for judging:** This is the architectural piece that elevates Sarvenix above "RAG over Slack search." Contradiction detection and provenance-linking are *graph traversal problems*, not retrieval problems — this is the technical depth story to tell judges.

### 4.3 Reasoning / Synthesis Engine (Claude)

**Purpose:** Turn graph queries + retrieved text into a human-readable, cited synthesis.

**Ask-mode flow** (`@Sarvenix "why did we drop the legacy database migration?"`):
1. Query hits RTS for candidate Slack messages semantically matching the question.
2. Matched messages are cross-referenced against the Knowledge Graph for linked `Artifact` nodes.
3. MCP calls fetch live detail from GitHub (PR #412 comments) and Jira (MIGRATE-412 resolution).
4. Claude synthesizes a single answer, citing each source inline:

> "We dropped it because Sarah found a schema conflict in **PR #412**, which matches the memory leak discussed in **#dev-infra** last Tuesday. Jira ticket **MIGRATE-412** was closed as *Won't Do* with that rationale."

5. Each citation is a clickable deep-link back to the original Slack message / GitHub comment / Jira ticket — critical for trust and auditability.

### 4.4 Proactive Intervention Engine

This is the layer that separates Sarvenix from a "smart search bot."

**Trigger types:**

| Trigger | Detection Method | Action |
|---|---|---|
| **Contradiction** | New message's extracted `Decision` entity semantically matches an existing graph node with `status: rejected/closed` | Post in-thread, non-blocking notice with citation and a clarifying question |
| **Duplicated effort** | Two `Decision` or `Artifact` nodes across different channels reference the same underlying problem within a rolling time window | DM both channel owners a merge suggestion |
| **Context gap** | `member_joined_channel` event, or a user's first message in a channel with a high "outside context" score | Proactively DM a synthesized project brief |
| **Return-from-OOO** | Slack status change from OOO → active | Trigger Context Summariser (see 4.6) |

**Guardrails (important for the demo and for judge trust):**
- Interventions are **rate-limited per channel per day** to avoid becoming noise.
- Sarvenix never edits or deletes anything — it only *adds* a threaded reply or DM, always with a citation, always phrased as a question/offer rather than a correction ("Still want to proceed?" not "This is wrong").
- A visible `🔕 Mute Sarvenix in this channel` control respects channel norms.

### 4.5 Delivery Layer

- **In-thread replies** for contradiction/duplication alerts — kept short, citation-first.
- **DMs** for onboarding briefs and OOO catch-up summaries, to avoid channel noise.
- **Slack Canvas** for longer synthesized documents (e.g., a full project history export) — persistent, linkable, editable by humans afterward.

### 4.6 Context Summariser ("Front Door" Feature)

The simplest, most immediately trust-building feature, and the one most reusing existing infrastructure (RTS index — no new integration cost).

- Slash command: `/sarvenix-catchup`
- Also auto-triggers on OOO → active status change.
- **Flow:** RTS query scoped to channels the user belongs to, filtered to the user's OOO time window → Claude produces a strict 3-bullet brief:

```
While you were out:
• 🔴 Decision: Migration to v2 API approved in #platform (owner: Dana) — affects your open PR #88
• 🟡 Blocker: #dev-infra flagged a staging outage, resolved Tues 4pm
• 🟢 FYI: Design review moved to Thursday 2pm
```

- Severity tagging (🔴 needs action / 🟡 relevant / 🟢 FYI) is generated by Claude classifying each candidate item against the user's known ownership (from the Knowledge Graph's `OWNED_BY` edges).
- This feature is the opening beat of the demo — simple, relatable, immediately useful — before escalating to the more architecturally impressive features.

### 4.7 Confidence Scoring `[MVP]`

Every synthesized answer (Ask Mode) and every proactive alert (Serve Mode) is tagged with a confidence level, not stated with flat authority:

- **High confidence** — the claim is directly and consistently supported across ≥2 independent sources (e.g., Slack + Jira + GitHub all agree).
- **Moderate confidence** — sources partially agree, or only one system explicitly confirms the claim.
- **Low confidence** — pattern-matched from semantic similarity only, no direct cross-system confirmation; Sarvenix will explicitly say "I'm inferring this, not certain" rather than asserting it.

This requires the reasoning engine to evaluate its own evidence quality as a distinct step, not just generate fluent text — genuine technical depth, and the single biggest lever for making Sarvenix feel *trustworthy* rather than merely *confident*.

### 4.8 Adversarial Verification Pass `[MVP]`

Before any proactive contradiction alert (§4.4) is posted, the candidate alert is run through a second, independent Claude pass whose only job is to try to disprove it — checking for reasons the "contradiction" might actually be intentional, already resolved, or a misread of context. Only alerts that survive this adversarial check are posted.

- This is a real two-agent verification pattern, not a marketing label: generator prompt and critic prompt are separately scoped, and the critic has no incentive to agree with the generator.
- Directly de-risks the worst failure mode of a proactive agent — being confidently wrong in front of a live team — before it ever reaches a human.
- Any alert the critic pass rejects is logged (not shown to the user) so the false-positive rate can be measured and tuned over time.

### 4.9 Decision Half-Life `[POST-MVP]`

Beyond reacting to active contradictions, Sarvenix periodically scans the Knowledge Graph for decisions in fast-changing domains (infra choices, vendor selections, staffing-dependent tradeoffs) that haven't been revisited in N months, and proactively nudges the original owner: *"This decision is 8 months old and the constraint that drove it may have changed — worth revisiting?"*

- This is **temporal reasoning** over the graph, a distinct capability from the *relational* reasoning contradiction-detection uses — a genuinely novel addition most competing submissions won't attempt.
- Scoped post-MVP because it requires a reliable, tuned graph (built on top of §4.2) plus a scheduling/staleness model — real value, but sequenced after the core reactive/proactive loop is proven.

### 4.10 Org-Chart-Aware Routing `[POST-MVP]`

When Sarvenix surfaces something sensitive (a stale decision, a significant contradiction), it doesn't default to posting publicly. It first identifies the actual decision-owner via the graph's `OWNED_BY` edges and privately routes the flag to them, giving them the option to address or contextualize it before it becomes visible to the wider channel.

- A workplace-social-dynamics-aware design choice, not just a technical one — shows judges the team thought about how proactive alerts land on real teams, not just whether the detection logic works.
- Post-MVP because it depends on accurate ownership data in the graph, which benefits from real usage history to be reliable.

### 4.11 Admin Dashboard `[POST-MVP]`

A lightweight internal dashboard (even a mockup for submission purposes) showing: alert frequency per channel, current mute status across the workspace, and aggregate accuracy/feedback trends from the 👍/👎 reactions used to tune the adversarial pass (§4.8).

- Signals the team is thinking about real deployment and governance at workspace scale, not only the demo scenario — relevant given this concept could plausibly extend toward an Agent for Organizations submission in a future cycle.
- Post-MVP: valuable for credibility in the submission narrative, but not required for the core agent loop to function or be demoed convincingly.

---

## 5. MCP Server Specifications

### GitHub MCP Server
- **Resources exposed:** `pull_requests`, `pr_comments`, `commits`, `issues`
- **Tools exposed:** `search_prs(query)`, `get_pr_detail(pr_id)`, `get_pr_comments(pr_id)`
- **Auth:** GitHub App installation token, scoped read-only to `repo` and `pull_requests`.

### Jira MCP Server
- **Resources exposed:** `issues`, `issue_transitions`, `issue_comments`
- **Tools exposed:** `search_issues(jql)`, `get_issue_detail(issue_id)`, `get_resolution(issue_id)`
- **Auth:** Jira OAuth 2.0 (3LO), scoped read-only to `read:jira-work`.

### Internal Docs MCP Server
- **Resources exposed:** `documents`, `document_revisions`
- **Tools exposed:** `search_docs(query)`, `get_doc_content(doc_id)`
- **Auth:** Google Workspace domain-wide delegation or per-user OAuth, read-only Drive scope.

All three are read-only for the hackathon build — a deliberate scoping decision worth stating explicitly in judging materials: **Sarvenix never writes to external systems**, which materially reduces the security review burden for an enterprise buyer and is a legitimate design/security talking point.

---

## 6. Tech Stack

| Layer | Technology |
|---|---|
| Slack integration | Slack Bolt (JS/Python), Slack Agent Builder scaffolding, Socket Mode for hackathon speed |
| Reasoning engine | Claude (via Anthropic API), tool-use for MCP calls |
| Search | Slack Real-Time Search API |
| Graph store | Neo4j AuraDB (free tier) or Postgres + pgvector fallback |
| MCP servers | Node.js MCP SDK, deployed as lightweight services (Fly.io / Render for demo) |
| Embeddings | Voyage AI or OpenAI text-embedding for entity-matching fallback |

---

## 7. Data Privacy & Security Considerations

- Read-only scopes across all integrations (see §5).
- Knowledge Graph stores references and short extracted rationale snippets, not full message bodies — reduces data duplication and blast radius of a breach.
- Per-channel opt-out (`/sarvenix mute`) respected at the ingestion layer, not just the delivery layer — muted channels are never indexed.
- All provenance links resolve through Slack's native permission model — Sarvenix never surfaces content the requesting user couldn't already see themselves.

---

## 8. Judging Criteria Alignment

| Criterion | How Sarvenix delivers |
|---|---|
| **Technological Implementation** | Multi-MCP fan-out (GitHub + Jira + Docs), RTS live indexing, custom knowledge graph with contradiction-detection traversal — real architectural depth beyond a single API call wrapped in a chatbot. |
| **Design** | Rate-limited, non-intrusive proactive alerts; citation-first answers; mute controls; DM vs in-thread delivery chosen deliberately by use case. |
| **Potential Impact** | Applicable to every mid-to-large engineering org; reduces onboarding time (3–9 months industry-average ramp-up), prevents redundant work, and cuts into the daily context-search tax developers already report (30+ min/day for 62% of developers per Stack Overflow's 2022 survey) — preserves institutional memory that normally walks out the door when someone leaves. |
| **Quality of Idea** | Competing "context agent" submissions will almost all be reactive-only. Sarvenix's proactive intervention layer — a system that *notices* and *speaks first* — is the differentiator. |

---

## 9. Honest Limitations & Scope for the Hackathon Build

Stated explicitly rather than left for judges to guess at:

- The GitHub, Jira, and Docs MCP servers are real, live integrations against test/demo instances — not simulated data pulled from a static file.
- The Knowledge Graph is seeded with a representative dataset for the demo (a realistic but not organically-grown history) — a production deployment would need weeks of live ingestion to reach the same density of linked entities organically.
- Confidence scoring (§4.7) and the adversarial verification pass (§4.8) are both real, working reasoning steps in the MVP — not deferred.
- Decision Half-Life, Org-Chart-Aware Routing, and the Admin Dashboard (§4.9–4.11) are designed and specified in full but scoped Post-MVP — they depend on either a longer-lived graph or usage history that a hackathon timeframe can't organically generate.

## 10. MVP vs. Post-MVP Feature Scope

| Feature | Section | Scope |
|---|---|---|
| Context Summariser (`/sarvenix-catchup`, OOO trigger) | §4.6 | **MVP** |
| Ask-mode synthesis with citations | §4.3 | **MVP** |
| Knowledge Graph (core schema, provenance edges) | §4.2 | **MVP** |
| Contradiction detection (proactive alert) | §4.4 | **MVP** |
| Duplicated-effort detection | §4.4 | **MVP** |
| Confidence scoring on answers/alerts | §4.7 | **MVP** |
| Adversarial verification pass before alerts | §4.8 | **MVP** |
| Mute controls / rate limiting | §4.4 | **MVP** |
| Decision Half-Life (staleness nudges) | §4.9 | **Post-MVP** |
| Org-chart-aware private routing | §4.10 | **Post-MVP** |
| Admin dashboard | §4.11 | **Post-MVP** |

## 11. Suggested Build Order (if time-boxed later)

1. RTS-backed Context Summariser (`/sarvenix-catchup`) — fastest path to a working, demoable feature.
2. Ask-mode synthesis with GitHub + Jira MCP (no graph yet — direct retrieval + Claude synthesis).
3. Knowledge Graph layer for provenance linking.
4. Contradiction-detection proactive engine, wrapped in confidence scoring (§4.7) and the adversarial verification pass (§4.8) from the start — these are cheap to build in alongside the core loop and materially reduce demo risk.
5. Post-MVP layer (§4.9–4.11) — build only if core loop is solid and time remains.
