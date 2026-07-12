# Sarvenix — Data Schema & Models

---

## 1. Overview

Sarvenix's core data asset is the **Knowledge Graph** — a property graph connecting decisions, people, artifacts, channels, and topics with provenance-preserving edges. This document defines the full schema: node types, edge types, properties, and the supporting relational/vector structures used alongside the graph.

**Storage choice:** Neo4j AuraDB (graph-native, ideal for traversal queries like contradiction detection) for the hackathon build, with a documented Postgres + pgvector fallback schema in §7 for teams that prefer a single-database approach.

---

## 2. Node Types

### 2.1 `Decision`
Represents a discrete decision made by the organization, extracted from Slack conversation, Jira resolution, or GitHub PR merge/close rationale.

| Property | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `summary` | string | Claude-generated one-line summary of the decision |
| `status` | enum | `active`, `superseded`, `rejected`, `closed` |
| `confidence` | enum | `high`, `moderate`, `low` — how confidently this was extracted as a genuine decision vs. casual conversation |
| `extracted_at` | timestamp | When Sarvenix ingested this |
| `decided_at` | timestamp | Best estimate of when the decision was actually made (may predate extraction) |
| `embedding` | vector(1536) | Semantic embedding for similarity matching against new messages |

### 2.2 `Person`
Represents a workspace member.

| Property | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `slack_user_id` | string | Slack's internal user ID (source of truth for identity) |
| `display_name` | string | Cached display name |
| `roles` | string[] | Optional role tags if available (e.g., "tech-lead", "pm") — used for future Org-Chart-Aware Routing (Phase 2) |

### 2.3 `Artifact`
Represents an external system object: a GitHub PR, a Jira ticket, or a doc.

| Property | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `type` | enum | `github_pr`, `jira_ticket`, `doc` |
| `external_id` | string | The source system's own ID (e.g., "PR #412", "MIGRATE-412") |
| `external_url` | string | Deep link back to the source |
| `title` | string | Cached title/summary from the source system |
| `last_synced_at` | timestamp | Last time Sarvenix refreshed this via MCP |

### 2.4 `Channel`
Represents a Slack channel.

| Property | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `slack_channel_id` | string | Slack's internal channel ID |
| `name` | string | Cached channel name |
| `is_muted` | boolean | Whether `/sarvenix mute` has been invoked here |
| `alert_count_today` | integer | Running counter for rate-limit enforcement, reset daily |

### 2.5 `Topic`
A lightweight clustering node representing a recurring subject (e.g., "legacy database migration") that multiple decisions/artifacts relate to — enables broader "what's the history of X" queries beyond a single decision.

| Property | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `label` | string | Claude-generated topic label |
| `embedding` | vector(1536) | Semantic embedding for topic clustering |

---

## 3. Edge Types

| Edge | From → To | Properties | Meaning |
|---|---|---|---|
| `DISCUSSED_IN` | `Decision` → `Channel` | `message_ts` (string), `permalink` (string) | The decision was discussed in this channel, at this specific message |
| `RESOLVED_BY` | `Decision` → `Artifact` | `resolution_type` (string, e.g. "Won't Do", "Merged") | The decision's resolution is recorded in this artifact |
| `REFERENCES` | `Decision` → `Artifact` | `reference_type` (string) | The decision references this artifact without being formally resolved by it |
| `CONTRADICTS` | `Decision` → `Decision` | `detected_at` (timestamp), `verification_status` (enum: `pending`, `confirmed`, `rejected_by_critic`) | One decision appears to contradict another — this edge is what Serve Mode traverses |
| `SUPERSEDES` | `Decision` → `Decision` | `superseded_at` (timestamp) | A newer decision formally replaces an older one (distinct from a contradiction — this is an intentional, acknowledged change) |
| `OWNED_BY` | `Decision` → `Person` | `confidence` (enum) | Best-estimate owner of the decision, used for severity tagging and (Phase 2) Org-Chart-Aware Routing |
| `RELATES_TO` | `Decision` → `Topic` | `relevance_score` (float 0–1) | Groups decisions under a common topic for broader queries |

---

## 4. Example Graph Fragment (from the "legacy migration" scenario used throughout the demo)

```
(Decision {summary: "Drop legacy DB migration", status: "rejected"})
   -[:DISCUSSED_IN {message_ts: "1719..."}]-> (Channel {name: "#dev-infra"})
   -[:RESOLVED_BY {resolution_type: "Won't Do"}]-> (Artifact {type: "jira_ticket", external_id: "MIGRATE-412"})
   -[:REFERENCES]-> (Artifact {type: "github_pr", external_id: "PR #412"})
   -[:OWNED_BY {confidence: "high"}]-> (Person {display_name: "Sarah Chen"})
   -[:RELATES_TO {relevance_score: 0.91}]-> (Topic {label: "legacy database migration"})
```

When a new message later proposes reviving this migration, the ingestion pipeline creates a new `Decision` node, computes embedding similarity against existing `Decision` nodes, and — above a similarity threshold — creates a candidate `CONTRADICTS` edge with `verification_status: pending`, which the adversarial verifier then evaluates before Serve Mode acts on it.

---

## 5. Supporting Data Structures (outside the graph)

### 5.1 Serve Log (audit trail)
A flat, append-only table — not part of the graph itself — recording every proactive alert decision, including ones the critic pass rejected.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `candidate_contradiction_edge_id` | UUID | FK to the `CONTRADICTS` edge being evaluated |
| `critic_verdict` | enum | `approved`, `rejected` |
| `critic_reasoning` | text | Claude's stated reasoning for the verdict (for later human review/tuning) |
| `posted` | boolean | Whether an alert was actually sent to Slack |
| `human_reaction` | enum, nullable | `thumbs_up`, `thumbs_down`, `none` |
| `created_at` | timestamp | |

### 5.2 Confidence Scoring Record
Attached to every Ask Mode answer (not persisted long-term in MVP, but logged for future tuning).

| Field | Type | Description |
|---|---|---|
| `question` | text | The original question |
| `sources_used` | Artifact[]/Channel[] | Which sources contributed to the answer |
| `agreement_score` | float | Computed agreement across sources |
| `confidence_label` | enum | `high`, `moderate`, `low` |

---

## 6. Entity Extraction Pipeline (how raw events become graph data)

1. Raw Slack message / GitHub event / Jira event ingested.
2. Passed to Claude with an entity-extraction prompt tagging: is this a *decision*, what's the *rationale*, who's the *actor*, what *artifact* does it reference.
3. If classified as a decision with sufficient confidence, a `Decision` node is created or matched against an existing similar node (via embedding similarity, threshold configurable — default 0.85 cosine similarity for hackathon build).
4. Relevant edges (`DISCUSSED_IN`, `RESOLVED_BY`, `REFERENCES`, `OWNED_BY`) are created based on extracted entities.
5. If a new `Decision` node has high similarity to an existing node with `status: rejected/closed`, a candidate `CONTRADICTS` edge is created with `verification_status: pending` and queued for the adversarial verifier.

---

## 7. Alternative Schema: Postgres + pgvector (fallback)

For teams preferring a single relational database instead of a dedicated graph DB, the same model can be represented relationally:

```sql
CREATE TABLE decisions (
  id UUID PRIMARY KEY,
  summary TEXT NOT NULL,
  status TEXT CHECK (status IN ('active','superseded','rejected','closed')),
  confidence TEXT CHECK (confidence IN ('high','moderate','low')),
  extracted_at TIMESTAMPTZ NOT NULL,
  decided_at TIMESTAMPTZ,
  embedding VECTOR(1536)
);

CREATE TABLE persons (
  id UUID PRIMARY KEY,
  slack_user_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  roles TEXT[]
);

CREATE TABLE artifacts (
  id UUID PRIMARY KEY,
  type TEXT CHECK (type IN ('github_pr','jira_ticket','doc')),
  external_id TEXT NOT NULL,
  external_url TEXT,
  title TEXT,
  last_synced_at TIMESTAMPTZ
);

CREATE TABLE channels (
  id UUID PRIMARY KEY,
  slack_channel_id TEXT UNIQUE NOT NULL,
  name TEXT,
  is_muted BOOLEAN DEFAULT FALSE,
  alert_count_today INT DEFAULT 0
);

CREATE TABLE topics (
  id UUID PRIMARY KEY,
  label TEXT NOT NULL,
  embedding VECTOR(1536)
);

-- Edge tables (relational representation of graph edges)
CREATE TABLE decision_discussed_in (
  decision_id UUID REFERENCES decisions(id),
  channel_id UUID REFERENCES channels(id),
  message_ts TEXT,
  permalink TEXT,
  PRIMARY KEY (decision_id, channel_id, message_ts)
);

CREATE TABLE decision_resolved_by (
  decision_id UUID REFERENCES decisions(id),
  artifact_id UUID REFERENCES artifacts(id),
  resolution_type TEXT,
  PRIMARY KEY (decision_id, artifact_id)
);

CREATE TABLE decision_contradicts (
  id UUID PRIMARY KEY,
  decision_id UUID REFERENCES decisions(id),
  contradicted_decision_id UUID REFERENCES decisions(id),
  detected_at TIMESTAMPTZ,
  verification_status TEXT CHECK (verification_status IN ('pending','confirmed','rejected_by_critic'))
);

CREATE TABLE decision_owned_by (
  decision_id UUID REFERENCES decisions(id),
  person_id UUID REFERENCES persons(id),
  confidence TEXT CHECK (confidence IN ('high','moderate','low')),
  PRIMARY KEY (decision_id, person_id)
);

CREATE TABLE serve_log (
  id UUID PRIMARY KEY,
  candidate_contradiction_edge_id UUID REFERENCES decision_contradicts(id),
  critic_verdict TEXT CHECK (critic_verdict IN ('approved','rejected')),
  critic_reasoning TEXT,
  posted BOOLEAN,
  human_reaction TEXT CHECK (human_reaction IN ('thumbs_up','thumbs_down','none')),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Note:** the graph-native approach (Neo4j) is recommended for anything beyond MVP scope, since contradiction-detection and provenance-tracing are fundamentally traversal problems that get progressively more awkward to express in SQL as the graph grows (multi-hop `CONTRADICTS`/`SUPERSEDES` chains, in particular). The Postgres schema above is a legitimate MVP shortcut, not a long-term recommendation.
