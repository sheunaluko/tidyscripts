#!/usr/bin/env node
/**
 * MCP Server Entrypoint
 * Starts the Tidyscripts MCP server over HTTP on port 8003
 * Sun Feb  9 20:09:55 CST 2025
 * Made with LoVe by Sheun Aluko MD
 */

import { start_mcp_server } from "./mcp/server";

// Start the HTTP server
start_mcp_server().catch((error) => {
  console.error("Failed to start MCP HTTP server:", error);
  process.exit(1);
});
