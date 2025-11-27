/**
 * MCP-specific type definitions
 */

import { z } from "zod";

/**
 * MCP Tool Definition with Generic Handler
 *
 * Tools now use generic handler functions instead of TES paths,
 * allowing for flexible argument transformation, validation, and custom logic.
 * Input schemas use Zod for type-safe validation.
 */
export interface McpTool {
  name: string; // MCP tool name
  description: string; // Description for Claude to understand what it does
  handler: (args: Record<string, any>) => Promise<any>; // Generic handler function
  input_schema: Record<string, z.ZodTypeAny>; // Zod schema for input parameters
}
