/**
 * TES (Tidyscripts Evaluation Server)  
 * 
 * Exposes Tidyscripts Node and Common Libs via a server http interface 
 * Sun Feb  9 20:09:55 CST 2025
 * Made with LoVe by Sheun Aluko MD  
 */

import common from "../../packages/ts_common/dist/index" ;
import node   from "../../packages/ts_node/dist/index" ;
import * as dev    from "./index"
import http from "http"   ;
import { execute_tes_call, CallData } from "./shared/executor" ;

const log   = common.logger.get_logger({id: "tes"}) ; 


/*

   Want to upgrade this file to also expose an MCP server that claude can use
   All MCP functionality should be tucked away and imported from mcp subfolder
   Adding functions available to MCP should be easy and clear
   First function to add will be a tes call
   where path = [ dev, surreal, get_node_info_for_query ]
   args = [ query , limit ] 
   
   
   
 */


/**
 * Services a TES function call (delegates to shared executor)
 */
async function handle_tes_call(callData : CallData) {
    return execute_tes_call(callData);
}


/**
 * Starts the server on the specified port 
 */ 
export function start_server(port : number) {
    log(`Initializing server on port: ${port}`) ;

    var server = http.createServer((req, res) => {

	// Set CORS headers to allow any origin
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

	// Handle preflight OPTIONS requests
	if (req.method === 'OPTIONS') {
	    log(`Writing options response...`) 
            res.writeHead(204);  // No Content response
            res.end();
            return;
	}

	
	if (req.method === 'POST' && req.url === '/call') {
            let body = '';

            // Collect the data chunks
            req.on('data', chunk => {
		body += chunk;
            });

            // Handle the end of the request and parse JSON
            req.on('end', async () => {
		try {
                    const jsonData = JSON.parse(body);
                    log(`Received JSON: ${JSON.stringify(jsonData)}`)  ; 

		    //here we have to process the jsonData object (which should be a function call)
		    //will need to optimize endpoint security
		    let return_data = await handle_tes_call(jsonData) ; 

                    // Respond with success and echo the data
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(return_data));
		    
		    
		} catch (err) {
                    // Handle invalid JSON
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
			error: 'Invalid JSON'
                    }));
		}
            });
	} else {
            // Handle other routes or methods
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Route not found');
	}
    });

    server.listen(port, () => {
	log(`Server running at http://localhost:${port}/`);
    });

    return server 
    
} 

export async function run_server(port :number ) {
    var server = start_server(port) ;
    let resolver 
    var p = new Promise( (resolve,reject) => {
	resolver = resolve
    })

    return resolver ; 
    
}
