import * as dsp from './dsp'
import * as performance from "./performance"
import * as debug from "./debug"
import * as bytes from "./bytes" 

export {
    dsp ,
    debug,
    performance ,
    bytes 
}


declare var Date : any ; 


//  - - https://github.com/flexdinesh/browser-or-node/blob/master/src/index.js

/**
 * Returns true if the code is executing in the browser 
 */
export function is_browser() {

    return ( typeof window !== "undefined" && typeof window.document !== "undefined" ) 
} 

/**
 * Returns true if the code is executing in node  
 */
export function is_node() {
    return ( typeof process !== "undefined" &&  process.versions != null &&   process.versions.node != null ) 
} 


/**
 * Returns unix timestamp in ms
 */
export function unix_timestamp_ms() {
    return Number(new Date()) 
} 



