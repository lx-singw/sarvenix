import {
  formatAskResponse,
  formatServeModeAlert,
} from '../../apps/slack-app/src/delivery/block-kit-formatters';

describe('E2E - Slack Block Kit contracts', () => {
  it('caps citation actions at Slack limits and preserves canonical deep links', () => {
    const citations = Array.from({ length: 12 }, (_, index) => ({
      index: index + 1,
      title: `Source ${index + 1}`,
      url: `https://example.com/source/${index + 1}`,
      sourceType: 'doc' as const,
    }));

    const blocks = formatAskResponse({
      answer: 'The migration was approved after the reliability review.',
      confidence: 'high',
      confidenceReasoning: 'Multiple independent sources agree.',
      citations,
    });
    const actionBlocks = blocks.filter((block: any) => block.type === 'actions');
    const sourceButtons = actionBlocks
      .flatMap((block: any) => block.elements)
      .filter((element: any) => element.url);

    expect(sourceButtons).toHaveLength(10);
    expect(sourceButtons[0].url).toBe('https://example.com/source/1');
    expect(actionBlocks.every((block: any) => block.elements.length <= 5)).toBe(true);
  });

  it('makes conflict resolution explicit, confirmed, and traceable', () => {
    const blocks = formatServeModeAlert({
      newDecisionSummary: 'Move all jobs to the new scheduler.',
      pastDecisionSummary: 'Keep regulated jobs on the existing scheduler.',
      pastDecisionOwner: 'Avery',
      pastDecisionOwnerId: 'U_AVERY',
      citationUrl: 'https://example.com/prior-decision',
      priorDecisionId: 'decision-42',
      similarityScore: 0.91,
    });
    const actionBlock = blocks.find((block: any) => block.block_id === 'contradiction_actions') as any;
    const elements = actionBlock?.elements as any[];
    const resolve = elements.find((element: any) => element.action_id === 'resolve_decision_conflict') as any;

    expect(resolve?.value).toBe('decision-42');
    expect(resolve?.confirm).toBeDefined();
    expect(elements).toHaveLength(5);
    expect(JSON.stringify(blocks)).toContain('91% semantic match');
  });
});
