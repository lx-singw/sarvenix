# Sarvenix — Directory Architecture / Repository Structure

---

## 1. Overview

This structure assumes a monorepo for the hackathon build — a single repository containing the Slack app, the MCP servers, and the knowledge graph service, organized so each concern is independently testable and deployable but shares common types/config. This is the recommended structure for a small team on a hackathon timeline; splitting into separate repos per MCP server can happen post-hackathon if the project continues.

---

## 2. Top-Level Structure

```
sarvenix/
├── README.md
├── ARCHITECTURE.md                  # links back to the full architecture doc
├── .env.example
├── .gitignore
├── package.json                     # root workspace config (if using npm/yarn workspaces)
├── turbo.json                       # or nx.json — monorepo task runner config
├── docker-compose.yml               # local dev: graph DB + MCP servers together
│
├── apps/
│   └── slack-app/                   # the core Slack Bolt application
│
├── services/
│   ├── mcp-github/                  # GitHub MCP server
│   ├── mcp-jira/                    # Jira MCP server
│   └── mcp-docs/                    # Internal Docs MCP server
│
├── packages/
│   ├── knowledge-graph/             # shared graph schema, queries, client
│   ├── shared-types/                # shared TypeScript types across apps/services
│   └── confidence-scoring/          # shared confidence-scoring logic (used by Ask Mode + Serve Mode)
│
├── scripts/
│   ├── seed-demo-data.ts            # seeds the Knowledge Graph with representative demo data
│   └── reset-dev-env.sh
│
├── docs/
│   ├── prd.md
│   ├── mvp-scope.md
│   └── demo-script.md
│
└── tests/
    └── e2e/                         # end-to-end scenario tests (see §6)
```

---

## 3. `apps/slack-app/` — Core Slack Application

```
apps/slack-app/
├── src/
│   ├── index.ts                     # entry point, Bolt app initialization
│   ├── config.ts                    # env/config loading
│   │
│   ├── commands/
│   │   ├── catchup.ts                # /sarvenix-catchup slash command
│   │   └── mute.ts                   # /sarvenix mute slash command
│   │
│   ├── events/
│   │   ├── message-handler.ts        # message.channels listener → ingestion trigger
│   │   ├── reaction-handler.ts       # 👍/👎 feedback capture for critic-pass tuning
│   │   ├── member-joined-handler.ts  # triggers onboarding brief
│   │   └── status-change-handler.ts  # OOO → active trigger for catchup
│   │
│   ├── modes/
│   │   ├── ask-mode/
│   │   │   ├── index.ts              # orchestrates RTS query → graph lookup → MCP calls → synthesis
│   │   │   ├── synthesis.ts          # Gemini prompt + citation formatting
│   │   │   └── ask-mode.test.ts
│   │   │
│   │   └── serve-mode/
│   │       ├── index.ts              # contradiction/duplication detection orchestration
│   │       ├── contradiction-detector.ts
│   │       ├── adversarial-verifier.ts   # the "critic" pass (§4.8 of architecture doc)
│   │       ├── rate-limiter.ts
│   │       └── serve-mode.test.ts
│   │
│   ├── ingestion/
│   │   ├── slack-ingest.ts           # normalizes Slack events into entities
│   │   ├── entity-extraction.ts      # Gemini-based entity/decision extraction
│   │   └── ingestion.test.ts
│   │
│   ├── delivery/
│   │   ├── in-thread-reply.ts
│   │   ├── dm-brief.ts
│   │   └── canvas-export.ts
│   │
│   └── lib/
│       ├── rts-client.ts             # Real-Time Search API wrapper
│       ├── gemini-client.ts          # Gemini API wrapper
│       └── logger.ts
│
├── package.json
└── tsconfig.json
```

---

## 4. `services/mcp-*/` — MCP Server Structure (pattern shared across all three)

Using `services/mcp-github/` as the representative example — `mcp-jira` and `mcp-docs` mirror this structure.

```
services/mcp-github/
├── src/
│   ├── index.ts                     # MCP server entry point
│   ├── tools/
│   │   ├── search-prs.ts
│   │   ├── get-pr-detail.ts
│   │   └── get-pr-comments.ts
│   ├── resources/
│   │   └── github-client.ts         # GitHub App auth + API wrapper (read-only scopes)
│   └── config.ts
├── package.json
└── tsconfig.json
```

```
services/mcp-jira/
├── src/
│   ├── index.ts
│   ├── tools/
│   │   ├── search-issues.ts
│   │   ├── get-issue-detail.ts
│   │   └── get-resolution.ts
│   ├── resources/
│   │   └── jira-client.ts           # Jira OAuth 2.0 (3LO), read-only scopes
│   └── config.ts
├── package.json
└── tsconfig.json
```

```
services/mcp-docs/
├── src/
│   ├── index.ts
│   ├── tools/
│   │   ├── search-docs.ts
│   │   └── get-doc-content.ts
│   ├── resources/
│   │   └── docs-client.ts           # Google Workspace / Drive read-only scope
│   └── config.ts
├── package.json
└── tsconfig.json
```

---

## 5. `packages/` — Shared Libraries

```
packages/knowledge-graph/
├── src/
│   ├── schema.ts                    # node/edge type definitions (Decision, Person, Artifact, etc.)
│   ├── client.ts                    # graph DB client (Neo4j or Postgres+pgvector)
│   ├── queries/
│   │   ├── find-contradictions.ts
│   │   ├── find-owner.ts            # OWNED_BY lookup, used by catchup severity tagging
│   │   └── trace-provenance.ts      # walks edges back to originating source
│   └── migrations/                  # schema migrations if using Postgres
├── package.json
└── tsconfig.json

packages/shared-types/
├── src/
│   ├── entities.ts                  # Decision, Person, Artifact, Channel, Topic types
│   ├── edges.ts                     # DISCUSSED_IN, RESOLVED_BY, CONTRADICTS, etc.
│   └── mcp-responses.ts             # shared response shapes across the three MCP servers
└── package.json

packages/confidence-scoring/
├── src/
│   ├── scorer.ts                    # High/Moderate/Low logic (architecture doc §4.7)
│   └── scorer.test.ts
└── package.json
```

---

## 6. `tests/e2e/` — Scenario Tests (mapped to MVP Definition of Done)

```
tests/e2e/
├── catchup.e2e.test.ts              # validates /sarvenix-catchup against seeded OOO scenario
├── ask-mode-citation.e2e.test.ts    # validates citations resolve to real sources
├── serve-mode-contradiction.e2e.test.ts   # seeded contradiction triggers alert + survives critic pass
├── serve-mode-false-positive.e2e.test.ts  # seeded intentional-revisit does NOT trigger, or is suppressed
└── mute-command.e2e.test.ts         # validates mute stops both alerts and indexing
```

Each file in this directory corresponds directly to one checklist item in the MVP Scope Document's §7 Definition of Done — nothing is demoed live that doesn't have a corresponding passing test here.

---

## 7. Environment & Config

```
.env.example
├── SLACK_BOT_TOKEN=
├── SLACK_SIGNING_SECRET=
├── ANTHROPIC_API_KEY=
├── GITHUB_APP_ID=
├── GITHUB_PRIVATE_KEY=
├── JIRA_CLIENT_ID=
├── JIRA_CLIENT_SECRET=
├── GOOGLE_SERVICE_ACCOUNT_JSON=
├── GRAPH_DB_URL=
├── RTS_API_KEY=
└── SERVE_MODE_RATE_LIMIT_PER_CHANNEL_PER_DAY=5
```

---

## 8. Local Development

```
docker-compose.yml services:
├── graph-db          # Neo4j (or Postgres+pgvector) for local Knowledge Graph
├── mcp-github         # runs services/mcp-github locally
├── mcp-jira            # runs services/mcp-jira locally
├── mcp-docs             # runs services/mcp-docs locally
└── slack-app             # runs apps/slack-app in Socket Mode for local Slack testing
```

**Quick start:**
```bash
cp .env.example .env        # fill in credentials
docker-compose up -d graph-db
npm run seed:demo           # runs scripts/seed-demo-data.ts
npm run dev                 # starts all services concurrently via turbo/nx
```

---

## 9. Deployment Notes (Hackathon Scope)

- **Slack app + MCP servers:** deploy to Fly.io or Render (per Architecture Doc §6) — one service per MCP server, plus the main Slack Bolt app.
- **Graph DB:** Neo4j AuraDB free tier for the demo; connection string swapped via `GRAPH_DB_URL` env var, no code changes needed between local/demo/prod.
- **Demo data:** `scripts/seed-demo-data.ts` must be re-run before each rehearsal to guarantee the seeded contradiction/false-positive scenarios (tests/e2e/) are in a known-good state — do not rely on organically accumulated state for the live demo.

---

## 10. Why This Structure

- **Services are independently deployable** (`services/mcp-*`) — mirrors the real MCP server specification in the Architecture Doc and lets each be demoed/tested in isolation if needed.
- **`packages/knowledge-graph` is shared, not duplicated** — both Ask Mode and Serve Mode depend on the same graph client and schema, avoiding drift between the two reasoning paths.
- **`tests/e2e` maps 1:1 to the MVP Definition of Done** — makes "is this demo-safe" a checkable, not a judgment call, the night before submission.
- **Confidence scoring and adversarial verification live in their own package/module** (`packages/confidence-scoring`, `modes/serve-mode/adversarial-verifier.ts`) rather than being inlined into the synthesis prompt — keeps the trust-critical logic testable and auditable on its own, which matters both for reliability and for being able to honestly describe it as a real architectural component in the submission, not just a prompt tweak.
