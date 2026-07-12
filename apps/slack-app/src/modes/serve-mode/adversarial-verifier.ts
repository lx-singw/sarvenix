import { generateStructuredJson, SchemaType } from '../../lib/gemini-client';

export interface CriticVerdict {
  approved: boolean;
  reason: string;
}

const criticVerdictSchema = {
  type: SchemaType.OBJECT,
  properties: {
    approved: {
      type: SchemaType.BOOLEAN,
      description: 'True if this is a genuine, unintended contradiction. False if the user is intentionally revisiting the topic, has new information, or if this is a false positive.',
    },
    reason: {
      type: SchemaType.STRING,
      description: 'The detailed reasoning justifying the critic verdict (e.g., explaining why this is or isn\'t a valid contradiction).',
    },
  },
  required: ['approved', 'reason'],
};

export async function verifyContradiction(
  newMessageText: string,
  newDecisionSummary: string,
  historicalDecisionSummary: string,
  historicalRationale: string
): Promise<CriticVerdict> {
  const prompt = `
    You are an AI Critic auditing a proactive contradiction alert system.
    A background agent flagged a possible contradiction.
    
    New Message Posted: "${newMessageText}"
    Extracted New Decision: "${newDecisionSummary}"
    
    Historical Vetoed Decision: "${historicalDecisionSummary}"
    Historical Veto Rationale: "${historicalRationale}"
    
    CRITICAL CHECK:
    Your job is to play devil's advocate and try to DISPROVE the contradiction:
    - If the user explicitly mentions they know about the past decision and are intentionally revisiting it ("we are intentionally revisiting", "now that we have budget", "Sarah gave approval"), set approved = false.
    - If the new message presents a new constraint or fact that resolves the past problem, set approved = false.
    - If it is a real, silent re-proposal of a previously rejected decision without acknowledging the past veto reason, set approved = true.
  `;

  try {
    return await generateStructuredJson<CriticVerdict>(
      prompt,
      criticVerdictSchema,
      'critic'
    );
  } catch (error) {
    console.error('Error in adversarial verification pass:', error);
    return {
      approved: false,
      reason: 'Failed to run adversarial verification pass due to API error.',
    };
  }
}
