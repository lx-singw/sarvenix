import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { spawnSync } from 'child_process';

const baseUrl = process.env.SARVENIX_EVIDENCE_URL;
if (!baseUrl) throw new Error('SARVENIX_EVIDENCE_URL is required for automated evidence capture.');
if (!/^https?:\/\/(localhost|127\.0\.0\.1|[^/]+\.vercel\.app)(:\d+)?(?:\/|$)/.test(baseUrl)) {
  throw new Error('Evidence capture is restricted to localhost or a Vercel preview URL.');
}
const directory = resolve(process.cwd(), 'reports/evidence');
mkdirSync(directory, { recursive: true });
const commands = [
  ['open', baseUrl],
  ['set', 'viewport', '879', '941'],
  ['wait', '--load', 'networkidle'],
  ['snapshot'],
  ['screenshot', resolve(directory, 'app-home.png'), '--full'],
];
const results = commands.map(args => {
  const result = spawnSync('agent-browser', args, { encoding: 'utf8' });
  return { command: args.join(' '), status: result.status, output: (result.stdout || result.stderr).slice(0, 2000) };
});
spawnSync('agent-browser', ['close'], { encoding: 'utf8' });
writeFileSync(resolve(directory, 'capture-manifest.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, results }, null, 2)}\n`);
if (results.some(result => result.status !== 0)) throw new Error('One or more evidence-capture commands failed.');
console.log(`Evidence captured to ${directory}.`);
