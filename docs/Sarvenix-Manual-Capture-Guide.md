# Sarvenix — Manual Slack Capture Guide

This guide covers the nine shots that require an authenticated Slack session.
Complete these in a single uninterrupted recording session with OBS or Loom running.

Sandbox run: sarvenix-run-20260713T060816Z-ea14ce74
All channels below exist live in the sandbox workspace.

---

## Before you start

1. Open Slack desktop app, light theme, hide all sidebars except channel list.
2. Set your screen to 1920x1080, 100% zoom.
3. Enable cursor highlighting (Cursor Highlighter or equivalent).
4. Start your screen recorder — include the full Slack window, not just a region.
5. Do not collapse or resize anything mid-recording.
6. Have the workspace visible: the workspace name must be readable in at least one frame.

---

## Shot 02 — Primary channel seed

**File:** 02-primary-channel-seed.png
**Step:** Navigate to #sarvenix-primary-ea14ce74.
**Verify:** You see the message from sarvenix-bot containing "[sarvenix-run-20260713T060816Z-ea14ce74] Decision: use the regional connection pool for primary."
**Screenshot:** Full channel view with the seed message visible and the channel name clearly shown at the top.
**Duration in recording:** ~5 seconds of hold.

---

## Shot 03 — Ask: type the question

**File:** 03-ask-question.png
**Step:** In #sarvenix-primary-ea14ce74, click the message input and type:
  @Sarvenix why did we use the regional connection pool for primary?
**Screenshot or frame:** The typed message is visible in the input box before pressing Enter. @Sarvenix should appear as a blue mention highlight.
**Duration in recording:** Type at a natural pace, ~3 seconds.

---

## Shot 04 — Hourglass reaction (processing)

**File:** 04-ask-loading-reaction.png
**Step:** Press Enter immediately after shot 03. Do not cut. Keep the recorder running.
**Screenshot or frame:** Within 2 seconds, the hourglass emoji reaction appears on your message. Capture this frame.
**Duration in recording:** Keep recording continuously from shot 03 through shot 05.

---

## Shot 05 — Ask response with citations

**File:** 05-ask-response-citations.png
**Step:** Wait for the Sarvenix Block Kit reply to appear in the channel.
**Verify:** The response includes: answer text, a confidence score labeled "High", and three source rows for Slack, GitHub Issue #14, and Jira MIGRATE-16.
**Screenshot or frame:** Full Block Kit card visible with the confidence bar and all three citation rows readable.
**Duration in recording:** Hold on the response for at least 5 seconds so citations are clearly readable.

---

## Shot 06 — Slack citation opened

**File:** 06-citation-slack-opened.png
**Step:** In the Block Kit response, click the Slack citation link.
**Verify:** #migration-decisions channel opens, showing the original thread messages.
**Screenshot:** Full channel view with messages visible and channel name shown.
**Duration in recording:** ~4 seconds of hold after navigating.

---

## Shot 09 — Backup channel seed

**File:** 09-backup-channel-seed.png
**Step:** Navigate to #sarvenix-backup-ea14ce74.
**Verify:** You see the seed message from sarvenix-bot with the blue-green deployment decision.
**Screenshot:** Full channel view with seed message visible.
**Duration in recording:** ~5 seconds of hold.

---

## Shot 10 — Proactive alert

**File:** 10-proactive-alert.png
**Step:** Return to #sarvenix-primary-ea14ce74. Type and send the following message as yourself — do NOT mention @Sarvenix:
  I'm thinking we should use a single global connection pool — simpler to manage.
**Wait:** Sarvenix will detect the semantic conflict and post its alert card in the channel within a few seconds.
**Screenshot or frame:** The full proactive alert Block Kit card is visible, including the "Prior decision" reference, the "Resolve prior decision" and "Dismiss" buttons, and the footer showing "No external action has been taken."
**Duration in recording:** Hold on the alert for at least 6 seconds.

---

## Shot 12 — Resolve dialog

**File:** 12-resolve-dialog.png
**Step:** Click "Resolve prior decision" in the alert card from shot 10.
**Verify:** A Slack modal opens with the resolution confirmation text and "Confirm Resolution" button visible.
**Screenshot or frame:** Full modal visible.
**Duration in recording:** Hold on the modal for 3 seconds before clicking.

---

## Shot 13 — Resolution confirmed

**File:** 13-resolution-confirmed.png
**Step:** In the modal from shot 12, click "Confirm Resolution".
**Verify:** The modal closes and a Sarvenix confirmation card appears in the channel showing "Decision Resolved" with the prior decision name, your username, and a note that GitHub and Jira were not modified.
**Screenshot or frame:** Full confirmation card visible.
**Duration in recording:** Hold for 5 seconds.

---

## After recording

1. Export the full recording at 1080p, 30fps minimum.
2. Export individual screenshots for each shot above and save them to:
   reports/judge-pretest/ea14ce74/screenshots/
   using the exact filenames listed above (02- through 13-).
3. Mark each completed item in reports/judge-pretest/ea14ce74/CAPTURE-STATUS.md.
4. Commit and push the new screenshots: git add reports/judge-pretest/ea14ce74/screenshots && git commit -m "feat(evidence): add manual Slack capture shots for judge pretest"
5. Do not replace or delete the automated screenshots (shots 01, 07–08, 11, 14–18).
