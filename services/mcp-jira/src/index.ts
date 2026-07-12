import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from './config.js';
import { callJiraAPI } from './resources/jira-client.js';

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

const isConfigured = !!(config.jira.cloudId && config.jira.accessToken);

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
  const typedArgs = args as any;

  if (!isConfigured) {
    // Graceful Fallback: Return mock scenario data for the demo if credentials are unset
    console.error('Jira Credentials not set. Running in Demo Mock mode.');

    switch (name) {
      case 'search_issues':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                issues: [
                  {
                    key: 'MIGRATE-412',
                    fields: {
                      summary: 'Legacy Database Migration to v2',
                      status: { name: 'Closed' },
                    },
                  },
                ],
              }),
            },
          ],
        };
      case 'get_issue_detail':
        if (typedArgs.issueKey.toUpperCase() === 'MIGRATE-412') {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  key: 'MIGRATE-412',
                  fields: {
                    summary: 'Legacy Database Migration to v2',
                    description: 'Move all user profiles and transaction schemas off the legacy cluster.',
                    status: { name: 'Closed' },
                    resolution: { name: "Won't Do" },
                  },
                }),
              },
            ],
          };
        }
        return { content: [{ type: 'text', text: JSON.stringify({ detail: null }) }] };
      case 'get_resolution':
        if (typedArgs.issueKey.toUpperCase() === 'MIGRATE-412') {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  key: 'MIGRATE-412',
                  status: 'Closed',
                  resolution: "Won't Do",
                  reason: 'Closed because Sarah Chen discovered memory leaks and schema compatibility issues in the connection pool.',
                }),
              },
            ],
          };
        }
        return { content: [{ type: 'text', text: JSON.stringify({ resolution: null }) }] };
      default:
        throw new Error(`Tool not found: ${name}`);
    }
  }

  // Active Live mode: Execute real Jira requests
  try {
    switch (name) {
      case 'search_issues': {
        const data = await callJiraAPI(
          `search?jql=${encodeURIComponent(typedArgs.jql)}`,
          config.jira.cloudId,
          config.jira.accessToken
        );
        return {
          content: [{ type: 'text', text: JSON.stringify({ issues: data.issues || [] }) }],
        };
      }
      case 'get_issue_detail': {
        const data = await callJiraAPI(
          `issue/${typedArgs.issueKey}`,
          config.jira.cloudId,
          config.jira.accessToken
        );
        return {
          content: [{ type: 'text', text: JSON.stringify({ detail: data }) }],
        };
      }
      case 'get_resolution': {
        const data = await callJiraAPI(
          `issue/${typedArgs.issueKey}?fields=status,resolution,resolutiondate`,
          config.jira.cloudId,
          config.jira.accessToken
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                key: typedArgs.issueKey,
                status: data.fields?.status?.name || 'Unknown',
                resolution: data.fields?.resolution?.name || 'None',
                resolvedAt: data.fields?.resolutiondate || null,
              }),
            },
          ],
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
          text: `Jira MCP Error: ${error.message}`,
        },
      ],
    };
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
