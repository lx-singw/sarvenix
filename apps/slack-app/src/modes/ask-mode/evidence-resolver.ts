import { spawn } from 'child_process';
import * as path from 'path';

export type EvidenceSourceType = 'github_pr' | 'jira_ticket';

export interface ResolvedEvidence {
  sourceType: EvidenceSourceType;
  externalId: string;
  title: string;
  url: string;
  context: string;
}

export interface EvidenceResolution {
  evidence: ResolvedEvidence[];
  unavailable: Array<{ artifactId: string; reason: string }>;
}

interface McpTextContent {
  type: string;
  text?: string;
}

interface McpToolResult {
  isError?: boolean;
  content?: McpTextContent[];
}

interface ArtifactReference {
  kind: EvidenceSourceType;
  externalId: string;
}

function parseArtifactReference(artifactId: string): ArtifactReference | null {
  const normalized = artifactId.trim();
  const jiraMatch = normalized.match(/(?:^|[^A-Z0-9])([A-Z][A-Z0-9]+-\d+)(?:$|[^A-Z0-9])/i);
  if (jiraMatch) {
    return { kind: 'jira_ticket', externalId: jiraMatch[1].toUpperCase() };
  }

  const prMatch = normalized.match(/(?:pr(?:[-_:#\s]+)?|pull(?:[-_/#\s]+)?)(\d+)/i);
  if (prMatch) {
    return { kind: 'github_pr', externalId: prMatch[1] };
  }

  return null;
}

function serverPath(service: 'mcp-jira' | 'mcp-github'): string {
  return path.resolve(process.cwd(), `services/${service}/dist/index.js`);
}

async function queryMcpServer(
  executablePath: string,
  toolName: string,
  args: Record<string, unknown>,
  timeoutMs = 8_000
): Promise<McpToolResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [executablePath], {
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let buffer = '';
    let settled = false;

    const finish = (error?: Error, result?: McpToolResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      child.kill();
      if (error) reject(error);
      else resolve(result || {});
    };

    const timeout = setTimeout(
      () => finish(new Error(`${toolName} timed out after ${timeoutMs}ms`)),
      timeoutMs
    );

    child.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const message = JSON.parse(line);
          if (message.id !== 1) continue;
          if (message.error) {
            finish(new Error(message.error.message || `${toolName} failed`));
            return;
          }
          finish(undefined, message.result as McpToolResult);
          return;
        } catch {
          // The MCP transport may emit non-JSON diagnostics on startup.
        }
      }
    });

    child.on('error', (error) => finish(error));
    child.on('exit', (code) => {
      if (!settled) finish(new Error(`${toolName} exited before responding (code ${code})`));
    });

    child.stdin.write(
      `${JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: toolName, arguments: args },
      })}\n`
    );
  });
}

function parseMcpPayload(result: McpToolResult): unknown {
  const text = result.content?.find((item) => item.type === 'text')?.text;
  if (result.isError) throw new Error(text || 'MCP tool returned an error');
  if (!text) throw new Error('MCP tool returned no text payload');
  return JSON.parse(text);
}

function normalizeSiteUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

async function resolveJira(issueKey: string): Promise<ResolvedEvidence> {
  const siteUrl = normalizeSiteUrl(process.env.JIRA_SITE_URL || '');
  if (!siteUrl) throw new Error('JIRA_SITE_URL is not configured');

  const result = await queryMcpServer(serverPath('mcp-jira'), 'get_issue_detail', { issueKey });
  const payload = parseMcpPayload(result) as { detail?: any };
  const detail = payload.detail;
  if (!detail?.key) throw new Error(`Jira issue ${issueKey} was not found`);

  const fields = detail.fields || {};
  const title = fields.summary || detail.key;
  const status = fields.status?.name || 'Unknown';
  const resolution = fields.resolution?.name || 'Unresolved';
  const description = typeof fields.description === 'string'
    ? fields.description
    : fields.description
      ? JSON.stringify(fields.description)
      : 'No description provided.';
  const url = `${siteUrl}/browse/${encodeURIComponent(detail.key)}`;

  return {
    sourceType: 'jira_ticket',
    externalId: detail.key,
    title: `${detail.key}: ${title}`,
    url,
    context: [
      `[Jira ${detail.key}]`,
      `Title: ${title}`,
      `Status: ${status}`,
      `Resolution: ${resolution}`,
      `Description: ${description}`,
      `Canonical URL: ${url}`,
    ].join('\n'),
  };
}

async function resolveGitHub(prNumber: number): Promise<ResolvedEvidence> {
  const owner = process.env.GITHUB_OWNER || '';
  const repo = process.env.GITHUB_REPO || '';
  if (!owner || !repo) throw new Error('GITHUB_OWNER and GITHUB_REPO are not configured');

  const [detailResult, commentsResult] = await Promise.all([
    queryMcpServer(serverPath('mcp-github'), 'get_pr_detail', { owner, repo, number: prNumber }),
    queryMcpServer(serverPath('mcp-github'), 'get_pr_comments', { owner, repo, number: prNumber }),
  ]);
  const detailPayload = parseMcpPayload(detailResult) as { detail?: any };
  const commentsPayload = parseMcpPayload(commentsResult) as { comments?: any[] };
  const detail = detailPayload.detail;
  if (!detail?.number) throw new Error(`GitHub PR #${prNumber} was not found`);

  const url = detail.html_url || `https://github.com/${owner}/${repo}/pull/${prNumber}`;
  const comments = (commentsPayload.comments || []).slice(-10).map((comment) => {
    const author = comment.user?.login || comment.author || 'Unknown';
    const body = String(comment.body || '').replace(/\s+/g, ' ').trim();
    return `- ${author}: ${body} (${comment.html_url || url})`;
  });

  return {
    sourceType: 'github_pr',
    externalId: String(detail.number),
    title: `GitHub PR #${detail.number}: ${detail.title}`,
    url,
    context: [
      `[GitHub PR #${detail.number}]`,
      `Repository: ${owner}/${repo}`,
      `Title: ${detail.title}`,
      `State: ${detail.merged_at ? 'merged' : detail.state}`,
      `Body: ${detail.body || 'No description provided.'}`,
      `Review comments:`,
      ...(comments.length ? comments : ['- No review comments found.']),
      `Canonical URL: ${url}`,
    ].join('\n'),
  };
}

export async function resolveExternalEvidence(artifactIds: string[]): Promise<EvidenceResolution> {
  const uniqueReferences = new Map<string, ArtifactReference>();
  for (const artifactId of artifactIds) {
    const reference = parseArtifactReference(artifactId);
    if (reference) uniqueReferences.set(`${reference.kind}:${reference.externalId}`, reference);
  }

  const evidence: ResolvedEvidence[] = [];
  const unavailable: EvidenceResolution['unavailable'] = [];

  await Promise.all(
    [...uniqueReferences.values()].map(async (reference) => {
      try {
        const result = reference.kind === 'jira_ticket'
          ? await resolveJira(reference.externalId)
          : await resolveGitHub(Number(reference.externalId));
        evidence.push(result);
      } catch (error) {
        unavailable.push({
          artifactId: reference.externalId,
          reason: error instanceof Error ? error.message : 'Unknown integration error',
        });
      }
    })
  );

  return { evidence, unavailable };
}
