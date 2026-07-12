import { generateText } from '../../lib/gemini-client';

/**
 * Drafts a reconciliation/compromise proposal between two contradicting decisions
 * using Gemini AI synthesis.
 */
export async function draftReconciliationProposal(
  proposal: string,
  pastDecision: string
): Promise<string> {
  const prompt = `
You are Sarvenix, an advanced agentic mediator specializing in resolving engineering and organizational decision conflicts.

We have detected a contradiction between two decisions in our knowledge graph:
1. Proposed New Decision: "${proposal}"
2. Past Conflicting Decision: "${pastDecision}"

Your task is to analyze both viewpoints and draft a constructive, highly technical "Reconciliation Proposal" (compromise draft).
- Acknowledge the context and rationale of both decisions.
- Propose a pragmatic, hybrid middle ground that resolves the technical conflict (e.g., merging code fixes, phasing deprecations, adding safeguards, or isolating connection pools).
- Keep the proposal concise, structured, and under 3 paragraphs. Use bullet points for action items if helpful.
- Keep the tone professional, objective, and collaborative.

Reconciliation Proposal Draft:
`;

  return await generateText(prompt, 'synthesis');
}
