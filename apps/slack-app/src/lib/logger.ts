import { WebClient } from '@slack/web-api';
import { config } from '../config';

const slackClient = config.slack.botToken ? new WebClient(config.slack.botToken) : null;
const adminChannel = process.env.SLACK_ADMIN_CHANNEL || null;

export class Logger {
  public static debug(message: string, meta?: any) {
    if (process.env.LOG_LEVEL === 'debug' || config.slack.botToken === '') {
      console.log(`[DEBUG] [${new Date().toISOString()}] ${message}`, meta ? JSON.stringify(meta) : '');
    }
  }

  public static info(message: string, meta?: any) {
    console.log(`[INFO] [${new Date().toISOString()}] ${message}`, meta ? JSON.stringify(meta) : '');
  }

  public static warn(message: string, meta?: any) {
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, meta ? JSON.stringify(meta) : '');
  }

  public static async error(message: string, error?: any) {
    console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, error || '');

    // Send alert to admin channel if configured and not in local test execution
    if (slackClient && adminChannel && process.env.NODE_ENV !== 'test') {
      try {
        const blocks = [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `🚨 *Sarvenix Critical Alert*\n*Details:* ${message}`,
            },
          },
        ];

        if (error) {
          const detailText = error.stack || error.message || JSON.stringify(error);
          blocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `\`\`\`${detailText.substring(0, 1900)}\`\`\``,
            },
          });
        }

        await slackClient.chat.postMessage({
          channel: adminChannel,
          text: `🚨 Critical Error: ${message}`,
          blocks: blocks,
        });
      } catch (alertError) {
        console.error('[Logger] Failed to send critical admin alert to Slack:', alertError);
      }
    }
  }
}
