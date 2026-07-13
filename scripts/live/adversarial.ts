import { withTimeout, CircuitBreaker, idempotencyKey } from '../../apps/slack-app/src/lib/reliability';
import { evaluateAlertPolicy } from '../../apps/slack-app/src/agent/alert-policy';
import { redactForReport, writeJsonReport } from './reporting';
import { loadManifest, saveManifest } from './run-context';
import type { LiveStepResult } from './contracts';

async function test(id: string, title: string, assertion: () => Promise<string> | string): Promise<LiveStepResult> {
  const start = Date.now();
  try {
    const detail = await assertion();
    return { id, title, status: 'passed', startedAt: new Date(start).toISOString(), finishedAt: new Date().toISOString(), durationMs: Date.now() - start, detail };
  } catch (error) {
    return { id, title, status: 'failed', startedAt: new Date(start).toISOString(), finishedAt: new Date().toISOString(), durationMs: Date.now() - start, detail: error instanceof Error ? error.message : 'Unknown failure' };
  }
}

export async function runAdversarial(runId: string) {
  const manifest = await loadManifest(runId);
  const steps: LiveStepResult[] = [];
  steps.push(await test('secret-redaction', 'Secrets never enter reports', () => {
    const value = JSON.stringify(redactForReport({ authorization: 'Bearer hidden', token: 'xoxb-hidden', title: 'safe' }));
    if (value.includes('hidden')) throw new Error('Sensitive value survived redaction.');
    return 'Nested authorization and token fields were redacted.';
  }));
  steps.push(await test('provider-timeout', 'Provider timeout fails closed', async () => {
    await expectReject(withTimeout(async () => new Promise(resolve => setTimeout(() => resolve('late'), 100)), 15, 'fault-provider'), 'timeout');
    return 'Bounded timeout rejected the delayed provider.';
  }));
  steps.push(await test('circuit-breaker', 'Repeated provider failures open circuit', async () => {
    const breaker = new CircuitBreaker(2, 60_000);
    for (let index = 0; index < 2; index++) await breaker.run(async () => { throw new Error('injected outage'); }).catch(() => undefined);
    await expectReject(breaker.run(async () => 'unexpected'), 'circuit');
    return 'Circuit opened after the configured failure threshold.';
  }));
  steps.push(await test('duplicate-delivery', 'Duplicate Slack deliveries share one idempotency key', () => {
    const first = idempotencyKey('slack-event', 'event-123', 'channel-1', '171234.1');
    const replay = idempotencyKey('slack-event', 'event-123', 'channel-1', '171234.1');
    if (first !== replay) throw new Error('Replay key changed.');
    return `Stable idempotency key ${first.slice(0, 12)}… generated.`;
  }));
  steps.push(await test('alert-suppression', 'Repeated or low-quality alerts are suppressed', () => {
    const result = evaluateAlertPolicy({ semanticSimilarity: 0.4, contradictionConfidence: 0.4, evidenceFreshness: 0.5, identicalAlertCount: 2, priorDisposition: 'rejected' });
    if (result.shouldAlert) throw new Error('Unsafe alert was allowed.');
    return `Alert suppressed: ${result.reason}`;
  }));
  steps.push(await test('ownership-boundary', 'All evidence belongs to the current run', () => {
    if (manifest.resources.some(resource => resource.marker !== manifest.runId)) throw new Error('Foreign resource found.');
    return `${manifest.resources.length} resources match the run marker.`;
  }));
  manifest.steps.push(...steps); await saveManifest(manifest);
  const report = { runId, generatedAt: new Date().toISOString(), passed: steps.every(step => step.status === 'passed'), steps };
  await writeJsonReport(runId, 'adversarial.json', report);
  return report;
}

async function expectReject(promise: Promise<unknown>, expected: string) {
  try { await promise; } catch (error) { if ((error instanceof Error ? error.message : String(error)).toLowerCase().includes(expected)) return; throw error; }
  throw new Error(`Expected rejection containing ${expected}.`);
}

if (require.main === module) {
  if (!process.env.SARVENIX_RUN_ID) throw new Error('SARVENIX_RUN_ID is required.');
  runAdversarial(process.env.SARVENIX_RUN_ID).then(report => { console.log(`Adversarial acceptance ${report.passed ? 'passed' : 'failed'}.`); if (!report.passed) process.exitCode = 1; }).catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
