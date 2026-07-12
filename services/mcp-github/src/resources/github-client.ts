import * as crypto from 'crypto';

export function generateJWT(appId: string, privateKey: string): string {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60, // 60s ago to handle clock drift
    exp: now + 600, // 10 minutes expiry
    iss: appId,
  };

  const encode = (obj: any) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const base64Header = encode(header);
  const base64Payload = encode(payload);
  const data = `${base64Header}.${base64Payload}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(data);
  const signature = sign
    .sign(privateKey, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${data}.${signature}`;
}

export async function getInstallationToken(
  appId: string,
  privateKey: string,
  installationId: string
): Promise<string> {
  const jwt = generateJWT(appId, privateKey);
  const url = `https://api.github.com/app/installations/${installationId}/access_tokens`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Sarvenix-MCP-Github',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GitHub token acquisition failed: ${response.statusText}. Details: ${errorBody}`);
  }

  const data = (await response.json()) as { token: string };
  return data.token;
}

export async function callGitHubAPI(
  endpoint: string,
  token: string,
  method = 'GET',
  body: any = null
): Promise<any> {
  const url = `https://api.github.com/${endpoint}`;
  const headers: Record<string, string> = {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'Sarvenix-MCP-Github',
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
    const requestId = response.headers.get('x-github-request-id');
    const details = await response.text();
    throw new Error(
      `GitHub API call failed (${response.status}) on ${endpoint}${requestId ? ` [request ${requestId}]` : ''}: ${details.slice(0, 500)}`
    );
  }

  return response.json();
}
