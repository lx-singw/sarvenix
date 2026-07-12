export type EvaluationCategory =
  | 'answerable'
  | 'unanswerable'
  | 'contradictory'
  | 'stale'
  | 'inaccessible'
  | 'false_positive'
  | 'adversarial'
  | 'outage';

export type EvidenceSource = 'slack' | 'github' | 'jira' | 'graph';

export interface EvaluationScenario {
  id: string;
  version: 1;
  category: EvaluationCategory;
  prompt: string;
  requester: { workspaceId: string; slackUserId: string; persona: 'allowed' | 'denied' };
  expected: {
    shouldAnswer: boolean;
    shouldAlert: boolean;
    requiredSources: EvidenceSource[];
    forbiddenClaims: string[];
    citationUrls: string[];
    currentDecisionId?: string;
  };
  tags: string[];
}

export interface EvaluationObservation {
  scenarioId: string;
  answer?: string;
  alerted: boolean;
  abstained: boolean;
  citations: Array<{ url: string; supportsClaim: boolean }>;
  claims: Array<{ text: string; supported: boolean }>;
  sourcesAttempted: EvidenceSource[];
  sourcesAvailable: EvidenceSource[];
  latencyMs: number;
}

export interface EvaluationMetrics {
  corpusVersion: string;
  scenarioCount: number;
  citationPrecision: number;
  claimCoverage: number;
  unsupportedClaimRate: number;
  contradictionPrecision: number;
  contradictionRecall: number;
  falseAlertRate: number;
  correctAbstentionRate: number;
  outageRecoveryRate: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
}

export interface BenchmarkObservation {
  scenarioId: string;
  path: 'manual' | 'sarvenix';
  correct: boolean;
  completed: boolean;
  elapsedMs: number;
  systemsOpened: number;
  steps: number;
}

export interface TelemetryContext {
  correlationId: string;
  workspaceId: string;
  slackUserId?: string;
  threadTs?: string;
  startedAt: string;
}

export interface SourceHealth {
  source: EvidenceSource;
  status: 'ready' | 'degraded' | 'denied' | 'stale' | 'unavailable';
  checkedAt: string;
  latencyMs?: number;
  detail?: string;
}
