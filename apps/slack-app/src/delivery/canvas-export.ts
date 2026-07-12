import { WebClient } from '@slack/web-api';
import { CatchupBrief } from '../commands/catchup';
import { config } from '../config';

export interface ExportResult {
  type: 'canvas' | 'dm';
  url: string;
}

/**
 * Robust hybrid Canvas exporter with triple-fallback:
 * 1. Try to create a Channel Canvas directly in the user's DM channel (inherits DM permissions).
 * 2. Try to create a Standalone Canvas and explicitly share it with canvases.access.set.
 * 3. Fall back to posting and pinning a rich Block Kit message directly in the DM.
 */
export async function exportBriefToCanvas(
  client: WebClient,
  brief: CatchupBrief,
  userId?: string
): Promise<ExportResult> {
  const dateStr = new Date().toLocaleDateString();
  const title = `Sarvenix Catchup Brief — ${dateStr}`;

  // Get the DM channel ID first
  let channelId: string | undefined;
  if (userId) {
    try {
      const dmResult = await client.conversations.open({ users: userId });
      channelId = dmResult.channel?.id;
    } catch (openErr) {
      console.warn('Failed to open DM channel:', openErr);
    }
  }

  // Generate markdown content
  let markdown = `# ${title}\n\n`;
  markdown += `*Generated automatically by Sarvenix*\n\n---\n\n`;

  brief.bullets.forEach((bullet) => {
    const emoji =
      bullet.severity === 'red'
        ? '🔴 [Action Required]'
        : bullet.severity === 'yellow'
        ? '🟡 [Relevant Context]'
        : '🟢 [FYI]';

    markdown += `### ${emoji} ${bullet.title}\n`;
    markdown += `${bullet.description}\n\n`;
  });

  // --- Step 1: Channel Canvas in DM ---
  if (channelId) {
    try {
      const result = await client.apiCall('conversations.canvases.create', {
        channel_id: channelId,
        document_content: {
          type: 'markdown',
          markdown: markdown,
        },
      }) as any;

      if (result.ok && result.canvas_id) {
        return {
          type: 'canvas',
          url: `https://slack.com/canvas/${result.canvas_id}`,
        };
      }
    } catch (error) {
      console.warn('conversations.canvases.create failed, trying standalone canvas:', error);
    }
  }

  // --- Step 2: Standalone Canvas + Set Access ---
  try {
    const result = await client.apiCall('canvases.create', {
      title: title,
      document_content: {
        type: 'markdown',
        markdown: markdown,
      },
    }) as any;

    if (result.ok && result.canvas_id) {
      if (userId) {
        try {
          await client.apiCall('canvases.access.set', {
            canvas_id: result.canvas_id,
            user_ids: userId,
            access_level: 'write',
          });
        } catch (shareError) {
          console.warn('Failed to set standalone canvas permissions:', shareError);
        }
      }
      return {
        type: 'canvas',
        url: `https://slack.com/canvas/${result.canvas_id}`,
      };
    }
  } catch (error) {
    console.warn('Standalone canvases.create failed, falling back to rich DM format:', error);
  }

  // --- Step 3: Block Kit DM Fallback ---
  const blocks: any[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `📋 ${title}`, emoji: true },
    },
    {
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: '_Generated automatically by Sarvenix_' },
      ],
    },
    { type: 'divider' },
  ];

  brief.bullets.forEach((bullet) => {
    const emoji =
      bullet.severity === 'red'
        ? '🔴 *[Action Required]*'
        : bullet.severity === 'yellow'
        ? '🟡 *[Relevant Context]*'
        : '🟢 *[FYI]*';

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${emoji}  *${bullet.title}*\n${bullet.description}`,
      },
    });
    blocks.push({ type: 'divider' });
  });

  blocks.push({
    type: 'context',
    elements: [
      { type: 'mrkdwn', text: '📌 _This brief has been pinned to your DM for easy reference._' },
    ],
  });

  if (channelId) {
    try {
      const postResult = await client.chat.postMessage({
        channel: channelId,
        text: title,
        blocks: blocks,
        unfurl_links: false,
      });

      if (postResult.ok && postResult.ts) {
        try {
          await client.pins.add({ channel: channelId, timestamp: postResult.ts });
        } catch {
          // Already pinned, ignore
        }

        const messageLink = `https://app.slack.com/archives/${channelId}/p${postResult.ts.replace('.', '')}`;
        return {
          type: 'dm',
          url: messageLink,
        };
      }
    } catch (error) {
      console.error('Failed to post rich DM fallback:', error);
    }
  }

  return {
    type: 'dm',
    url: '',
  };
}
