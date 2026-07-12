import { generateStructuredJson, SchemaType } from '../../lib/gemini-client';

export interface Citation {
  index: number;
  sourceType: 'slack' | 'github_pr' | 'jira_ticket' | 'doc';
  title: string;
  url: string;
  snippet?: string;
}

export interface SynthesizedResponse {
  answer: string;
  confidence: 'high' | 'moderate' | 'low';
  confidenceReasoning: string;
  citations: Citation[];
}

const synthesisSchema = {
  type: SchemaType.OBJECT,
  properties: {
    answer: {
      type: SchemaType.STRING,
      description: 'The synthesized answer explaining the "why" and historical context. Must use inline citations like [1], [2] to reference sources.',
    },
    confidence: {
      type: SchemaType.STRING,
      enum: ['high', 'moderate', 'low'],
      description: 'Confidence score based on consistency and availability of source references.',
    },
    confidenceReasoning: {
      type: SchemaType.STRING,
      description: 'Short explanation of why this confidence level was assigned.',
    },
    citations: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          index: { type: SchemaType.INTEGER },
          sourceType: {
            type: SchemaType.STRING,
            enum: ['slack', 'github_pr', 'jira_ticket', 'doc'],
          },
          title: { type: SchemaType.STRING },
          url: { type: SchemaType.STRING },
          snippet: { type: SchemaType.STRING },
        },
        required: ['index', 'sourceType', 'title', 'url'],
      },
    },
  },
  required: ['answer', 'confidence', 'confidenceReasoning', 'citations'],
};

export async function synthesizeResponse(
  question: string,
  slackContext: string,
  mcpContext: string
): Promise<SynthesizedResponse> {
  const prompt = `
    You are Sarvenix, an institutional memory agent. Your goal is to answer the user's question about the "why" behind decisions, drawing from the provided Slack conversation contexts and external systems (GitHub/Jira/Docs context).

    Question: "${question}"

    Slack Conversations Context:
    ${slackContext}

    GitHub, Jira, and Docs Context (from MCP):
    ${mcpContext}

    Please synthesize a clear, coherent answer. Detail the reasoning behind the decisions.
    Assign a confidence score ('high', 'moderate', 'low') based on evidence quality.
    Build a list of citations and make sure the answer text contains inline citations like [1] or [2] referring to the index of the source.
  `;

  try {
    return await generateStructuredJson<SynthesizedResponse>(
      prompt,
      synthesisSchema,
      'synthesis'
    );
  } catch (error) {
    console.error('Error in synthesizeResponse:', error);
    return {
      answer: 'Sorry, I encountered an error while synthesizing the answer.',
      confidence: 'low',
      confidenceReasoning: 'Failed during API synthesis pass.',
      citations: [],
    };
  }
}
