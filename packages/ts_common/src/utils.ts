

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
 * Performs fetch request and then converts the result to json 
 */
export async function get_json(url : string){
    let res =  await fetch( url )  ; 
    return await res.json() ; 
}

  
