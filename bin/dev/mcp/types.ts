/**
 * MCP-specific type definitions
 */

/**
 * MCP Tool Definition with Generic Handler
 *
 * Tools now use generic handler functions instead of TES paths,
 * allowing for flexible argument transformation, validation, and custom logic.
 */
export interface McpTool {
  name: string; // MCP tool name
  description: string; // Description for Claude to understand what it does
  handler: (args: Record<string, any>) => Promise<any>; // Generic handler function
  input_schema: {
    // JSON Schema for the tool's input parameters
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}
