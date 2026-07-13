# Sarvenix — High-Production Video Edit Plan

Target length: 3:00 exactly.
Sandbox run: sarvenix-run-20260713T060816Z-ea14ce74.
All Slack footage must come from live sandbox sessions with visible channel names and run IDs. No fixture substitution.

---

## Technical setup before recording

- Screen resolution: 1920x1080, 100% browser zoom.
- Slack: desktop app, light theme, sidebar collapsed to show only active channels.
- GitHub and Jira: opened in a browser tab already loaded before recording starts.
- Cursor: enlarged and highlighted (use a cursor-highlight tool).
- Audio: quiet environment, external microphone, no background music during voiceover sections.
- Recording software: OBS or Loom. Record at 60fps if possible; minimum 30fps.

---

## Shot list with timings, transitions, and captions

### 00:00–00:05 — Title card

- **Source:** Static graphic generated from 18-quality-gate-proof.png or a simple dark card.
- **Content:** "Sarvenix" centered on a dark background. Tagline below: "Decision Memory for Engineering Teams."
- **Transition in:** fade from black (0.5s).
- **Caption:** none.

---

### 00:05–00:15 — The problem

- **Source:** Quick-cut sequence: Slack channel screenshot, GitHub Issues list, Jira board — real sandbox views.
- **Voiceover:** "A team's decisions do not live in one document. The debate lives in Slack, the status lives in Jira, and the implementation detail lives in GitHub. Teams lose the causal chain — and repeat work that was already settled."
- **Transition:** quick cuts at 00:08 and 00:12, no fade.
- **Caption:** "The problem: fragmented decision context."

---

### 00:15–00:22 — App Home

- **Source:** 01-app-home.png (static screenshot, zoom-in pan).
- **Visual action:** slow Ken Burns zoom from full card into the status rows.
- **Voiceover:** "Sarvenix lives inside Slack. It connects to your existing channels, GitHub, Jira, and your decision graph, and it tells you when it is ready."
- **Caption:** "App Home — all sources connected."

---

### 00:22–00:42 — Seeded channel context

- **Source:** 02-primary-channel-seed.png — MANUAL screen recording.
- **Visual action:** Scroll into view of the seed message in #sarvenix-primary-ea14ce74.
- **Voiceover:** "The sandbox has a live decision: adopt the regional connection pool to reduce failover latency while preserving tenant isolation."
- **Caption:** "Channel: #sarvenix-primary-ea14ce74 | Run ea14ce74."

---

### 00:42–01:00 — Ask: the question

- **Source:** 03-ask-question.png then 04-ask-loading-reaction.png — MANUAL recording.
- **Visual action:** Type the question in real time. Show Enter key pressed. Cut immediately to the hourglass reaction appearing within 2 seconds.
- **Voiceover:** "In the relevant channel, any engineer can ask. Sarvenix reacts immediately so the team knows it is working."
- **On-screen text overlay (brief):** "No slash command. No separate UI. Just ask."
- **Caption:** "Ask mode — processing acknowledged."

---

### 01:00–01:22 — Ask: the response

- **Source:** 05-ask-response-citations.png — MANUAL recording, then slow zoom on citations.
- **Visual action:** Block Kit card appears. Pan slowly over the answer text, confidence bar, and the three source rows.
- **Voiceover:** "Every factual claim has a cited source. Confidence is evidence-derived — it falls when sources conflict or a system is unavailable. It never guesses."
- **On-screen emphasis (highlight boxes around):** confidence bar, three citation rows.
- **Caption:** "High confidence — 3 corroborating sources, 0 conflicts."

---

### 01:22–01:40 — Open citations

- **Source:** 06-citation-slack-opened.png (MANUAL), 07-citation-github-opened.png (STATIC), 08-citation-jira-opened.png (STATIC).
- **Visual action:** Click each source link. Show the real channel thread, GitHub Issue #14, Jira MIGRATE-16 in quick succession.
- **Voiceover:** "The links open the real artifacts — a Slack thread, GitHub Issue 14, and Jira MIGRATE-16. Everything cited is real and accessible."
- **Transition:** cut on each click, 0.3s.
- **Caption:** "Live sources — Slack, GitHub, Jira."

---

### 01:40–01:50 — Backup channel

- **Source:** 09-backup-channel-seed.png — MANUAL screenshot pan.
- **Voiceover:** "A second independent decision chain exists in the backup channel for redundancy."
- **Caption:** "Channel: #sarvenix-backup-ea14ce74."

---

### 01:50–02:10 — Serve: proactive alert

- **Source:** 10-proactive-alert.png — MANUAL recording.
- **Visual action:** Another user types a conflicting proposal — without mentioning Sarvenix. Show Sarvenix's alert card appear in the thread unprompted. Hold on the card for 5 seconds. Highlight the semantic match percentage and the "No external action" footer.
- **Voiceover:** "This is where Sarvenix stops being another search bot. A new proposal conflicts with an earlier decision. Sarvenix finds the prior evidence, runs a skeptical critic pass, and sends a verified alert — only if it crosses the confidence threshold. It does not act without a human."
- **Caption:** "Serve mode — proactive conflict detection."

---

### 02:10–02:25 — Impact radius

- **Source:** 11-impact-radius.png (STATIC), Ken Burns zoom into the tree.
- **Voiceover:** "The impact radius shows every decision, artifact, and owner downstream of the conflict — across Slack, GitHub, and Jira — with freshness status."
- **Caption:** "Impact radius — 4 nodes, 3 systems, max depth 2."

---

### 02:25–02:38 — Human resolution

- **Source:** 12-resolve-dialog.png then 13-resolution-confirmed.png — MANUAL recording.
- **Visual action:** Click "Resolve prior decision". Show the modal clearly. Click "Confirm Resolution". Show the acknowledgement card.
- **Voiceover:** "The agent does not decide for the team. A human confirms. The decision graph updates. GitHub and Jira are untouched."
- **Caption:** "Human in the loop — always."

---

### 02:38–02:45 — Graceful degradation

- **Source:** 14-degraded-partial-result.png (STATIC), slow zoom onto the source-status rows.
- **Voiceover:** "When GitHub is unavailable, Sarvenix answers from remaining sources, reduces its confidence score, and tells you exactly why."
- **Caption:** "Partial result — transparent about what is missing."

---

### 02:45–02:58 — Quality proof

- **Source:** 15-evaluation-report.png, 16-benchmark-report.png, 18-quality-gate-proof.png — STATIC, cut between all three quickly.
- **Voiceover:** "The build compiles all seven packages, passes every test suite, and validates 104 adversarial scenarios. Zero production dependency vulnerabilities. These are corpus-based metrics — not a production SLA."
- **Caption:** "Quality gate passed | f5d9667."

---

### 02:58–03:00 — Close

- **Source:** 17-architecture-diagram.png held for 2 seconds, then fade to black.
- **Voiceover:** "Sarvenix turns fragmented tribal knowledge into decision memory — and serves it before the mistake repeats."
- **Caption:** none.
- **Transition:** fade to black over 1 second.

---

## Edit rules

1. Total runtime must be 3:00 or under when measured from the first frame after the title fade to the last frame before black.
2. Every Slack clip must show the channel name, the real run ID, and the workspace name somewhere in the frame.
3. Do not use jump cuts during the Ask response or alert sequences; let the reactions and responses appear in real time.
4. Captions must use the exact spellings: Sarvenix, Slack, Jira, GitHub, Neo4j, MCP.
5. Never describe seeded graph history as organic production history. Use the word "sandbox" or "seeded demo" when the voiceover covers the seed context step.
6. Do not publish precision, recall, latency, or time-saved numbers from anywhere other than reports/judge-pretest/ea14ce74/reports/*.

---

## Accessibility requirements

- Closed captions in English for every voiceover and on-screen text segment.
- Minimum font size for on-screen labels: 18pt equivalent at 1080p.
- Minimum contrast ratio for captions: 4.5:1 against background.
- No flashing content faster than 3Hz.
