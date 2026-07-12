# Sarvenix — Three-Minute Demo Script

## Recording thesis

**Teams do not lose documents; they lose the causal chain between them. Sarvenix reconstructs that chain and serves it before the mistake repeats.**

Every source shown in this recording must be a real sandbox Slack message, GitHub artifact, or Jira issue. The graph may be seeded to represent historical ingestion, but that fact must be disclosed. Never cut from a fixture into a claim of live retrieval.

## 0:00–0:15 — The problem

**Visual:** Slack, GitHub, and Jira visible in quick succession. Keep IDs in view so the systems clearly refer to the same project.

**Voiceover:**

> “A team’s decisions do not live in one document. The debate lives in Slack, the status lives in Jira, and the implementation detail lives in GitHub. Teams lose the causal chain—and repeat work that was already settled.”

## 0:15–0:42 — Catch Up: immediate usefulness

**Visual:** Run `/sarvenix-catchup`. Show the private brief. Open one source link.

**Voiceover:**

> “Sarvenix starts with a familiar problem: returning to work. Catch Up searches only channels this user can access and turns the time window into a private brief of decisions, actions, and risks—with direct jumps to the original messages.”

**Judge proof:** Slack-native command, private delivery, prioritization, exact provenance.

## 0:42–1:22 — Ask: reconstruct the decision

**Visual:** In the relevant channel, mention Sarvenix with the pre-verified question. Let the processing reaction appear. Show the answer, confidence, and source actions. Open the real GitHub and Jira links.

**Voiceover:**

> “Now I can ask why the decision changed. Sarvenix searches the live Slack index with this user’s channel permissions, follows the referenced artifacts through read-only MCP tools, and reconstructs one answer. Every factual claim has a source. Confidence falls when evidence conflicts or a system is unavailable—it never swaps in fake production data.”

**On-screen emphasis:**

- Concise answer before details
- Evidence-derived confidence
- Exact Slack, GitHub, and Jira deep links
- Any unavailable-source notice

## 1:22–2:08 — Serve: the differentiator

**Visual:** A second user proposes the incompatible plan. Do not mention Sarvenix. Show the proactive in-thread alert.

**Voiceover:**

> “This is where Sarvenix stops being another search bot. A new proposal conflicts with an earlier decision. Sarvenix finds the prior owner and evidence, measures the semantic relationship, then sends the candidate to a separately prompted skeptical critic. Only verified candidates survive the channel rate limit and appear here.”

**On-screen emphasis:**

- Prior decision and owner
- Canonical evidence link
- Semantic match percentage and decision ID
- Statement that no external action was taken automatically

## 2:08–2:30 — Human resolution and control

**Visual:** Click **Resolve prior decision**, show the confirmation dialog, confirm, and show the resolution acknowledgement. Briefly show mute.

**Voiceover:**

> “The agent does not decide for the team. A human confirms whether the old decision should close. That updates the auditable decision graph and removes the open conflict; GitHub and Jira remain read-only. Teams can dismiss feedback or mute Sarvenix at any time.”

## 2:30–2:48 — Architecture in one breath

**Visual:** Show `Sarvenix-Judge-Architecture.md` rendered as the clean Mermaid diagram.

**Voiceover:**

> “Under the hood, Slack Real-Time Search provides permission-scoped evidence; GitHub and Jira MCP services provide live external context; Neo4j stores decision lineage; and grounding, confidence, and an adversarial critic turn retrieval into a trustworthy intervention.”

## 2:48–3:00 — Measured proof and close

**Visual:** Show the generated proof card or CI capture with the current verified gate: 7 packages, 8 suites, 16 tests, 104 validated scenarios across 8 categories, and 0 production vulnerabilities.

**Voiceover:**

> “The current build compiles all seven packages, passes all eight suites and sixteen tests, validates 104 adversarial scenarios, and has zero production dependency vulnerabilities. Sarvenix turns fragmented tribal knowledge into decision memory—and serves it before the mistake repeats.”

## Required edit checks

- The final runtime is within the challenge limit.
- At least one real Slack, GitHub, and Jira source is opened on screen.
- The proactive alert is triggered without mentioning Sarvenix.
- The confirmation dialog is visible before resolution.
- Seeded graph history is described as seeded, not organic production history.
- No unmeasured accuracy, precision, recall, latency, or time-saved claim appears.
- Captions spell Sarvenix, Slack, Jira, GitHub, Neo4j, MCP, and RTS correctly.
- Replace all `TBD` timestamps in `Sarvenix-Judging-Evidence.md` after locking the edit.

## Backup scenario

Prepare a second real cross-system decision chain with different Slack messages, Jira issue, and GitHub artifact. Use it only if the primary artifact is unavailable; do not substitute screenshots or fixture output while describing the flow as live.
