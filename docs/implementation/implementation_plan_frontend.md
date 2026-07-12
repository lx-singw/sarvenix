# Frontend Implementation Plan (For v0)

This plan outlines the user-facing Slack UI components that **v0** needs to design. v0 will generate the raw **Slack Block Kit JSON payloads** and **Canvas Markdown templates**, which Antigravity will then integrate and hydrate with live backend data.

---

## Slack UI Components to Design

### 1. Ask Mode Reply Template
A rich thread response to `@Sarvenix <question>`.
- **Requirements**:
  - A clean layout for the synthesized answer.
  - A visual confidence badge (High: green, Moderate: yellow, Low: gray).
  - Clickable button links for citations pointing to the source systems (e.g., Slack, GitHub PR, Jira Ticket).
  - Feedback utility (Thumbs up / Thumbs down buttons) for human reaction logging.

### 2. Serve Mode Proactive Alert Template
An in-thread warning message when a proposed decision contradicts past history.
- **Requirements**:
  - A distinct warning header (e.g., "⚠️ Heads Up").
  - An explanation section showing the contradiction details.
  - A citation block highlighting the past decision.
  - Action buttons: "Loop in [Owner]" and "Dismiss / This is Intentional".

### 3. Catchup Brief DM Layout
A direct message summarizing channel activity while the user was OOO.
- **Requirements**:
  - Formatted sections with emoji severity tags (🔴 needs action / 🟡 relevant / 🟢 FYI).
  - Clear typography showing the channel, decision topic, and actor.
  - An "Export to Canvas" action button at the bottom.

### 4. Catchup Canvas Markdown Template
A structured Markdown template for export to Slack Canvas.
- **Requirements**:
  - Hierarchical headers, bullet lists, bold highlights, and clean divider formatting.
  - Places for detailed causal chains and deep links.
