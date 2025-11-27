/**
 * Tool Registry for MCP Server
 * Tools use generic handler functions for flexibility with Zod schemas
 */

import { McpTool } from "./types";
import { execute_tes_call } from "../shared/executor";
import { z } from "zod";

/**
 * Registry of all available MCP tools
 * Each tool has a generic handler function that can do anything
 */
export const TOOLS: McpTool[] = [
  // Existing tool - migrated to handler-based architecture with Zod
  {
    name: "Query_Tidyscripts_code_base",
    description:
      "Search the tidyscripts codebase using vector embeddings. Returns information about functions, classes, modules, and other code elements. Useful for understanding the codebase structure and finding specific implementations.",
    handler: async (args: Record<string, any>) => {
      const { txt, limit } = args;
      // Call TES function via shared executor
      const result = await execute_tes_call({
        fn_path: ["dev", "surreal", "get_node_info_for_query"],
        fn_args: [txt, limit],
      });
      if (result.error) {
        throw new Error(result.error);
      }
      return result.result;
    },
    input_schema: {
      txt: z.string().describe("The text query to search for in the codebase"),
      limit: z.number().describe("Maximum number of results to return"),
    },
  },

  // NEW TOOL - Search SurrealQL Documentation with Zod
  {
    name: "Search_SurrealQL_Documentation",
    description:
      "Search the SurrealQL documentation using natural language queries. Uses vector embeddings to find relevant documentation sections. Returns markdown-formatted results with file paths, line numbers, and relevance scores. Useful for finding information about SurrealQL syntax, functions, statements, operators, and concepts.",
    handler: async (args: Record<string, any>) => {
      const { query, limit = 10 } = args;

      // Hardcode rootDir for SurrealQL documentation
      const rootDir = "./data/docs.surrealdb.com/src/content/doc-surrealql/";

      // Call query_project via TES
      const result = await execute_tes_call({
        fn_path: ["node", "generic_hierarchical_embedder", "query_project"],
        fn_args: [query, rootDir, { limit, threshold: 0 }],
      });

      if (result.error) {
        throw new Error(result.error);
      }

      return result.result;
    },
    input_schema: {
      query: z
        .string()
        .describe(
          "Natural language query to search the documentation (e.g., 'How do I create a vector index?', 'RELATE statement syntax', 'distance functions')"
        ),
      limit: z
        .number()
        .optional()
        .describe(
          "Maximum number of results to return (default: 10, recommended range: 3-20)"
        ),
    },
  },
];
