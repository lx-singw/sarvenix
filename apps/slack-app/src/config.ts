import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from workspace root if it exists
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export const config = {
  slack: {
    botToken: process.env.SLACK_BOT_TOKEN || '',
    signingSecret: process.env.SLACK_SIGNING_SECRET || '',
    appToken: process.env.SLACK_APP_TOKEN || '',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    modelSynthesis: process.env.CLAUDE_MODEL_SYNTHESIS || 'claude-sonnet-4-6',
    modelCritic: process.env.CLAUDE_MODEL_CRITIC || 'claude-sonnet-4-6',
  },
  serveMode: {
    rateLimitPerChannelPerDay: parseInt(process.env.SERVE_MODE_RATE_LIMIT_PER_CHANNEL_PER_DAY || '5', 10),
    enabled: process.env.SERVE_MODE_ENABLED !== 'false',
    adversarialVerificationEnabled: process.env.ADVERSARIAL_VERIFICATION_ENABLED !== 'false',
  },
  general: {
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    demoMode: process.env.DEMO_MODE === 'true',
  }
};
