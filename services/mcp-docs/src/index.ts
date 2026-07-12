import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'mcp-docs-server',
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
        name: 'search_docs',
        description: 'Search internal documentation',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search term/query' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_doc_content',
        description: 'Retrieve content of a specific document',
        inputSchema: {
          type: 'object',
          properties: {
            docId: { type: 'string', description: 'Internal document ID' },
          },
          required: ['docId'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  switch (name) {
    case 'search_docs':
      return {
        content: [{ type: 'text', text: JSON.stringify({ documents: [] }) }],
      };
    case 'get_doc_content':
      return {
        content: [{ type: 'text', text: JSON.stringify({ doc: {} }) }],
      };
    default:
      throw new Error(`Tool not found: ${name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Docs MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error running Docs MCP Server:', error);
  process.exit(1);
});
