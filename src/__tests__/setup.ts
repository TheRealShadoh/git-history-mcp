import { beforeAll, afterAll, vi } from 'vitest';

// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.MCP_DEBUG = 'false'; // Disable logging in tests unless specifically needed
  
  // Mock console methods to prevent output during tests
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  // Restore console methods
  vi.restoreAllMocks();
});