import { classifyCounterfactual } from '../../apps/slack-app/src/agent/counterfactual-preview';
import { evaluateAlertPolicy } from '../../apps/slack-app/src/agent/alert-policy';

const impact = {
  decisionId: 'proposal-1',
  generatedAt: new Date(),
  partial: false,
  items: [
    { id: 'PR-1', type: 'github_pr' as const, title: 'Open implementation', depth: 1, confidence: 0.9, freshness: 'current' as const, path: ['proposal-1', 'PR-1'], reason: 'Direct reference' },
    { id: 'JIRA-2', type: 'jira_ticket' as const, title: 'Downstream rollout', depth: 2, confidence: 0.7, freshness: 'current' as const, path: ['proposal-1', 'PR-1', 'JIRA-2'], reason: 'Inherited dependency' },
    { id: 'unsupported', type: 'decision' as const, title: 'Unsupported', depth: 1, confidence: 0, freshness: 'unknown' as const, path: [], reason: 'No path' },
  ],
};

describe('innovation safeguards', () => {
  test('counterfactuals include only path-supported consequences', () => {
    const preview = classifyCounterfactual('proposal-1', impact);
    expect(preview.readOnly).toBe(true);
    expect(preview.directEffects.map(item => item.id)).toEqual(['PR-1']);
    expect(preview.inheritedEffects.map(item => item.id)).toEqual(['JIRA-2']);
    expect(preview.recommendedReviewOrder[0]).toBe('PR-1');
  });

  test('explicit rejection suppresses repeated alerts', () => {
    const first = evaluateAlertPolicy({ semanticSimilarity: 0.95, contradictionConfidence: 0.95, evidenceFreshness: 1, identicalAlertCount: 0 });
    const repeated = evaluateAlertPolicy({ semanticSimilarity: 0.95, contradictionConfidence: 0.95, evidenceFreshness: 1, identicalAlertCount: 3, priorDisposition: 'rejected', lastAlertedAt: new Date() });
    expect(first.shouldAlert).toBe(true);
    expect(repeated.shouldAlert).toBe(false);
    expect(repeated.novelty).toBe(0);
  });
});
