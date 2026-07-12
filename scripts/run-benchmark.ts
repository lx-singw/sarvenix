import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import type { BenchmarkObservation } from '../packages/shared-types/src';

interface Summary {
  path: BenchmarkObservation['path'];
  observations: number;
  completionRate: number;
  correctnessRate: number;
  medianElapsedMs: number;
  medianSteps: number;
  medianSystemsOpened: number;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function summarize(path: BenchmarkObservation['path'], observations: BenchmarkObservation[]): Summary {
  const selected = observations.filter(item => item.path === path);
  const ratio = (value: number) => selected.length ? Number((value / selected.length).toFixed(4)) : 0;
  return {
    path,
    observations: selected.length,
    completionRate: ratio(selected.filter(item => item.completed).length),
    correctnessRate: ratio(selected.filter(item => item.correct).length),
    medianElapsedMs: median(selected.map(item => item.elapsedMs)),
    medianSteps: median(selected.map(item => item.steps)),
    medianSystemsOpened: median(selected.map(item => item.systemsOpened)),
  };
}

const inputPath = process.argv[2];
if (!inputPath) throw new Error('Usage: npm run benchmark -- <raw-observations.json>');
const observations = JSON.parse(readFileSync(resolve(process.cwd(), inputPath), 'utf8')) as BenchmarkObservation[];
const scenarioPaths = new Map<string, Set<string>>();
for (const observation of observations) {
  if (observation.elapsedMs < 0 || observation.steps < 0 || observation.systemsOpened < 0) throw new Error(`Invalid observation for ${observation.scenarioId}`);
  const paths = scenarioPaths.get(observation.scenarioId) || new Set<string>();
  paths.add(observation.path);
  scenarioPaths.set(observation.scenarioId, paths);
}
const unpaired = [...scenarioPaths].filter(([, paths]) => paths.size !== 2).map(([id]) => id);
if (unpaired.length) throw new Error(`Every scenario requires manual and Sarvenix observations. Unpaired: ${unpaired.join(', ')}`);

const summaries = [summarize('manual', observations), summarize('sarvenix', observations)];
const output = { generatedAt: new Date().toISOString(), methodology: 'controlled-paired-benchmark-v1', summaries, rawObservationCount: observations.length };
const reportDir = resolve(process.cwd(), 'reports/benchmark');
mkdirSync(reportDir, { recursive: true });
writeFileSync(resolve(reportDir, 'latest.json'), `${JSON.stringify(output, null, 2)}\n`);
writeFileSync(resolve(reportDir, 'latest.md'), `# Controlled Workflow Benchmark\n\nThis is a paired benchmark, not a participant study. Results describe only the recorded tasks and environment.\n\n${summaries.map(item => `## ${item.path}\n- Observations: ${item.observations}\n- Completion: ${item.completionRate}\n- Correctness: ${item.correctnessRate}\n- Median elapsed: ${item.medianElapsedMs}ms\n- Median steps: ${item.medianSteps}\n- Median systems opened: ${item.medianSystemsOpened}`).join('\n\n')}\n`);
console.log(JSON.stringify(output, null, 2));
