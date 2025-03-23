/**
 * src/index.ts
 *
 * The main entry point for this web client library. 
 * Re-exports the key classes, functions, and types so consumers 
 * can import them from 'my-bash-web-client' (or whatever the final package name is).
 */

// If you need to re-export specific types or utilities, you can do so here.
// For example:
// export { CommandRequest, WebSocketMessage } from './types/messages';
// export { generateDelimiter } from './utils/generateDelimiter';


import { BashWebClient } from './BashWebClient';


export async function connect_client() {
    const client = new BashWebClient();

    client.on('open', () => {
	console.log('Connected to server.');
    });
    client.on('close', () => {
	console.log('Connection closed.');
    });
    client.on('stdout', (data) => {
	console.log('[STDOUT]', data);
    });
    client.on('stderr', (data) => {
	console.warn('[STDERR]', data);
    });
    client.on('commandComplete', (command, output) => {
	console.log(`[COMMAND COMPLETE] "${command}"`);
	console.log('Final Output:', output);
    });
    client.on('error', (err) => {
	console.error('[ERROR]', err);
    });

    await client.connect('ws://localhost:8080'); // or wss://... for secure websockets
    console.log('WebSocket is now open, ready for commands.');
    return client; 

}


export {BashWebClient}  ; 
