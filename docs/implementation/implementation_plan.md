# Master Implementation Plan — Sarvenix Monorepo

To maximize execution efficiency, we are splitting the development work into two distinct plans: one for **v0** (designing the user-facing Block Kit UI layouts) and one for **Antigravity** (building the logic, database queries, and MCP servers).

---

## User Review Required

### Division of Labor

1. **v0 (Frontend Designs)**:
   - Design the raw Block Kit JSON payloads and Canvas Markdown templates.
   - Refer to the detailed [Frontend Implementation Plan](implementation_plan_frontend.md) to hand off to v0.

2. **Antigravity (Backend Logic)**:
   - Build out the packages, DB schemas, pipeline logic, adversarial critic-pass verifier, and hydration helpers.
   - Refer to the detailed [Backend Implementation Plan](implementation_plan_backend.md).

---

## Credentials Setup Timeline (Stage-by-Stage)

To avoid credentials setup overhead upfront, we will configure APIs incrementally:

### 1. Immediately (Local Sandbox & Logic Setup)
- **Google Gemini API Key**: Needed immediately to run AI synthesis.
- **Neo4j AuraDB Database Connection**: Needed immediately to configure the graph driver and run the seed script.

### 2. Phase 5 (MCP Server Integration)
- **GitHub App Credentials**: Scoped read-only access (App ID, Private Key, Installation ID).
- **Jira App Credentials**: OAuth 2.0 (3LO) tokens.
- **Google Drive credentials** (Google Service Account JSON) if configuring the documentation crawler.

---

## Verification Plan
- Verify each phase compiles workspace-wide: `wsl npm run build`.
- Hand off v0 Block Kit designs to Antigravity's hydration methods.
