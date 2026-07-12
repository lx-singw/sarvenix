# Sarvenix — Environment Variables Reference

---

## 1. Overview

This document is the authoritative reference for every environment variable used across Sarvenix's services (`apps/slack-app`, `services/mcp-github`, `services/mcp-jira`, `services/mcp-docs`). Each variable lists which service(s) consume it, whether it's required or optional, and where to obtain its value.

---

## 2. Slack App Configuration

| Variable | Required | Used by | Description | Where to obtain |
|---|---|---|---|---|
| `SLACK_BOT_TOKEN` | Yes | `apps/slack-app` | Bot user OAuth token (`xoxb-...`) | Slack App settings → OAuth & Permissions |
| `SLACK_SIGNING_SECRET` | Yes | `apps/slack-app` | Verifies requests genuinely originate from Slack | Slack App settings → Basic Information |
| `SLACK_APP_TOKEN` | Yes (if using Socket Mode for local dev) | `apps/slack-app` | App-level token (`xapp-...`) for Socket Mode | Slack App settings → Basic Information → App-Level Tokens |
| `SLACK_CLIENT_ID` | Yes (for OAuth install flow) | `apps/slack-app` | OAuth client ID | Slack App settings → Basic Information |
| `SLACK_CLIENT_SECRET` | Yes (for OAuth install flow) | `apps/slack-app` | OAuth client secret | Slack App settings → Basic Information |

**Required Slack scopes:** `app_mentions:read`, `channels:history`, `channels:read`, `chat:write`, `im:write`, `reactions:read`, `users:read`, `commands`.

---

## 3. Anthropic / Claude Configuration

| Variable | Required | Used by | Description | Where to obtain |
|---|---|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | `apps/slack-app`, indirectly all reasoning paths | API key for Claude calls (synthesis, entity extraction, adversarial verification) | console.anthropic.com |
| `CLAUDE_MODEL_SYNTHESIS` | No (default: `claude-sonnet-4-6`) | `apps/slack-app` — Ask Mode synthesis | Which model to use for the primary reasoning/synthesis step |
| `CLAUDE_MODEL_CRITIC` | No (default: same as synthesis) | `apps/slack-app` — Serve Mode adversarial verifier | Can be set to a different model than synthesis if you want the critic pass to use a distinct model as an extra layer of independence |

---

## 4. GitHub MCP Server

| Variable | Required | Used by | Description | Where to obtain |
|---|---|---|---|---|
| `GITHUB_APP_ID` | Yes | `services/mcp-github` | GitHub App ID | GitHub App settings |
| `GITHUB_PRIVATE_KEY` | Yes | `services/mcp-github` | PEM private key for the GitHub App (store as a secret, not plaintext, in any non-local environment) | GitHub App settings → generate private key |
| `GITHUB_INSTALLATION_ID` | Yes | `services/mcp-github` | Installation ID for the specific org/repo the app is installed on | GitHub App installation settings |
| `GITHUB_ALLOWED_REPOS` | No (default: all installed repos) | `services/mcp-github` | Comma-separated allowlist to scope which repos Sarvenix can query, if you want to restrict below the App installation's full access |

**Required GitHub App permissions:** `Pull requests: Read`, `Contents: Read`, `Issues: Read`. No write permissions should be granted in MVP.

---

## 5. Jira MCP Server

| Variable | Required | Used by | Description | Where to obtain |
|---|---|---|---|---|
| `JIRA_CLIENT_ID` | Yes | `services/mcp-jira` | OAuth 2.0 (3LO) client ID | Atlassian Developer Console |
| `JIRA_CLIENT_SECRET` | Yes | `services/mcp-jira` | OAuth 2.0 (3LO) client secret | Atlassian Developer Console |
| `JIRA_REDIRECT_URI` | Yes | `services/mcp-jira` | OAuth callback URL | Set in Atlassian Developer Console, must match your deployment URL |
| `JIRA_CLOUD_ID` | Yes | `services/mcp-jira` | Identifies which Jira Cloud instance to query | Retrieved via Atlassian's `accessible-resources` endpoint after OAuth |

**Required Jira scope:** `read:jira-work`. No write scopes in MVP.

---

## 6. Internal Docs MCP Server

| Variable | Required | Used by | Description | Where to obtain |
|---|---|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Yes (if using domain-wide delegation) | `services/mcp-docs` | Path to or inline JSON of the service account credentials | Google Cloud Console → IAM & Admin → Service Accounts |
| `GOOGLE_OAUTH_CLIENT_ID` | Yes (if using per-user OAuth instead) | `services/mcp-docs` | Per-user OAuth client ID (alternative to service account approach) | Google Cloud Console → APIs & Services → Credentials |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Yes (if using per-user OAuth) | `services/mcp-docs` | Per-user OAuth client secret | Google Cloud Console |
| `GOOGLE_DRIVE_ALLOWED_FOLDER_IDS` | No | `services/mcp-docs` | Comma-separated allowlist to scope which Drive folders are queryable |

**Required scope:** `https://www.googleapis.com/auth/drive.readonly`. Read-only in MVP.

---

## 7. Knowledge Graph / Database

| Variable | Required | Used by | Description | Where to obtain |
|---|---|---|---|---|
| `GRAPH_DB_URL` | Yes | `apps/slack-app`, `packages/knowledge-graph` | Connection string for Neo4j AuraDB (or Postgres, if using the relational fallback schema) | Neo4j AuraDB console, or your Postgres instance |
| `GRAPH_DB_USER` | Yes | same as above | Database username | |
| `GRAPH_DB_PASSWORD` | Yes | same as above | Database password (store as secret) | |
| `EMBEDDING_MODEL` | No (default: `voyage-2`) | `packages/knowledge-graph` — entity similarity matching | Which embedding model to use for `Decision`/`Topic` similarity |
| `VOYAGE_API_KEY` | Yes (if using Voyage for embeddings) | `packages/knowledge-graph` | API key for the embedding provider | voyageai.com |
| `EMBEDDING_SIMILARITY_THRESHOLD` | No (default: `0.85`) | `packages/knowledge-graph` — contradiction candidate detection | Cosine similarity threshold above which two `Decision` nodes are considered candidate matches |

---

## 8. Real-Time Search (RTS)

| Variable | Required | Used by | Description | Where to obtain |
|---|---|---|---|---|
| `RTS_API_KEY` | Yes | `apps/slack-app` — Context Summariser, Ask Mode | Slack Real-Time Search API credential | Slack App settings / RTS API provisioning |
| `RTS_INDEX_MUTED_CHANNELS` | No (default: `false`) | `apps/slack-app` — ingestion | Should always remain `false` — muted channels must never be indexed per FR-3.5; exposed as a variable only for local testing, never override in any deployed environment |

---

## 9. Serve Mode Configuration

| Variable | Required | Used by | Description |
|---|---|---|---|
| `SERVE_MODE_RATE_LIMIT_PER_CHANNEL_PER_DAY` | No (default: `5`) | `apps/slack-app` — Serve Mode | Max proactive alerts per channel per day (placeholder default, see Roadmap Phase 1 for calibration plan) |
| `SERVE_MODE_ENABLED` | No (default: `true`) | `apps/slack-app` | Global kill switch for the proactive layer — useful for demo troubleshooting without a full redeploy |
| `ADVERSARIAL_VERIFICATION_ENABLED` | No (default: `true`) | `apps/slack-app` — Serve Mode | **Must remain `true` in any live/demo environment** — this is the trust-critical safeguard; disabling it should only ever happen in isolated local testing |

---

## 10. General / Deployment

| Variable | Required | Used by | Description |
|---|---|---|---|
| `NODE_ENV` | Yes | all services | `development`, `staging`, or `production` |
| `LOG_LEVEL` | No (default: `info`) | all services | `debug`, `info`, `warn`, `error` |
| `PORT` | No (service-specific defaults) | each service | HTTP port for local dev / container deployment |
| `DEMO_MODE` | No (default: `false`) | `apps/slack-app` | When `true`, loads seeded demo data on startup (see `scripts/seed-demo-data.ts`) — should be `false` in any real pilot deployment |

---

## 11. `.env.example` (consolidated)

```bash
# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=
SLACK_APP_TOKEN=xapp-...
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=

# Anthropic
ANTHROPIC_API_KEY=
CLAUDE_MODEL_SYNTHESIS=claude-sonnet-4-6
CLAUDE_MODEL_CRITIC=claude-sonnet-4-6

# GitHub MCP
GITHUB_APP_ID=
GITHUB_PRIVATE_KEY=
GITHUB_INSTALLATION_ID=
GITHUB_ALLOWED_REPOS=

# Jira MCP
JIRA_CLIENT_ID=
JIRA_CLIENT_SECRET=
JIRA_REDIRECT_URI=
JIRA_CLOUD_ID=

# Docs MCP
GOOGLE_SERVICE_ACCOUNT_JSON=
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_DRIVE_ALLOWED_FOLDER_IDS=

# Knowledge Graph
GRAPH_DB_URL=
GRAPH_DB_USER=
GRAPH_DB_PASSWORD=
EMBEDDING_MODEL=voyage-2
VOYAGE_API_KEY=
EMBEDDING_SIMILARITY_THRESHOLD=0.85

# RTS
RTS_API_KEY=
RTS_INDEX_MUTED_CHANNELS=false

# Serve Mode
SERVE_MODE_RATE_LIMIT_PER_CHANNEL_PER_DAY=5
SERVE_MODE_ENABLED=true
ADVERSARIAL_VERIFICATION_ENABLED=true

# General
NODE_ENV=development
LOG_LEVEL=info
DEMO_MODE=true
```

---

## 12. Secrets Handling Notes

- **Never commit** `.env` — only `.env.example` with empty/placeholder values belongs in version control.
- `GITHUB_PRIVATE_KEY`, `JIRA_CLIENT_SECRET`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `GRAPH_DB_PASSWORD`, and `ANTHROPIC_API_KEY` should be injected via your deployment platform's secret manager (Fly.io secrets, Render environment groups, etc.) in any non-local environment — not plain environment variables in a dashboard visible to all collaborators.
- `ADVERSARIAL_VERIFICATION_ENABLED` and `RTS_INDEX_MUTED_CHANNELS` are flagged above as safety-critical — treat any pull request that changes their defaults as requiring explicit review, since both directly affect the trust guarantees described in the PRD and Architecture Doc.
