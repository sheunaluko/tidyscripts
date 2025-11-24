#!/usr/bin/env node
/**
 * MCP Server Entrypoint
 * Starts the Tidyscripts MCP server
 * Sun Feb  9 20:09:55 CST 2025
 * Made with LoVe by Sheun Aluko MD
 */

import { start_mcp_server } from "./mcp/server";

// Start the server
start_mcp_server().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
