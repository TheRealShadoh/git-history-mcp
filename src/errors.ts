import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';

/**
 * Base error class for all MCP-related errors
 */
export class MCPError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public data?: unknown
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

/**
 * Validation error for invalid input parameters
 */
export class ValidationError extends MCPError {
  constructor(message: string, data?: unknown) {
    super(message, ErrorCode.InvalidParams, data);
    this.name = 'ValidationError';
  }
}

/**
 * Repository error for git-related issues
 */
export class RepositoryError extends MCPError {
  constructor(message: string, data?: unknown) {
    super(message, ErrorCode.InternalError, data);
    this.name = 'RepositoryError';
  }
}

/**
 * API error for external service issues
 */
export class ApiError extends MCPError {
  constructor(message: string, public statusCode?: number, data?: unknown) {
    super(message, ErrorCode.InternalError, data);
    this.name = 'ApiError';
  }
}

/**
 * File system error for I/O operations
 */
export class FileSystemError extends MCPError {
  constructor(message: string, data?: unknown) {
    super(message, ErrorCode.InternalError, data);
    this.name = 'FileSystemError';
  }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends MCPError {
  constructor(message: string, data?: unknown) {
    super(message, ErrorCode.MethodNotFound, data);
    this.name = 'NotFoundError';
  }
}

/**
 * Configuration error for missing or invalid config
 */
export class ConfigurationError extends MCPError {
  constructor(message: string, data?: unknown) {
    super(message, ErrorCode.InvalidRequest, data);
    this.name = 'ConfigurationError';
  }
}

/**
 * Convert any error to an MCP-compatible error response
 */
export function toMCPError(error: unknown): MCPError {
  if (error instanceof MCPError) {
    return error;
  }

  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return new ValidationError(error.message);
    }
    
    if (error.message.includes('not found') || error.message.includes('does not exist')) {
      return new NotFoundError(error.message);
    }
    
    if (error.message.includes('git') || error.message.includes('repository')) {
      return new RepositoryError(error.message);
    }
    
    // Default to internal error
    return new MCPError(error.message, ErrorCode.InternalError);
  }

  // Handle non-Error objects
  return new MCPError(
    'An unknown error occurred',
    ErrorCode.InternalError,
    error
  );
}

/**
 * Error handler wrapper for MCP tool handlers
 */
export async function handleToolError<T>(
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw toMCPError(error);
  }
}