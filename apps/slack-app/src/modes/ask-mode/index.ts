import { WebClient } from '@slack/web-api';
import { searchMessages } from '../../lib/rts-client';
import { getEmbedding } from '../../lib/gemini-client';
import { findSimilarDecisions, traceProvenance, findDecisionPaths } from '@sarvenix/knowledge-graph';
import { synthesizeResponse, SynthesizedResponse } from './synthesis';

// Mock MCP client call for Phase 3 (will be wired to real MCP in Phase 5)
async function getMCPContextForArtifacts(artifactIds: string[]): Promise<string> {
  let context = '';
  for (const id of artifactIds) {
    if (id.toLowerCase().includes('migrate-412') || id.toLowerCase().includes('jira-migrate-412')) {
      context += `[Jira Ticket MIGRATE-412]
Title: Legacy Database Migration to v2
Status: Closed / Won't Do
Resolution Reason: Closed because Sarah Chen discovered memory leaks and schema compatibility issues in the connection pool.
Comments:
- Sarah Chen (2026-06-16): "Outage on staging was tied to the legacy pool. Recommend dropping the migration completely."
`;
    } else if (id.toLowerCase().includes('pr-412') || id.toLowerCase().includes('pr #412')) {
      context += `[GitHub Pull Request #412]
Title: Fix database connection pooling memory leak
State: Merged
Comments:
- Sarah Chen: "Found schema conflicts and memory leaks in connection pooling. Do not reuse this old driver pattern."
`;
    }
  }
  return context || 'No external system details found for referenced artifacts.';
}

export async function handleAskMode(
  client: WebClient,
  question: string,
  channelId: string,
  userId?: string
): Promise<SynthesizedResponse> {
  try {
    // 1. Query Slack RTS
    const rtsMatches = await searchMessages(client, question, [channelId]);
    const slackContext = rtsMatches.length > 0
      ? rtsMatches.map((m, idx) => `[Slack Msg ${idx + 1}] User: ${m.username}, Ch: ${m.channel.name}, Text: "${m.text}", Link: ${m.permalink}`).join('\n')
      : 'No matching Slack conversations found.';

    // Resolve user's allowed channels for privacy filtering
    let allowedChannelIds: string[] | undefined = undefined;
    if (userId) {
      try {
        const conversations = await client.users.conversations({
          user: userId,
          types: 'public_channel,private_channel',
          limit: 100,
        });
        allowedChannelIds = (conversations.channels || []).map((c: any) => c.id);
        if (allowedChannelIds && !allowedChannelIds.includes(channelId)) {
          allowedChannelIds.push(channelId);
        }
      } catch (convErr) {
        console.warn(`Could not resolve channel memberships for user ${userId}:`, convErr);
        allowedChannelIds = [channelId];
      }
    }

    // 2. Query Knowledge Graph to trace decision provenance with allowedChannelIds boundary filter
    const questionEmbedding = await getEmbedding(question);
    const similarDecisions = await findSimilarDecisions(questionEmbedding, 0.7, 5, allowedChannelIds);

    let mcpContext = '';
    const referencedArtifactIds: string[] = [];

    let graphContext = 'No direct decision paths matched.';

    if (similarDecisions.length > 0) {
      const bestMatch = similarDecisions[0].decision;
      const provenanceArtifacts = await traceProvenance(bestMatch.id);
      
      provenanceArtifacts.forEach((art) => {
        referencedArtifactIds.push(art.id);
      });

      try {
        const paths = await findDecisionPaths(bestMatch.id);
        if (paths && paths.length > 0) {
          graphContext = paths.join('\n');
        }
      } catch (err) {
        console.warn(`Could not trace decision paths for match ${bestMatch.id}:`, err);
      }
    }

    // 3. Fetch MCP details (mocked for now, real MCP integrated in Phase 5)
    mcpContext = await getMCPContextForArtifacts(referencedArtifactIds);

    // 4. Synthesize Answer
    const synthesisResult = await synthesizeResponse(question, slackContext, mcpContext, graphContext);

    // Hydrate citations with actual deep links if they match the mocked files
    synthesisResult.citations = synthesisResult.citations.map((cit) => {
      if (cit.sourceType === 'slack' && rtsMatches.length > 0) {
        const match = rtsMatches[0];
        return { ...cit, url: match.permalink, title: `Slack message in #${match.channel.name}` };
      }
      if (cit.sourceType === 'github_pr') {
        return { ...cit, url: 'https://github.com/org/repo/pull/412', title: 'GitHub PR #412' };
      }
      if (cit.sourceType === 'jira_ticket') {
        return { ...cit, url: 'https://org.atlassian.net/browse/MIGRATE-412', title: 'Jira MIGRATE-412' };
      }
      return cit;
    });

    return synthesisResult;
  } catch (error) {
    console.error('Error in handleAskMode:', error);
    return {
      answer: 'Sorry, I encountered an issue retrieving the history details.',
      confidence: 'low',
      confidenceReasoning: 'Orchestration flow error.',
      citations: [],
    };
  }
}
