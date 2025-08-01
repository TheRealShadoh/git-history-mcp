import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import { z, ZodError } from 'zod';
import { toolSchemas } from './schemas/index.js';

export class ValidationError extends McpError {
  constructor(message: string, data?: unknown) {
    super(ErrorCode.InvalidParams, message, data);
  }
}

/**
 * Validate tool arguments using Zod schema
 */
export function validateToolArguments<T extends keyof typeof toolSchemas>(
  toolName: T,
  args: unknown
): z.infer<typeof toolSchemas[T]> {
  const schema = toolSchemas[toolName];
  if (!schema) {
    throw new ValidationError(`No schema found for tool: ${toolName}`);
  }

  try {
    return schema.parse(args);
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues.map(issue => 
        `${issue.path.join('.')}: ${issue.message}`
      ).join(', ');
      throw new ValidationError(`Invalid arguments: ${issues}`, error.issues);
    }
    throw error;
  }
}

export class Validator {
  static validateNumber(value: any, fieldName: string, min?: number, max?: number): number {
    if (value === undefined || value === null) {
      return value; // Let the caller handle defaults
    }

    const num = Number(value);
    if (isNaN(num)) {
      throw new ValidationError(`${fieldName} must be a valid number`);
    }

    if (min !== undefined && num < min) {
      throw new ValidationError(`${fieldName} must be at least ${min}`);
    }

    if (max !== undefined && num > max) {
      throw new ValidationError(`${fieldName} must be at most ${max}`);
    }

    return num;
  }

  static validateString(value: any, fieldName: string, allowEmpty = false): string {
    if (value === undefined || value === null) {
      return value; // Let the caller handle defaults
    }

    if (typeof value !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`);
    }

    if (!allowEmpty && value.trim() === '') {
      throw new ValidationError(`${fieldName} cannot be empty`);
    }

    return value;
  }

  static validateBoolean(value: any, fieldName: string): boolean {
    if (value === undefined || value === null) {
      return value; // Let the caller handle defaults
    }

    if (typeof value !== 'boolean') {
      throw new ValidationError(`${fieldName} must be a boolean`);
    }

    return value;
  }

  static validateArray(value: any, fieldName: string, itemValidator?: (item: any) => any): any[] {
    if (value === undefined || value === null) {
      return value; // Let the caller handle defaults
    }

    if (!Array.isArray(value)) {
      throw new ValidationError(`${fieldName} must be an array`);
    }

    if (itemValidator) {
      return value.map((item, index) => {
        try {
          return itemValidator(item);
        } catch (error) {
          throw new ValidationError(
            `${fieldName}[${index}]: ${error instanceof Error ? error.message : 'Invalid item'}`
          );
        }
      });
    }

    return value;
  }

  static validateEnum<T>(value: any, fieldName: string, validValues: T[]): T {
    if (value === undefined || value === null) {
      return value; // Let the caller handle defaults
    }

    if (!validValues.includes(value)) {
      throw new ValidationError(
        `${fieldName} must be one of: ${validValues.map(v => JSON.stringify(v)).join(', ')}`
      );
    }

    return value as T;
  }

  static async validateFilePath(filePath: string, fieldName: string, mustExist = true): Promise<string> {
    if (!filePath) {
      throw new ValidationError(`${fieldName} is required`);
    }

    const resolvedPath = path.resolve(filePath);

    if (mustExist) {
      const exists = await fs.pathExists(resolvedPath);
      if (!exists) {
        throw new ValidationError(`${fieldName}: File not found at ${filePath}`);
      }
    }

    return resolvedPath;
  }

  static async validateDirectoryPath(dirPath: string, fieldName: string, mustExist = true): Promise<string> {
    if (!dirPath) {
      throw new ValidationError(`${fieldName} is required`);
    }

    const resolvedPath = path.resolve(dirPath);

    if (mustExist) {
      const exists = await fs.pathExists(resolvedPath);
      if (!exists) {
        throw new ValidationError(`${fieldName}: Directory not found at ${dirPath}`);
      }

      const stats = await fs.stat(resolvedPath);
      if (!stats.isDirectory()) {
        throw new ValidationError(`${fieldName}: Path is not a directory: ${dirPath}`);
      }
    }

    return resolvedPath;
  }

  static validateMargins(margins: any): any {
    if (!margins) return margins;

    if (typeof margins !== 'object') {
      throw new ValidationError('margins must be an object');
    }

    const validatedMargins: any = {};
    const marginFields = ['top', 'right', 'bottom', 'left'];

    for (const field of marginFields) {
      if (margins[field] !== undefined) {
        const value = Validator.validateString(margins[field], `margins.${field}`);
        // Validate margin format (e.g., "1in", "2cm", "10px")
        if (!/^\d+(\.\d+)?(px|in|cm|mm|pt)$/.test(value)) {
          throw new ValidationError(
            `margins.${field} must be a valid CSS margin value (e.g., "1in", "2cm", "10px")`
          );
        }
        validatedMargins[field] = value;
      }
    }

    return validatedMargins;
  }

  static validateGitHash(hash: string, fieldName: string): string {
    if (!hash) {
      throw new ValidationError(`${fieldName} is required`);
    }

    // Git hash should be 40 characters hex or abbreviated (at least 7 chars)
    if (!/^[a-f0-9]{7,40}$/i.test(hash)) {
      throw new ValidationError(`${fieldName} must be a valid git commit hash`);
    }

    return hash;
  }
}