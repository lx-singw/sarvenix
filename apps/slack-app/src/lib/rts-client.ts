import { WebClient } from '@slack/web-api';

export interface RTSSearchResult {
  text: string;
  username: string;
  ts: string;
  channel: {
    id: string;
    name: string;
  };
  permalink: string;
}

export async function searchMessages(
  client: WebClient,
  query: string,
  channelIds?: string[]
): Promise<RTSSearchResult[]> {
  try {
    // Call the Slack search.messages Web API method
    // Note: This requires the 'search:read' user or bot scope
    const response = await client.search.messages({
      query: query,
      count: 20,
      sort: 'timestamp',
      sort_dir: 'desc',
    });

    if (!response.ok || !response.messages || !response.messages.matches) {
      console.warn('Slack search.messages returned no matches or failed:', response.error);
      return [];
    }

    let matches = response.messages.matches as any[];

    // Filter by channels if specified
    if (channelIds && channelIds.length > 0) {
      matches = matches.filter((msg) => channelIds.includes(msg.channel.id));
    }

    return matches.map((msg) => ({
      text: msg.text || '',
      username: msg.username || msg.user || 'Unknown User',
      ts: msg.ts,
      channel: {
        id: msg.channel.id,
        name: msg.channel.name,
      },
      permalink: msg.permalink || '',
    }));
  } catch (error) {
    console.error('Error calling Slack search.messages API:', error);
    return [];
  }
}
