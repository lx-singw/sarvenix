import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from './config.js';
import { getInstallationToken, callGitHubAPI } from './resources/github-client.js';

const server = new Server(
  {
    name: 'mcp-github-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Flag to check if GitHub credentials are configured
const isConfigured = !!(
  config.github.appId &&
  config.github.privateKey &&
  config.github.installationId
);

async function getCachedToken(): Promise<string> {
  if (!isConfigured) {
    throw new Error('GitHub App credentials are not configured.');
  }
  return await getInstallationToken(
    config.github.appId,
    config.github.privateKey,
    config.github.installationId
  );
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_prs',
        description: 'Search for pull requests in GitHub',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_pr_detail',
        description: 'Get details of a specific pull request',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string' },
            repo: { type: 'string' },
            number: { type: 'number' },
          },
          required: ['owner', 'repo', 'number'],
        },
      },
      {
        name: 'get_pr_comments',
        description: 'Get comments of a specific pull request',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string' },
            repo: { type: 'string' },
            number: { type: 'number' },
          },
          required: ['owner', 'repo', 'number'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const typedArgs = args as any;

  if (!isConfigured) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: 'GitHub MCP is unavailable because GitHub App credentials are not configured.',
        },
      ],
    };
  }

  // Active Live mode: Execute real GitHub requests
  try {
    const token = await getCachedToken();
    switch (name) {
      case 'search_prs': {
        const query = encodeURIComponent(typedArgs.query);
        const data = await callGitHubAPI(`search/issues?q=${query}+type:pr`, token);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              prs: (data.items || []).map((item: any) => ({
                number: item.number,
                title: item.title,
                state: item.state,
                url: item.html_url,
                repositoryUrl: item.repository_url,
                updatedAt: item.updated_at,
              })),
            }),
          }],
        };
      }
      case 'get_pr_detail': {
        const endpoint = `repos/${typedArgs.owner}/${typedArgs.repo}/pulls/${typedArgs.number}`;
        const data = await callGitHubAPI(endpoint, token);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              detail: {
                number: data.number,
                title: data.title,
                state: data.state,
                body: data.body,
                html_url: data.html_url,
                merged_at: data.merged_at,
                updated_at: data.updated_at,
                author: data.user?.login,
              },
            }),
          }],
        };
      }
      case 'get_pr_comments': {
        const endpoint = `repos/${typedArgs.owner}/${typedArgs.repo}/pulls/${typedArgs.number}/comments`;
        const data = await callGitHubAPI(endpoint, token);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              comments: (data || []).map((comment: any) => ({
                author: comment.user?.login,
                body: comment.body,
                html_url: comment.html_url,
                created_at: comment.created_at,
              })),
            }),
          }],
        };
      }
      default:
        throw new Error(`Tool not found: ${name}`);
    }
  } catch (error: any) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `GitHub MCP Error: ${error.message}`,
        },
      ],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GitHub MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error running GitHub MCP Server:', error);
  process.exit(1);
});
