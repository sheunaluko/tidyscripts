

import {get_logger} from "../logger"  ; 


export var db : { [k:string] : any }  = {}  



export function add(id : string, val : any ) { 
    db[id] = val 
} 

export function get(id : string) { 
    return db[id]
} 




export var log = get_logger({id: "debug" } )



