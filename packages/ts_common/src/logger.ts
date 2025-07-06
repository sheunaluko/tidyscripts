

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

      if (t == undefined ) {
	  console.log(`[${id}]:: undefined`)
	  return 
      } 

      if (t == null ) {
	  console.log(`[${id}]:: null`)
	  return 
      } 
      
      
    if (t.toString() == '[object Object]' ) {
      console.log(`[${id}]:: > `)
      console.log(t) 
    } else { 
      console.log(`[${id}]:: ${t}`)
    }


      
  }
}

export function color_string(color : string, text : string) {
    let code = colors[color] ;
    let reset = colors['reset'] ; 
    return `${code}${text}${reset}` ; 
}

export var colors : any = { 
    // ANSI escape codes for common colors
    red : '\x1b[31m' , 
    green :'\x1b[32m' ,
    reset : '\x1b[0m' ,  // Resets formatting to default
}

