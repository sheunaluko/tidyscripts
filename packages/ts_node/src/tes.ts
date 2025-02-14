/**
 * TES (Tidyscripts Evaluation Server)  
 * 
 * Exposes Tidyscripts Node and Common Libs via a server http interface 
 * Sun Feb  9 20:09:55 CST 2025
 * Made with LoVe by Sheun Aluko MD  
 */

import * as common from "tidyscripts_common" 

const log = common.logger.get_logger({id: "tes"}) ; 

/**
 * Starts the server on the specified port 
 */ 
export function start_server(port : number) {
    log(`Initializing server on port: ${port}`) ;
    
} 
