process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { App } from '@slack/bolt';
import { config } from './config';
import { ingestSlackMessage } from './ingestion/slack-ingest';
import { handleAskMode } from './modes/ask-mode';
import { generateCatchupBrief } from './commands/catchup';
import { processServeMode } from './modes/serve-mode';
import { setChannelMute, verifyDatabaseConnection, deleteDecisionByMessageTs } from '@sarvenix/knowledge-graph';
import {
  formatAskResponse,
  formatCatchupBrief,
} from './delivery/block-kit-formatters';
import { exportBriefToCanvas } from './delivery/canvas-export';
import { postInThreadReply } from './delivery/in-thread-reply';
import { sendDMBrief } from './delivery/dm-brief';
import { Logger } from './lib/logger';
import { SarvenixError, DatabaseQueryError, GeminiApiError, SlackClientError } from '@sarvenix/shared-types';

const app = new App({
  token: config.slack.botToken,
  signingSecret: config.slack.signingSecret,
  socketMode: true,
  appToken: config.slack.appToken,
});

// Configure global Bolt framework error handler
app.error(async (error) => {
  await Logger.error('Unhandled Bolt framework-level error', error);
});

// 1. Message listener for Ingestion and Serve Mode Proactive Alerts
app.message(async ({ message, client, say }) => {
  const msg = message as any;
  Logger.debug(`app.message received: Subtype = ${msg.subtype || 'none'}, Channel = ${msg.channel || 'unknown'}`);

  // Handle Slack message deletion sync
  if (msg.subtype === 'message_deleted') {
    const channelId = msg.channel;
    const messageTs = msg.deleted_ts;
    Logger.info(`Handling message deletion: Channel = ${channelId}, ts = ${messageTs}`);
    try {
      await deleteDecisionByMessageTs(channelId, messageTs);
      Logger.info(`Decision node matching ts ${messageTs} deleted successfully.`);
    } catch (err: any) {
      await Logger.error(`Failed to handle message deletion for ts ${messageTs}`, err);
    }
    return;
  }

  // Handle Slack message edit sync
  if (msg.subtype === 'message_changed') {
    const channelId = msg.channel;
    const editMsg = msg.message;
    if (!editMsg || editMsg.bot_id || !editMsg.text) {
      return;
    }
    const messageTs = editMsg.ts;
    const messageText = editMsg.text;
    const userId = editMsg.user || 'U_UNKNOWN';

    Logger.info(`Handling message edit: Channel = ${channelId}, ts = ${messageTs}`);
    try {
      // 1. Delete the old decision node if it exists
      await deleteDecisionByMessageTs(channelId, messageTs);

      // 2. Extract and ingest the new edited decision
      const permalinkRes = await client.chat.getPermalink({
        channel: channelId,
        message_ts: messageTs,
      });
      const permalink = permalinkRes.permalink || '';

      let userName = 'User';
      let userTitle = '';
      let userTeam = '';
      let userTz = '';
      try {
        const userProfile = await client.users.info({ user: userId });
        if (userProfile.ok && userProfile.user) {
          userName = userProfile.user.profile?.real_name || userProfile.user.name || 'User';
          userTitle = userProfile.user.profile?.title || '';
          userTz = userProfile.user.tz || '';
          userTeam = (userProfile.user.profile as any).team || '';
        }
      } catch (e) {
        Logger.warn(`Could not fetch user profile info for user: ${userId}`, e);
      }

      let channelName = 'channel';
      try {
        const channelInfo = await client.conversations.info({ channel: channelId });
        if (channelInfo.ok && channelInfo.channel) {
          channelName = channelInfo.channel.name || 'channel';
        }
      } catch (e) {
        Logger.warn(`Could not fetch channel info for channel: ${channelId}`, e);
      }

      await ingestSlackMessage(
        messageText,
        userId,
        userName,
        channelId,
        channelName,
        messageTs,
        permalink,
        userTitle,
        userTeam,
        userTz
      );
      Logger.info(`Decision node matching ts ${messageTs} updated successfully.`);
    } catch (err: any) {
      await Logger.error(`Failed to handle message edit for ts ${messageTs}`, err);
    }
    return;
  }

  // Handle standard new message ingestion
  if (!msg.text || msg.bot_id || msg.subtype) {
    return;
  }

  const channelId = msg.channel;
  const messageText = msg.text;
  const userId = msg.user || 'U_UNKNOWN';
  const messageTs = msg.ts;

  // Add 👀 reaction to indicate processing has started
  try {
    await client.reactions.add({
      name: 'eyes',
      channel: channelId,
      timestamp: messageTs,
    });
  } catch (err) {
    // Ignore if already reacted or failed
  }

  // Run Serve Mode contradiction check
  if (config.serveMode.enabled) {
    try {
      const serveResult = await processServeMode(messageText, channelId);
      if (serveResult.alertBlocks && serveResult.isApproved) {
        // Remove 👀 reaction
        try {
          await client.reactions.remove({
            name: 'eyes',
            channel: channelId,
            timestamp: messageTs,
          });
        } catch (e) {}

        // Add ⚠️ reaction to indicate contradiction warning
        try {
          await client.reactions.add({
            name: 'warning',
            channel: channelId,
            timestamp: messageTs,
          });
        } catch (e) {}

        await postInThreadReply(
          client,
          channelId,
          messageTs,
          serveResult.alertBlocks,
          'Warning: Possible decision contradiction detected!'
        );
        return; // Stop here if we've flagged a contradiction to keep the thread focused
      }
    } catch (err: any) {
      await Logger.error(`Serve Mode contradiction check failed on message ts: ${messageTs}`, err);
    }
  }

  // Run normal Ingestion pipeline (Write operation: propagates/logs error)
  try {
    const permalinkRes = await client.chat.getPermalink({
      channel: channelId,
      message_ts: messageTs,
    });
    const permalink = permalinkRes.permalink || '';

    // Fetch user profile info
    let userName = 'User';
    let userTitle = '';
    let userTeam = '';
    let userTz = '';
    try {
      const userProfile = await client.users.info({ user: userId });
      if (userProfile.ok && userProfile.user) {
        userName = userProfile.user.profile?.real_name || userProfile.user.name || 'User';
        userTitle = userProfile.user.profile?.title || '';
        userTz = userProfile.user.tz || '';
        userTeam = (userProfile.user.profile as any).team || '';
      }
    } catch (e) {
      Logger.warn(`Could not fetch user profile info for user: ${userId}`, e);
    }

    // Fetch channel info
    let channelName = 'channel';
    try {
      const channelInfo = await client.conversations.info({ channel: channelId });
      if (channelInfo.ok && channelInfo.channel) {
        channelName = channelInfo.channel.name || 'channel';
      }
    } catch (e) {
      Logger.warn(`Could not fetch channel info for channel: ${channelId}`, e);
    }

    const ingestRes = await ingestSlackMessage(
      messageText,
      userId,
      userName,
      channelId,
      channelName,
      messageTs,
      permalink,
      userTitle,
      userTeam,
      userTz
    );

    // Remove 👀 reaction when analysis completes
    try {
      await client.reactions.remove({
        name: 'eyes',
        channel: channelId,
        timestamp: messageTs,
      });
    } catch (e) {}

    if (ingestRes) {
      // Add ✅ reaction to indicate decision successfully recorded in Graph
      try {
        await client.reactions.add({
          name: 'white_check_mark',
          channel: channelId,
          timestamp: messageTs,
        });
      } catch (e) {}

      // Add a bookmark in the channel linking to the decision
      try {
        await client.bookmarks.add({
          channel_id: channelId,
          title: `Decision: ${ingestRes.summary.slice(0, 40)}...`,
          type: 'link',
          link: permalink,
        });
      } catch (e) {
        Logger.warn(`Could not create bookmark for decision in channel: ${channelId}`, e);
      }
    }
  } catch (err: any) {
    await Logger.error(`Failed to ingest Slack message at ts: ${messageTs}`, err);
    // Try to remove 👀 reaction on failure
    try {
      await client.reactions.remove({
        name: 'eyes',
        channel: channelId,
        timestamp: messageTs,
      });
    } catch (e) {}
  }
});

// 2. Mentions listener for Ask Mode Synthesized Responses (Read operation: graceful degradation)
app.event('app_mention', async ({ event, client, say }) => {
  Logger.debug(`app_mention received: "${event.text}" from User ${event.user}`);
  const question = event.text.replace(/<@U[A-Z0-9]+>/g, '').trim();
  const channelId = event.channel;
  const threadTs = event.ts;

  try {
    const askResult = await handleAskMode(client, question, channelId, event.user);
    const blocks = formatAskResponse(askResult);
    await postInThreadReply(client, channelId, threadTs, blocks, askResult.answer);
  } catch (error: any) {
    let friendlyMessage = 'Sorry, I encountered an error while synthesizing the answer.';
    let reasoning = 'Failed during API synthesis pass.';

    if (error instanceof DatabaseQueryError) {
      reasoning = 'Database query failed or timed out.';
    } else if (error instanceof GeminiApiError) {
      reasoning = `Gemini API failed: ${error.message}`;
    } else if (error instanceof SlackClientError) {
      reasoning = `Slack integration error: ${error.message}`;
    }

    await Logger.error(`Ask Mode query failed for question: "${question}"`, error);

    const errorBlocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `⚠️ *${friendlyMessage}*`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `*Status:* ⚪ Low Confidence | *Reasoning:* ${reasoning}`,
          },
        ],
      },
    ];

    await postInThreadReply(
      client,
      channelId,
      threadTs,
      errorBlocks,
      friendlyMessage
    );
  }
});

// 3. Slash Command `/sarvenix-catchup` (Read/Brief operation: graceful user-facing error response)
app.command('/sarvenix-catchup', async ({ command, ack, client }) => {
  await ack();
  const userId = command.user_id;

  try {
    const brief = await generateCatchupBrief(client, userId);
    const blocks = formatCatchupBrief(brief);
    await sendDMBrief(client, userId, blocks, 'Your catchup brief is ready!');
  } catch (error: any) {
    await Logger.error(`Command /sarvenix-catchup failed for user: ${userId}`, error);
    try {
      await sendDMBrief(
        client,
        userId,
        [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `⚠️ *Sorry, I could not generate your catchup brief right now.*\n_Reason:_ ${error.message || 'Unknown internal error.'}`,
            },
          },
        ],
        'Catchup brief generation failed.'
      );
    } catch (dmErr) {
      Logger.warn(`Failed to deliver DM brief error notification to user: ${userId}`, dmErr);
    }
  }
});

// 4. Slash Command `/sarvenix` Subcommands (Write operation: immediate notification of failure)
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
    } catch (err: any) {
      await Logger.error(`Mute command failed on channel: ${channelId}`, err);
      await respond({
        text: `⚠️ Error muting channel: ${err.message || 'Unknown database issue.'}`,
        response_type: 'ephemeral',
      });
    }
  } else if (text === 'unmute') {
    try {
      await setChannelMute(channelId, false);
      await respond({
        text: 'Channel unmuted. Ingestion and alerts resumed.',
        response_type: 'ephemeral',
      });
    } catch (err: any) {
      await Logger.error(`Unmute command failed on channel: ${channelId}`, err);
      await respond({
        text: `⚠️ Error unmuting channel: ${err.message || 'Unknown database issue.'}`,
        response_type: 'ephemeral',
      });
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
    const result = await exportBriefToCanvas(client, brief, userId);

    if (result.type === 'canvas') {
      await respond({
        text: `Brief successfully exported! View Canvas: ${result.url}`,
        replace_original: false,
      });
    } else {
      await respond({
        text: `✅ Brief successfully exported and pinned to your DM! (Note: Real Canvas export requires the canvases:write scope).`,
        replace_original: false,
      });
    }
  } catch (error: any) {
    await Logger.error(`Catchup Canvas export action failed for user: ${userId}`, error);
    await respond({
      text: `⚠️ Failed to export brief to Canvas: ${error.message || 'unknown error'}`,
      replace_original: false,
    });
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
  Logger.info('Verifying database connectivity...');
  await verifyDatabaseConnection();
  Logger.info('Database connection verified successfully.');

  await app.start();
  Logger.info('Sarvenix Slack App is running in Socket Mode!');
}

main().catch((error) => {
  Logger.error('Fatal error starting Slack App', error);
  process.exit(1);
});
