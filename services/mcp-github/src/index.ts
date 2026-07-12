import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

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
  switch (name) {
    case 'search_prs':
      return {
        content: [{ type: 'text', text: JSON.stringify({ prs: [] }) }],
      };
    case 'get_pr_detail':
      return {
        content: [{ type: 'text', text: JSON.stringify({ details: {} }) }],
      };
    case 'get_pr_comments':
      return {
        content: [{ type: 'text', text: JSON.stringify({ comments: [] }) }],
      };
    default:
      throw new Error(`Tool not found: ${name}`);
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
