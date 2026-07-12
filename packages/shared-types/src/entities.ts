export type DecisionStatus = 'active' | 'superseded' | 'rejected' | 'closed';
export type ConfidenceLevel = 'high' | 'moderate' | 'low';

export interface Decision {
  id: string;
  summary: string;
  status: DecisionStatus;
  confidence: ConfidenceLevel;
  extractedAt: Date;
  decidedAt?: Date;
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
