import { isAllowedToAlert } from '../../apps/slack-app/src/modes/serve-mode/rate-limiter';
import { isChannelMuted, getChannelAlertCount } from '@sarvenix/knowledge-graph';

jest.mock('@sarvenix/knowledge-graph');

describe('E2E - Mute Command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should prevent alerts if the channel is muted', async () => {
    (isChannelMuted as jest.Mock).mockResolvedValue(true);
    (getChannelAlertCount as jest.Mock).mockResolvedValue(0);

    const allowed = await isAllowedToAlert('C_MUTED');
    expect(allowed).toBe(false);
    expect(isChannelMuted).toHaveBeenCalledWith('C_MUTED');
  });

  it('should prevent alerts if daily rate limit is reached', async () => {
    (isChannelMuted as jest.Mock).mockResolvedValue(false);
    (getChannelAlertCount as jest.Mock).mockResolvedValue(5); // assuming limit is 5

    const allowed = await isAllowedToAlert('C_LIMITED');
    expect(allowed).toBe(false);
    expect(getChannelAlertCount).toHaveBeenCalledWith('C_LIMITED');
  });

  it('should allow alerts if not muted and under rate limit', async () => {
    (isChannelMuted as jest.Mock).mockResolvedValue(false);
    (getChannelAlertCount as jest.Mock).mockResolvedValue(2);

    const allowed = await isAllowedToAlert('C_OK');
    expect(allowed).toBe(true);
  });
});

