export async function callJiraAPI(
  endpoint: string,
  cloudId: string,
  accessToken: string,
  method = 'GET',
  body: any = null
): Promise<any> {
  // Jira Cloud REST API URL structure for 3LO OAuth
  const url = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/${endpoint}`;
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
    throw new Error(`Jira API call failed: ${response.statusText} on ${endpoint}`);
  }

  return response.json();
}
