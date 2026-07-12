import { processServeMode } from '../../apps/slack-app/src/modes/serve-mode';
import { extractDecisionEntity } from '../../apps/slack-app/src/ingestion/entity-extraction';
import { getEmbedding } from '../../apps/slack-app/src/lib/gemini-client';
import { detectContradiction } from '../../apps/slack-app/src/modes/serve-mode/contradiction-detector';
import { isAllowedToAlert } from '../../apps/slack-app/src/modes/serve-mode/rate-limiter';
import { verifyContradiction } from '../../apps/slack-app/src/modes/serve-mode/adversarial-verifier';

jest.mock('../../apps/slack-app/src/ingestion/entity-extraction');
jest.mock('../../apps/slack-app/src/lib/gemini-client');
jest.mock('../../apps/slack-app/src/modes/serve-mode/contradiction-detector');
jest.mock('../../apps/slack-app/src/modes/serve-mode/rate-limiter');
jest.mock('../../apps/slack-app/src/modes/serve-mode/adversarial-verifier');

describe('E2E - Serve Mode False Positive Prevention', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not trigger a false alert for an intentional revisit', async () => {
    // Arrange mocks
    (extractDecisionEntity as jest.Mock).mockResolvedValue({
      isDecision: true,
      summary: 'Drop legacy DB migration',
      artifactRefs: []
    });
    (getEmbedding as jest.Mock).mockResolvedValue(new Array(3072).fill(0.1));
    (detectContradiction as jest.Mock).mockResolvedValue({
      similarDecision: {
        id: 'dec-1',
        summary: 'Approve legacy DB migration to v2',
        status: 'active',
        confidence: 'high',
        extractedAt: new Date()
      },
      ownerName: 'Sarah Chen',
      ownerSlackId: 'U_SARAH',
      citationUrl: 'https://slack.com/archives/C1/p1'
    });
    (isAllowedToAlert as jest.Mock).mockResolvedValue(true);
    (verifyContradiction as jest.Mock).mockResolvedValue({
      approved: false,
      reason: 'This is an intentional revisit of database connection pooling issues'
    });

    // Act
    const result = await processServeMode('We will drop the legacy DB migration', 'C_PLATFORM');

    // Assert
    expect(extractDecisionEntity).toHaveBeenCalled();
    expect(detectContradiction).toHaveBeenCalled();
    expect(isAllowedToAlert).toHaveBeenCalledWith('C_PLATFORM');
    expect(verifyContradiction).toHaveBeenCalled();
    expect(result.isApproved).toBe(false);
    expect(result.alertBlocks).toBeNull();
    expect(result.criticReasoning).toBe('Alert rejected by adversarial verifier. Reason: This is an intentional revisit of database connection pooling issues');
  });
});

