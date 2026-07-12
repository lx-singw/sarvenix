import { ConfidenceLevel } from '@sarvenix/shared-types';

export interface ScoreInput {
  sourcesCount: number;
  agreementScore: number; // 0 to 1
}

export function computeConfidence(input: ScoreInput): ConfidenceLevel {
  const { sourcesCount, agreementScore } = input;
  if (sourcesCount >= 3 && agreementScore >= 0.8) {
    return 'high';
  } else if (sourcesCount >= 2 && agreementScore >= 0.5) {
    return 'moderate';
  }
  return 'low';
}
