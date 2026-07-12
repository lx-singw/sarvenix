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
    // Graceful Fallback: Return mock scenario data for the demo if credentials are unset
    console.error('GitHub Credentials not set. Running in Demo Mock mode.');
    
    switch (name) {
      case 'search_prs':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                prs: [
                  {
                    number: 412,
                    title: 'Fix database connection pooling memory leak',
                    url: 'https://github.com/org/repo/pull/412',
                    state: 'merged',
                  },
                ],
              }),
            },
          ],
        };
      case 'get_pr_detail':
        if (typedArgs.number === 412) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  number: 412,
                  title: 'Fix database connection pooling memory leak',
                  state: 'merged',
                  url: 'https://github.com/org/repo/pull/412',
                  body: 'Replacing legacy DB connection pool driver to fix staging memory leak.',
                }),
              },
            ],
          };
        }
        return { content: [{ type: 'text', text: JSON.stringify({ detail: null }) }] };
      case 'get_pr_comments':
        if (typedArgs.number === 412) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  comments: [
                    {
                      author: 'Sarah Chen',
                      body: 'Found schema conflicts and memory leaks in connection pooling. Do not reuse this old driver pattern.',
                      createdAt: '2026-06-15T12:00:00Z',
                    },
                  ],
                }),
              },
            ],
          };
        }
        return { content: [{ type: 'text', text: JSON.stringify({ comments: [] }) }] };
      default:
        throw new Error(`Tool not found: ${name}`);
    }
  }

  // Active Live mode: Execute real GitHub requests
  try {
    const token = await getCachedToken();
    switch (name) {
      case 'search_prs': {
        const query = encodeURIComponent(typedArgs.query);
        const data = await callGitHubAPI(`search/issues?q=${query}+type:pr`, token);
        return {
          content: [{ type: 'text', text: JSON.stringify({ prs: data.items || [] }) }],
        };
      }
      case 'get_pr_detail': {
        const endpoint = `repos/${typedArgs.owner}/${typedArgs.repo}/pulls/${typedArgs.number}`;
        const data = await callGitHubAPI(endpoint, token);
        return {
          content: [{ type: 'text', text: JSON.stringify({ detail: data }) }],
        };
      }
      case 'get_pr_comments': {
        const endpoint = `repos/${typedArgs.owner}/${typedArgs.repo}/pulls/${typedArgs.number}/comments`;
        const data = await callGitHubAPI(endpoint, token);
        return {
          content: [{ type: 'text', text: JSON.stringify({ comments: data }) }],
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
