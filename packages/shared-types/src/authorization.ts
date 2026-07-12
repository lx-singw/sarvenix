export type AuthorizationMode = 'sandbox_service' | 'per_user_oauth';
export type ProtectedSource = 'slack' | 'github' | 'jira';

export interface RequestIdentity {
  workspaceId: string;
  slackUserId: string;
  mode: AuthorizationMode;
}

export interface SourceGrant {
  source: ProtectedSource;
  identity: RequestIdentity;
  subject: string;
  scopes: string[];
  expiresAt?: Date;
}

export interface AuthorizationDecision {
  allowed: boolean;
  source: ProtectedSource;
  resource: string;
  reason: 'granted' | 'not_linked' | 'outside_sandbox_allowlist' | 'source_denied' | 'expired';
}

export interface SourceAuthorizer {
  authorize(identity: RequestIdentity, source: ProtectedSource, resource: string): Promise<AuthorizationDecision>;
}

export function redactSensitive(value: string): string {
  return value
    .replace(/(bearer|token|secret|password|private[_ -]?key)\s*[:=]?\s*[^\s,;]+/gi, '$1=[REDACTED]')
    .replace(/xox[baprs]-[A-Za-z0-9-]+/g, '[REDACTED_SLACK_TOKEN]')
    .replace(/gh[opsu]_[A-Za-z0-9]+/g, '[REDACTED_GITHUB_TOKEN]');
}

export function assertSafeExternalUrl(value: string, hosts: string[]): URL {
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:' || !hosts.includes(parsed.hostname.toLowerCase())) {
    throw new Error('External URL is not on the HTTPS source allowlist.');
  }
  return parsed;
}
