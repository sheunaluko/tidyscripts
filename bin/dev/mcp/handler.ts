/**
 * MCP Tool Call Handler
 * Handles MCP tool calls by invoking generic handler functions
 */

import { TOOLS } from "./tools";
import common from "../../../packages/ts_common/dist/index";

const log = common.logger.get_logger({ id: "mcp-handler" });

/**
 * Handles an MCP tool call by invoking the tool's handler function
 */
export async function handle_mcp_tool_call(
  tool_name: string,
  args: Record<string, any>
): Promise<any> {
  log(`Handling tool call: ${tool_name}`);
  log(`Arguments: ${JSON.stringify(args)}`);

  // Find the tool definition
  const tool = TOOLS.find((t) => t.name === tool_name);
  if (!tool) {
    throw new Error(`Tool not found: ${tool_name}`);
  }

  // Call handler directly with args object
  try {
    const result = await tool.handler(args);
    log(`Tool call successful`);
    return result;
  } catch (error) {
    log(`Tool call failed: ${error}`);
    throw error;
  }
}
