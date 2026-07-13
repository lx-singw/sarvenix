import { WebClient } from '@slack/web-api';
import { searchMessages } from '../../lib/rts-client';
import { getEmbedding } from '../../lib/gemini-client';
import { findSimilarDecisions, traceProvenance, findDecisionPaths } from '@sarvenix/knowledge-graph';
import { synthesizeResponse, SynthesizedResponse } from './synthesis';
import { resolveExternalEvidence, ResolvedEvidence } from './evidence-resolver';

function evidenceContext(evidence: ResolvedEvidence[]): string {
  if (evidence.length === 0) {
    return 'No live GitHub or Jira evidence was available for the referenced artifacts.';
  }
  return evidence.map((item) => item.context).join('\n\n');
}

function resolveCitationUrl(
  citation: SynthesizedResponse['citations'][number],
  evidence: ResolvedEvidence[]
): ResolvedEvidence | undefined {
  const searchable = `${citation.title} ${citation.snippet || ''} ${citation.url}`.toLowerCase();
  const candidates = evidence.filter((item) => item.sourceType === citation.sourceType);
  return candidates.find((item) => searchable.includes(item.externalId.toLowerCase())) ||
    (candidates.length === 1 ? candidates[0] : undefined);
}

export async function handleAskMode(
  client: WebClient,
  question: string,
  channelId: string,
  userId?: string
): Promise<SynthesizedResponse> {
  try {
    let allowedChannelIds: string[] = [channelId];
    if (userId) {
      try {
        const conversations = await client.users.conversations({
          user: userId,
          types: 'public_channel,private_channel',
          limit: 200,
        });
        const memberships = (conversations.channels || [])
          .map((channel) => channel.id)
          .filter((id): id is string => Boolean(id));
        allowedChannelIds = [...new Set([...memberships, channelId])];
      } catch (error) {
        console.warn(`Could not resolve channel memberships for user ${userId}; limiting Ask Mode to the current channel.`, error);
      }
    }

    const rtsMatches = await searchMessages(client, question, allowedChannelIds);
    const slackContext = rtsMatches.length > 0
      ? rtsMatches
        .map((match, index) => [
          `[Slack message ${index + 1}]`,
          `Author: ${match.username}`,
          `Channel: #${match.channel.name}`,
          `Text: ${match.text}`,
          `Canonical URL: ${match.permalink}`,
        ].join('\n'))
        .join('\n\n')
      : 'No matching Slack conversations were found in channels visible to the requesting user.';

    const questionEmbedding = await getEmbedding(question);
    const similarDecisions = await findSimilarDecisions(questionEmbedding, 0.7, 5, allowedChannelIds);
    const referencedArtifactIds = new Set<string>();
    let graphContext = 'No direct decision paths matched.';

    if (similarDecisions.length > 0) {
      const bestMatch = similarDecisions[0].decision;
      const provenanceArtifacts = await traceProvenance(bestMatch.id);
      for (const artifact of provenanceArtifacts) referencedArtifactIds.add(artifact.externalId || artifact.id);

      try {
        const paths = await findDecisionPaths(bestMatch.id);
        if (paths.length > 0) graphContext = paths.join('\n');
      } catch (error) {
        console.warn(`Could not trace decision paths for ${bestMatch.id}.`, error);
      }
    }

    const resolution = await resolveExternalEvidence([...referencedArtifactIds]);
    const synthesisResult = await synthesizeResponse(
      question,
      slackContext,
      evidenceContext(resolution.evidence),
      graphContext
    );

    synthesisResult.citations = synthesisResult.citations.flatMap((citation) => {
      if (citation.sourceType === 'slack') {
        const searchable = `${citation.title} ${citation.snippet || ''} ${citation.url}`.toLowerCase();
        const match = rtsMatches.find((item) =>
          searchable.includes(item.permalink.toLowerCase()) ||
          searchable.includes(item.channel.name.toLowerCase()) ||
          searchable.includes(item.text.slice(0, 40).toLowerCase())
        ) || (rtsMatches.length === 1 ? rtsMatches[0] : undefined);
        return match
          ? [{ ...citation, url: match.permalink, title: `Slack message in #${match.channel.name}` }]
          : [];
      }

      const source = resolveCitationUrl(citation, resolution.evidence);
      return source
        ? [{ ...citation, url: source.url, title: source.title }]
        : [];
    });

    if (resolution.unavailable.length > 0) {
      synthesisResult.confidence = synthesisResult.confidence === 'high' ? 'moderate' : synthesisResult.confidence;
      synthesisResult.confidenceReasoning = `${synthesisResult.confidenceReasoning} Some referenced external evidence was unavailable and was not substituted with demo data.`;
    }
    if (synthesisResult.citations.length === 0) {
      synthesisResult.confidence = 'low';
      synthesisResult.confidenceReasoning = 'No verifiable deep-link citations were available to support the answer.';
    }

    return synthesisResult;
  } catch (error) {
    console.error('Error in handleAskMode:', error);
    return {
      answer: 'I could not retrieve enough authorized evidence to answer safely. No demo or fabricated data was substituted.',
      confidence: 'low',
      confidenceReasoning: 'The evidence pipeline failed or the requester lacked access to the required sources.',
      citations: [],
    };
  }
}
