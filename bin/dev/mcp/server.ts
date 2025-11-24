/**
 * MCP Server for Tidyscripts
 * Exposes Tidyscripts functionality via Model Context Protocol
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import common from "../../../packages/ts_common/dist/index";
import { TOOLS } from "./tools";
import { handle_mcp_tool_call } from "./handler";

const log = common.logger.get_logger({ id: "mcp-server" });

/**
 * Creates and configures the MCP server
 */
export function create_mcp_server() {
  const server = new Server(
    {
      name: "tidyscripts-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    log("Listing available tools");
    return {
      tools: TOOLS.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.input_schema,
      })),
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    log(`Tool call received: ${name}`);

    try {
      const result = await handle_mcp_tool_call(name, args || {});
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      log(`Error handling tool call: ${error.message}`);
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Starts the MCP server with stdio transport
 */
export async function start_mcp_server() {
  log("Starting MCP server...");

  const server = create_mcp_server();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  log("MCP server started and ready!");

  // Keep the process alive
  process.stdin.resume();
}
