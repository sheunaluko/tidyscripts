/**
 * src/server/WebSocketHandlers.ts
 *
 * This module exports functions that handle incoming WebSocket messages.
 * It parses messages, validates commands, and interacts with the BashProcessManager.
 * 
 * Usage:
 *  - From WebSocketServer, when a new message arrives, call handleMessage(...)
 */

import WebSocket from 'ws';
import { BashProcessManager } from '../bash/BashProcessManager';
import { CommandMessage } from '../types';

/**
 * Handle a single raw message string from a WebSocket client.
 * @param rawData The raw message data received over the socket (usually a JSON string)
 * @param socket The WebSocket client that sent the message
 * @param bashManager The BashProcessManager to send commands to
 */
export function handleMessage(
  rawData: string,
  socket: WebSocket,
  bashManager: BashProcessManager
) {
  try {
    // Attempt to parse the incoming JSON
    const message: CommandMessage = JSON.parse(rawData);

    // Validate that it has a 'command' field
    if (!message.command) {
      throw new Error('No command specified in message.');
    }

    // Send the command to our Bash process
    bashManager.sendCommand(message.command);
  } catch (error) {
    console.error('[WebSocketHandlers] Error handling message:', error);
    // Send an error response back to the client
    socket.send(JSON.stringify({ error: (error as Error).message }));
  }
}
