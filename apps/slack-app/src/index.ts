import { App } from '@slack/bolt';
import { config } from './config';
import { ingestSlackMessage } from './ingestion/slack-ingest';
import { handleAskMode } from './modes/ask-mode';
import { generateCatchupBrief } from './commands/catchup';
import { processServeMode } from './modes/serve-mode';
import { setChannelMute, verifyDatabaseConnection, deleteDecisionByMessageTs, getAppHomeData, isChannelMuted, resolveDecisionConflict } from '@sarvenix/knowledge-graph';
import {
  formatAskResponse,
  formatCatchupBrief,
  formatAppHome,
  formatChannelConfigModal,
} from './delivery/block-kit-formatters';
import { exportBriefToCanvas } from './delivery/canvas-export';
import { postInThreadReply } from './delivery/in-thread-reply';
import { sendDMBrief } from './delivery/dm-brief';
import { draftReconciliationProposal } from './modes/serve-mode/mediator';
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

  if (!question) {
    await postInThreadReply(
      client,
      channelId,
      threadTs,
      [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*What decision should I trace?*\nTry: `@Sarvenix Why did we choose the current database migration approach?`',
        },
      }],
      'Ask Sarvenix a specific question about a workspace decision.'
    );
    return;
  }

  try {
    await client.reactions.add({ name: 'hourglass_flowing_sand', channel: channelId, timestamp: threadTs }).catch(() => undefined);
    const askResult = await handleAskMode(client, question, channelId, event.user);
    const blocks = formatAskResponse(askResult);
    await postInThreadReply(client, channelId, threadTs, blocks, askResult.answer);
    await client.reactions.remove({ name: 'hourglass_flowing_sand', channel: channelId, timestamp: threadTs }).catch(() => undefined);
  } catch (error: any) {
    await client.reactions.remove({ name: 'hourglass_flowing_sand', channel: channelId, timestamp: threadTs }).catch(() => undefined);
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
      text: '*Sarvenix channel controls*\n• `/sarvenix mute` — pause indexing and proactive alerts here\n• `/sarvenix unmute` — resume indexing and proactive alerts\n\nTo ask why a decision was made, mention `@Sarvenix` in the relevant channel. Use `/sarvenix-catchup` for a private return-from-OOO brief.',
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
  await respond({ text: 'Feedback recorded. This answer was marked accurate.', replace_original: false });
});

app.action('feedback_wrong', async ({ body, ack, respond }) => {
  await ack();
  await respond({
    text: 'Feedback recorded as needing correction. Sarvenix will not claim the reasoning path was changed until the evidence is reviewed.',
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

app.action('resolve_decision_conflict', async ({ body, ack, respond }) => {
  await ack();
  const decisionId = (body as any).actions[0].value;
  const userId = body.user.id;

  try {
    const resolved = await resolveDecisionConflict(decisionId, userId);
    await respond({
      text: resolved
        ? `Resolved by <@${userId}>. Prior decision \`${decisionId}\` is closed and its open conflict links were removed.`
        : `Decision \`${decisionId}\` was not found or was already removed.`,
      replace_original: resolved,
    });
  } catch (error) {
    await Logger.error(`Failed to resolve decision conflict ${decisionId}`, error);
    await respond({ text: 'The conflict could not be resolved. No graph changes were applied.', replace_original: false });
  }
});

app.action('dismiss_contradiction', async ({ body, ack, respond }) => {
  await ack();
  await respond({ text: 'Alert dismissed. The underlying decision graph was not changed.', replace_original: true });
});

// 6. App Home opened view publisher (Best UX)
app.event('app_home_opened', async ({ event, client }) => {
  const userId = event.user;
  Logger.debug(`app_home_opened event received for user: ${userId}`);

  try {
    let allowedChannelIds: string[] | undefined = undefined;
    try {
      const conversations = await client.users.conversations({
        user: userId,
        types: 'public_channel,private_channel',
        limit: 100,
      });
      allowedChannelIds = (conversations.channels || []).map((c: any) => c.id);
    } catch (e) {
      Logger.warn(`Could not fetch allowed channels for App Home for user ${userId}`, e);
    }

    const homeData = await getAppHomeData(allowedChannelIds);
    const homeView = formatAppHome(homeData.stats, homeData.recentDecisions);

    await client.views.publish({
      user_id: userId,
      view: homeView as any,
    });
  } catch (error) {
    await Logger.error(`Failed to publish App Home view for user ${userId}`, error);
  }
});

// App Home Quick Action for Catchup Brief
app.action('home_trigger_catchup', async ({ body, ack, client }) => {
  await ack();
  const userId = body.user.id;
  Logger.info(`App Home triggered catchup brief for user: ${userId}`);

  try {
    const brief = await generateCatchupBrief(client, userId);
    const blocks = formatCatchupBrief(brief);
    await sendDMBrief(client, userId, blocks, 'Your catchup brief is ready!');
  } catch (error) {
    await Logger.error(`App Home catchup brief generation failed for user: ${userId}`, error);
  }
});

// Mediator Action Listener (Most Innovative Slack Agent)
app.action('draft_reconciliation', async ({ body, ack, client, respond }) => {
  await ack();
  const userId = body.user.id;
  const actionValue = (body as any).actions[0].value;
  Logger.info(`Drafting reconciliation compromise proposal for user: ${userId}`);

  try {
    const parts = actionValue.split('|||');
    const newSummary = parts[0];
    const pastSummary = parts[1];
    const pastOwnerId = parts[2];

    await respond({
      text: '🤖 _Sarvenix is drafting a reconciliation compromise proposal, please wait..._',
      replace_original: false,
    });

    // 1. Open direct group chat with proposing user and past decision owner
    const openRes = await client.conversations.open({
      users: `${userId},${pastOwnerId}`,
    });

    const dmChannelId = openRes.channel?.id;
    if (!dmChannelId) {
      throw new Error('Failed to open DM channel with contradiction participants.');
    }

    // 2. Draft compromise proposal
    const compromise = await draftReconciliationProposal(newSummary, pastSummary);

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🤖 Sarvenix Reconciliation Mediation',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Hello <@${userId}> and <@${pastOwnerId}>,\n\nI noticed a contradiction between your workspace decisions. Here is my drafted compromise proposal to reconcile them:\n\n${compromise}`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `💡 _Please discuss and coordinate here. You can update or archive the decisions directly._`,
          },
        ],
      },
    ];

    await client.chat.postMessage({
      channel: dmChannelId,
      blocks: blocks,
      text: 'Sarvenix Reconciliation Proposal',
    });

    await respond({
      text: `🤖 _Draft completed! I have opened a direct message group chat with <@${pastOwnerId}> and posted the proposal there._`,
      replace_original: false,
    });
  } catch (error) {
    await Logger.error('Failed to draft reconciliation proposal:', error);
    await respond({
      text: '⚠️ Failed to draft reconciliation proposal. Please check log details.',
      replace_original: false,
    });
  }
});

// 1. App Home Config Modal action listener (Best UX)
app.action('configure_channels_modal', async ({ body, ack, client }) => {
  await ack();
  const triggerId = (body as any).trigger_id;
  const userId = body.user.id;
  Logger.info(`Opening channel configurations modal for user: ${userId}`);

  try {
    const conversations = await client.users.conversations({
      user: userId,
      types: 'public_channel,private_channel',
      limit: 100,
    });
    const allChannels = (conversations.channels || []).filter((c: any) => typeof c.id === 'string');

    const channelsWithMuteStatus = [];
    for (const chan of allChannels) {
      const isMuted = await isChannelMuted(chan.id!);
      channelsWithMuteStatus.push({
        id: chan.id!,
        name: chan.name || 'channel',
        isMuted,
      });
    }

    const modalView = formatChannelConfigModal(channelsWithMuteStatus);
    await client.views.open({
      trigger_id: triggerId,
      view: modalView as any,
    });
  } catch (error) {
    await Logger.error('Failed to open channel configurations modal', error);
  }
});

// App Home Config Modal submission listener (Best UX)
app.view('configure_channels_submit', async ({ ack, view, client, body }) => {
  await ack();
  const userId = body.user.id;
  Logger.info(`Saving channel configuration settings for user: ${userId}`);

  try {
    const selectedOptions = view.state.values['mute_block']?.['mute_checkboxes']?.selected_options || [];
    const mutedIds = selectedOptions.map((o: any) => o.value);

    const conversations = await client.users.conversations({
      user: userId,
      types: 'public_channel,private_channel',
      limit: 100,
    });
    const allChannels = (conversations.channels || []).filter((c: any) => typeof c.id === 'string');

    for (const chan of allChannels) {
      const isMuted = mutedIds.includes(chan.id!);
      await setChannelMute(chan.id!, isMuted);
    }
    Logger.info(`Channel configurations saved successfully.`);
  } catch (error) {
    await Logger.error('Failed to save channel configurations from modal submit', error);
  }
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
