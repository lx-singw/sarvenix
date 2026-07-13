export type LiveProvider = 'slack' | 'github' | 'jira' | 'neo4j';
export type LiveStepStatus = 'passed' | 'failed' | 'skipped';
export type LiveResourceAction = 'archive' | 'close' | 'delete';

export interface LiveResource {
  provider: LiveProvider;
  type: string;
  id: string;
  marker: string;
  canonicalUrl?: string;
  cleanupAction: LiveResourceAction;
  cleanedAt?: string;
}

export interface LiveStepResult {
  id: string;
  title: string;
  status: LiveStepStatus;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  detail?: string;
  correlationId?: string;
}

export interface LiveRunManifest {
  schemaVersion: 1;
  runId: string;
  marker: string;
  createdAt: string;
  updatedAt: string;
  sandbox: {
    slackWorkspaceId: string;
    githubRepository: string;
    jiraProjectKey: string;
  };
  resources: LiveResource[];
  steps: LiveStepResult[];
  cleanup: {
    startedAt?: string;
    completedAt?: string;
    verified: boolean;
  };
}

export interface PreflightCheck {
  id: string;
  provider: LiveProvider | 'local';
  passed: boolean;
  detail: string;
}

export interface PreflightReport {
  runId: string;
  generatedAt: string;
  passed: boolean;
  checks: PreflightCheck[];
}
