/**
 * Shared Executor for TES function calls
 * Used by both HTTP server and MCP server
 */

import common from "../../../packages/ts_common/dist/index";
import node from "../../../packages/ts_node/dist/index";
import * as dev from "../index";

const log = common.logger.get_logger({ id: "executor" });
const debug = common.util.debug;

// The available function namespaces
export const T = { common, node, dev };

export interface CallData {
  fn_path: string[]; // path to the function that should be called (starts with node or common or dev)
  fn_args: any[]; // array of arguments to pass to the function
}

export interface CallResult {
  error: string | null;
  result: any;
  fn_path: string[];
}

/**
 * Executes a TES function call based on path and arguments
 */
export async function execute_tes_call(callData: CallData): Promise<CallResult> {
  let { fn_path, fn_args } = callData;
  log(`Request to call ${JSON.stringify(fn_path)}`);
  debug.add("fn_args", fn_args);

  var fn: any = T;

  try {
    for (var i = 0; i < fn_path.length; i++) {
      let next_key = fn_path[i];
      fn = fn[next_key];
    }
    log(`Retrieved function and running...`);
    // at this point we should have the desired function
    let result = await fn(...fn_args);
    log(`Got result and returning (^.^) `);

    return {
      error: null,
      result,
      fn_path,
    };
  } catch (e: any) {
    log(`Error:`);
    log(e);
    return {
      error: e.message,
      result: null,
      fn_path,
    };
  }
}
