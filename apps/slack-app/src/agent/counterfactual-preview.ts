import type { ImpactItem, ImpactRadius } from '@sarvenix/shared-types';
import { calculateImpactRadius } from '@sarvenix/knowledge-graph';

export interface CounterfactualPreview {
  proposalDecisionId: string;
  generatedAt: Date;
  readOnly: true;
  directEffects: ImpactItem[];
  inheritedEffects: ImpactItem[];
  unknownEffects: string[];
  assumptions: string[];
  recommendedReviewOrder: string[];
}

export function classifyCounterfactual(
  proposalDecisionId: string,
  impact: ImpactRadius
): CounterfactualPreview {
  const supported = impact.items.filter(item => item.path.length > 1 && item.confidence > 0);
  const directEffects = supported.filter(item => item.depth === 1);
  const inheritedEffects = supported.filter(item => item.depth > 1);
  const unknownEffects = impact.partial
    ? ['The traversal reached its safety limit; additional downstream effects may exist.']
    : [];
  const assumptions = [
    'The proposal is accepted without changing its stated scope.',
    'Only consequences connected by current graph evidence are included.',
    'This preview does not predict delivery dates, business outcomes, or human choices.',
  ];
  const reviewPriority = (item: ImpactItem): number => {
    const activeWork = item.type === 'github_pr' || item.type === 'jira_ticket' ? 2 : 0;
    const freshness = item.freshness === 'current' ? 1 : 0;
    return activeWork + freshness + item.confidence - item.depth * 0.1;
  };
  return {
    proposalDecisionId,
    generatedAt: new Date(),
    readOnly: true,
    directEffects,
    inheritedEffects,
    unknownEffects,
    assumptions,
    recommendedReviewOrder: [...supported]
      .sort((a, b) => reviewPriority(b) - reviewPriority(a))
      .map(item => item.id),
  };
}

export async function previewProposalImpact(proposalDecisionId: string): Promise<CounterfactualPreview> {
  const impact = await calculateImpactRadius(proposalDecisionId);
  return classifyCounterfactual(proposalDecisionId, impact);
}
