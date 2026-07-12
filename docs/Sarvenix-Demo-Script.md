# Sarvenix — Demo Video Script
### ~3 minutes · Track: New Slack Agent

**Goal of this script:** open simple and relatable, escalate to the architecturally impressive proactive features, close on impact. Every scene maps to a specific judging criterion so nothing in the video is wasted.

---

## Pre-production notes

- Record in a realistic-looking Slack workspace (seeded with believable channel names: `#dev-infra`, `#platform`, `#product`, `#eng-general`) — not an empty sandbox. Judges notice sterile demo environments and it undercuts "Potential Impact."
- Have a second monitor or split-screen ready to show GitHub/Jira in the background when Sarvenix cites them — seeing the *actual* source it pulled from is more convincing than just reading Sarvenix's text output.
- Voiceover should sound like a product walkthrough, not a hackathon pitch — confident, plain language, no filler like "so basically."

---

## Scene-by-scene

### [0:00–0:15] Cold open — the problem, fast

**Visual:** Quick montage — a person alt-tabbing between Slack, GitHub, Jira, looking increasingly lost. Timestamp counter ticking up in the corner ("14 minutes searching...").

**VO:**
> "Every large team has this problem. The answer to 'why did we do this' is scattered across Slack, GitHub, and Jira — and nobody has time to be a detective."

### [0:15–0:35] Introduce Sarvenix — the front door

**Visual:** User returns from vacation. Slack status flips from 🌴 OOO to active. A DM from Sarvenix appears automatically.

**On-screen (Sarvenix DM):**
```
While you were out:
🔴 Decision: Migration to v2 API approved in #platform — affects your open PR #88
🟡 Blocker: #dev-infra staging outage, resolved Tues 4pm
🟢 FYI: Design review moved to Thursday 2pm
```

**VO:**
> "Sarvenix already knows what happened while you were gone — and what actually matters to you, specifically, versus everyone else."

### [0:35–1:10] Ask mode — the causal chain

**Visual:** In `#eng-general`, a user types: `@Sarvenix why did we drop the legacy database migration?`

**On-screen (Sarvenix reply, appearing with a short "synthesizing across 3 sources..." loading state):**
> "We dropped it because Sarah found a schema conflict in **PR #412** [link], which matches the memory leak discussed in **#dev-infra** [link] last Tuesday. **Jira MIGRATE-412** [link] was closed as *Won't Do* with that rationale.
> ✅ **High confidence** — confirmed across all 3 sources."

**Cut to:** briefly show the actual GitHub PR comment and Jira ticket on screen — proving it's real data, not a hallucinated answer.

**VO:**
> "It's not just searching Slack. It's tracing the decision across every system where it lives, showing its work — and telling you how sure it actually is."

### [1:10–1:55] The differentiator — proactive intervention

**Visual:** In `#product`, someone types: *"Let's ship the legacy DB migration next sprint, we have bandwidth now."*

**Beat:** Half a second of silence — then Sarvenix replies in-thread, unprompted.

**On-screen (Sarvenix reply):**
> "⚠️ Heads up — this was previously deprioritized in **MIGRATE-412** due to a schema conflict Sarah found in PR #412. Still want to proceed, or should I loop her in?"

**VO (slightly slower, letting this land):**
> "This is the part that matters. Sarvenix didn't wait to be asked. It noticed a team was about to repeat a mistake that was already solved three months ago — and said something."

### [1:55–2:10] Handling being wrong

**Visual:** A second, different scenario — Sarvenix flags what looks like a contradiction, but the human replies "actually this is intentional, we're revisiting on purpose." A single 👎 reaction is added to Sarvenix's message.

**VO:**
> "And when it's wrong — because it will be, sometimes — a single reaction is enough to teach it. Every alert is checked by a second, skeptical pass before it's ever posted, specifically to catch false positives like this before a human has to."

*(Note: this beat directly demonstrates §4.8's adversarial verification pass and is worth protecting in the edit even under time pressure — it's the strongest "we thought about failure modes" moment in the video.)*

### [2:10–2:35] Architecture flash

**Visual:** Quick, clean animated diagram (10–15 sec) showing: Slack messages + GitHub + Jira → Knowledge Graph → Claude synthesis → proactive alert. Keep it visual, minimal text.

**VO:**
> "Under the hood: Sarvenix indexes live conversation through Slack's Real-Time Search API, connects to GitHub and Jira through MCP, and builds a knowledge graph linking decisions, people, and artifacts — so it can detect contradictions, not just keywords."

### [2:35–2:50] Guardrails — the trust moment

**Visual:** Show the `/sarvenix mute` command in a channel; show a rate-limit tooltip ("Sarvenix limits proactive alerts to avoid noise").

**VO:**
> "And because a proactive agent can become annoying fast, Sarvenix is read-only everywhere, rate-limited, and every channel can mute it. It never edits, never deletes — it only adds context, with receipts."

### [2:50–3:00] Close — impact statement

**Visual:** Return to the opening montage shot, now with the person calmly closing their laptop — the "14 minutes" counter never even starts.

**VO:**
> "Sarvenix turns tribal knowledge into institutional memory — so the answer to 'why did we do this' is never more than a Slack message away."

**End card:** Sarvenix logo/wordmark, one-line tagline: *"Sarvenix. It serves the answer before you ask."*

---

## Judging criteria checklist (confirm each is visibly hit)

- [x] **Technological Implementation** — architecture flash scene (2:20) + real GitHub/Jira citations shown on screen
- [x] **Design** — mute control, rate limiting, DM vs in-thread delivery choices shown explicitly
- [x] **Potential Impact** — cold open problem framing + close statement generalizes beyond one team
- [x] **Quality of Idea** — the 1:10–1:55 proactive-intervention beat is the single most important shot in the video; do not cut it short in editing
- [x] **Trustworthiness** (supports Design + Technological Implementation) — confidence scoring (1:00) and the false-positive/adversarial-verification beat (1:55) together prove Sarvenix knows the difference between "confident" and "correct"

---

## Appendix — Post-MVP features referenced but not demoed in the 3-minute cut

These are specified in the architecture doc but intentionally left out of the timed video to protect pacing; mention them verbally in Q&A or the written project description instead:

- **Decision Half-Life** — proactive staleness nudges on old decisions (temporal reasoning over the graph)
- **Org-chart-aware private routing** — sensitive flags go to the decision-owner privately before any public post
- **Admin dashboard** — alert-frequency, mute-status, and accuracy-trend visibility for workspace admins

If time allows a longer submission cut (e.g., an optional extended video or written appendix), these are the next three beats to add, in that priority order.
