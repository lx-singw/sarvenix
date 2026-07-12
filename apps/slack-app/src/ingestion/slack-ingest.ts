import { randomUUID } from 'crypto';
import { extractDecisionEntity } from './entity-extraction';
import { getEmbedding } from '../lib/gemini-client';
import {
  createDecision,
  createPerson,
  createChannel,
  createArtifact,
  linkNodes,
} from '@sarvenix/knowledge-graph';
import { Decision } from '@sarvenix/shared-types';

export interface IngestResult {
  decisionId: string;
  summary: string;
  confidence: 'high' | 'moderate' | 'low';
}

export async function ingestSlackMessage(
  messageText: string,
  userId: string,
  userName: string,
  channelId: string,
  channelName: string,
  messageTs: string,
  permalink: string
): Promise<IngestResult | null> {
  try {
    // 1. Run entity extraction
    const extracted = await extractDecisionEntity(messageText);
    if (!extracted.isDecision) {
      return null;
    }

    // 2. Generate embedding for the decision summary
    const embedding = await getEmbedding(extracted.summary);
    const decisionId = randomUUID();

    // 3. Create core database nodes
    await createChannel({
      id: `channel-${channelId}`,
      slackChannelId: channelId,
      name: channelName,
      isMuted: false,
      alertCountToday: 0,
    });

    await createPerson({
      id: `person-${userId}`,
      slackUserId: userId,
      displayName: userName,
    });

    const newDecision: Decision = {
      id: decisionId,
      summary: extracted.summary,
      status: 'active',
      confidence: (extracted as any).confidence || 'high',
      extractedAt: new Date(),
      embedding: embedding,
    };

    await createDecision(newDecision);

    // 4. Create relationships
    await linkNodes('Decision', decisionId, 'Person', `person-${userId}`, 'OWNED_BY', {
      confidence: 'high',
    });

    await linkNodes('Decision', decisionId, 'Channel', `channel-${channelId}`, 'DISCUSSED_IN', {
      message_ts: messageTs,
      permalink: permalink,
    });

    // 5. Reference artifacts if extracted
    for (const ref of extracted.artifactRefs) {
      const cleanRef = ref.replace(/[^a-zA-Z0-9-]/g, '');
      const artifactId = `artifact-${cleanRef.toLowerCase()}`;
      const isPR = ref.toLowerCase().includes('pr') || ref.toLowerCase().includes('pull');
      const isJira = /^[A-Z]+-\d+$/i.test(ref.trim());
      const type = isPR ? 'github_pr' : (isJira ? 'jira_ticket' : 'doc');

      await createArtifact({
        id: artifactId,
        type: type,
        externalId: ref,
        externalUrl: isPR 
          ? `https://github.com/test-org/test-repo/pull/${ref.replace(/\D/g, '')}` 
          : (isJira ? `https://org.atlassian.net/browse/${ref.toUpperCase()}` : ''),
        title: ref,
        lastSyncedAt: new Date(),
      });

      await linkNodes('Decision', decisionId, 'Artifact', artifactId, 'REFERENCES', {
        referenceType: 'mentioned-in-slack',
      });
    }

    return {
      decisionId,
      summary: extracted.summary,
      confidence: (extracted as any).confidence || 'high',
    };
  } catch (error) {
    console.error('Error in ingestSlackMessage:', error);
    return null;
  }
}
