/**
 * MCP-specific type definitions
 */

/**
 * Defines a TES tool that can be exposed via MCP
 */
export interface TesTool {
  name: string; // MCP tool name (snake_case recommended)
  description: string; // Description for Claude to understand what it does
  fn_path: string[]; // Path to the function in T object (e.g., ["dev", "surreal", "get_node_info_for_query"])
  input_schema: {
    // JSON Schema for the tool's input parameters
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}
