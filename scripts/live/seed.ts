import neo4j from 'neo4j-driver';
import { getInstallationToken, callGitHubAPI } from '../../services/mcp-github/src/resources/github-client';
import { callJiraAPI } from '../../services/mcp-jira/src/resources/jira-client';
import type { LiveResource, LiveRunManifest } from './contracts';
import { createManifest, loadManifest, saveManifest } from './run-context';
import { writeJsonReport } from './reporting';

async function slack(method: string, body: Record<string, unknown>): Promise<any> {
  const response = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  const result = await response.json() as any;
  if (!result.ok) throw new Error(`Slack ${method} failed: ${result.error || 'unknown error'}`);
  return result;
}

function issueDocument(text: string) {
  return { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
}

async function provisionSlack(manifest: LiveRunManifest, suffix: string): Promise<LiveResource[]> {
  const name = `sarvenix-${suffix}-${manifest.runId.slice(-8)}`.toLowerCase();
  const channel = await slack('conversations.create', { name, is_private: false });
  const message = await slack('chat.postMessage', {
    channel: channel.channel.id,
    text: `[${manifest.marker}] Decision: use the regional connection pool for ${suffix}. Rationale: reduce failover latency while preserving tenant isolation.`,
  });
  return [
    { provider: 'slack', type: 'channel', id: channel.channel.id, marker: manifest.marker, cleanupAction: 'archive' },
    { provider: 'slack', type: 'message', id: `${channel.channel.id}:${message.ts}`, marker: manifest.marker, canonicalUrl: `https://slack.com/archives/${channel.channel.id}/p${String(message.ts).replace('.', '')}`, cleanupAction: 'delete' },
  ];
}

async function provisionGitHub(manifest: LiveRunManifest, suffix: string): Promise<LiveResource> {
  const token = await getInstallationToken(process.env.GITHUB_APP_ID!, process.env.GITHUB_PRIVATE_KEY!.replace(/\\n/g, '\n'), process.env.GITHUB_INSTALLATION_ID!);
  const repository = process.env.SANDBOX_GITHUB_REPOSITORY!;
  const issue = await callGitHubAPI(`repos/${repository}/issues`, token, 'POST', {
    title: `[${manifest.marker}] ${suffix} connection-pool implementation`,
    body: `${manifest.marker}\nImplements the regional connection-pool decision. This artifact is owned by the Sarvenix live proof run.`,
  });
  return { provider: 'github', type: 'issue', id: String(issue.number), marker: manifest.marker, canonicalUrl: issue.html_url, cleanupAction: 'close' };
}

async function provisionJira(manifest: LiveRunManifest, suffix: string): Promise<LiveResource> {
  const issue = await callJiraAPI('issue', process.env.JIRA_CLOUD_ID!, process.env.JIRA_ACCESS_TOKEN!, 'POST', {
    fields: {
      project: { key: process.env.SANDBOX_JIRA_PROJECT_KEY },
      summary: `[${manifest.marker}] ${suffix} connection-pool rollout`,
      description: issueDocument(`${manifest.marker} tracks the regional connection-pool decision and its rollout.`),
      issuetype: { name: 'Task' },
    },
  });
  return { provider: 'jira', type: 'issue', id: issue.key, marker: manifest.marker, canonicalUrl: `${process.env.JIRA_SITE_URL}/browse/${issue.key}`, cleanupAction: 'close' };
}

async function provisionGraph(manifest: LiveRunManifest, suffix: string, resources: LiveResource[]): Promise<LiveResource> {
  const driver = neo4j.driver(process.env.GRAPH_DB_URL!, neo4j.auth.basic(process.env.GRAPH_DB_USER!, process.env.GRAPH_DB_PASSWORD!));
  const session = driver.session();
  const id = `${manifest.runId}-${suffix}`;
  
  const slackChannel = resources.find(r => r.provider === 'slack' && r.type === 'channel');
  const channelId = slackChannel ? slackChannel.id : '';
  
  const title = `${suffix} regional connection pool`;
  let embedding: number[] | null = null;
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = ai.getGenerativeModel({ model: 'gemini-embedding-2' });
      const result = await model.embedContent(title);
      if (result.embedding && result.embedding.values) {
        embedding = result.embedding.values;
      }
    } catch (e) {
      console.warn(`Embedding generation failed during seeding:`, e);
    }
  }

  try {
    await session.run(
      `MERGE (d:Decision {id: $id}) 
       SET d.runMarker=$marker, d.title=$title, d.summary=$title, d.status='rejected', 
           d.currentTruth=true, d.validFrom=datetime(), d.channelId=$channelId, d.embedding=$embedding
       WITH d UNWIND $artifacts AS artifact
       MERGE (a:Artifact {externalId: artifact.id, runMarker: $marker}) SET a.type=artifact.type, a.externalUrl=artifact.url
       MERGE (d)-[:REFERENCES]->(a)`,
      { 
        id, 
        marker: manifest.marker, 
        title, 
        channelId,
        embedding,
        artifacts: resources.filter(resource => resource.canonicalUrl).map(resource => ({ id: resource.id, type: `${resource.provider}_${resource.type}`, url: resource.canonicalUrl })) 
      },
    );
  } finally { await session.close(); await driver.close(); }
  return { provider: 'neo4j', type: 'decision', id, marker: manifest.marker, cleanupAction: 'delete' };
}

export async function seedSandbox(runId?: string): Promise<LiveRunManifest> {
  if (process.env.SARVENIX_SANDBOX_MODE !== 'true' || process.env.NODE_ENV === 'production') throw new Error('Sandbox seed requires non-production sandbox mode.');
  const manifest = runId ? await loadManifest(runId) : await createManifest();
  if (manifest.resources.length > 0) return manifest;
  for (const suffix of ['primary', 'backup']) {
    const slackResources = await provisionSlack(manifest, suffix);
    const github = await provisionGitHub(manifest, suffix);
    const jira = await provisionJira(manifest, suffix);
    manifest.resources.push(...slackResources, github, jira);
    manifest.resources.push(await provisionGraph(manifest, suffix, [...slackResources, github, jira]));
    await saveManifest(manifest);
  }
  await writeJsonReport(manifest.runId, 'seed.json', { passed: true, resources: manifest.resources });
  return manifest;
}

if (require.main === module) seedSandbox(process.env.SARVENIX_RUN_ID).then(manifest => console.log(`Seeded ${manifest.resources.length} resources for ${manifest.runId}.`)).catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
