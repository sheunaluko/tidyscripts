/**
 * Tool Registry for MCP Server
 * Add new TES tools here to expose them via MCP
 */

import { TesTool } from "./types";

/**
 * Registry of all available TES tools for MCP
 * To add a new tool: just add a new entry to this array!
 */
export const TOOLS: TesTool[] = [
    {
	name: "Query Tidyscripts code base",
	description:
      "Search the tidyscripts codebase. Uses vector embeddings to retrieve codebase elements (functions/modules/classes/etc) that match the given query. Provide limit param to limit number of results",
	fn_path: ["dev", "surreal", "get_node_info_for_query"],
	input_schema: {
	    type: "object",
	    properties: {
		txt: {
		    type: "string",
		    description: "The text query to search for in the database",
		},
		limit: {
		    type: "number",
		    description: "Maximum number of results to return",
		},
	    },
	    required: ["txt", "limit"],
	},
    },
    // Add more tools here...
];
