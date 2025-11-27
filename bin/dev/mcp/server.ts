/**
 * MCP Server for Tidyscripts
 * Exposes Tidyscripts functionality via Model Context Protocol over HTTP
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp";
import express from "express";
import cors from "cors";
import common from "../../../packages/ts_common/dist/index";
import { TOOLS } from "./tools";

const log = common.logger.get_logger({ id: "mcp-server" });

const PORT = 8003;

/**
 * Creates and configures the MCP server with all tools registered
 */
function create_mcp_server(): McpServer {
  const server = new McpServer({
    name: "tidyscripts-mcp-server",
    version: "1.0.0",
  });

  // Register all tools from the TOOLS array
  for (const tool of TOOLS) {
    log(`Registering tool: ${tool.name}`);

    server.registerTool(
      tool.name,
      {
        title: tool.name,
        description: tool.description,
        inputSchema: tool.input_schema,
      },
      async (args: Record<string, any>) => {
        log(`Executing tool: ${tool.name}`);

        try {
          // Call the tool's handler
          const result = await tool.handler(args);

          // Wrap result in SDK's expected format
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error: any) {
          log(`Tool execution error: ${tool.name} - ${error.message}`);
          throw error;
        }
      }
    );
  }

  log(`Registered ${TOOLS.length} tools`);
  return server;
}

/**
 * Starts the MCP server with HTTP transport on port 8003
 */
export async function start_mcp_server() {
  log(`Starting MCP HTTP server on port ${PORT}...`);

  const app = express();

  // CORS configuration for browser clients
  app.use(
    cors({
      origin: "*", // Allow all origins for development
      exposedHeaders: ["Mcp-Session-Id"],
      allowedHeaders: ["Content-Type", "mcp-session-id", "mcp-protocol-version"],
    })
  );

  app.use(express.json());

  // Create the MCP server once (reusable across requests)
  const server = create_mcp_server();

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      server: "tidyscripts-mcp-server",
      port: PORT,
    });
  });

  // Main MCP endpoint - handles all JSON-RPC requests
  app.post("/mcp", async (req, res) => {
    try {
      // Stateless mode: create new transport per request
      // This prevents request ID collisions from different clients
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });

      // Clean up transport when response closes
      res.on("close", () => {
        transport.close();
      });

      // Connect server to transport and handle the request
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error: any) {
      log(`Error handling MCP request: ${error.message}`);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error",
          },
          id: null,
        });
      }
    }
  });

  // Return 405 for GET requests (no session management support)
  app.get("/mcp", (req, res) => {
    res.status(405).end();
  });

  // Start the HTTP server
  app
    .listen(PORT, () => {
      log(`MCP HTTP server listening on http://localhost:${PORT}`);
      log(`Health check: http://localhost:${PORT}/health`);
      log(`MCP endpoint: POST http://localhost:${PORT}/mcp`);
    })
    .on("error", (error) => {
      log(`Server error: ${error}`);
      process.exit(1);
    });
}
