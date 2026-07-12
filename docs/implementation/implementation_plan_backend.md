# Backend Implementation Plan (For Antigravity)

This plan outlines the logic, database, and integration tasks that **Antigravity (me)** will implement.

---

## Technical Implementations

### Phase 1: Gemini & RTS Integration
- **Tasks**:
  - Replace the Anthropic client placeholder with a Google Gemini API client wrapper.
  - Implement structured JSON formatting for entity extraction.
  - Configure the Real-Time Search (RTS) client to index and query Slack channel histories.

### Phase 2: Neo4j Graph Schema & Database
- **Tasks**:
  - Implement active Neo4j driver interactions (creating/linking nodes and query searches).
  - Write a robust data seed script (`seed-demo-data.ts`) to populate nodes and computed embeddings for the mock "legacy migration" scenario.

### Phase 3: Ingestion Pipeline & Logic Orchestration
- **Tasks**:
  - Write the Gemini-based entity extraction prompt.
  - Implement `@Sarvenix` command parsing, RTS/Graph lookup, and MCP fan-out.
  - Formulate catchup brief logic, combining RTS results with graph-derived ownership weights.
  - Create the Node.js functions that hydrate v0's Block Kit template inputs with dynamic URLs and texts.

### Phase 4: Serve Mode & Adversarial Verifier
- **Tasks**:
  - Implement proactive message listeners, embedding comparisons, and similar-decision queries.
  - Implement the two-pass verifier (Contradiction Generator vs. Critic).
  - Set up logging of verifications, dismissals, and reactions to the database.

### Phase 5: Live MCP Servers
- **Tasks**:
  - Connect standard GitHub and Jira APIs using real token-based client authorizations.
  - Set up read-only tools to return real issue descriptions, PR state, comments, and statuses.
