import { runPreflight } from './preflight';
import { seedSandbox } from './seed';
import { runAcceptance } from './accept';
import { runAdversarial } from './adversarial';
import { resetSandbox } from './reset';
import { writeJsonReport } from './reporting';

export async function runAll() {
  const preflight = await runPreflight();
  if (!preflight.passed) throw new Error(`Preflight failed for ${preflight.runId}; inspect its redacted report.`);
  process.env.SARVENIX_RUN_ID = preflight.runId;
  let cleanupVerified = false;
  try {
    const manifest = await seedSandbox(preflight.runId);
    const acceptance = await runAcceptance(manifest.runId);
    const adversarial = await runAdversarial(manifest.runId);
    const passed = acceptance.passed && adversarial.passed;
    await writeJsonReport(manifest.runId, 'summary.json', { runId: manifest.runId, passed, acceptance, adversarial, cleanupVerified: false });
    if (!passed) throw new Error('One or more live proof checks failed.');
    return manifest.runId;
  } finally {
    const cleanup = await resetSandbox(preflight.runId);
    cleanupVerified = cleanup.cleanup.verified;
    await writeJsonReport(preflight.runId, 'final.json', { runId: preflight.runId, cleanupVerified, completedAt: new Date().toISOString() });
    if (!cleanupVerified) process.exitCode = 1;
  }
}

if (require.main === module) runAll().then(runId => console.log(`Live proof completed and cleaned for ${runId}.`)).catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
