import { ConfidenceLevel } from './entities';

export interface DiscussedInEdge {
  decisionId: string;
  channelId: string;
  messageTs: string;
  permalink: string;
}

export interface ResolvedByEdge {
  decisionId: string;
  artifactId: string;
  resolutionType: string;
}

export interface ReferencesEdge {
  decisionId: string;
  artifactId: string;
  referenceType?: string;
}

export type VerificationStatus = 'pending' | 'confirmed' | 'rejected_by_critic';

export interface ContradictsEdge {
  id: string;
  decisionId: string;
  contradictedDecisionId: string;
  detectedAt: Date;
  verificationStatus: VerificationStatus;
}

export interface SupersedesEdge {
  decisionId: string;
  supersededDecisionId: string;
  supersededAt: Date;
}

export interface OwnedByEdge {
  decisionId: string;
  personId: string;
  confidence: ConfidenceLevel;
}

export interface RelatesToEdge {
  decisionId: string;
  topicId: string;
  relevanceScore: number;
}
