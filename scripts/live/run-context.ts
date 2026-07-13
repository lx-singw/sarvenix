import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import type { LiveResource, LiveRunManifest } from './contracts';

const RUN_ID_PATTERN = /^sarvenix-run-\d{8}T\d{6}Z-[a-f0-9]{8}$/;

export function createRunId(now = new Date()): string {
  const timestamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return `sarvenix-run-${timestamp}-${crypto.randomBytes(4).toString('hex')}`;
}

export function assertValidRunId(runId: string): void {
  if (!RUN_ID_PATTERN.test(runId)) throw new Error('Invalid Sarvenix live run ID.');
}

export function reportDirectory(runId: string): string {
  assertValidRunId(runId);
  return path.join(process.cwd(), 'reports', 'live', runId);
}

export async function createManifest(runId = createRunId()): Promise<LiveRunManifest> {
  assertValidRunId(runId);
  const createdAt = new Date().toISOString();
  const manifest: LiveRunManifest = {
    schemaVersion: 1,
    runId,
    marker: runId,
    createdAt,
    updatedAt: createdAt,
    sandbox: {
      slackWorkspaceId: process.env.SANDBOX_SLACK_WORKSPACE_ID || '',
      githubRepository: process.env.SANDBOX_GITHUB_REPOSITORY || '',
      jiraProjectKey: process.env.SANDBOX_JIRA_PROJECT_KEY || '',
    },
    resources: [],
    steps: [],
    cleanup: { verified: false },
  };
  await saveManifest(manifest);
  return manifest;
}

export async function saveManifest(manifest: LiveRunManifest): Promise<void> {
  assertValidRunId(manifest.runId);
  if (manifest.marker !== manifest.runId) throw new Error('Manifest marker does not match run ID.');
  manifest.updatedAt = new Date().toISOString();
  const directory = reportDirectory(manifest.runId);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

export async function loadManifest(runId: string): Promise<LiveRunManifest> {
  const raw = await readFile(path.join(reportDirectory(runId), 'manifest.json'), 'utf8');
  const manifest = JSON.parse(raw) as LiveRunManifest;
  if (manifest.runId !== runId || manifest.marker !== runId) throw new Error('Manifest ownership validation failed.');
  return manifest;
}

export function assertOwnedResource(resource: LiveResource, manifest: LiveRunManifest): void {
  if (resource.marker !== manifest.runId) throw new Error(`Refusing cleanup for unowned ${resource.provider} resource.`);
  if (!manifest.resources.some(candidate => candidate.provider === resource.provider && candidate.id === resource.id && candidate.marker === manifest.runId)) {
    throw new Error(`Resource ${resource.id} is not recorded in the run manifest.`);
  }
}
