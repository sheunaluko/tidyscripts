/**
 * src/types/messages.ts
 *
 * Defines TypeScript interfaces for the messages exchanged between
 * the web client and the Bash WebSocket server.
 */

/**
 * Outgoing message sent from the client to the server when initiating a command.
 * Must include:
 *  - command: the shell command to run
 *  - delimiter: a unique marker to detect the end of command output
 */
export interface CommandRequest {
  command: string;
  delimiter: string;
}

/**
 * Possible message types sent by the server back to the client.
 * This will help the client library parse events appropriately.
 */
export type ServerMessageType =
  | 'stdout'
  | 'stderr'
  | 'error'
  | 'close'
  | 'commandComplete';

/**
 * Incoming message received from the server.
 * - type indicates the category of data (stdout, stderr, etc.)
 * - data is the main text payload (partial output, error info, etc.)
 * - command and output fields appear on 'commandComplete', indicating which command finished and the final output
 */
export interface ServerMessage {
  type: ServerMessageType;
  data: string;
  command?: string;  // present if type === 'commandComplete'
  output?: string;   // present if type === 'commandComplete'
}
