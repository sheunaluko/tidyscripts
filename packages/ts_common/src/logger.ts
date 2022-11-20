

export interface LoggerOps {
  id : string
}

const log = get_logger({id:"log"}) ;

var suppress_map : {[k:string] : boolean } = { } ;

/**
 * Suppresses the logs of the specified id 
 */
export function suppress(id : string, reason : string) {
  suppress_map[id] = true ;
  log(`Suppressing ${id}, reason=${reason || "none_given"}`) ;
} 

/**
 * Unsuppress the logs of the specified id 
 */
export function unsuppress(id : string) {
  suppress_map[id] = false ;
  log(`Unsuppressing ${id}`) ;
} 


/**
 * Creates a logger object based on input options. 
 * This is used to help separate and manage logs from submodules. 
 * ```typescript
 * const log = get_logger({id: "util"}) 
 * log("brackets contain the submodule name") // => [util]:: brackets contain the submodule name
 * ```
 */
export function get_logger(ops : LoggerOps) {
  let { id  } = ops ;
  return function(t : any) {

    if ( suppress_map[id] ) { return }  ; //suppress if applicable 
    
    if (t.toString() == '[object Object]' ) {
      console.log(`[${id}]:: > `)
      console.log(t) 
    } else { 
      console.log(`[${id}]:: ${t}`)
    } 
  }
} 
