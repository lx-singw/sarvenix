import { redactSensitive } from '@sarvenix/shared-types';

function assertSafeJiraEndpoint(endpoint: string): string {
  const normalized = endpoint.replace(/^\/+/, '');
  if (!/^[A-Za-z0-9._~!$&'()*+,;=:@%/?-]+$/.test(normalized) || normalized.includes('..')) {
    throw new Error('Unsafe Jira API endpoint.');
  }
  const allowedProjects = (process.env.JIRA_ALLOWED_PROJECT_KEYS || '').split(',').map(value => value.trim()).filter(Boolean);
  const issueMatch = normalized.match(/issue\/([A-Z][A-Z0-9]+)-\d+/);
  if (allowedProjects.length > 0 && issueMatch && !allowedProjects.includes(issueMatch[1])) {
    throw new Error('Jira resource is outside the configured project allowlist.');
  }
  return normalized;
}

export async function callJiraAPI(
  endpoint: string,
  cloudId: string,
  accessToken: string,
  method = 'GET',
  body: any = null
): Promise<any> {
  // Jira Cloud REST API URL structure for 3LO OAuth
  const safeEndpoint = assertSafeJiraEndpoint(endpoint);
  if (!/^[A-Za-z0-9-]+$/.test(cloudId)) throw new Error('Invalid Jira cloud identifier.');
  const url = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/${safeEndpoint}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'User-Agent': 'Sarvenix-MCP-Jira',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    const requestId = response.headers.get('x-arequestid');
    const details = await response.text();
    throw new Error(
      redactSensitive(`Jira API call failed (${response.status}) on ${safeEndpoint}${requestId ? ` [request ${requestId}]` : ''}: ${details.slice(0, 500)}`)
    );
  }

  return response.json();
}
