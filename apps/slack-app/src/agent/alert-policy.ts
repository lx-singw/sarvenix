export interface AlertSignal {
  semanticSimilarity: number;
  contradictionConfidence: number;
  evidenceFreshness: number;
  priorDisposition?: 'accepted' | 'rejected' | 'snoozed';
  identicalAlertCount: number;
  lastAlertedAt?: Date;
}

export interface AlertPolicyDecision {
  shouldAlert: boolean;
  score: number;
  novelty: number;
  reason: string;
}

export function evaluateAlertPolicy(signal: AlertSignal, threshold = 0.68): AlertPolicyDecision {
  const repetitionPenalty = Math.min(0.75, signal.identicalAlertCount * 0.2);
  const dispositionPenalty = signal.priorDisposition === 'rejected' ? 0.45 : signal.priorDisposition === 'snoozed' ? 0.2 : 0;
  const recencyPenalty = signal.lastAlertedAt && Date.now() - signal.lastAlertedAt.getTime() < 86_400_000 ? 0.2 : 0;
  const novelty = Math.max(0, 1 - repetitionPenalty - dispositionPenalty - recencyPenalty);
  const evidenceScore = signal.semanticSimilarity * 0.35 + signal.contradictionConfidence * 0.45 + signal.evidenceFreshness * 0.2;
  const score = Number((evidenceScore * novelty).toFixed(4));
  const shouldAlert = score >= threshold;
  const reason = shouldAlert
    ? `Alerted because verified contradiction evidence scored ${score} with ${novelty.toFixed(2)} novelty.`
    : `Suppressed because the grounded score ${score} was below ${threshold}; repetition or prior feedback reduced novelty to ${novelty.toFixed(2)}.`;
  return { shouldAlert, score, novelty, reason };
}
