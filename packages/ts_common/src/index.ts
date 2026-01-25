import * as fp from './fp'
import * as logger from './logger'
import * as R from 'ramda'
import * as trading from './trading/index'
import * as util from './util/index'
import * as asnc from "./async"
import * as apis from "./apis"
import * as midi_encoder from "./midi_encoder"
import * as dates from "./dates"
import * as external from "./external"
import * as insights from "./apis/insights"
import * as reflections from "./apis/reflections"

export * as tes from "./tes"
export * as tobi from "./tobi"

const log = logger.get_logger({ id: "common" });

export async function get_json_from_url(url: string, data: any) {

    let full_url = `${url}?${new URLSearchParams(data)}`
    log(`Querying with url= ${full_url}`)

    const response = await fetch(full_url, {
	method: 'GET', // *GET, POST, PUT, DELETE, etc.
	cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
	//credentials: 'same-origin', // include, *same-origin, omit
	headers: {
	    'Content-Type': 'application/json'
	    // 'Content-Type': 'application/x-www-form-urlencoded',
	},
	redirect: 'follow', // manual, *follow, error
	//referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    });
    return response.json();
}



export {
    fp,
    logger,
    R,
    trading,
    util,
    asnc,
    apis,
    midi_encoder,
    dates ,
    external,
    insights,
    reflections
}

// Re-export commonly used types for easier imports
export type { InsightsEvent, InsightsConfig } from "./types/insights"
export type {
  SandboxExecutor,
  SandboxResult,
  SandboxLog,
  SandboxEvent,
  SandboxRuntimeEvent
} from "./apis/cortex/sandbox_interface"
export type { Cortex } from "./apis/cortex/cortex"


