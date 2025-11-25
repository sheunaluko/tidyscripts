/**
 * TES2 (Tidyscripts Evaluation Server v2)
 *
 * Exposes Tidyscripts Node and Common Libs via server http interface
 * + WebSocket server for real-time client-to-client message broadcasting
 * Sun Feb  9 20:09:55 CST 2025
 * Made with LoVe by Sheun Aluko MD
 */

import common from "../../packages/ts_common/dist/index" ;
import node   from "../../packages/ts_node/dist/index" ;
import * as dev    from "./index"
import http from "http"   ;
import { WebSocketServer, WebSocket } from 'ws';
import { execute_tes_call, CallData } from "./shared/executor" ;

const log   = common.logger.get_logger({id: "tes2"}) ;


/**
 * Services a TES function call (delegates to shared executor)
 */
async function handle_tes_call(callData : CallData) {
    return execute_tes_call(callData);
}


/**
 * Starts the HTTP server and WebSocket server on the specified ports
 */
export function start_server(httpPort : number, wsPort : number) {
    log(`Initializing HTTP server on port: ${httpPort}`) ;
    log(`Initializing WebSocket server on port: ${wsPort}`) ;

    // HTTP Server
    var httpServer = http.createServer((req, res) => {

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

    httpServer.listen(httpPort, () => {
	log(`HTTP Server running at http://localhost:${httpPort}/`);
    });

    // WebSocket Server
    const wss = new WebSocketServer({ port: wsPort });
    const clients = new Set<WebSocket>();

    wss.on('connection', (ws: WebSocket) => {
        log(`New WebSocket client connected. Total clients: ${clients.size + 1}`);

        // Add client to the set
        clients.add(ws);

        // Handle incoming messages
        ws.on('message', (data: Buffer) => {
            const message = data.toString();
            log(`Received message: ${message}`);

            // Broadcast to all other clients (excluding sender)
            clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(message);
                }
            });
        });

        // Handle client disconnect
        ws.on('close', () => {
            clients.delete(ws);
            log(`Client disconnected. Total clients: ${clients.size}`);
        });

        // Handle errors
        ws.on('error', (error) => {
            log(`WebSocket error: ${error.message}`);
            clients.delete(ws);
        });
    });

    log(`WebSocket Server running at ws://localhost:${wsPort}/`);

    return { httpServer, wss }

}

export async function run_server(httpPort: number, wsPort: number) {
    var servers = start_server(httpPort, wsPort);
    let resolver
    var p = new Promise( (resolve,reject) => {
	resolver = resolve
    })

    return resolver ;

}
