import { WebClient } from '@slack/web-api';
import { searchMessages } from '../lib/rts-client';
import { findDecisionsOwnedBy } from '@sarvenix/knowledge-graph';
import { generateStructuredJson, SchemaType } from '../lib/gemini-client';

export interface CatchupBullet {
  severity: 'red' | 'yellow' | 'green';
  title: string;
  description: string;
}

export interface CatchupBrief {
  bullets: CatchupBullet[];
}

const catchupBriefSchema = {
  type: SchemaType.OBJECT,
  properties: {
    bullets: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          severity: {
            type: SchemaType.STRING,
            enum: ['red', 'yellow', 'green'],
            description: 'Red (🔴) if it directly impacts a decision the user owns; Yellow (🟡) if relevant context; Green (🟢) for informational FYI.',
          },
          title: {
            type: SchemaType.STRING,
            description: 'One-line summary (e.g. "Decision: Migration to v2 API approved in #platform").',
          },
          description: {
            type: SchemaType.STRING,
            description: 'Short explanation of why it matters and context.',
          },
        },
        required: ['severity', 'title', 'description'],
      },
    },
  },
  required: ['bullets'],
};

export async function generateCatchupBrief(
  client: WebClient,
  slackUserId: string,
  channelIds?: string[]
): Promise<CatchupBrief> {
  try {
    // 1. Fetch user's historical decisions in the graph to weigh relevance
    const ownedDecisions = await findDecisionsOwnedBy(slackUserId);
    const ownedDecisionsContext = ownedDecisions.length > 0
      ? ownedDecisions.map((d) => `- ${d}`).join('\n')
      : 'User does not currently own any registered decisions.';

    // 2. Query RTS for recent workspace updates
    // Using a default search query for engineering decisions/updates in the workspace
    const searchMatches = await searchMessages(client, 'decision OR approved OR resolved OR blocker OR migration', channelIds);
    if (searchMatches.length === 0) {
      return {
        bullets: [
          {
            severity: 'green',
            title: 'No major updates',
            description: "No recent updates matching decisions, blockers, or migrations were found in your channels.",
          },
        ],
      };
    }

    const recentContext = searchMatches
      .map(
        (m, idx) =>
          `[Message ${idx + 1}] User: ${m.username}, Ch: #${m.channel.name}, Text: "${m.text}", TS: ${m.ts}`
      )
      .join('\n');

    // 3. Classify and synthesize using Gemini
    const prompt = `
      You are Sarvenix, an institutional memory agent. Your task is to generate a personalized "Catchup Brief" for a Slack user who has been OOO (Out Of Office).
      Generate a maximum of 3 bullet items summarizing the most critical updates.
      
      User's Owned Decisions (use this to assign high severity to items that impact these):
      ${ownedDecisionsContext}

      Recent Workspace Messages:
      ${recentContext}
      
      Classify severity:
      - 'red' (🔴): Directly contradicts or impacts decisions/projects the user owns.
      - 'yellow' (🟡): Significant blockers, outages, or architectural changes.
      - 'green' (🟢): Informational updates or FYI.
    `;

    const brief = await generateStructuredJson<CatchupBrief>(
      prompt,
      catchupBriefSchema,
      'synthesis'
    );

    // Limit to max 3 bullets as per PRD requirements
    if (brief.bullets.length > 3) {
      brief.bullets = brief.bullets.slice(0, 3);
    }

    return brief;
  } catch (error) {
    console.error('Error generating catchup brief:', error);
    return {
      bullets: [
        {
          severity: 'yellow',
          title: 'Catchup brief incomplete',
          description: 'Encountered an error while compiling the context summaries.',
        },
      ],
    };
  }
}
