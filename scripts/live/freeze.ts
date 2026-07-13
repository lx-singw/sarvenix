import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

interface EvidenceItem { id: string; claim: string; artifact: string; required: boolean }

const root = process.cwd();
const docs = ['docs/Sarvenix-Judging-Evidence.md', 'docs/Sarvenix-Devpost-Submission.md', 'docs/Sarvenix-Demo-Script.md'];
const failures: string[] = [];
for (const file of docs) {
  const content = readFileSync(resolve(root, file), 'utf8');
  if (/6 suites|10 tests/.test(content)) failures.push(`${file} contains stale quality claims.`);
  const tableTbdCount = (content.match(/\|\s*TBD\s*\|/g) || []).length;
  if (process.env.COMPETITION_FINAL_FREEZE === 'true' && tableTbdCount > 0) failures.push(`${file} has ${tableTbdCount} unresolved recording timestamps.`);
}
if (process.env.NODE_ENV === 'production' && process.env.DEMO_MODE === 'true') failures.push('DEMO_MODE cannot be enabled in production.');

const evidence: EvidenceItem[] = [
  { id: 'quality-gate', claim: 'Build, tests, evaluation corpus, and audit', artifact: 'docs/Sarvenix-Judging-Evidence.md', required: true },
  { id: 'evaluation-method', claim: 'Reproducible evaluation methodology', artifact: 'docs/Sarvenix-Evaluation-Methodology.md', required: true },
  { id: 'live-runbook', claim: 'Cross-system acceptance procedure', artifact: 'docs/Sarvenix-Live-Acceptance.md', required: true },
  { id: 'app-home-shot', claim: 'Slack App Home onboarding and readiness', artifact: 'reports/evidence/app-home.png', required: false },
  { id: 'primary-run', claim: 'Primary live causal chain', artifact: 'reports/live/PRIMARY/acceptance.json', required: false },
  { id: 'backup-run', claim: 'Backup live causal chain', artifact: 'reports/live/BACKUP/acceptance.json', required: false },
];
for (const item of evidence) if (item.required && !existsSync(resolve(root, item.artifact))) failures.push(`Missing required evidence: ${item.artifact}`);

const output = { generatedAt: new Date().toISOString(), passed: failures.length === 0, failures, evidence: evidence.map(item => ({ ...item, present: existsSync(resolve(root, item.artifact)) })) };
mkdirSync(resolve(root, 'reports/freeze'), { recursive: true });
writeFileSync(resolve(root, 'reports/freeze/latest.json'), `${JSON.stringify(output, null, 2)}\n`);
writeFileSync(resolve(root, 'reports/freeze/evidence-manifest.md'), `# Competition Evidence Manifest\n\n${output.evidence.map(item => `- [${item.present ? 'x' : ' '}] **${item.claim}** — \`${item.artifact}\`${item.required ? '' : ' (captured during live rehearsal)'}`).join('\n')}\n\nFreeze result: **${output.passed ? 'PASS' : 'FAIL'}**\n`);
console.log(`Competition freeze ${output.passed ? 'passed' : 'failed'} with ${failures.length} blocking issue(s).`);
if (!output.passed) process.exitCode = 1;
