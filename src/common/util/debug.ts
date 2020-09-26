

import {Logger} from "./logger.ts" 


export var db : { [k:string] : any }  = {}  



export function add(id : string, val : any ) { 
    db[id] = val 
} 

export function get(id : string) { 
    return db[id]
} 





export var log = Logger("debug")



