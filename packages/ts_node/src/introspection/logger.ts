/**
 * Logging utility for introspection system
 *
 * Provides structured logging with levels, context, and performance tracking.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

interface LogContext {
  file?: string;
  nodeId?: number;
  nodeName?: string;
  operation?: string;
  [key: string]: any;
}

class Logger {
  private level: LogLevel = LogLevel.INFO;
  private timers: Map<string, number> = new Map();

  setLevel(level: LogLevel) {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  debug(message: string, context?: LogContext) {
    if (this.level <= LogLevel.DEBUG) {
      this.log('DEBUG', message, context);
    }
  }

  info(message: string, context?: LogContext) {
    if (this.level <= LogLevel.INFO) {
      this.log('INFO', message, context);
    }
  }

  warn(message: string, context?: LogContext) {
    if (this.level <= LogLevel.WARN) {
      this.log('WARN', message, context, true);
    }
  }

  error(message: string, error?: Error, context?: LogContext) {
    if (this.level <= LogLevel.ERROR) {
      this.log('ERROR', message, context, true);
      if (error && error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
  }

  private log(level: string, message: string, context?: LogContext, isError = false) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;

    const output = isError ? console.error : console.log;

    if (context && Object.keys(context).length > 0) {
      output(`${prefix} ${message}`, context);
    } else {
      output(`${prefix} ${message}`);
    }
  }

  // Performance tracking
  startTimer(label: string) {
    this.timers.set(label, Date.now());
    this.debug(`Timer started: ${label}`);
  }

  endTimer(label: string): number {
    const start = this.timers.get(label);
    if (!start) {
      this.warn(`Timer '${label}' was not started`);
      return 0;
    }

    const duration = Date.now() - start;
    this.timers.delete(label);
    this.debug(`Timer ended: ${label} (${duration}ms)`);
    return duration;
  }

  logTiming(label: string, durationMs: number) {
    if (this.level <= LogLevel.INFO) {
      console.log(`⏱️  ${label}: ${durationMs}ms (${(durationMs / 1000).toFixed(2)}s)`);
    }
  }

  // Contextual error logging
  logNodeError(operation: string, nodeName: string, nodeId: number, filePath: string, error: Error) {
    this.error(
      `Failed to ${operation} node`,
      error,
      {
        operation,
        nodeName,
        nodeId,
        filePath,
        errorMessage: error.message,
      }
    );
  }

  logFileError(operation: string, filePath: string, error: Error) {
    this.error(
      `Failed to ${operation} file`,
      error,
      {
        operation,
        filePath,
        errorMessage: error.message,
      }
    );
  }

  // Progress logging
  logProgress(current: number, total: number, item: string) {
    if (this.level <= LogLevel.INFO) {
      const percent = total > 0 ? ((current / total) * 100).toFixed(1) : '0.0';
      console.log(`[${current}/${total}] (${percent}%) ${item}`);
    }
  }

  // Success/failure markers
  success(message: string, context?: LogContext) {
    this.info(`✓ ${message}`, context);
  }

  failure(message: string, error?: Error, context?: LogContext) {
    this.error(`✗ ${message}`, error, context);
  }
}

// Global logger instance
export const logger = new Logger();

// Convenience function to set log level from environment
export function initializeLogger() {
  const envLevel = process.env.TS_INTROSPECTION_LOG_LEVEL?.toUpperCase();

  switch (envLevel) {
    case 'DEBUG':
      logger.setLevel(LogLevel.DEBUG);
      break;
    case 'INFO':
      logger.setLevel(LogLevel.INFO);
      break;
    case 'WARN':
      logger.setLevel(LogLevel.WARN);
      break;
    case 'ERROR':
      logger.setLevel(LogLevel.ERROR);
      break;
    case 'SILENT':
      logger.setLevel(LogLevel.SILENT);
      break;
    default:
      logger.setLevel(LogLevel.INFO);
  }

  logger.debug('Logger initialized', { level: LogLevel[logger.getLevel()] });
}
