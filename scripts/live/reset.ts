import neo4j from 'neo4j-driver';
import { getInstallationToken, callGitHubAPI } from '../../services/mcp-github/src/resources/github-client';
import { callJiraAPI } from '../../services/mcp-jira/src/resources/jira-client';
import type { LiveResource, LiveRunManifest } from './contracts';
import { assertOwnedResource, loadManifest, saveManifest } from './run-context';
import { summarizeCleanup, writeJsonReport } from './reporting';

async function slack(method: string, body: Record<string, unknown>): Promise<any> {
  const response = await fetch(`https://slack.com/api/${method}`, { method: 'POST', headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json() as any;
  if (!result.ok && !['already_archived', 'message_not_found'].includes(result.error)) throw new Error(`Slack cleanup failed: ${result.error}`);
  return result;
}

async function cleanupResource(resource: LiveResource, manifest: LiveRunManifest): Promise<void> {
  assertOwnedResource(resource, manifest);
  if (resource.cleanedAt) return;
  if (resource.provider === 'slack' && resource.type === 'message') {
    const [channel, ts] = resource.id.split(':'); await slack('chat.delete', { channel, ts });
  } else if (resource.provider === 'slack' && resource.type === 'channel') {
    await slack('conversations.archive', { channel: resource.id });
  } else if (resource.provider === 'github') {
    const token = await getInstallationToken(process.env.GITHUB_APP_ID!, process.env.GITHUB_PRIVATE_KEY!.replace(/\\n/g, '\n'), process.env.GITHUB_INSTALLATION_ID!);
    await callGitHubAPI(`repos/${process.env.SANDBOX_GITHUB_REPOSITORY}/issues/${resource.id}`, token, 'PATCH', { state: 'closed' });
  } else if (resource.provider === 'jira') {
    await callJiraAPI(`issue/${resource.id}`, process.env.JIRA_CLOUD_ID!, process.env.JIRA_ACCESS_TOKEN!, 'PUT', { fields: { labels: ['sarvenix-live-cleaned'] } });
  } else if (resource.provider === 'neo4j') {
    const driver = neo4j.driver(process.env.GRAPH_DB_URL!, neo4j.auth.basic(process.env.GRAPH_DB_USER!, process.env.GRAPH_DB_PASSWORD!));
    const session = driver.session();
    try { await session.run('MATCH (n {runMarker: $marker}) DETACH DELETE n', { marker: manifest.marker }); } finally { await session.close(); await driver.close(); }
  }
  resource.cleanedAt = new Date().toISOString();
}

export async function resetSandbox(runId: string): Promise<LiveRunManifest> {
  if (process.env.SARVENIX_SANDBOX_MODE !== 'true' || process.env.NODE_ENV === 'production') throw new Error('Sandbox reset requires non-production sandbox mode.');
  const manifest = await loadManifest(runId);
  manifest.cleanup.startedAt ||= new Date().toISOString();
  const order = [...manifest.resources].reverse();
  for (const resource of order) { await cleanupResource(resource, manifest); await saveManifest(manifest); }
  manifest.cleanup.completedAt = new Date().toISOString();
  manifest.cleanup.verified = manifest.resources.every(resource => Boolean(resource.cleanedAt));
  await saveManifest(manifest);
  await writeJsonReport(runId, 'cleanup.json', { passed: manifest.cleanup.verified, summary: summarizeCleanup(manifest) });
  return manifest;
}

if (require.main === module) {
  if (!process.env.SARVENIX_RUN_ID) throw new Error('SARVENIX_RUN_ID is required for cleanup.');
  resetSandbox(process.env.SARVENIX_RUN_ID).then(manifest => console.log(summarizeCleanup(manifest))).catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
