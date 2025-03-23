/**
 * src/index.ts
 *
 * Main entry point, now wrapped in a startServer function that:
 *  - creates the BashProcessManager
 *  - starts the WebSocket server
 *  - (optionally) sets up graceful shutdown signals
 * Exporting this function allows flexible usage from other modules.
 */

import { BashProcessManager } from './bash/BashProcessManager';
import { MyWebSocketServer } from './server/WebSocketServer';

export interface ServerInstance {
  wsServer: MyWebSocketServer;
  bashManager: BashProcessManager;
  shutdown: () => void;
}

/**
 * Starts the BashProcessManager and WebSocket server on the specified port.
 * Returns an object containing the server and manager instances, plus a shutdown function.
 *
 * @param port The port number for the WebSocket server (default 8080).
 */
export function startServer(port: number = 8080): ServerInstance {
  const bashManager = new BashProcessManager('/bin/bash');
  const wsServer = new MyWebSocketServer(port, bashManager);

  // Graceful shutdown logic
  function shutdown() {
    console.log('[startServer] Shutting down...');
    wsServer.close();
    bashManager.close();
  }

  // Optionally listen for signals here
  process.on('SIGINT', () => {
    shutdown();
    // If you're running in a context that expects the app to exit, do:
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    shutdown();
    process.exit(0);
  });

  console.log(`[startServer] Server started. WebSocket listening on port ${port}`);

  return {
    wsServer,
    bashManager,
    shutdown
  };
}

/**
 * If you want to auto-start the server when the file is run directly via `ts-node`,
 * you could do something like:
 * 
 * if (require.main === module) {
 *   startServer();
 * }
 */
