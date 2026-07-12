export const NodeLabels = {
  DECISION: 'Decision',
  PERSON: 'Person',
  ARTIFACT: 'Artifact',
  CHANNEL: 'Channel',
  TOPIC: 'Topic',
} as const;

export const RelationshipTypes = {
  DISCUSSED_IN: 'DISCUSSED_IN',
  RESOLVED_BY: 'RESOLVED_BY',
  REFERENCES: 'REFERENCES',
  CONTRADICTS: 'CONTRADICTS',
  SUPERSEDES: 'SUPERSEDES',
  OWNED_BY: 'OWNED_BY',
  RELATES_TO: 'RELATES_TO',
} as const;
