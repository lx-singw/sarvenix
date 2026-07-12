import neo4j, { Driver } from 'neo4j-driver';
import { Decision, Person, Artifact, Channel } from '@sarvenix/shared-types';
import { DatabaseQueryError, withRetry } from '@sarvenix/shared-types';

let driver: Driver | null = null;

export function getSession() {
  if (!driver) {
    const url = process.env.GRAPH_DB_URL || 'bolt://localhost:7687';
    const user = process.env.GRAPH_DB_USER || 'neo4j';
    const password = process.env.GRAPH_DB_PASSWORD || 'password';
    driver = neo4j.driver(url, neo4j.auth.basic(user, password));
  }
  return driver.session();
}

export async function closeDriver() {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

/**
 * Runs a query with retry policy and custom DatabaseQueryError wrapping.
 */
export async function runQueryWithRetry(
  query: string,
  params: Record<string, any> = {}
): Promise<any> {
  const dbUrl = process.env.GRAPH_DB_URL || 'bolt://localhost:7687';
  return withRetry(
    async () => {
      const session = getSession();
      try {
        return await session.run(query, params);
      } catch (error: any) {
        throw new DatabaseQueryError(
          `Neo4j query execution failed: ${error.message || error}`,
          query,
          params,
          dbUrl
        );
      } finally {
        await session.close();
      }
    },
    {
      isRetryable: (error: any) => {
        const code = error.code || '';
        return (
          error.message?.includes('connection') ||
          error.message?.includes('timeout') ||
          error.message?.includes('Socket') ||
          code.includes('ServiceUnavailable') ||
          code.includes('SessionExpired')
        );
      },
    }
  );
}

// Initialize Vector Index in Neo4j
export async function initializeVectorIndex() {
  try {
    // Vector search index for decision embeddings
    await runQueryWithRetry(`
      CREATE VECTOR INDEX decision_embeddings IF NOT EXISTS
      FOR (d:Decision) ON (d.embedding)
      OPTIONS {indexConfig: {
        \`vector.dimensions\`: 3072,
        \`vector.similarity_function\`: 'cosine'
      }}
    `);
  } catch (error) {
    console.error('Error creating vector index (may require Neo4j Aura Enterprise or Community v5+):', error);
  }
}

export async function createDecision(decision: Decision): Promise<void> {
  await runQueryWithRetry(
    `MERGE (d:Decision {id: $id})
     ON CREATE SET d.summary = $summary,
                   d.status = $status,
                   d.confidence = $confidence,
                   d.extractedAt = datetime($extractedAt),
                   d.decidedAt = datetime($decidedAt),
                   d.embedding = $embedding,
                   d.channelId = $channelId
     ON MATCH SET d.summary = $summary,
                  d.status = $status,
                  d.confidence = $confidence,
                  d.extractedAt = datetime($extractedAt),
                  d.decidedAt = datetime($decidedAt),
                  d.embedding = $embedding,
                  d.channelId = $channelId`,
    {
      id: decision.id,
      summary: decision.summary,
      status: decision.status,
      confidence: decision.confidence,
      extractedAt: decision.extractedAt.toISOString(),
      decidedAt: decision.decidedAt ? decision.decidedAt.toISOString() : null,
      embedding: decision.embedding || null,
      channelId: decision.channelId || null,
    }
  );
}

export async function createPerson(person: Person): Promise<void> {
  await runQueryWithRetry(
    `MERGE (p:Person {id: $id})
     SET p.slackUserId = $slackUserId,
         p.displayName = $displayName,
         p.roles = $roles,
         p.title = $title,
         p.team = $team,
         p.tz = $tz`,
    {
      id: person.id,
      slackUserId: person.slackUserId,
      displayName: person.displayName,
      roles: person.roles || [],
      title: person.title || null,
      team: person.team || null,
      tz: person.tz || null,
    }
  );
}

export async function createArtifact(artifact: Artifact): Promise<void> {
  await runQueryWithRetry(
    `MERGE (a:Artifact {id: $id})
     SET a.type = $type,
         a.externalId = $externalId,
         a.externalUrl = $externalUrl,
         a.title = $title,
         a.lastSyncedAt = datetime($lastSyncedAt)`,
    {
      id: artifact.id,
      type: artifact.type,
      externalId: artifact.externalId,
      externalUrl: artifact.externalUrl,
      title: artifact.title,
      lastSyncedAt: artifact.lastSyncedAt.toISOString(),
    }
  );
}

export async function createChannel(channel: Channel): Promise<void> {
  await runQueryWithRetry(
    `MERGE (c:Channel {id: $id})
     SET c.slackChannelId = $slackChannelId,
         c.name = $name,
         c.isMuted = $isMuted,
         c.alertCountToday = $alertCountToday`,
    {
      id: channel.id,
      slackChannelId: channel.slackChannelId,
      name: channel.name,
      isMuted: channel.isMuted,
      alertCountToday: channel.alertCountToday,
    }
  );
}

export async function linkNodes(
  fromLabel: string,
  fromId: string,
  toLabel: string,
  toId: string,
  relType: string,
  properties: Record<string, any> = {}
): Promise<void> {
  const propString = Object.keys(properties)
    .map((k) => `${k}: $props.${k}`)
    .join(', ');
  const query = `
    MATCH (from:${fromLabel} {id: $fromId})
    MATCH (to:${toLabel} {id: $toId})
    MERGE (from)-[r:${relType}]->(to)
    SET r += $props
  `;
  await runQueryWithRetry(query, { fromId, toId, props: properties });
}

export async function findSimilarDecisions(
  embedding: number[],
  threshold: number,
  limit = 5,
  allowedChannelIds?: string[]
): Promise<Array<{ decision: Decision; score: number }>> {
  try {
    const query = `
      CALL db.index.vector.queryNodes('decision_embeddings', $limit, $embedding)
      YIELD node, score
      WHERE score >= $threshold AND ($allowedChannelIds IS NULL OR node.channelId IN $allowedChannelIds)
      RETURN node, score
    `;
    const result = await runQueryWithRetry(query, {
      embedding,
      threshold,
      limit: neo4j.int(limit),
      allowedChannelIds: allowedChannelIds || null,
    });
    return result.records.map((record: any) => {
      const node = record.get('node');
      const score = record.get('score');
      return {
        decision: {
          id: node.properties.id,
          summary: node.properties.summary,
          status: node.properties.status,
          confidence: node.properties.confidence,
          extractedAt: new Date(node.properties.extractedAt),
          decidedAt: node.properties.decidedAt ? new Date(node.properties.decidedAt) : undefined,
          channelId: node.properties.channelId,
        },
        score,
      };
    });
  } catch (error) {
    const query = `
      MATCH (d:Decision)
      WHERE d.embedding IS NOT NULL AND ($allowedChannelIds IS NULL OR d.channelId IN $allowedChannelIds)
      WITH d, gds.similarity.cosine(d.embedding, $embedding) AS score
      WHERE score >= $threshold
      RETURN d, score
      ORDER BY score DESC
      LIMIT $limit
    `;
    try {
      const result = await runQueryWithRetry(query, {
        embedding,
        threshold,
        limit: neo4j.int(limit),
        allowedChannelIds: allowedChannelIds || null,
      });
      return result.records.map((record: any) => {
        const node = record.get('d');
        const score = record.get('score');
        return {
          decision: {
            id: node.properties.id,
            summary: node.properties.summary,
            status: node.properties.status,
            confidence: node.properties.confidence,
            extractedAt: new Date(node.properties.extractedAt),
            decidedAt: node.properties.decidedAt ? new Date(node.properties.decidedAt) : undefined,
            channelId: node.properties.channelId,
          },
          score,
        };
      });
    } catch (fallbackError) {
      console.warn('Cosine similarity fallback failed (missing GDS library?):', fallbackError);
      const result = await runQueryWithRetry(
        `MATCH (d:Decision)
         WHERE $allowedChannelIds IS NULL OR d.channelId IN $allowedChannelIds
         RETURN d LIMIT $limit`,
        {
          limit: neo4j.int(limit),
          allowedChannelIds: allowedChannelIds || null,
        }
      );
      return result.records.map((record: any) => {
        const node = record.get('d');
        return {
          decision: {
            id: node.properties.id,
            summary: node.properties.summary,
            status: node.properties.status,
            confidence: node.properties.confidence,
            extractedAt: new Date(node.properties.extractedAt),
            decidedAt: node.properties.decidedAt ? new Date(node.properties.decidedAt) : undefined,
            channelId: node.properties.channelId,
          },
          score: 1.0,
        };
      });
    }
  }
}

export async function isChannelMuted(slackChannelId: string): Promise<boolean> {
  const result = await runQueryWithRetry(
    `MATCH (c:Channel {slackChannelId: $slackChannelId})
     RETURN c.isMuted AS isMuted LIMIT 1`,
    { slackChannelId }
  );
  if (result.records.length === 0) return false;
  return result.records[0].get('isMuted') === true;
}

export async function incrementChannelAlertCount(slackChannelId: string): Promise<number> {
  const result = await runQueryWithRetry(
    `MATCH (c:Channel {slackChannelId: $slackChannelId})
     SET c.alertCountToday = coalesce(c.alertCountToday, 0) + 1
     RETURN c.alertCountToday AS count`,
    { slackChannelId }
  );
  if (result.records.length === 0) return 1;
  const val = result.records[0].get('count');
  return typeof val === 'number' ? val : val.toNumber();
}

export async function getChannelAlertCount(slackChannelId: string): Promise<number> {
  const result = await runQueryWithRetry(
    `MATCH (c:Channel {slackChannelId: $slackChannelId})
     RETURN c.alertCountToday AS count LIMIT 1`,
    { slackChannelId }
  );
  if (result.records.length === 0) return 0;
  const val = result.records[0].get('count');
  return typeof val === 'number' ? val : val.toNumber();
}

export async function setChannelMute(slackChannelId: string, isMuted: boolean): Promise<void> {
  await runQueryWithRetry(
    `MERGE (c:Channel {slackChannelId: $slackChannelId})
     SET c.isMuted = $isMuted`,
    { slackChannelId, isMuted }
  );
}

export async function verifyDatabaseConnection(): Promise<void> {
  // Access session to trigger driver instantiation if needed
  const session = getSession();
  await session.close();
  if (driver) {
    await driver.verifyConnectivity();
  }
}

export async function deleteDecisionByMessageTs(channelId: string, messageTs: string): Promise<void> {
  const query = `
    MATCH (d:Decision)-[r:DISCUSSED_IN]->(c:Channel {slackChannelId: $channelId})
    WHERE r.message_ts = $messageTs
    DETACH DELETE d
  `;
  await runQueryWithRetry(query, { channelId, messageTs });
}
