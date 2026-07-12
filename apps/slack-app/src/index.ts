import { App } from '@slack/bolt';
import { config } from './config';

const app = new App({
  token: config.slack.botToken,
  signingSecret: config.slack.signingSecret,
  socketMode: true,
  appToken: config.slack.appToken,
});

// Basic message listener placeholder
app.message(async ({ message, say }) => {
  console.log('Received message:', message);
});

// Slash commands placeholders
app.command('/sarvenix-catchup', async ({ command, ack, respond }) => {
  await ack();
  await respond('Running catchup brief...');
});

app.command('/sarvenix', async ({ command, ack, respond }) => {
  await ack();
  const text = command.text.trim();
  if (text === 'mute') {
    await respond('Channel muted.');
  } else {
    await respond('Unknown subcommand.');
  }
});

async function main() {
  await app.start();
  console.log('⚡️ Sarvenix Slack App is running in Socket Mode!');
}

main().catch((error) => {
  console.error('Fatal error starting Slack App:', error);
  process.exit(1);
});
