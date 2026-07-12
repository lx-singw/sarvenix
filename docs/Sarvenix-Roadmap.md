# Sarvenix — Product Roadmap

---

## 1. Roadmap Philosophy

Each phase below only unlocks once its prerequisite data or infrastructure genuinely exists — this roadmap is sequenced by *what the system needs to have learned or accumulated*, not by arbitrary calendar dates. A feature that depends on usage history is not scheduled until usage history is plausible, even if it's technically simple to build.

---

## 2. Phase 0 — Hackathon MVP (see MVP Scope Document)

Ask Mode, Context Summariser, Serve Mode (contradiction/duplication detection), Confidence Scoring, Adversarial Verification, Knowledge Graph core schema, read-only MCP integrations (GitHub, Jira, Docs), mute/rate-limit controls.

**Exit criteria for Phase 0:** all items in the MVP Scope Document §7 Definition of Done pass reliably in the demo environment.

---

## 3. Phase 1 — Post-Hackathon Hardening (Weeks 1–6 after launch)

Goal: convert a hackathon demo into something a real team could run in production without hand-holding.

- **Real ingestion at scale** — replace seeded demo data with organic, continuous ingestion from a pilot workspace; validate Knowledge Graph accuracy against real usage rather than curated scenarios.
- **Serve Mode false-positive tuning** — use the 👍/👎 feedback log (captured but only logged in MVP) to actually retrain/adjust the adversarial verification pass's rejection threshold.
- **Rate-limit calibration** — MVP ships a placeholder default (5 alerts/channel/day); Phase 1 replaces this with data-driven defaults per channel activity level, informed by real pilot feedback.
- **Error handling & observability** — structured logging, alerting on MCP integration failures, graceful degradation when a source system is unreachable (answer with partial sources + lowered confidence rather than failing silently).
- **Admin Dashboard (real, not mockup)** — alert frequency, mute status, accuracy trends, now backed by real data instead of the hackathon-stage concept mockup.

**Exit criteria:** a pilot workspace runs Sarvenix for 2+ weeks without a Serve Mode false positive going unaddressed and without manual intervention to keep ingestion running.

---

## 4. Phase 2 — Temporal & Ownership Intelligence (Months 2–4)

Goal: add the capabilities that require the Knowledge Graph to have real temporal depth and ownership density — impossible to fake convincingly in a hackathon demo, but genuinely valuable once the graph has matured.

- **Decision Half-Life** — staleness detection on decisions in fast-changing domains (infra, vendor choices, staffing-dependent tradeoffs); requires months of real decision history to identify what's "gone stale" with any confidence.
- **Org-Chart-Aware Routing** — private routing of sensitive flags to the actual decision-owner before wider visibility; requires `OWNED_BY` edges built from real usage, not seeded assumptions, to avoid misrouting.
- **Cross-workspace pattern detection** (exploratory) — for organizations running multiple Slack workspaces (e.g., separate orgs per business unit), detect when the same unresolved question is being independently investigated in parallel workspaces.

**Exit criteria:** Decision Half-Life nudges are validated against real owner feedback (accepted vs. dismissed) before being enabled by default for any workspace.

---

## 5. Phase 3 — Expanded System Coverage (Months 4–8)

Goal: extend the MCP integration surface beyond the three MVP systems, based on pilot-customer demand rather than speculative breadth.

- **Additional MCP servers** — candidates in priority order based on likely pilot demand: Linear (issue tracking alternative to Jira), Notion (docs alternative to Google Docs/Confluence), Figma (design decision provenance), PagerDuty/Datadog (incident correlation — natural extension of the "why did we do this" thesis into "why did this break").
- **Write-capable actions (opt-in, human-confirmed only)** — the MVP's permanent read-only boundary can evolve into *human-confirmed* write actions (e.g., "Sarvenix drafted this Jira comment, click to post") without violating the "never acts autonomously on external systems" principle — every write requires explicit human confirmation, never silent execution.
- **Multi-language support** for organizations with non-English-primary Slack workspaces.

---

## 6. Phase 4 — Enterprise Readiness (Months 8–12)

Goal: features required to sell into larger, more security-conscious organizations, building on the security/privacy foundation established in MVP.

- **SOC 2 Type II compliance** — formalizes the "read-only, minimal data retention" architecture decisions made from day one into an auditable compliance posture.
- **Configurable data retention policies** — allow workspace admins to set how long extracted rationale snippets persist in the Knowledge Graph.
- **SSO / SCIM provisioning** for enterprise identity management integration.
- **Per-team Serve Mode policy configuration** — different teams may want different contradiction-detection sensitivity or rate limits; MVP ships one global default, Phase 4 makes this configurable per channel/team.

---

## 7. Explicitly Not on the Roadmap

Consistent with the MVP Scope Document's Non-Goals (§5), these remain permanently out of scope regardless of phase:

- **Autonomous write access without human confirmation** — even Phase 3's write-capable actions require explicit human confirmation per action; Sarvenix never acts on external systems unilaterally.
- **General-purpose chatbot functionality** unrelated to institutional decision context.
- **Real-time voice/huddle transcription** — if this capability is ever wanted, it belongs to a distinct product surface, not a scope expansion of Sarvenix's text/thread-based design.

---

## 8. Roadmap Summary Table

| Phase | Focus | Key unlock condition |
|---|---|---|
| **0 — MVP** | Core reactive + proactive loop | Hackathon deadline |
| **1 — Hardening** | Production reliability | Real pilot workspace running for 2+ weeks |
| **2 — Temporal/Ownership Intelligence** | Decision Half-Life, Org-Chart Routing | Knowledge Graph has real temporal + ownership density |
| **3 — Expanded Coverage** | More MCP integrations, confirmed writes | Pilot-customer demand signal |
| **4 — Enterprise Readiness** | Compliance, SSO, per-team config | Enterprise pilot/sales motion begins |
