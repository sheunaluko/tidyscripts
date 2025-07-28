/* 
    Tidyscripts Evaluation Server client API
*/

import {get_logger}  from "./logger";
import * as debug from "./util/debug";

const log = get_logger({ id: "tes" });

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


export async function cloud_tes_call(call: CallData): Promise<any> {
    
    const url = "/api/tes";

    debug.add("cloud_tes_call.request", call);
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
    debug.add("cloud_tes_call.response", result);
    log("Received result");

    return result;
}


/**
 * Build a dynamic proxy that forwards property accesses and calls
 * to the local TES server via local_tes_call().
 */
function make_local_proxy(path: string[] = []): any {
    const proxyTarget = () => { /* no-op */ };
    return new Proxy(proxyTarget, {
        get(_target, prop: string | symbol) {
            // Avoid treating root proxy as a Promise
            if (prop === 'then' && path.length === 0) {
                return undefined;
            }
            // Forward symbol-keyed properties to the target
            if (typeof prop === 'symbol') {
                return Reflect.get(proxyTarget, prop);
            }
            // Recurse into nested path
            return make_local_proxy(path.concat(prop.toString()));
        },
        apply(_target, _thisArg, args: any[]) {
            // Finally invoke the remote call
            return local_tes_call({ fn_path: path, fn_args: args });
        }
    });
}



/**
 * Build a dynamic proxy that forwards property accesses and calls
 * to the local TES server via local_tes_call().
 */
function make_cloud_proxy(path: string[] = []): any {
    const proxyTarget = () => { /* no-op */ };
    return new Proxy(proxyTarget, {
        get(_target, prop: string | symbol) {
            // Avoid treating root proxy as a Promise
            if (prop === 'then' && path.length === 0) {
                return undefined;
            }
            // Forward symbol-keyed properties to the target
            if (typeof prop === 'symbol') {
                return Reflect.get(proxyTarget, prop);
            }
            // Recurse into nested path
            return make_cloud_proxy(path.concat(prop.toString()));
        },
        apply(_target, _thisArg, args: any[]) {
            // Finally invoke the remote call
            return cloud_tes_call({ fn_path: path, fn_args: args });
        }
    });
}



/**
 * Root proxy exposing all TES-callable functions under .common, .node, etc.
 */
export const localhost = make_local_proxy();
export const cloud = make_cloud_proxy();
