/**
 * src/bash/BashProcessManager.ts
 *
 * Manages a single long-running Bash process.
 * - Spawns the process
 * - Exposes sendCommand() to feed commands into stdin, where each call also includes its own delimiter
 * - Parses stdout for that provided delimiter and emits 'commandComplete' when it’s found
 * - Emits real-time stdout/stderr events
 * - Allows graceful shutdown
 */

import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { EventEmitter } from 'events';

export interface BashProcessManagerEvents {
  stdout: (data: string) => void;
  stderr: (data: string) => void;
  error: (error: Error) => void;
  close: (code: number | null) => void;
  commandComplete: (command: string, output: string) => void;
}

export class BashProcessManager extends EventEmitter {
  private bashProcess: ChildProcessWithoutNullStreams;

  // Buffer for accumulating stdout data
  private stdoutBuffer = '';

  // Track the current command’s identifier
  private currentCommand: string | null = null;

  // Track the current delimiter to detect
  private currentDelimiter: string | null = null;

  constructor(shellPath: string = '/bin/bash') {
    super();

    // Spawn a long-lived Bash process
    this.bashProcess = spawn(shellPath, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Listen to stdout
    this.bashProcess.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      this.stdoutBuffer += text;

      // Emit 'stdout' for real-time streaming
      this.emit('stdout', text);

      // Attempt to parse the delimiter if set
      this.parseDelimiter();
    });

    // Listen to stderr
    this.bashProcess.stderr.on('data', (chunk) => {
      this.emit('stderr', chunk.toString());
    });

    // Listen for process errors
    this.bashProcess.on('error', (err) => {
      this.emit('error', err);
    });

    // Listen for the process closing
    this.bashProcess.on('close', (code) => {
      this.emit('close', code);
    });
  }

  /**
   * Writes a command to the Bash process's stdin, requiring a delimiter argument.
   * This delimiter is echoed by Bash at the end of the command, which we use to detect completion.
   *
   * @param command The shell command to execute
   * @param delimiter A unique string that we echo to mark the command's completion in stdout
   *
   * Example usage:
   *   const delimiter = `__END__${Date.now()}__`;
   *   bashManager.sendCommand('ls -l', delimiter);
   */
  public sendCommand(command: string, delimiter: string): void {
    // Store for later use when parsing
    this.currentCommand = command;
    this.currentDelimiter = delimiter;

    // Append an echo of the delimiter to the command
    // so the shell prints the delimiter once the command is done
    const wrappedCommand = `${command} ; echo ${delimiter}`;
    this.bashProcess.stdin.write(wrappedCommand + '\n');
  }

  /**
   * Closes the Bash process by ending stdin. This usually signals Bash
   * to exit once it has processed any remaining commands.
   */
  public close(): void {
    this.bashProcess.stdin.end();
  }

  /**
   * Checks stdoutBuffer for the currentDelimiter. If found, everything up to (but not including)
   * the delimiter is considered the command’s output. Emitting 'commandComplete' means the command ended.
   */
  private parseDelimiter(): void {
    // No delimiter set, nothing to parse
    if (!this.currentDelimiter) return;

    let delimiterIndex = this.stdoutBuffer.indexOf(this.currentDelimiter);
    while (delimiterIndex !== -1) {
      // All output up to the delimiter is considered command output
      const commandOutput = this.stdoutBuffer.slice(0, delimiterIndex);

      // Emit an event that the command is complete, with the command and its output
      this.emit('commandComplete', this.currentCommand, commandOutput);

      // Remove that part + the delimiter from the buffer
      this.stdoutBuffer = this.stdoutBuffer.slice(
        delimiterIndex + this.currentDelimiter!.length
      );

      // Reset current command/delimiter so we don’t parse them again
      this.currentCommand = null;
      this.currentDelimiter = null;

      // Look for any subsequent occurrence of the same delimiter (rare, but possible)
      delimiterIndex = this.stdoutBuffer.indexOf(this.currentDelimiter || '');
    }
  }
}
