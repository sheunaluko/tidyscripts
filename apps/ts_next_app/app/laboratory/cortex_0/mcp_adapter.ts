/**
 * MCP Adapter - Modular architecture for integrating MCP servers with Cortex
 *
 * This module provides a clean, modular way to:
 * 1. Connect to MCP servers via Streamable HTTP transport
 * 2. Discover available tools
 * 3. Convert MCP tools to Cortex function format
 * 4. Execute MCP tools through Cortex
 */

import * as tsw from "tidyscripts_web";
import { Client } from "@modelcontextprotocol/sdk/client/index";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp";

const { common } = tsw;
const logger = common.logger.get_logger({ id: "mcp_adapter" });

// ============================================================================
// Type Definitions
// ============================================================================

interface MCPTool {
  name: string;
  description?: string;
  inputSchema: any; // Can be JSON Schema or other format from SDK
}

interface CortexFunction {
  enabled: boolean;
  description: string;
  name: string;
  parameters: Record<string, string> | null;
  fn: (ops: any) => Promise<any>;
  return_type: string;
}

// ============================================================================
// MCP Client Communication Layer
// ============================================================================

/**
 * Establishes connection to an MCP server via Streamable HTTP transport
 */
async function connect_to_mcp_server(url: string): Promise<Client> {
  logger(`Connecting to MCP server: ${url}`);

  const client = new Client({
    name: "cortex-mcp-client",
    version: "1.0.0",
  });

  const transport = new StreamableHTTPClientTransport(new URL(url));

  try {
    await client.connect(transport);
    logger(`Successfully connected to MCP server`);
    return client;
  } catch (error: any) {
    logger(`Failed to connect to MCP server: ${error.message}`);
    throw error;
  }
}

/**
 * Lists all available tools from the MCP server
 */
async function list_mcp_tools(client: Client): Promise<MCPTool[]> {
  logger(`Listing tools from MCP server`);

  try {
    const response = await client.listTools();
    const tools = response.tools || [];
    logger(`Discovered ${tools.length} tools from MCP server`);
    logger(`Raw tools response: ${JSON.stringify(tools, null, 2)}`);
    return tools as MCPTool[];
  } catch (error: any) {
    logger(`Failed to list MCP tools: ${error.message}`);
    throw error;
  }
}

/**
 * Calls a specific MCP tool with given arguments
 */
async function call_mcp_tool(
  client: Client,
  toolName: string,
  args: Record<string, any>
): Promise<any> {
  logger(`Calling MCP tool: ${toolName} with args: ${JSON.stringify(args)}`);

  try {
    const result = await client.callTool({
      name: toolName,
      arguments: args,
    });

    logger(`MCP tool call succeeded: ${toolName}`);

    // Extract text content from MCP response
    if (result.content && result.content.length > 0) {
      const textContent = result.content.find((c: any) => c.type === "text");
      if (textContent) {
        try {
          // Try to parse JSON if it's a JSON string
          return JSON.parse(textContent.text);
        } catch {
          // Return as-is if not JSON
          return textContent.text;
        }
      }
    }

    return result;
  } catch (error: any) {
    logger(`MCP tool call failed: ${toolName} - ${error.message}`);
    throw error;
  }
}

// ============================================================================
// Schema Conversion Layer
// ============================================================================

/**
 * Converts MCP JSON Schema parameters to Cortex parameter format
 */
function convert_mcp_schema_to_cortex_parameters(
  inputSchema: MCPTool["inputSchema"]
): Record<string, string> | null {
  logger(`Converting schema: ${JSON.stringify(inputSchema)}`);

  if (!inputSchema.properties) {
    logger(`No properties found in schema, returning null`);
    return null;
  }

  const cortexParams: Record<string, string> = {};

  for (const [paramName, paramDef] of Object.entries(inputSchema.properties)) {
    const def = paramDef as any;
    // Map JSON Schema types to simple type strings
    let type = def.type || "any";

    // Handle arrays and objects
    if (type === "array") {
      type = "array";
    } else if (type === "object") {
      type = "object";
    } else if (type === "integer") {
      type = "number";
    }

    cortexParams[paramName] = type;
  }

  logger(`Converted parameters: ${JSON.stringify(cortexParams)}`);
  return Object.keys(cortexParams).length > 0 ? cortexParams : null;
}

/**
 * Coerces arguments to their correct types based on the schema
 */
function coerce_argument_types(
  args: Record<string, any>,
  inputSchema: any
): Record<string, any> {
  if (!inputSchema || !inputSchema.properties) {
    return args;
  }

  const coercedArgs: Record<string, any> = {};

  for (const [key, value] of Object.entries(args)) {
    const propertySchema = inputSchema.properties[key];
    if (!propertySchema) {
      coercedArgs[key] = value;
      continue;
    }

    const type = propertySchema.type;

    // Coerce based on type
    if (type === "number" || type === "integer") {
      coercedArgs[key] = typeof value === "string" ? Number(value) : value;
    } else if (type === "boolean") {
      coercedArgs[key] = typeof value === "string" ? value === "true" : value;
    } else if (type === "array" && typeof value === "string") {
      try {
        coercedArgs[key] = JSON.parse(value);
      } catch {
        coercedArgs[key] = value;
      }
    } else if (type === "object" && typeof value === "string") {
      try {
        coercedArgs[key] = JSON.parse(value);
      } catch {
        coercedArgs[key] = value;
      }
    } else {
      coercedArgs[key] = value;
    }
  }

  logger(`Coerced arguments: ${JSON.stringify(coercedArgs)}`);
  return coercedArgs;
}

/**
 * Validates arguments against required parameters
 */
function validate_mcp_arguments(
  args: Record<string, any>,
  requiredParams: string[] = []
): void {
  for (const required of requiredParams) {
    if (!(required in args)) {
      throw new Error(`Missing required parameter: ${required}`);
    }
  }
}

// ============================================================================
// Cortex Function Factory
// ============================================================================

/**
 * Converts a single MCP tool definition into a Cortex function
 */
function convert_mcp_tool_to_cortex_function(
  mcpTool: MCPTool,
  client: Client
): CortexFunction {
  logger(`Converting MCP tool to Cortex function: ${mcpTool.name}`);
  logger(`Tool description: ${mcpTool.description}`);
  logger(`Tool inputSchema: ${JSON.stringify(mcpTool.inputSchema, null, 2)}`);

  const parameters = convert_mcp_schema_to_cortex_parameters(mcpTool.inputSchema);

  const cortexFunction = {
    enabled: true,
    description: mcpTool.description || `MCP tool: ${mcpTool.name}`,
    name: mcpTool.name,
    parameters: parameters,
    fn: async (ops: any) => {
      // Extract actual arguments (filter out cortex-specific fields)
      const { event, feedback, get_user_data, user_output, log, ...actualArgs } =
        ops;

      logger(`Raw arguments before coercion: ${JSON.stringify(actualArgs)}`);

      // Coerce argument types based on schema
      const coercedArgs = coerce_argument_types(actualArgs, mcpTool.inputSchema);

      // Validate required parameters
      validate_mcp_arguments(coercedArgs, mcpTool.inputSchema.required);

      // Call the MCP tool
      try {
        const result = await call_mcp_tool(client, mcpTool.name, coercedArgs);
        return result;
      } catch (error: any) {
        logger(`MCP tool execution error: ${mcpTool.name} - ${error.message}`);
        throw new Error(`MCP tool '${mcpTool.name}' failed: ${error.message}`);
      }
    },
    return_type: "any",
  };

  logger(`Created Cortex function: ${JSON.stringify({
    name: cortexFunction.name,
    description: cortexFunction.description,
    parameters: cortexFunction.parameters,
    return_type: cortexFunction.return_type,
    enabled: cortexFunction.enabled
  }, null, 2)}`);

  return cortexFunction;
}

/**
 * Converts multiple MCP tools into Cortex functions
 */
function convert_mcp_tools_to_cortex_functions(
  mcpTools: MCPTool[],
  client: Client
): CortexFunction[] {
  return mcpTools.map((tool) =>
    convert_mcp_tool_to_cortex_function(tool, client)
  );
}

// ============================================================================
// Main Orchestration
// ============================================================================

/**
 * Main function: Connects to MCP server and creates Cortex functions
 *
 * @param url - The MCP server URL (e.g., "http://localhost:8003/mcp")
 * @returns Array of Cortex-compatible function definitions
 */
export async function create_cortex_functions_from_mcp_server(
  url: string
): Promise<CortexFunction[]> {
  logger(`Starting MCP adapter for server: ${url}`);

  // Step 1: Connect to MCP server
  const client = await connect_to_mcp_server(url);

  // Step 2: Discover available tools
  const mcpTools = await list_mcp_tools(client);

  // Step 3: Convert to Cortex functions
  const cortexFunctions = convert_mcp_tools_to_cortex_functions(
    mcpTools,
    client
  );

  logger(`MCP adapter complete: Created ${cortexFunctions.length} Cortex functions`);
  return cortexFunctions;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates a single Cortex function for a specific MCP tool
 * Useful for selective tool integration
 */
export async function create_cortex_function_for_mcp_tool(
  url: string,
  toolName: string
): Promise<CortexFunction | null> {
  logger(`Creating Cortex function for specific MCP tool: ${toolName}`);

  const client = await connect_to_mcp_server(url);
  const tools = await list_mcp_tools(client);

  const tool = tools.find((t) => t.name === toolName);
  if (!tool) {
    logger(`MCP tool not found: ${toolName}`);
    return null;
  }

  return convert_mcp_tool_to_cortex_function(tool, client);
}

/**
 * Filters MCP tools by name pattern before conversion
 */
export async function create_cortex_functions_from_mcp_server_filtered(
  url: string,
  namePattern: RegExp
): Promise<CortexFunction[]> {
  logger(`Creating filtered Cortex functions with pattern: ${namePattern}`);

  const client = await connect_to_mcp_server(url);
  const mcpTools = await list_mcp_tools(client);

  const filteredTools = mcpTools.filter((tool) => namePattern.test(tool.name));
  logger(`Filtered to ${filteredTools.length} tools matching pattern`);

  return convert_mcp_tools_to_cortex_functions(filteredTools, client);
}
