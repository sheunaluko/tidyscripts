import  {Logger } from "./logger" 


let init_log_pass : string[] = [] ; 

export var params = { 
    suppress_log : false , 
    log_pass : init_log_pass , 
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

export function filter_log(ids : string[]) {
    log(`Filtering logs: ${JSON.stringify(ids)}`)        
    params.log_pass = ids ; 
    params.suppress_log = true; 
} 

