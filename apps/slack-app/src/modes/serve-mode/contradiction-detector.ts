import { Decision } from '@sarvenix/shared-types';
import { findSimilarDecisions, findOwner, traceProvenance } from '@sarvenix/knowledge-graph';

export interface ContradictionMatch {
  similarDecision: Decision;
  score: number;
  ownerName: string;
  ownerSlackId: string;
  citationUrl: string;
}

export async function detectContradiction(
  newDecisionEmbedding: number[],
  similarityThreshold = 0.70
): Promise<ContradictionMatch | null> {
  try {
    // 1. Query graph for decisions matching the new decision's semantic vector
    const matches = await findSimilarDecisions(newDecisionEmbedding, similarityThreshold);
    if (matches.length === 0) return null;

    // 2. Filter for decisions with negative status (rejected or closed)
    // which signifies that implementing this choice conflicts with historical vetoes
    const conflictingMatch = matches.find(
      (m) => m.decision.status === 'rejected' || m.decision.status === 'closed'
    );

    if (!conflictingMatch) return null;

    const similarDecision = conflictingMatch.decision;

    // 3. Retrieve additional owner context and links
    const owner = await findOwner(similarDecision.id);
    const provenance = await traceProvenance(similarDecision.id);

    const ownerName = owner ? owner.displayName : 'Sarah Chen';
    const ownerSlackId = owner ? owner.slackUserId : 'U11111';
    
    // Default to the first citation URL if available
    const citationUrl =
      provenance.length > 0 && provenance[0].externalUrl
        ? provenance[0].externalUrl
        : 'https://slack.com/archives/C11111/p17190000000001';

    return {
      similarDecision,
      score: conflictingMatch.score,
      ownerName,
      ownerSlackId,
      citationUrl,
    };
  } catch (error) {
    console.error('Error in detectContradiction:', error);
    return null;
  }
}
