import { assertOwnedResource, assertValidRunId } from '../../scripts/live/run-context';
import { redactForReport } from '../../scripts/live/reporting';
import type { LiveRunManifest } from '../../scripts/live/contracts';

describe('protected live tooling', () => {
  const runId = 'sarvenix-run-20260713T120000Z-deadbeef';
  const manifest: LiveRunManifest = {
    schemaVersion: 1, runId, marker: runId,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    sandbox: { slackWorkspaceId: 'T1', githubRepository: 'org/repo', jiraProjectKey: 'SARV' },
    resources: [{ provider: 'github', type: 'issue', id: '1', marker: runId, cleanupAction: 'close' }],
    steps: [], cleanup: { verified: false },
  };

  it('accepts only canonical run IDs', () => {
    expect(() => assertValidRunId(runId)).not.toThrow();
    expect(() => assertValidRunId('../../unsafe')).toThrow();
  });

  it('refuses cleanup of resources outside the manifest', () => {
    expect(() => assertOwnedResource(manifest.resources[0], manifest)).not.toThrow();
    expect(() => assertOwnedResource({ ...manifest.resources[0], id: '2' }, manifest)).toThrow();
    expect(() => assertOwnedResource({ ...manifest.resources[0], marker: 'another-run' }, manifest)).toThrow();
  });

  it('redacts nested credentials and provider tokens', () => {
    const report = redactForReport({ authorization: 'Bearer secret', nested: { token: 'xoxb-secret', detail: 'ghp_abcdefghijklmnopqrstuvwxyz' } }) as any;
    expect(report.authorization).toBe('[REDACTED]');
    expect(report.nested.token).toBe('[REDACTED]');
    expect(report.nested.detail).toBe('[REDACTED]');
  });
});
