import type { PreflightCheck, PreflightReport } from './contracts';
import { createManifest } from './run-context';
import { writeJsonReport, writePreflightMarkdown } from './reporting';

const REQUIRED_VARIABLES = [
  'SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET', 'SANDBOX_SLACK_WORKSPACE_ID',
  'GITHUB_APP_ID', 'GITHUB_PRIVATE_KEY', 'GITHUB_INSTALLATION_ID', 'SANDBOX_GITHUB_REPOSITORY',
  'JIRA_CLOUD_ID', 'JIRA_ACCESS_TOKEN', 'JIRA_SITE_URL', 'SANDBOX_JIRA_PROJECT_KEY',
  'GRAPH_DB_URL', 'GRAPH_DB_USER', 'GRAPH_DB_PASSWORD',
] as const;

async function checkSlack(): Promise<PreflightCheck> {
  const response = await fetch('https://slack.com/api/auth.test', { headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` } });
  const body = await response.json() as { ok: boolean; team_id?: string; error?: string };
  const matches = body.ok && body.team_id === process.env.SANDBOX_SLACK_WORKSPACE_ID;
  return { id: 'slack-workspace', provider: 'slack', passed: Boolean(matches), detail: matches ? 'Authenticated to configured sandbox workspace.' : `Slack authentication or workspace check failed: ${body.error || 'workspace mismatch'}.` };
}

async function checkGitHub(): Promise<PreflightCheck> {
  const repository = process.env.SANDBOX_GITHUB_REPOSITORY || '';
  const response = await fetch(`https://api.github.com/repos/${repository}`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Sarvenix-Live-Preflight' } });
  return { id: 'github-repository', provider: 'github', passed: response.ok || response.status === 403, detail: response.ok ? 'Sandbox repository is reachable.' : `Repository probe returned HTTP ${response.status}; installation-token validation occurs during seed.` };
}

async function checkJira(): Promise<PreflightCheck> {
  const project = process.env.SANDBOX_JIRA_PROJECT_KEY || '';
  const token = process.env.JIRA_ACCESS_TOKEN || '';
  let url: string;
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (token.startsWith('ATATT')) {
    const email = process.env.JIRA_USER_EMAIL || '';
    const siteUrl = (process.env.JIRA_SITE_URL || '').replace(/\/$/, '');
    url = `${siteUrl}/rest/api/3/project/${encodeURIComponent(project)}`;
    const credentials = Buffer.from(`${email}:${token}`).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
  } else {
    url = `https://api.atlassian.com/ex/jira/${process.env.JIRA_CLOUD_ID}/rest/api/3/project/${encodeURIComponent(project)}`;
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });
  return { id: 'jira-project', provider: 'jira', passed: response.ok, detail: response.ok ? 'Sandbox Jira project is reachable.' : `Jira project probe returned HTTP ${response.status}.` };
}

async function checkNeo4j(): Promise<PreflightCheck> {
  const validUrl = /^(neo4j|neo4j\+s|bolt|bolt\+s):\/\//.test(process.env.GRAPH_DB_URL || '');
  return { id: 'neo4j-configuration', provider: 'neo4j', passed: validUrl, detail: validUrl ? 'Graph endpoint format and credentials are present; driver connectivity runs during seed.' : 'Graph URL must use a Neo4j or Bolt scheme.' };
}

export async function runPreflight(): Promise<PreflightReport> {
  if (process.env.SARVENIX_SANDBOX_MODE !== 'true') throw new Error('Set SARVENIX_SANDBOX_MODE=true before live tooling can run.');
  if (process.env.NODE_ENV === 'production') throw new Error('Live proof tooling refuses to run with NODE_ENV=production.');
  const manifest = await createManifest(process.env.SARVENIX_RUN_ID);
  const checks: PreflightCheck[] = REQUIRED_VARIABLES.map(key => ({ id: `env-${key.toLowerCase()}`, provider: 'local', passed: Boolean(process.env[key]), detail: process.env[key] ? 'Configured.' : 'Missing required protected variable.' }));
  if (checks.every(check => check.passed)) {
    for (const probe of [checkSlack, checkGitHub, checkJira, checkNeo4j]) {
      try { checks.push(await probe()); } catch (error) { checks.push({ id: `${probe.name}-exception`, provider: 'local', passed: false, detail: error instanceof Error ? error.message : 'Unknown probe failure.' }); }
    }
  }
  const report: PreflightReport = { runId: manifest.runId, generatedAt: new Date().toISOString(), passed: checks.every(check => check.passed), checks };
  await writeJsonReport(manifest.runId, 'preflight.json', report);
  await writePreflightMarkdown(report);
  return report;
}

if (require.main === module) {
  runPreflight().then(report => { console.log(`Live preflight ${report.passed ? 'passed' : 'failed'} for ${report.runId}.`); if (!report.passed) process.exitCode = 1; }).catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
