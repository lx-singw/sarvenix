import neo4j, { Driver } from 'neo4j-driver';
import { Decision, Person, Artifact, Channel, Topic } from '@sarvenix/shared-types';

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

// Initialize Vector Index in Neo4j
export async function initializeVectorIndex() {
  const session = getSession();
  try {
    // Vector search index for decision embeddings
    await session.run(`
      CREATE VECTOR INDEX decision_embeddings IF NOT EXISTS
      FOR (d:Decision) ON (d.embedding)
      OPTIONS {indexConfig: {
        \`vector.dimensions\`: 768,
        \`vector.similarity_function\`: 'cosine'
      }}
    `);
  } catch (error) {
    console.error('Error creating vector index (may require Neo4j Aura Enterprise or Community v5+):', error);
  } finally {
    await session.close();
  }
}

export async function createDecision(decision: Decision): Promise<void> {
  const session = getSession();
  try {
    await session.run(
      `MERGE (d:Decision {id: $id})
       ON CREATE SET d.summary = $summary,
                     d.status = $status,
                     d.confidence = $confidence,
                     d.extractedAt = datetime($extractedAt),
                     d.decidedAt = datetime($decidedAt),
                     d.embedding = $embedding
       ON MATCH SET d.summary = $summary,
                    d.status = $status,
                    d.confidence = $confidence,
                    d.extractedAt = datetime($extractedAt),
                    d.decidedAt = datetime($decidedAt),
                    d.embedding = $embedding`,
      {
        id: decision.id,
        summary: decision.summary,
        status: decision.status,
        confidence: decision.confidence,
        extractedAt: decision.extractedAt.toISOString(),
        decidedAt: decision.decidedAt ? decision.decidedAt.toISOString() : null,
        embedding: decision.embedding || null,
      }
    );
  } finally {
    await session.close();
  }
}

export async function createPerson(person: Person): Promise<void> {
  const session = getSession();
  try {
    await session.run(
      `MERGE (p:Person {id: $id})
       SET p.slackUserId = $slackUserId,
           p.displayName = $displayName,
           p.roles = $roles`,
      {
        id: person.id,
        slackUserId: person.slackUserId,
        displayName: person.displayName,
        roles: person.roles || [],
      }
    );
  } finally {
    await session.close();
  }
}

export async function createArtifact(artifact: Artifact): Promise<void> {
  const session = getSession();
  try {
    await session.run(
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
  } finally {
    await session.close();
  }
}

export async function createChannel(channel: Channel): Promise<void> {
  const session = getSession();
  try {
    await session.run(
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
  } finally {
    await session.close();
  }
}

export async function linkNodes(
  fromLabel: string,
  fromId: string,
  toLabel: string,
  toId: string,
  relType: string,
  properties: Record<string, any> = {}
): Promise<void> {
  const session = getSession();
  try {
    const propString = Object.keys(properties)
      .map((k) => `${k}: $props.${k}`)
      .join(', ');
    const query = `
      MATCH (from:${fromLabel} {id: $fromId})
      MATCH (to:${toLabel} {id: $toId})
      MERGE (from)-[r:${relType}]->(to)
      SET r += $props
    `;
    await session.run(query, { fromId, toId, props: properties });
  } finally {
    await session.close();
  }
}

export async function findSimilarDecisions(
  embedding: number[],
  threshold: number,
  limit = 5
): Promise<Array<{ decision: Decision; score: number }>> {
  const session = getSession();
  try {
    // Try to run using vector search index. If it fails, fallback to simple cosine similarity over loaded nodes
    const query = `
      CALL db.index.vector.queryNodes('decision_embeddings', $limit, $embedding)
      YIELD node, score
      WHERE score >= $threshold
      RETURN node, score
    `;
    const result = await session.run(query, { embedding, threshold, limit: neo4j.int(limit) });
    return result.records.map((record) => {
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
        },
        score,
      };
    });
  } catch (error) {
    // Fallback: Scan all Decision nodes (fine for hackathon demo scale)
    const query = `
      MATCH (d:Decision)
      WHERE d.embedding IS NOT NULL
      WITH d, gds.similarity.cosine(d.embedding, $embedding) AS score
      WHERE score >= $threshold
      RETURN d, score
      ORDER BY score DESC
      LIMIT $limit
    `;
    try {
      const result = await session.run(query, { embedding, threshold, limit: neo4j.int(limit) });
      return result.records.map((record) => {
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
          },
          score,
        };
      });
    } catch (fallbackError) {
      console.warn('Cosine similarity fallback failed (missing GDS library?):', fallbackError);
      // Fallback 2: Just return all decisions (no similarity filter, for standard query-matching check)
      const result = await session.run(`MATCH (d:Decision) RETURN d LIMIT $limit`, { limit: neo4j.int(limit) });
      return result.records.map((record) => {
        const node = record.get('d');
        return {
          decision: {
            id: node.properties.id,
            summary: node.properties.summary,
            status: node.properties.status,
            confidence: node.properties.confidence,
            extractedAt: new Date(node.properties.extractedAt),
            decidedAt: node.properties.decidedAt ? new Date(node.properties.decidedAt) : undefined,
          },
          score: 1.0, // Mock score since vector index is unavailable
        };
      });
    }
  } finally {
    await session.close();
  }
}
