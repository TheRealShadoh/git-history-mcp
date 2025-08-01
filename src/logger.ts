/**
 * Logger module for MCP server
 * All output goes to stderr to avoid corrupting JSON-RPC communication on stdout
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private enabled: boolean;

  private constructor() {
    // Check environment variables for configuration
    this.enabled = process.env.MCP_DEBUG === 'true' || process.env.DEBUG === 'true';
    
    const level = process.env.MCP_LOG_LEVEL || process.env.LOG_LEVEL || 'info';
    this.logLevel = this.parseLogLevel(level);
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'error':
        return LogLevel.ERROR;
      case 'warn':
      case 'warning':
        return LogLevel.WARN;
      case 'info':
        return LogLevel.INFO;
      case 'debug':
        return LogLevel.DEBUG;
      default:
        return LogLevel.INFO;
    }
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.enabled || level > this.logLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level];
    const prefix = `[${timestamp}] [${levelStr}]`;

    // Format the message with optional arguments
    let formattedMessage = message;
    if (args.length > 0) {
      // Convert objects to JSON for better readability
      const formattedArgs = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
      );
      formattedMessage = `${message} ${formattedArgs.join(' ')}`;
    }

    // Always output to stderr to avoid corrupting stdout
    console.error(`${prefix} ${formattedMessage}`);
  }

  error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  // Performance logging helpers
  startTimer(label: string): () => void {
    const start = Date.now();
    this.debug(`Timer started: ${label}`);
    
    return () => {
      const duration = Date.now() - start;
      this.debug(`Timer ended: ${label} (${duration}ms)`);
    };
  }

  // Request/Response logging for MCP
  logRequest(toolName: string, args: any): void {
    this.debug(`MCP Request: ${toolName}`, args);
  }

  logResponse(toolName: string, success: boolean, duration?: number): void {
    const status = success ? 'SUCCESS' : 'FAILURE';
    const durationStr = duration ? ` (${duration}ms)` : '';
    this.debug(`MCP Response: ${toolName} - ${status}${durationStr}`);
  }

  logError(toolName: string, error: Error): void {
    this.error(`MCP Error in ${toolName}: ${error.message}`, {
      stack: error.stack,
      name: error.name,
    });
  }
}

// Export a singleton instance
export const logger = Logger.getInstance();