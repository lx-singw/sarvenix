import { getSession } from '../client';
import { Artifact } from '@sarvenix/shared-types';

export async function traceProvenance(decisionId: string): Promise<Artifact[]> {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (d:Decision {id: $decisionId})-[:RESOLVED_BY|REFERENCES]->(a:Artifact)
       RETURN a`,
      { decisionId }
    );
    return result.records.map(record => {
      const node = record.get('a');
      return {
        id: node.properties.id,
        type: node.properties.type,
        externalId: node.properties.externalId,
        externalUrl: node.properties.externalUrl,
        title: node.properties.title,
        lastSyncedAt: new Date(node.properties.lastSyncedAt),
      };
    });
  } finally {
    await session.close();
  }
}
