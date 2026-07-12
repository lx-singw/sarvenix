import { isChannelMuted, getChannelAlertCount, incrementChannelAlertCount } from '@sarvenix/knowledge-graph';
import { config } from '../../config';

export async function isAllowedToAlert(slackChannelId: string): Promise<boolean> {
  try {
    // 1. Check if channel is muted
    const muted = await isChannelMuted(slackChannelId);
    if (muted) {
      console.log(`Channel ${slackChannelId} is muted. Muting proactive alerts.`);
      return false;
    }

    // 2. Check daily rate limits
    const limit = config.serveMode.rateLimitPerChannelPerDay;
    const currentCount = await getChannelAlertCount(slackChannelId);
    if (currentCount >= limit) {
      console.log(`Channel ${slackChannelId} reached daily alert limit (${currentCount}/${limit}).`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking alert permission in rate limiter:', error);
    return false;
  }
}

export async function recordAlertSent(slackChannelId: string): Promise<void> {
  try {
    await incrementChannelAlertCount(slackChannelId);
  } catch (error) {
    console.error('Failed to increment channel alert count:', error);
  }
}
