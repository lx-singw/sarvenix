import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from various relative locations
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export const config = {
  slack: {
    botToken: process.env.SLACK_BOT_TOKEN || '',
    signingSecret: process.env.SLACK_SIGNING_SECRET || '',
    appToken: process.env.SLACK_APP_TOKEN || '',
    rtsApiKey: process.env.RTS_API_KEY || '',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    modelSynthesis: process.env.GEMINI_MODEL_SYNTHESIS || 'gemini-3.5-flash',
    modelCritic: process.env.GEMINI_MODEL_CRITIC || 'gemini-3.5-flash',
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
  },
  features: {
    durableThreads: process.env.FEATURE_DURABLE_THREADS !== 'false',
    impactRadius: process.env.FEATURE_IMPACT_RADIUS !== 'false',
    counterfactualPreview: process.env.FEATURE_COUNTERFACTUAL_PREVIEW !== 'false',
    perUserOAuth: process.env.FEATURE_PER_USER_OAUTH === 'true',
  },
  sandbox: {
    enabled: process.env.SARVENIX_SANDBOX_MODE === 'true',
    workspaceId: process.env.SANDBOX_SLACK_WORKSPACE_ID || '',
    githubRepository: process.env.SANDBOX_GITHUB_REPOSITORY || '',
    jiraProjectKey: process.env.SANDBOX_JIRA_PROJECT_KEY || '',
  },
};

if (config.general.nodeEnv === 'production' && config.general.demoMode) {
  throw new Error('DEMO_MODE cannot be enabled in production. Use dedicated sandbox mode instead.');
}

if (config.sandbox.enabled && !config.sandbox.workspaceId) {
  throw new Error('SANDBOX_SLACK_WORKSPACE_ID is required when sandbox mode is enabled.');
}
