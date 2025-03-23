/**
 * src/BashWebClient.ts
 *
 * A TypeScript class for a browser-based client that communicates
 * with the Bash WebSocket server. It sends commands (with a unique
 * delimiter) and handles streaming output in real time.
 */

import { EventEmitter } from 'events';
import { CommandRequest, ServerMessage } from './types/messages';
import { generateDelimiter } from './utils/generateDelimiter';

/**
 * BashWebClient Events:
 *  - 'open': WebSocket connected
 *  - 'close': WebSocket closed
 *  - 'error': WebSocket error or server error
 *  - 'stdout': partial standard output from the server
 *  - 'stderr': partial standard error output from the server
 *  - 'commandComplete': final output when the command ends
 */
interface BashWebClientEvents {
  open: () => void;
  close: () => void;
  error: (err: Error) => void;
  stdout: (data: string) => void;
  stderr: (data: string) => void;
  commandComplete: (command: string, output: string) => void;
}

export class BashWebClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;

  constructor() {
    super();
  }

  /**
   * Connect to the server via WebSocket.
   * @param url The WebSocket URL, e.g. "ws://localhost:8080"
   * @returns A promise that resolves once the connection is open.
   */
  public connect(url: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.ws) {
        return reject(new Error('WebSocket is already initialized.'));
      }

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.emit('open');
        resolve();
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.emit('close');
      };

      this.ws.onerror = (evt) => {
        const error = new Error(`WebSocket error: ${evt}`);
        this.emit('error', error);
        reject(error);
      };

      this.ws.onmessage = (evt) => {
        this.handleServerMessage(evt.data);
      };
    });
  }

  /**
   * Disconnect from the server by closing the WebSocket.
   */
  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  /**
   * Sends a command to the server, automatically generating a unique delimiter.
   * @param command The shell command to run (e.g., "ls -la")
   * @returns A promise that resolves to the command's final output (captured up to delimiter).
   */
  public runCommand(command: string): Promise<string> {
    if (!this.isConnected || !this.ws) {
      return Promise.reject(new Error('WebSocket is not connected.'));
    }

    // Generate a unique delimiter
    const delimiter = generateDelimiter();

    // Construct our outgoing message
    const payload: CommandRequest = {
      command,
      delimiter
    };

    return new Promise<string>((resolve, reject) => {
      // We'll track the "commandComplete" for this specific delimiter
      const onCommandComplete = (cmd: string, output: string) => {
        // If it matches our command, resolve
        if (cmd === command) {
          // Cleanup event listener to avoid leaks
          this.off('commandComplete', onCommandComplete as any);
          resolve(output);
        }
      };

      // If there's an error from the server, you might want to handle that
      const onError = (err: Error) => {
        this.off('commandComplete', onCommandComplete as any);
        reject(err);
      };

      this.on('commandComplete', onCommandComplete as any);
      this.on('error', onError);

      // Send the JSON-encoded command
      this.ws!.send(JSON.stringify(payload));
    });
  }

  /**
   * Internal method to parse a message from the server and emit the corresponding event.
   * @param data Raw data (string) from onmessage
   */
  private handleServerMessage(data: any) {
    let msg;
    try {
      msg = JSON.parse(data) as ServerMessage;
    } catch (error) {
      // Malformed JSON or unexpected format
      this.emit('error', new Error('Failed to parse server message.'));
      return;
    }

    switch (msg.type) {
      case 'stdout':
        this.emit('stdout', msg.data);
        break;
      case 'stderr':
        this.emit('stderr', msg.data);
        break;
      case 'error':
        // Could interpret `msg.data` as an error message
        this.emit('error', new Error(msg.data));
        break;
      case 'close':
        // Server might have closed the bash process or signaled shutdown
        this.emit('close');
        break;
      case 'commandComplete':
        // The server includes { command, output }
        if (msg.command && msg.output !== undefined) {
          this.emit('commandComplete', msg.command, msg.output);
        }
        break;
      default:
        this.emit('error', new Error(`Unknown message type: ${msg.type}`));
        break;
    }
  }
}

