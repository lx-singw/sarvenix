import { WebClient } from '@slack/web-api';
import { config } from '../config';
import { SlackClientError, withRetry } from '@sarvenix/shared-types';

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
    return await withRetry(
      async () => {
        const response = await client.search.messages({
          token: config.slack.rtsApiKey || undefined,
          query: query,
          count: 20,
          sort: 'timestamp',
          sort_dir: 'desc',
        });

        if (!response.ok) {
          throw new SlackClientError(
            `Slack search.messages API call failed: ${response.error || 'unknown error'}`,
            'search.messages',
            ['search:read'],
            response.needed ? [response.needed] : undefined,
            response
          );
        }

        const matches = (response.messages?.matches || []) as any[];

        // Filter by channels if specified
        let filteredMatches = matches;
        if (channelIds && channelIds.length > 0) {
          filteredMatches = matches.filter((msg) => msg.channel && channelIds.includes(msg.channel.id));
        }

        return filteredMatches.map((msg) => ({
          text: msg.text || '',
          username: msg.username || msg.user || 'Unknown User',
          ts: msg.ts,
          channel: {
            id: msg.channel?.id || '',
            name: msg.channel?.name || '',
          },
          permalink: msg.permalink || '',
        }));
      },
      {
        isRetryable: (error: any) => {
          // Retry on HTTP 429, timeouts, and connection errors.
          // Do not retry on permanent scope or parameter mismatches.
          const isRateLimit = error.status === 429 || error.message?.includes('429');
          const isTimeout = error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT');
          const isNetwork = error.message?.includes('fetch') || error.message?.includes('reset');
          return isRateLimit || isTimeout || isNetwork;
        },
      }
    );
  } catch (error: any) {
    if (error instanceof SlackClientError) {
      throw error;
    }
    throw new SlackClientError(
      `Slack API unexpected failure: ${error.message || error}`,
      'search.messages',
      undefined,
      undefined,
      error
    );
  }
}
