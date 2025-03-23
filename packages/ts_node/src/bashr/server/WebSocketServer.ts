/**
 * src/server/WebSocketServer.ts
 *
 * Creates and manages a WebSocket server that:
 *  - Receives incoming command messages from clients, including a delimiter
 *  - Sends them to the BashProcessManager via sendCommand(command, delimiter)
 *  - Streams Bash output (stdout/stderr) back to all connected clients
 */

import WebSocket, { WebSocketServer } from 'ws';
import { BashProcessManager } from '../bash/BashProcessManager';

/**
 * Adjust your CommandMessage definition to include the delimiter.
 * For instance, in src/types/index.ts:
 *
 * export interface CommandMessage {
 *   command: string;
 *   delimiter: string; // The marker to detect command completion
 * }
 */
interface CommandMessage {
  command: string;
  delimiter: string;
}

export class MyWebSocketServer {
  private wss: WebSocketServer;
  private bashManager: BashProcessManager;

  /**
   * Create a WebSocket server on the specified port and bind it to the given BashProcessManager.
   * @param port The port number to listen on (e.g., 8080).
   * @param bashManager An instance of BashProcessManager that manages the Bash shell.
   */
  constructor(port: number, bashManager: BashProcessManager) {
    this.bashManager = bashManager;

    // Create the server
    this.wss = new WebSocketServer({ port });

    // Handle new connections
    this.wss.on('connection', (socket) => {
      console.log('[WebSocketServer] New client connected');

      // Listen for incoming messages from this client
      socket.on('message', (rawData) => {
        try {
          const message: CommandMessage = JSON.parse(rawData.toString());

          // Ensure the message has both command and delimiter
          if (!message.command || !message.delimiter) {
            throw new Error('Message must contain both "command" and "delimiter".');
          }

          // Relay the command + delimiter to the bash manager
          this.bashManager.sendCommand(message.command, message.delimiter);
        } catch (err) {
          console.error('[WebSocketServer] Failed to parse incoming message', err);
          // Optionally send an error message back to the client
          socket.send(JSON.stringify({ error: (err as Error).message }));
        }
      });

      // If needed, handle socket close event
      socket.on('close', () => {
        console.log('[WebSocketServer] Client disconnected');
      });
    });

    // Subscribe to BashProcessManager events and broadcast to all clients
    this.bashManager.on('stdout', (data) => {
      this.broadcast({ type: 'stdout', data });
    });

    this.bashManager.on('stderr', (data) => {
      this.broadcast({ type: 'stderr', data });
    });

    this.bashManager.on('error', (error) => {
      this.broadcast({ type: 'error', data: error.message });
    });

    this.bashManager.on('close', (code) => {
      console.log(`[BashProcessManager] Process closed with code: ${code}`);
      this.broadcast({ type: 'close', data: `exit code: ${code}` });
    });

    // Listen for the new 'commandComplete' event
    this.bashManager.on('commandComplete', (cmd, output) => {
      this.broadcast({
        type: 'commandComplete',
        command: cmd,
        output,
      });
    });

    console.log(`[WebSocketServer] Listening on port ${port}`);
  }

  /**
   * Broadcast a JSON-serializable message to every connected client.
   * @param message An object that can be JSON-stringified
   */
  private broadcast(message: unknown) {
    const serialized = JSON.stringify(message);
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(serialized);
      }
    });
  }

  /**
   * Close the WebSocket server gracefully.
   * (Useful when shutting down the entire application.)
   */
  public close() {
    this.wss.close(() => {
      console.log('[WebSocketServer] Closed');
    });
  }
}
