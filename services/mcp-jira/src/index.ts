import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'mcp-jira-server',
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
        name: 'search_issues',
        description: 'Search for issues in Jira',
        inputSchema: {
          type: 'object',
          properties: {
            jql: { type: 'string', description: 'Jira Query Language query' },
          },
          required: ['jql'],
        },
      },
      {
        name: 'get_issue_detail',
        description: 'Get details of a specific Jira issue',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: { type: 'string', description: 'e.g. PROJ-123' },
          },
          required: ['issueKey'],
        },
      },
      {
        name: 'get_resolution',
        description: 'Get the resolution status details for a Jira issue',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: { type: 'string' },
          },
          required: ['issueKey'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  switch (name) {
    case 'search_issues':
      return {
        content: [{ type: 'text', text: JSON.stringify({ issues: [] }) }],
      };
    case 'get_issue_detail':
      return {
        content: [{ type: 'text', text: JSON.stringify({ detail: {} }) }],
      };
    case 'get_resolution':
      return {
        content: [{ type: 'text', text: JSON.stringify({ resolution: {} }) }],
      };
    default:
      throw new Error(`Tool not found: ${name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Jira MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error running Jira MCP Server:', error);
  process.exit(1);
});
