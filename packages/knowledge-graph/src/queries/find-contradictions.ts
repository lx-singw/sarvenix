import { runQueryWithRetry } from '../client';
import { Decision } from '@sarvenix/shared-types';

export async function findContradictions(decisionId: string): Promise<Decision[]> {
  const result = await runQueryWithRetry(
    `MATCH (d:Decision {id: $decisionId})-[:CONTRADICTS]-(other:Decision)
     RETURN other`,
    { decisionId }
  );
  return result.records.map((record: any) => {
    const node = record.get('other');
    return {
      id: node.properties.id,
      summary: node.properties.summary,
      status: node.properties.status,
      confidence: node.properties.confidence,
      extractedAt: new Date(node.properties.extractedAt),
      decidedAt: node.properties.decidedAt ? new Date(node.properties.decidedAt) : undefined,
    };
  });
}
