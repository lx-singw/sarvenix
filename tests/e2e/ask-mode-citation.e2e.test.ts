import { handleAskMode } from '../../apps/slack-app/src/modes/ask-mode';
import { searchMessages } from '../../apps/slack-app/src/lib/rts-client';
import { getEmbedding } from '../../apps/slack-app/src/lib/gemini-client';
import { findSimilarDecisions, traceProvenance, findDecisionPaths } from '@sarvenix/knowledge-graph';
import { synthesizeResponse } from '../../apps/slack-app/src/modes/ask-mode/synthesis';
import { resolveExternalEvidence } from '../../apps/slack-app/src/modes/ask-mode/evidence-resolver';

jest.mock('../../apps/slack-app/src/lib/rts-client');
jest.mock('../../apps/slack-app/src/lib/gemini-client');
jest.mock('@sarvenix/knowledge-graph');
jest.mock('../../apps/slack-app/src/modes/ask-mode/synthesis');
jest.mock('../../apps/slack-app/src/modes/ask-mode/evidence-resolver');

describe('E2E - Ask Mode Citations', () => {
  const mockWebClient = {
    users: {
      conversations: jest.fn().mockResolvedValue({ channels: [{ id: 'C123' }] }),
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a cited, confidence-scored answer synthesized from live MCP sources', async () => {
    // Arrange mocks
    (searchMessages as jest.Mock).mockResolvedValue([
      {
        username: 'bob',
        channel: { name: 'general' },
        text: 'Legacy DB migration approved',
        permalink: 'https://slack.com/archives/C123/p12345',
        ts: '12345.67'
      }
    ]);
    (getEmbedding as jest.Mock).mockResolvedValue(new Array(3072).fill(0.1));
    (findSimilarDecisions as jest.Mock).mockResolvedValue([
      {
        decision: { id: 'dec-123', summary: 'Drop legacy DB migration' },
        score: 0.85
      }
    ]);
    (traceProvenance as jest.Mock).mockResolvedValue([
      { id: 'migrate-412', type: 'jira_ticket' }
    ]);
    (findDecisionPaths as jest.Mock).mockResolvedValue([]);
    (resolveExternalEvidence as jest.Mock).mockResolvedValue({
      evidence: [
        {
          sourceType: 'jira_ticket',
          externalId: 'MIGRATE-412',
          title: 'MIGRATE-412: Legacy Database Migration to v2',
          url: 'https://workspace.atlassian.net/browse/MIGRATE-412',
          context: '[Jira MIGRATE-412] Status: Closed',
        },
      ],
      unavailable: [],
    });
    (synthesizeResponse as jest.Mock).mockResolvedValue({
      answer: 'Sarah Chen recommended dropping it due to leaks.',
      confidence: 'high',
      confidenceReasoning: 'Consistent with PR #412 and Jira ticket MIGRATE-412.',
      citations: [
        {
          sourceType: 'slack',
          text: 'Approved migration',
          url: '',
          title: ''
        },
        {
          sourceType: 'jira_ticket',
          text: 'MIGRATE-412 details',
          url: '',
          title: ''
        }
      ]
    });

    // Act
    const result = await handleAskMode(mockWebClient, 'Should we drop the legacy migration?', 'C123');

    // Assert
    expect(searchMessages).toHaveBeenCalled();
    expect(findSimilarDecisions).toHaveBeenCalled();
    expect(traceProvenance).toHaveBeenCalledWith('dec-123');
    expect(synthesizeResponse).toHaveBeenCalled();

    expect(result.answer).toContain('Sarah Chen');
    expect(result.citations).toHaveLength(2);
    expect(result.citations[0].url).toBe('https://slack.com/archives/C123/p12345');
    expect(result.citations[1].url).toBe('https://workspace.atlassian.net/browse/MIGRATE-412');
  });
});

