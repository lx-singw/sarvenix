# Sarvenix — Product Requirements Document (PRD)

---

## 1. Overview

| Field | Detail |
|---|---|
| **Product name** | Sarvenix |
| **One-line description** | A proactive, cross-platform institutional memory agent for Slack that traces the "why" behind decisions across Slack, GitHub, and Jira — and speaks up before repeated mistakes happen. |
| **Track** | Slack Agent Builder Challenge — New Slack Agent |
| **Primary technologies** | MCP server integration (GitHub, Jira, Internal Docs), Slack Real-Time Search (RTS) API, Slack AI capabilities |
| **Target user** | Engineers, PMs, and cross-functional contributors in mid-to-large organizations where decisions are made across Slack, GitHub, and Jira |
| **Core differentiator** | Proactive intervention (Serve Mode) — not just reactive search |

---

## 2. Problem Statement

Large organizations fragment work across disconnected surfaces. The reasoning behind a decision — why a migration was dropped, why an approach was chosen — lives split across a Slack thread, a closed Jira ticket, and a GitHub PR comment that reference the same event but are never linked. Recovering that context today means manually cross-referencing three systems by hand.

Quantified cost: industry data puts full engineer ramp-up at roughly three to nine months on average, and separately, 62% of developers report spending 30+ minutes a day searching for answers or context — for a 50-person team, an estimated 333–651 hours lost per week workspace-wide (Stack Overflow Developer Survey 2022; CodePath/Swimm onboarding research).

Existing AI search tools only solve retrieval — they don't reconstruct causal chains across systems, and they're entirely reactive, waiting to be asked even when they already have the information needed to prevent a mistake in progress.

---

## 3. Goals

### 3.1 Product goals
- Reduce time-to-context for a question with a cross-system answer from "hours of manual digging" to "one Slack message, cited."
- Catch at least one class of real, repeated-mistake pattern (contradicted decisions) before it fully happens, not after.
- Be trustworthy enough that a real engineering team would keep it installed after the hackathon — meaning it must be honest about its own confidence and rate-limited enough not to become noise.

### 3.2 Non-goals
See MVP Scope Document §5 for the full non-goals list (no write access to external systems, not a general chatbot, no voice/huddle features).

### 3.3 Success metrics (post-launch, for future measurement)
- % of Ask Mode answers rated "accurate and cited correctly" by users (target: >90%).
- % of Serve Mode alerts that survive the adversarial verification pass and are later confirmed useful via 👍 feedback (target: >70% positive rate).
- Reduction in duplicate/redundant work incidents per quarter in a pilot workspace (directional, not a hard KPI for MVP).

---

## 4. User Personas

**Priya, Senior Engineer (primary persona)**
Returns from two weeks of parental leave. Needs to know what changed without pinging five people. Uses `/sarvenix-catchup` daily for the first week back.

**Sarah, Tech Lead (secondary persona)**
Owns infrastructure decisions. Wants to know when her past decisions are being silently re-litigated by teams who don't have the full history. Benefits most from Serve Mode and (post-MVP) Org-Chart-Aware Routing.

**Dana, New Hire (tertiary persona)**
Joins a project mid-flight. Uses Ask Mode constantly in the first month to avoid asking teammates the same "why did we..." questions repeatedly.

---

## 5. Functional Requirements

### 5.1 Context Summariser (`/sarvenix-catchup`)
- **FR-1.1:** System must generate a maximum 3-bullet summary of relevant activity in a user's channels during a specified time window.
- **FR-1.2:** Each bullet must be tagged with a severity indicator (🔴/🟡/🟢) derived from the user's ownership relationships in the Knowledge Graph.
- **FR-1.3:** Command must auto-trigger on Slack status transition from OOO to active, in addition to manual invocation.
- **FR-1.4:** Response time must be under 10 seconds for a workspace of up to 50 channels.

### 5.2 Ask Mode
- **FR-2.1:** System must respond to `@Sarvenix <question>` mentions with a synthesized answer drawing from Slack (via RTS), GitHub, and Jira (via MCP).
- **FR-2.2:** Every factual claim must include an inline citation linking to its source.
- **FR-2.3:** Every answer must include a confidence label (High / Moderate / Low) per the criteria in the Architecture Doc §4.7.
- **FR-2.4:** If no source can be found, the system must say so explicitly rather than generating an unsupported answer.

### 5.3 Serve Mode (proactive intervention)
- **FR-3.1:** System must monitor new messages for `Decision` entities and compare them against existing graph nodes for contradiction.
- **FR-3.2:** Any candidate contradiction alert must pass an independent adversarial verification pass before posting.
- **FR-3.3:** Alerts must be phrased as a question/offer, never a correction ("Still want to proceed?" not "This is wrong").
- **FR-3.4:** System must respect a per-channel daily rate limit on proactive alerts (default: configurable, hackathon default = 5/day).
- **FR-3.5:** System must respect `/sarvenix mute` at the ingestion layer — muted channels are never indexed, not just never alerted.

### 5.4 Knowledge Graph
- **FR-4.1:** System must maintain a graph of `Decision`, `Person`, `Artifact`, `Channel`, `Topic` nodes connected by `DISCUSSED_IN`, `RESOLVED_BY`, `CONTRADICTS`, `SUPERSEDES`, `REFERENCES`, `OWNED_BY` edges.
- **FR-4.2:** Every edge must retain a provenance pointer back to its originating message/comment/ticket.
- **FR-4.3:** Graph writes must be idempotent — reprocessing the same event must not create duplicate nodes/edges.

### 5.5 MCP Integrations
- **FR-5.1:** GitHub MCP server must expose `search_prs`, `get_pr_detail`, `get_pr_comments` as read-only tools.
- **FR-5.2:** Jira MCP server must expose `search_issues`, `get_issue_detail`, `get_resolution` as read-only tools.
- **FR-5.3:** Internal Docs MCP server must expose `search_docs`, `get_doc_content` as read-only tools.
- **FR-5.4:** No MCP server may expose any write/mutate tool in the MVP build.

---

## 6. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Security** | All MCP integrations read-only; no credentials stored client-side; per-user Slack permission model respected for all citation content (never surface content the requesting user couldn't already see). |
| **Privacy** | Knowledge Graph stores references and short extracted rationale snippets, not full message bodies. |
| **Performance** | Ask Mode responses under 15 seconds for a 3-source synthesis; Context Summariser under 10 seconds. |
| **Reliability** | Serve Mode false-positive rate must be measured and logged (via the adversarial pass rejection log) for post-hackathon tuning. |
| **Auditability** | Every proactive alert and its confidence score must be logged (Serve Log) even if not exposed in a UI for MVP. |

---

## 7. User Flows

### 7.1 Ask Mode flow
1. User mentions `@Sarvenix` with a question in any channel Sarvenix is installed in.
2. System queries RTS for candidate Slack messages.
3. System cross-references matches against the Knowledge Graph for linked artifacts.
4. System calls relevant MCP tools (GitHub/Jira) for live detail on matched artifacts.
5. Gemini synthesizes a cited, confidence-scored answer.
6. Answer posts in-thread with clickable citations.

### 7.2 Serve Mode flow
1. New message posted in a monitored (non-muted) channel.
2. Ingestion pipeline extracts `Decision` entity, if present.
3. System checks Knowledge Graph for matching nodes with `status: rejected/closed`.
4. If a candidate match is found, the adversarial verification (critic) pass evaluates it.
5. If the critic pass does not reject it, the alert posts in-thread with citation and a clarifying question.
6. Human reacts (👍/👎); reaction is logged to tune future critic-pass behavior.

### 7.3 Context Summariser flow
1. Trigger: manual `/sarvenix-catchup` or automatic OOO → active transition.
2. System queries RTS scoped to the user's channels and OOO time window.
3. Candidate items are classified by severity using the user's `OWNED_BY` graph relationships.
4. Top items are compressed into a 3-bullet DM.

---

## 8. Out of Scope for MVP

See MVP Scope Document §4 (Decision Half-Life, Org-Chart-Aware Routing, Admin Dashboard) and §5 (Non-Goals: write access, general chatbot use, voice/huddle features).

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Serve Mode produces a visible false positive live during judging | Adversarial verification pass (FR-3.2) + rehearse only pre-validated seeded scenarios per MVP Definition of Done |
| Knowledge Graph feels artificially thin/seeded | State this honestly in the submission (Architecture Doc §9) rather than let judges discover it and lose trust |
| MCP server auth/rate limits fail live during demo | Use dedicated demo/test instances with pre-warmed data, not live production accounts, for the recorded demo |
| Proactive alerts read as annoying/intrusive to judges | Explicitly demo the mute control and rate limiting (already in MVP scope) as a called-out design decision |

---

## 10. Open Questions

- Should the hackathon submission's written description quantify the Post-MVP roadmap (Decision Half-Life, Org-Chart-Aware Routing, Admin Dashboard) to strengthen the "Potential Impact" and "Quality of Idea" narrative, or keep the written submission MVP-only for credibility? *(Current recommendation: mention briefly as roadmap, per the Demo Script Appendix — don't let it dominate.)*
- What is the actual per-channel default rate limit that balances "useful" against "noisy" — needs user testing beyond hackathon timeframe; hackathon default of 5/day is a placeholder, not a validated number.
