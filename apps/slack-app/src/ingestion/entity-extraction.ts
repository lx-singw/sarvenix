import { generateStructuredJson, SchemaType } from '../lib/gemini-client';

export interface ExtractedDecision {
  isDecision: boolean;
  summary: string;
  rationale: string;
  actors: string[];
  artifactRefs: string[];
}

const decisionExtractionSchema = {
  type: SchemaType.OBJECT,
  properties: {
    isDecision: {
      type: SchemaType.BOOLEAN,
      description: 'True if the message contains a clear organizational decision, proposed decision, or agreement on a course of action.',
    },
    summary: {
      type: SchemaType.STRING,
      description: 'A brief, clean one-line summary of the decision or proposal.',
    },
    rationale: {
      type: SchemaType.STRING,
      description: 'The reasoning or justification stated or implied for the decision.',
    },
    actors: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: 'Names or usernames of individuals associated with the decision or proposal.',
    },
    artifactRefs: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: 'Any references to tickets, PRs, or document IDs mentioned (e.g., "PR #412", "MIGRATE-412").',
    },
  },
  required: ['isDecision', 'summary', 'rationale', 'actors', 'artifactRefs'],
};

export async function extractDecisionEntity(messageText: string): Promise<ExtractedDecision> {
  const prompt = `
    Analyze the following raw Slack message or communication log.
    Extract any organizational decision or active proposal.
    
    Message: "${messageText}"
  `;

  try {
    const result = await generateStructuredJson<ExtractedDecision>(
      prompt,
      decisionExtractionSchema,
      'synthesis'
    );
    return result;
  } catch (error) {
    console.error('Error in decision entity extraction:', error);
    return {
      isDecision: false,
      summary: '',
      rationale: '',
      actors: [],
      artifactRefs: [],
    };
  }
}
