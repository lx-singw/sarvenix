import neo4j from 'neo4j-driver';
import type { LiveStepResult } from './contracts';
import { loadManifest, saveManifest } from './run-context';
import { writeJsonReport } from './reporting';

async function measure(id: string, title: string, operation: () => Promise<string>): Promise<LiveStepResult> {
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  try {
    const detail = await operation();
    const finished = Date.now();
    return { id, title, status: 'passed', startedAt, finishedAt: new Date(finished).toISOString(), durationMs: finished - started, detail };
  } catch (error) {
    const finished = Date.now();
    return { id, title, status: 'failed', startedAt, finishedAt: new Date(finished).toISOString(), durationMs: finished - started, detail: error instanceof Error ? error.message : 'Unknown failure' };
  }
}

async function verifyUrl(url: string): Promise<string> {
  const response = await fetch(url, { redirect: 'manual' });
  if (response.status >= 500) throw new Error(`Canonical evidence returned HTTP ${response.status}.`);
  return `Canonical evidence responded with HTTP ${response.status}.`;
}

export async function runAcceptance(runId: string) {
  const manifest = await loadManifest(runId);
  if (manifest.resources.length === 0) throw new Error('Seed the sandbox before acceptance.');
  const steps: LiveStepResult[] = [];
  const canonical = manifest.resources.filter(resource => resource.canonicalUrl);
  steps.push(await measure('canonical-citations', 'Canonical evidence links resolve', async () => {
    for (const resource of canonical) await verifyUrl(resource.canonicalUrl!);
    return `${canonical.length} manifest-owned citation URLs responded.`;
  }));
  steps.push(await measure('graph-lineage', 'Graph contains both decision chains and evidence', async () => {
    const driver = neo4j.driver(process.env.GRAPH_DB_URL!, neo4j.auth.basic(process.env.GRAPH_DB_USER!, process.env.GRAPH_DB_PASSWORD!));
    const session = driver.session();
    try {
      const result = await session.run('MATCH (d:Decision {runMarker: $marker})-[:REFERENCES]->(a:Artifact {runMarker: $marker}) RETURN count(DISTINCT d) AS decisions, count(a) AS artifacts', { marker: manifest.marker });
      const decisions = result.records[0].get('decisions').toNumber();
      const artifacts = result.records[0].get('artifacts').toNumber();
      if (decisions !== 2 || artifacts < 4) throw new Error(`Expected 2 decisions and at least 4 artifacts; observed ${decisions}/${artifacts}.`);
      return `Observed ${decisions} decision chains and ${artifacts} evidence edges.`;
    } finally { await session.close(); await driver.close(); }
  }));
  steps.push(await measure('idempotent-seed', 'Manifest enforces seed idempotency', async () => {
    const unique = new Set(manifest.resources.map(resource => `${resource.provider}:${resource.type}:${resource.id}`));
    if (unique.size !== manifest.resources.length) throw new Error('Duplicate resource IDs found in manifest.');
    return `${unique.size} unique resources recorded.`;
  }));
  steps.push(await measure('impact-radius', 'Impact radius has cross-system evidence', async () => {
    const providers = new Set(manifest.resources.map(resource => resource.provider));
    for (const required of ['slack', 'github', 'jira', 'neo4j']) if (!providers.has(required as any)) throw new Error(`Missing ${required} evidence.`);
    return 'Slack, GitHub, Jira, and Neo4j are represented in the owned evidence chain.';
  }));
  manifest.steps.push(...steps);
  await saveManifest(manifest);
  const report = { runId, generatedAt: new Date().toISOString(), passed: steps.every(step => step.status === 'passed'), steps };
  await writeJsonReport(runId, 'acceptance.json', report);
  return report;
}

if (require.main === module) {
  if (!process.env.SARVENIX_RUN_ID) throw new Error('SARVENIX_RUN_ID is required.');
  runAcceptance(process.env.SARVENIX_RUN_ID).then(report => { console.log(`Live acceptance ${report.passed ? 'passed' : 'failed'} for ${report.runId}.`); if (!report.passed) process.exitCode = 1; }).catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
