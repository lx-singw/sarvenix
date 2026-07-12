import { WebClient } from '@slack/web-api';

export async function sendDMBrief(
  client: WebClient,
  userId: string,
  blocks: any[],
  fallbackText: string
): Promise<void> {
  try {
    // 1. Open conversation DM
    const response = await client.conversations.open({
      users: userId,
    });

    if (!response.ok || !response.channel || !response.channel.id) {
      console.error('Failed to open DM channel with user:', response.error);
      return;
    }

    // 2. Post DM catchup message
    await client.chat.postMessage({
      channel: response.channel.id,
      text: fallbackText,
      blocks: blocks,
    });
  } catch (error) {
    console.error('Error sending DM catchup brief:', error);
  }
}
