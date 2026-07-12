import { getSession } from '../client';
import { Person } from '@sarvenix/shared-types';

export async function findOwner(decisionId: string): Promise<Person | null> {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (d:Decision {id: $decisionId})-[:OWNED_BY]->(p:Person)
       RETURN p LIMIT 1`,
      { decisionId }
    );
    if (result.records.length === 0) return null;
    const node = result.records[0].get('p');
    return {
      id: node.properties.id,
      slackUserId: node.properties.slackUserId,
      displayName: node.properties.displayName,
      roles: node.properties.roles,
    };
  } finally {
    await session.close();
  }
}
