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
  const safeEndpoint = assertSafeJiraEndpoint(endpoint);
  
  let url: string;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'Sarvenix-MCP-Jira',
  };

  if (accessToken.startsWith('ATATT')) {
    // Basic Auth with Atlassian API Token
    const email = process.env.JIRA_USER_EMAIL || '';
    if (!email) {
      throw new Error('JIRA_USER_EMAIL must be set in env to use Atlassian API token.');
    }
    const siteUrl = (process.env.JIRA_SITE_URL || '').replace(/\/$/, '');
    if (!siteUrl) {
      throw new Error('JIRA_SITE_URL must be set in env to use Atlassian API token.');
    }
    url = `${siteUrl}/rest/api/3/${safeEndpoint}`;
    const credentials = Buffer.from(`${email}:${accessToken}`).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
  } else {
    // 3LO OAuth token
    if (!/^[A-Za-z0-9-]+$/.test(cloudId)) throw new Error('Invalid Jira cloud identifier.');
    url = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/${safeEndpoint}`;
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

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

  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (err: any) {
    throw new Error(`Failed to parse Jira response as JSON: ${text.slice(0, 100)}`);
  }
}
