import { WebClient } from '@slack/web-api';

export async function postInThreadReply(
  client: WebClient,
  channelId: string,
  threadTs: string,
  blocks: any[],
  fallbackText: string
): Promise<void> {
  try {
    await client.chat.postMessage({
      channel: channelId,
      thread_ts: threadTs,
      text: fallbackText,
      blocks: blocks,
    });
  } catch (error) {
    console.error('Error posting in-thread message to Slack:', error);
  }
}
