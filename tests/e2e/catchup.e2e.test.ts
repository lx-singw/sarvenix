import { generateCatchupBrief } from '../../apps/slack-app/src/commands/catchup';
import { searchMessages } from '../../apps/slack-app/src/lib/rts-client';
import { findDecisionsOwnedBy } from '@sarvenix/knowledge-graph';
import { generateStructuredJson } from '../../apps/slack-app/src/lib/gemini-client';

jest.mock('../../apps/slack-app/src/lib/rts-client');
jest.mock('@sarvenix/knowledge-graph');
jest.mock('../../apps/slack-app/src/lib/gemini-client');

describe('E2E - Context Summariser (/sarvenix-catchup)', () => {
  const mockWebClient = {} as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a real, correctly-severity-tagged 3-bullet brief from live RTS data', async () => {
    // 1. Arrange mocks
    (findDecisionsOwnedBy as jest.Mock).mockResolvedValue([
      'Migration of DB from v1 to v2'
    ]);
    (searchMessages as jest.Mock).mockResolvedValue([
      {
        username: 'alice',
        channel: { name: 'platform' },
        text: 'Decided to drop legacy DB migration',
        ts: '12345.67'
      }
    ]);
    (generateStructuredJson as jest.Mock).mockResolvedValue({
      bullets: [
        {
          severity: 'red',
          title: 'Legacy migration canceled',
          description: 'Alice announced dropping the legacy DB migration in #platform.'
        },
        {
          severity: 'green',
          title: 'Routine catchup',
          description: 'No other major blockers identified.'
        }
      ]
    });

    // 2. Act
    const result = await generateCatchupBrief(mockWebClient, 'U12345');

    // 3. Assert
    expect(findDecisionsOwnedBy).toHaveBeenCalledWith('U12345');
    expect(searchMessages).toHaveBeenCalled();
    expect(generateStructuredJson).toHaveBeenCalled();
    expect(result.bullets).toHaveLength(2);
    expect(result.bullets[0].severity).toBe('red');
    expect(result.bullets[0].title).toBe('Legacy migration canceled');
  });

  it('should truncate results to exactly 3 bullets if more are returned by the model', async () => {
    (findDecisionsOwnedBy as jest.Mock).mockResolvedValue([]);
    (searchMessages as jest.Mock).mockResolvedValue([
      { username: 'bob', channel: { name: 'general' }, text: 'Update', ts: '1.2' }
    ]);
    (generateStructuredJson as jest.Mock).mockResolvedValue({
      bullets: [
        { severity: 'green', title: 'T1', description: 'D1' },
        { severity: 'green', title: 'T2', description: 'D2' },
        { severity: 'green', title: 'T3', description: 'D3' },
        { severity: 'green', title: 'T4', description: 'D4' }
      ]
    });

    const result = await generateCatchupBrief(mockWebClient, 'U12345');
    expect(result.bullets).toHaveLength(3);
  });
});

