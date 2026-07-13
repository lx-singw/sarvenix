import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import type { EvaluationMetrics, EvaluationObservation, EvaluationScenario } from '../packages/shared-types/src';

interface Corpus { version: string; scenarios: EvaluationScenario[] }

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 1 : Number((numerator / denominator).toFixed(4));
}

function percentile(values: number[], percentileValue: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(percentileValue * sorted.length) - 1)];
}

export function validateCorpus(corpus: Corpus): string[] {
  const errors: string[] = [];
  if (corpus.scenarios.length < 100) errors.push('Corpus must contain at least 100 scenarios.');
  const ids = new Set<string>();
  for (const item of corpus.scenarios) {
    if (ids.has(item.id)) errors.push(`Duplicate scenario id: ${item.id}`);
    ids.add(item.id);
    if (!item.prompt.trim()) errors.push(`${item.id} has an empty prompt.`);
    if (item.requester.persona === 'denied' && item.expected.shouldAnswer) {
      errors.push(`${item.id} cannot expect an answer for the denied persona.`);
    }
  }
  return errors;
}

export function validateObservations(corpus: Corpus, observations: EvaluationObservation[]): string[] {
  const errors: string[] = [];
  const expectedIds = new Set(corpus.scenarios.map(item => item.id));
  const seen = new Set<string>();
  for (const observation of observations) {
    if (seen.has(observation.scenarioId)) errors.push(`Duplicate observation: ${observation.scenarioId}`);
    seen.add(observation.scenarioId);
    if (!expectedIds.has(observation.scenarioId)) errors.push(`Unknown scenario: ${observation.scenarioId}`);
    if (!Number.isFinite(observation.latencyMs) || observation.latencyMs < 0) errors.push(`${observation.scenarioId} has invalid latency.`);
    if (!Array.isArray(observation.citations) || !Array.isArray(observation.claims)) errors.push(`${observation.scenarioId} has malformed evidence arrays.`);
    if (!observation.abstained && !observation.answer?.trim()) errors.push(`${observation.scenarioId} must include an answer or abstain.`);
  }
  for (const scenario of corpus.scenarios) if (!seen.has(scenario.id)) errors.push(`Missing observation: ${scenario.id}`);
  return errors;
}

export function score(corpus: Corpus, observations: EvaluationObservation[]): EvaluationMetrics {
  const validationErrors = validateObservations(corpus, observations);
  if (validationErrors.length) throw new Error(`Evaluation observations are invalid:\n${validationErrors.join('\n')}`);
  const byId = new Map(observations.map(item => [item.scenarioId, item]));
  const joined = corpus.scenarios.flatMap(item => {
    const observation = byId.get(item.id);
    return observation ? [{ item, observation }] : [];
  });
  const citations = joined.flatMap(({ observation }) => observation.citations);
  const claims = joined.flatMap(({ observation }) => observation.claims);
  const expectedAlerts = joined.filter(({ item }) => item.expected.shouldAlert);
  const actualAlerts = joined.filter(({ observation }) => observation.alerted);
  const trueAlerts = joined.filter(({ item, observation }) => item.expected.shouldAlert && observation.alerted);
  const falseAlerts = joined.filter(({ item, observation }) => !item.expected.shouldAlert && observation.alerted);
  const abstentions = joined.filter(({ item }) => !item.expected.shouldAnswer);
  const correctAbstentions = abstentions.filter(({ observation }) => observation.abstained);
  const outages = joined.filter(({ item }) => item.category === 'outage');
  const recoveredOutages = outages.filter(({ observation }) => observation.abstained || observation.answer);
  const latencies = joined.map(({ observation }) => observation.latencyMs);

  return {
    corpusVersion: corpus.version,
    scenarioCount: joined.length,
    citationPrecision: ratio(citations.filter(item => item.supportsClaim).length, citations.length),
    claimCoverage: ratio(claims.filter(item => item.supported).length, claims.length),
    unsupportedClaimRate: ratio(claims.filter(item => !item.supported).length, claims.length),
    contradictionPrecision: ratio(trueAlerts.length, actualAlerts.length),
    contradictionRecall: ratio(trueAlerts.length, expectedAlerts.length),
    falseAlertRate: ratio(falseAlerts.length, joined.filter(({ item }) => !item.expected.shouldAlert).length),
    correctAbstentionRate: ratio(correctAbstentions.length, abstentions.length),
    outageRecoveryRate: ratio(recoveredOutages.length, outages.length),
    latencyP50Ms: percentile(latencies, 0.5),
    latencyP95Ms: percentile(latencies, 0.95),
  };
}

const corpusPath = resolve(process.cwd(), 'tests/evaluation/corpus.v1.json');
const observationPath = process.argv[2];
const corpus = JSON.parse(readFileSync(corpusPath, 'utf8')) as Corpus;
const errors = validateCorpus(corpus);
if (errors.length) throw new Error(`Evaluation corpus is invalid:\n${errors.join('\n')}`);

if (!observationPath) {
  console.log(`Validated ${corpus.scenarios.length} scenarios across ${new Set(corpus.scenarios.map(item => item.category)).size} categories.`);
  process.exit(0);
}

const observations = JSON.parse(readFileSync(resolve(process.cwd(), observationPath), 'utf8')) as EvaluationObservation[];
const metrics = score(corpus, observations);
const reportDir = resolve(process.cwd(), 'reports/evaluation');
mkdirSync(reportDir, { recursive: true });
const result = { ...metrics, generatedAt: new Date().toISOString(), methodology: 'labeled-corpus-v1', limitations: ['Results describe this fixed corpus and configured sandbox only.', 'Claim support labels require reviewer verification before publication.', 'These results are not a participant study or production SLA.'] };
writeFileSync(resolve(reportDir, 'latest.json'), `${JSON.stringify(result, null, 2)}\n`);
writeFileSync(resolve(reportDir, 'latest.md'), `# Sarvenix Evaluation\n\nCorpus: ${metrics.corpusVersion}\n\nScenarios measured: ${metrics.scenarioCount}\n\n- Citation precision: ${metrics.citationPrecision}\n- Claim coverage: ${metrics.claimCoverage}\n- Unsupported claim rate: ${metrics.unsupportedClaimRate}\n- Contradiction precision: ${metrics.contradictionPrecision}\n- Contradiction recall: ${metrics.contradictionRecall}\n- False alert rate: ${metrics.falseAlertRate}\n- Correct abstention: ${metrics.correctAbstentionRate}\n- Outage recovery: ${metrics.outageRecoveryRate}\n- Latency p50/p95: ${metrics.latencyP50Ms}ms / ${metrics.latencyP95Ms}ms\n\n## Limitations\n\n- Results describe this fixed corpus and configured sandbox only.\n- Claim support labels require reviewer verification before publication.\n- These results are not a participant study or production SLA.\n`);
console.log(JSON.stringify(metrics, null, 2));
