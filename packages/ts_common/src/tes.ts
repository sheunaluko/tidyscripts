/* 
    Tidyscripts Evaluation Server client API
*/

import * as common from "tidyscripts_common";

const log = common.logger.get_logger({ id: "tes" });
const debug = common.util.debug;

interface CallData {
    fn_path: string[];  // path to the function that should be called (starts with node or common)
    fn_args: any[];     // array of arguments to pass to the function
}

const local_url = 'localhost';
const local_port = 8001;

export async function local_tes_call(call: CallData): Promise<any> {
    
    const url = `http://${local_url}:${local_port}/call`;

    debug.add("local_tes_call.request", call);
    log(`POST ${url}`);

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(call),
    });

    if (!response.ok) {
        const errorText = await response.text();
        log(`Error response: ${response.status} ${response.statusText} - ${errorText}`);
        throw new Error(`TES call failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    debug.add("local_tes_call.response", result);
    log("Received result");

    return result;
}
