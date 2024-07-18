import {get_logger} from "../logger"  ;

/*
 * Debugger module 
 *
 * @packageDocumentation 
 */

export var log = get_logger({id: "debug" } )
export var db : { [k:string] : any }  = {}  

export function add(id : string, val : any ) { 
    db[id] = val
    log(`Added :${id}`)
} 

export function get(id : string) { 
    return db[id]
} 








