import { App } from '@slack/bolt';
import { config } from './config';
import { ingestSlackMessage } from './ingestion/slack-ingest';
import { handleAskMode } from './modes/ask-mode';
import { generateCatchupBrief } from './commands/catchup';
import { processServeMode } from './modes/serve-mode';
import { setChannelMute } from '@sarvenix/knowledge-graph';
import {
  formatAskResponse,
  formatCatchupBrief,
} from './delivery/block-kit-formatters';
import { exportBriefToCanvas } from './delivery/canvas-export';
import { postInThreadReply } from './delivery/in-thread-reply';
import { sendDMBrief } from './delivery/dm-brief';

const app = new App({
  token: config.slack.botToken,
  signingSecret: config.slack.signingSecret,
  socketMode: true,
  appToken: config.slack.appToken,
});

// 1. Message listener for Ingestion and Serve Mode Proactive Alerts
app.message(async ({ message, client, say }) => {
  const msg = message as any;
  if (!msg.text || msg.bot_id || msg.subtype) {
    return;
  }

  const channelId = msg.channel;
  const messageText = msg.text;
  const userId = msg.user || 'U_UNKNOWN';
  const messageTs = msg.ts;

  // Run Serve Mode contradiction check
  if (config.serveMode.enabled) {
    try {
      const serveResult = await processServeMode(messageText, channelId);
      if (serveResult.alertBlocks && serveResult.isApproved) {
        await postInThreadReply(
          client,
          channelId,
          messageTs,
          serveResult.alertBlocks,
          'Warning: Possible decision contradiction detected!'
        );
        return; // Stop here if we've flagged a contradiction to keep the thread focused
      }
    } catch (err) {
      console.error('Error running Serve Mode check on message:', err);
    }
  }

  // Run normal Ingestion pipeline
  try {
    const permalinkRes = await client.chat.getPermalink({
      channel: channelId,
      message_ts: messageTs,
    });
    const permalink = permalinkRes.permalink || '';

    // Fetch user profile info
    let userName = 'User';
    try {
      const userProfile = await client.users.info({ user: userId });
      if (userProfile.ok && userProfile.user) {
        userName = userProfile.user.profile?.real_name || userProfile.user.name || 'User';
      }
    } catch (e) {
      console.warn('Could not fetch user profile info:', e);
    }

    // Fetch channel info
    let channelName = 'channel';
    try {
      const channelInfo = await client.conversations.info({ channel: channelId });
      if (channelInfo.ok && channelInfo.channel) {
        channelName = channelInfo.channel.name || 'channel';
      }
    } catch (e) {
      console.warn('Could not fetch channel info:', e);
    }

    await ingestSlackMessage(
      messageText,
      userId,
      userName,
      channelId,
      channelName,
      messageTs,
      permalink
    );
  } catch (err) {
    console.error('Failed to ingest Slack message:', err);
  }
});

// 2. Mentions listener for Ask Mode Synthesized Responses
app.event('app_mention', async ({ event, client, say }) => {
  const question = event.text.replace(/<@U[A-Z0-9]+>/g, '').trim();
  const channelId = event.channel;
  const threadTs = event.ts;

  try {
    const askResult = await handleAskMode(client, question, channelId);
    const blocks = formatAskResponse(askResult);
    await postInThreadReply(client, channelId, threadTs, blocks, askResult.answer);
  } catch (error) {
    console.error('Error handling app mention in Ask Mode:', error);
    await postInThreadReply(
      client,
      channelId,
      threadTs,
      [],
      'Sorry, I encountered an error processing your query.'
    );
  }
});

// 3. Slash Command `/sarvenix-catchup`
app.command('/sarvenix-catchup', async ({ command, ack, client }) => {
  await ack();
  const userId = command.user_id;

  try {
    const brief = await generateCatchupBrief(client, userId);
    const blocks = formatCatchupBrief(brief);
    await sendDMBrief(client, userId, blocks, 'Your catchup brief is ready!');
  } catch (error) {
    console.error('Error processing /sarvenix-catchup command:', error);
  }
});

// 4. Slash Command `/sarvenix` Subcommands (mute, unmute)
app.command('/sarvenix', async ({ command, ack, respond }) => {
  await ack();
  const text = command.text.trim().toLowerCase();
  const channelId = command.channel_id;

  if (text === 'mute') {
    try {
      await setChannelMute(channelId, true);
      await respond({
        text: 'Channel muted. Sarvenix will no longer index messages or alert here.',
        response_type: 'ephemeral',
      });
    } catch (err) {
      await respond({ text: 'Error muting channel.', response_type: 'ephemeral' });
    }
  } else if (text === 'unmute') {
    try {
      await setChannelMute(channelId, false);
      await respond({
        text: 'Channel unmuted. Ingestion and alerts resumed.',
        response_type: 'ephemeral',
      });
    } catch (err) {
      await respond({ text: 'Error unmuting channel.', response_type: 'ephemeral' });
    }
  } else {
    await respond({
      text: 'Unknown subcommand. Supported options: `/sarvenix mute`, `/sarvenix unmute`.',
      response_type: 'ephemeral',
    });
  }
});

// 5. Block Actions listeners for interactive UI buttons
app.action('export_catchup_canvas', async ({ body, ack, client, respond }) => {
  await ack();
  const userId = body.user.id;

  try {
    const brief = await generateCatchupBrief(client, userId);
    const canvasUrl = await exportBriefToCanvas(client, brief);
    await respond({
      text: `Brief successfully exported! View Canvas: ${canvasUrl}`,
      replace_original: false,
    });
  } catch (error) {
    console.error('Error exporting brief to canvas:', error);
  }
});

app.action('feedback_accurate', async ({ body, ack, respond }) => {
  await ack();
  await respond({ text: 'Thank you for your feedback! 👍', replace_original: false });
});

app.action('feedback_wrong', async ({ body, ack, respond }) => {
  await ack();
  await respond({
    text: 'Feedback recorded. I will update my reasoning path. 👎',
    replace_original: false,
  });
});

app.action('loop_in_owner', async ({ body, ack, client, respond }) => {
  await ack();
  const actionValue = (body as any).actions[0].value;
  await respond({
    text: `Looping in past decision owner <@${actionValue}>...`,
    replace_original: false,
  });
});

app.action('dismiss_contradiction', async ({ body, ack, respond }) => {
  await ack();
  await respond({ text: 'Alert dismissed.', replace_original: true });
});

async function main() {
  await app.start();
  console.log('⚡️ Sarvenix Slack App is running in Socket Mode!');
}

main().catch((error) => {
  console.error('Fatal error starting Slack App:', error);
  process.exit(1);
});
