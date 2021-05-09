
import  {Logger } from "./logger.ts" 


export var params = { 
    suppress_log : false , 
} 



let log = Logger("params") 


export function suppress_log() {
    log("Suppressing logs")
    params.suppress_log = true  ; 
} 

export function enable_log() {
    params.suppress_log = false ; 
    log("Enabling logs")    
} 
