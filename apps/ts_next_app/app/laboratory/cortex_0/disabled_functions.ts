'use client';

/**
 * Disabled Cortex functions
 * These functions are kept here for reference but are not currently active
 */

import * as fbu from "../../../src/firebase_utils";
import * as fnu from "../src/fn_util";
import * as bashr from "../../../src/bashr/index";
import * as tsw from "tidyscripts_web";
import { z } from "zod";

const { common } = tsw;
const { debug } = common.util;

declare var window: any;

// Bash client state
var BASH_CLIENT: any = null;

export async function get_practice_question(ops: any) {
    let { test_num, question_num } = ops;
    let qid = `t${test_num}_q${question_num}`;
    return await fbu.get_user_doc({ path: [qid], app_id: "usync" });
}

export async function tidyscripts_log(ops: any) {
    let { text, user_initiation_string, path } = ops;
    let tokenized_text = fnu.tokenize_text(text);
    let app_id = "tidyscripts";
    let date_o = new Date();
    let data = {
        tokenized_text,
        user_initiation_string,
        time_string: date_o.toString(),
        time_created: fbu.get_firestore_timestamp_from_date(date_o)
    };
    await fbu.store_user_collection({ app_id, path, data });
}

export const disabled_functions = [
    {
        enabled: false,
        description: "Retrieve a random fact to test the user",
        name: "retrieve_random_medical_fact",
        parameters: null,
        fn: async (ops: any) => {
            let result = await common.tes.localhost.dev.tom.get_random_study_record();
            debug.add('random_fact', result);
            return result;
        },
        return_type: "object"
    },

    {
        enabled: false,
        description: "Search the TOM database for matching medical entities given a string",
        name: "search_tom_for_entities",
        parameters: { query: "string" },
        fn: async (ops: any) => {
            let { query } = ops.params;
            let tmp = await common.tes.cloud.node.tom.entity_vector_search(query, 6) as any;
            let result = tmp.result[0];
            debug.add('evs_result', result);
            return result;
        },
        return_type: "object"
    },

    {
        enabled: false,
        description: "Retrieve all defined relationships (information) for a specific entity in TOM. You must ensure that the query string provided is an exact match of the entity id from TOM, which you can find by using the search_tom_for_entities function",
        name: "get_information_for_entity",
        parameters: { query: "string" },
        fn: async (ops: any) => {
            let { query } = ops.params;
            let tmp = await common.tes.cloud.node.tom.all_relationships_for_entity(query) as any;
            debug.add('er_result', tmp);
            return tmp;
        },
        return_type: "object"
    },

    {
        enabled: false,
        description: "Connect to the bash websocket server. The bash websocket server exposes an API for running bash commands on machine.",
        name: "connect_to_bash_server",
        parameters: null,
        fn: async (ops: any) => {
            BASH_CLIENT = await bashr.connect_client();
            return "done";
        },
        return_type: "string"
    },

    {
        enabled: false,
        description: "Runs a bash command using the bash server. Need to connect first. You can then provide any unix bash command to be executed, in order to accomplish the desired task. Please be careful and do not issue any dangerous commands that could harm the underlying system.",
        name: "run_bash_command",
        parameters: { command: "string" },
        fn: async (ops: any) => {
            return await BASH_CLIENT.runCommand(ops.params.command);
        },
        return_type: "string"
    },

    {
        enabled: false,
        description: `Retrieves a practice question give the test number and question number. Must pass the question_num and test_num parameters`,
        name: "get_practice_question",
        parameters: { test_num: "number", question_num: "number" },
        fn: async (ops: any) => {
            return await get_practice_question(ops.params);
        },
        return_type: "any"
    },

    {
        enabled: false,
        description: `
Creates a new Tidyscripts log entry for the user.

1. Tidyscripts logs are stored inside "collections" in the database. Each log has a name and a path
2. All log names are in snake_case
3. When the user requests to store a log, you should first call the "get_user_collections" function to determines if the log already exists
4. If it does not then create it using the "initialize_user_log" function, then proceed
5. If it does exist then proceed
6. You will need to first accumulate text from the user before passing that text to this function.
7. In addition, you should pass the user_initiation_string, which is the original text the user provided that led to the initiation of the log
8. Finally, you should provide the log_path which is a forward slash delimited string
	`,
        name: "create_user_log_entry",
        parameters: { text: "string", user_initiation_string: "string", log_path: "string" },
        fn: async (ops: any) => {
            let { text, user_initiation_string, log_path } = ops.params;
            ops.util.log(ops);
            let path = log_path.split("/").filter(Boolean);
            if (path[0] != "tidyscripts") {
                return "please make sure the path starts with tidyscripts and is separated by forward slashes";
            }

            path = path.splice(1);

            await tidyscripts_log({ text, user_initiation_string, path });
            return "done";
        },
        return_type: "string"
    },

    {
        enabled: false,
        description: "Initializes a user log/collection. Takes the name of the log, in snake_case",
        name: "initialize_user_log",
        parameters: { name: "string" },
        fn: async (ops: any) => {
            let { name } = ops;
            let log = ops.util.log;
            log(`Request to create log: ${name}`);
            let text = `creating the ${name} log`;
            let path = ["logs", name];
            let user_initiation_string = null;

            await tidyscripts_log({ text, path, user_initiation_string });  //auto adds app-id
            return "done";
        },
        return_type: "string"
    },

    {
        enabled: false,
        description: "Retrieves existing Tidyscripts database collections",
        name: "get_user_collections",
        parameters: null,
        fn: async (ops: any) => {
            return await fnu.get_tidyscripts_collections();
        },
        return_type: "string"
    },

    {
        enabled: false,
        description: "Searches a particular log/collection. Provide the search terms as a comma separated string like term1,term2,term3,etc. ",
        name: "search_user_log",
        parameters: { name: "string", search_terms: "string" },
        fn: async (ops: any) => {
            let { name, search_terms } = ops;
            let { log } = ops.util;
            log('searching');
            log(ops);
            return fbu.search_user_collection("tidyscripts", ["logs", name], search_terms.split(",").map((y: string) => y.trim()).filter(Boolean));
        },
        return_type: "any"
    },

    {
        enabled: false,
        description: "Retrieves an entire log/collection. You should opt to search instead of retrieving the entire collection unless the user specifically has requested to retrieve the whole collection",
        name: "get_whole_user_collection",
        parameters: { name: "string" },
        fn: async (ops: any) => {
            let { name } = ops.params;
            return fbu.get_user_collection({ app_id: "tidyscripts", path: ["logs", name] });
        },
        return_type: "any"
    },

    {
        enabled: false,
        description: `
           Runs a function_template by using its name and arguments
	`,
        name: "run_function_template",
        parameters: {
            template_name: "string",
            template_args: "array"
        },

        fn: async (ops: any) => {
            let { template_name, template_args } = ops.params;
            let {
                log,
                collect_args,
                handle_function_call,
                get_var,
            } = ops.util;

            log(`Request to run function template: ${template_name}, with args`);
            log(template_args);

            //now we need to actually have the function template object !
            log(`Attempting to get template object: ${template_name}`);
            let { error, result } = await handle_function_call({
                name: "get_function_template_object_test",
                parameters: { name: template_name }
            });

            if (error) { throw (error) }

            //if it ran well then result should contain the id of the template
            log(`Retrieved template id : ${result}`);
            //and we can get a ref to it like this:
            let template = get_var(result);
            debug.add("template", template);

            //destructure out
            let { name, function_args, function_name } = template;

            //build the template args dic
            log(`Collecting args`);
            let arg_dic = collect_args(template_args);

            //resolve the function_args
            // NOTE: resolve_function_args_array was removed with template system migration
            let resolved_function_args = function_args; // Stub - this function is disabled
            let collected_function_args = collect_args(resolved_function_args);

            //run it
            debug.add('template_run_info', {
                template,
                function_args,
                resolved_function_args,
                function_name,
                collected_function_args,
                arg_dic
            });

            /*
            let template_result =  await handle_function_call({
        name : function_name,
        parameters : collected_function_args
            });
            */

            return false;
        },
        return_type: "any"
    },

    {
        enabled: false,
        description: `
Execute multiple functions serially in a single step.
Later functions can reference the results of earlier functions using $N syntax.

Parameters:
- calls: array of function call objects, each with:
  - function_name: string (name of function to call)
  - function_args: array of strings (same format as Cortex outputs)
- return_indices: (optional) array of numbers specifying which results to return
  - If omitted, returns all results
  - Example: [0, 2] returns only results from 1st and 3rd functions

Reference syntax in function_args:
- Use "$0" to reference result from first function (index 0)
- Use "$1" to reference result from second function (index 1)
- Use "@hash_id" to reference CortexRAM variables (auto-resolved by collect_args)
- etc.

Example:
calls: [
  {
    function_name: "compute_embedding",
    function_args: ["text", "hello world"]
  },
  {
    function_name: "array_nth_value",
    function_args: ["a", "$0", "n", "5"]
  }
]

The second call uses "$0" which will be replaced with the result from compute_embedding.

Returns: Array of results (all or filtered by return_indices)
Each result: { function_name, error, result, execution_time_ms }
	`,
        name: "multicall",
        parameters: {
            calls: "array",             // Array of {function_name, function_args: string[]}
            return_indices: "array"     // Optional array of indices to return
        },
        fn: async (ops: any) => {
            var { calls, return_indices } = ops.params;
            const { handle_function_call, collect_args, log } = ops.util;


            log(`Executing ${calls.length} functions serially`);

            const results: any[] = [];
            const startTime = Date.now();

            // Helper to resolve $N references in function_args
            const resolve_result_references = (args: any[]): any[] => {
                return args.map(arg => {
                    // Check if arg is a result reference like "$0", "$1", etc.
                    if (typeof arg === 'string' && arg.match(/^\$\d+$/)) {
                        const index = parseInt(arg.substring(1));
                        if (index >= 0 && index < results.length) {
                            log(`Resolving ${arg} to result at index ${index}`);
                            //return result
                            return results[index].result;
                        } else {
                            log(`Warning: ${arg} references invalid index`);
                            return arg;  // Return as-is if invalid
                        }
                    }
                    return arg;
                });
            };

            // Execute functions serially
            for (let i = 0; i < calls.length; i++) {
                const call = calls[i];
                const callStartTime = Date.now();

                log(`Executing function ${i + 1}/${calls.length}: ${call.function_name}`);

                // Resolve any $N references in function_args
                const resolved_args = resolve_result_references(call.function_args);

                // Use collect_args to convert string array to parameters object
                // This also handles @identifier CortexRAM references automatically
                const parameters = collect_args(resolved_args);

                // Call the function
                const result = await handle_function_call({
                    name: call.function_name,
                    parameters: parameters
                });

                const functionResult = {
                    function_name: call.function_name,
                    error: result.error || false,
                    result: result.result,
                    execution_time_ms: Date.now() - callStartTime
                };

                results.push(functionResult);

                // Fail fast on error
                if (result.error) {
                    const totalTime = Date.now() - startTime;
                    log(`Stopping execution due to error in ${call.function_name}`);

                    // Filter results if return_indices specified
                    const filtered = filter_results(results, return_indices);

                    return {
                        total_execution_time_ms: totalTime,
                        completed: i + 1,
                        total: calls.length,
                        error: `Failed at function ${i + 1} (${call.function_name}): ${result.error}`,
                        results: filtered
                    };
                }
            }

            const totalTime = Date.now() - startTime;
            log(`All functions completed successfully in ${totalTime}ms`);

            // Filter results if return_indices specified
            const filtered = filter_results(results, return_indices);

            return {
                total_execution_time_ms: totalTime,
                completed: calls.length,
                total: calls.length,
                error: false,
                results: filtered
            };

            // Helper to filter results by indices
            function filter_results(results: any[], indices: number[] | null | undefined): any[] {
                if (!indices || indices.length === 0) {
                    return results;  // Return all
                }
                return indices
                    .filter(idx => idx >= 0 && idx < results.length)
                    .map(idx => results[idx]);
            }
        },
        return_type: "object"
    }
];
