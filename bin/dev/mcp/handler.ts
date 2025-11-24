/**
 * MCP Tool Call Handler
 * Translates MCP tool calls into TES executor calls
 */

import { execute_tes_call, CallData } from "../shared/executor";
import { TOOLS } from "./tools";
import { TesTool } from "./types";
import common from "../../../packages/ts_common/dist/index";

const log = common.logger.get_logger({ id: "mcp-handler" });

/**
 * Handles an MCP tool call by mapping it to the appropriate TES function
 */
export async function handle_mcp_tool_call(
  tool_name: string,
  args: Record<string, any>
): Promise<any> {
  log(`Handling MCP tool call: ${tool_name}`);

  // Find the tool definition
  const tool = TOOLS.find((t) => t.name === tool_name);
  if (!tool) {
    throw new Error(`Unknown tool: ${tool_name}`);
  }

  // Convert args object to array based on the schema property order
  const fn_args = convert_args_to_array(tool, args);

  // Create the call data
  const callData: CallData = {
    fn_path: tool.fn_path,
    fn_args: fn_args,
  };

  // Execute via shared executor
  const result = await execute_tes_call(callData);

  // If there was an error, throw it (MCP will handle it)
  if (result.error) {
    throw new Error(result.error);
  }

  // Return the result
  return result.result;
}

/**
 * Converts args object to ordered array based on schema properties
 */
function convert_args_to_array(tool: TesTool, args: Record<string, any>): any[] {
  const properties = Object.keys(tool.input_schema.properties);
  return properties.map((prop) => args[prop]);
}
