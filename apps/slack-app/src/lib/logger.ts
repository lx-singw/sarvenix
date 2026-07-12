import { WebClient } from '@slack/web-api';
import { config } from '../config';

const slackClient = config.slack.botToken ? new WebClient(config.slack.botToken) : null;
const adminChannel = process.env.SLACK_ADMIN_CHANNEL || null;
const SECRET_PATTERN = /(xox[baprs]-[a-zA-Z0-9-]+|AIza[a-zA-Z0-9_-]+|gh[pousr]_[a-zA-Z0-9_]+|Bearer\s+[a-zA-Z0-9._-]+)/g;

function redact(value: unknown): unknown {
  if (typeof value === 'string') return value.replace(SECRET_PATTERN, '[REDACTED]');
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        /(token|secret|password|apiKey|authorization)/i.test(key) ? '[REDACTED]' : redact(item),
      ])
    );
  }
  return value;
}

function errorDetails(error: unknown) {
  if (error instanceof Error) {
    return redact({ name: error.name, message: error.message, stack: error.stack });
  }
  return redact(error);
}

function write(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: unknown) {
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: 'sarvenix-slack-app',
    message: redact(message),
    ...(meta === undefined ? {} : { meta: redact(meta) }),
  });

  if (level === 'error') console.error(payload);
  else if (level === 'warn') console.warn(payload);
  else console.log(payload);
}

export class Logger {
  public static debug(message: string, meta?: unknown) {
    if (config.general.logLevel === 'debug') write('debug', message, meta);
  }

  public static info(message: string, meta?: unknown) {
    write('info', message, meta);
  }

  public static warn(message: string, meta?: unknown) {
    write('warn', message, meta);
  }

  public static async error(message: string, error?: unknown) {
    const safeError = errorDetails(error);
    write('error', message, safeError);

    if (slackClient && adminChannel && config.general.nodeEnv !== 'test') {
      try {
        const detail = error instanceof Error ? error.message : 'Inspect structured application logs for details.';
        await slackClient.chat.postMessage({
          channel: adminChannel,
          text: `Sarvenix error: ${redact(message)}`,
          blocks: [
            {
              type: 'header',
              text: { type: 'plain_text', text: 'Sarvenix operational alert', emoji: false },
            },
            {
              type: 'section',
              text: { type: 'mrkdwn', text: `*Event*\n${redact(message)}\n\n*Detail*\n${redact(detail)}` },
            },
          ],
        });
      } catch (alertError) {
        write('error', 'Failed to deliver the admin-channel alert', errorDetails(alertError));
      }
    }
  }
}
