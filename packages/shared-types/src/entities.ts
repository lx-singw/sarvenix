export type DecisionStatus = 'proposed' | 'active' | 'implemented' | 'superseded' | 'reopened' | 'rejected' | 'closed';
export type DecisionLifecycleEventType = 'PROPOSED' | 'DECIDED' | 'IMPLEMENTED' | 'SUPERSEDED' | 'REOPENED' | 'RESOLVED';

export interface DecisionLifecycleEvent {
  id: string;
  decisionId: string;
  type: DecisionLifecycleEventType;
  occurredAt: Date;
  validFrom: Date;
  validTo?: Date;
  actorSlackUserId?: string;
  reason?: string;
  evidenceUrl: string;
  evidenceVersion: string;
}

export interface ImpactItem {
  id: string;
  type: 'decision' | 'github_pr' | 'jira_ticket' | 'channel' | 'owner';
  title: string;
  url?: string;
  owner?: string;
  depth: number;
  confidence: number;
  freshness: 'current' | 'stale' | 'unknown';
  path: string[];
  reason: string;
}

export interface ImpactRadius {
  decisionId: string;
  generatedAt: Date;
  partial: boolean;
  items: ImpactItem[];
}
export type ConfidenceLevel = 'high' | 'moderate' | 'low';

export interface Decision {
  id: string;
  summary: string;
  status: DecisionStatus;
  confidence: ConfidenceLevel;
  extractedAt: Date;
  decidedAt?: Date;
  validFrom?: Date;
  validTo?: Date;
  currentTruth?: boolean;
  evidenceVersion?: string;
  embedding?: number[];
  channelId?: string;
}

export interface Person {
  id: string;
  slackUserId: string;
  displayName: string;
  roles?: string[];
  title?: string;
  team?: string;
  tz?: string;
}

export type ArtifactType = 'github_pr' | 'jira_ticket' | 'doc';

export interface Artifact {
  id: string;
  type: ArtifactType;
  externalId: string;
  externalUrl: string;
  title: string;
  lastSyncedAt: Date;
}

export interface Channel {
  id: string;
  slackChannelId: string;
  name: string;
  isMuted: boolean;
  alertCountToday: number;
}

export interface Topic {
  id: string;
  label: string;
  embedding?: number[];
}
