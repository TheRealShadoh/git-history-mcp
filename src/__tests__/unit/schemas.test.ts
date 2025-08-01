import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  parseGitHistorySchema,
  generateDetailedIssuesSchema,
  getCommitDiffSchema,
  exportMarkdownToPdfSchema,
  setRepositoryPathSchema,
  markIssueCreatedSchema,
} from '../../schemas/index.js';

describe('Tool Schemas', () => {
  describe('parseGitHistorySchema', () => {
    it('should validate valid input', () => {
      const input = { since_days: 30 };
      const result = parseGitHistorySchema.parse(input);
      expect(result.since_days).toBe(30);
    });

    it('should use default value when not provided', () => {
      const input = {};
      const result = parseGitHistorySchema.parse(input);
      expect(result.since_days).toBe(90);
    });

    it('should reject invalid since_days', () => {
      expect(() => parseGitHistorySchema.parse({ since_days: 0 }))
        .toThrow('Number must be greater than or equal to 1');
      
      expect(() => parseGitHistorySchema.parse({ since_days: 4000 }))
        .toThrow('Number must be less than or equal to 3650');
      
      expect(() => parseGitHistorySchema.parse({ since_days: 'invalid' }))
        .toThrow('Expected number, received string');
    });
  });

  describe('getCommitDiffSchema', () => {
    it('should validate valid commit SHA', () => {
      const validSHAs = [
        { commit_sha: 'abc123f' }, // 7 chars
        { commit_sha: '1234567890abcdef1234567890abcdef12345678' }, // 40 chars
        { commit_sha: 'ABCDEF1234567890' }, // uppercase
      ];

      validSHAs.forEach(input => {
        const result = getCommitDiffSchema.parse(input);
        expect(result.commit_sha).toBe(input.commit_sha);
      });
    });

    it('should reject invalid commit SHA', () => {
      const invalidSHAs = [
        { commit_sha: 'abc12' }, // too short
        { commit_sha: 'xyz123!' }, // invalid character
        { commit_sha: 'g123456' }, // invalid hex character
        { commit_sha: '' }, // empty
      ];

      invalidSHAs.forEach(input => {
        expect(() => getCommitDiffSchema.parse(input))
          .toThrow('Invalid commit SHA');
      });
    });

    it('should validate context_lines', () => {
      const input = { commit_sha: 'abc123f', context_lines: 5 };
      const result = getCommitDiffSchema.parse(input);
      expect(result.context_lines).toBe(5);
    });
  });

  describe('exportMarkdownToPdfSchema', () => {
    it('should validate valid PDF export options', () => {
      const input = {
        markdown_content: '# Test Document',
        output_filename: 'test-report.pdf',
        options: {
          format: 'A4',
          margin: {
            top: '20mm',
            right: '15mm',
            bottom: '20mm',
            left: '15mm',
          },
          landscape: true,
        },
      };

      const result = exportMarkdownToPdfSchema.parse(input);
      expect(result.markdown_content).toBe('# Test Document');
      expect(result.output_filename).toBe('test-report.pdf');
      expect(result.options?.format).toBe('A4');
      expect(result.options?.landscape).toBe(true);
    });

    it('should reject invalid filename', () => {
      const invalidFilenames = [
        'test.txt', // wrong extension
        'test report.pdf', // space in filename
        'test/report.pdf', // path separator
        '.pdf', // no name
        'test.PDF', // uppercase extension
      ];

      invalidFilenames.forEach(filename => {
        expect(() => exportMarkdownToPdfSchema.parse({
          markdown_content: 'test',
          output_filename: filename,
        })).toThrow('Must be a valid PDF filename');
      });
    });

    it('should use default values for options', () => {
      const input = {
        markdown_content: 'test',
        output_filename: 'test.pdf',
      };

      const result = exportMarkdownToPdfSchema.parse(input);
      expect(result.options).toBeUndefined();
    });
  });

  describe('setRepositoryPathSchema', () => {
    it('should validate path is provided', () => {
      const input = { path: '/path/to/repo' };
      const result = setRepositoryPathSchema.parse(input);
      expect(result.path).toBe('/path/to/repo');
    });

    it('should reject empty path', () => {
      expect(() => setRepositoryPathSchema.parse({ path: '' }))
        .toThrow('String must contain at least 1 character');
    });
  });

  describe('markIssueCreatedSchema', () => {
    it('should validate all required fields', () => {
      const input = {
        branch_name: 'feature/test',
        commit_sha: 'abc123f',
        issue_url: 'https://github.com/org/repo/issues/123',
        issue_number: 123,
        platform: 'github',
      };

      const result = markIssueCreatedSchema.parse(input);
      expect(result.branch_name).toBe('feature/test');
      expect(result.issue_number).toBe(123);
      expect(result.platform).toBe('github');
    });

    it('should use default platform', () => {
      const input = {
        branch_name: 'feature/test',
        commit_sha: 'abc123f',
        issue_url: 'https://github.com/org/repo/issues/123',
        issue_number: 123,
      };

      const result = markIssueCreatedSchema.parse(input);
      expect(result.platform).toBe('github');
    });

    it('should validate platform enum', () => {
      const validPlatforms = ['github', 'gitlab', 'jira', 'other'];
      
      validPlatforms.forEach(platform => {
        const input = {
          branch_name: 'feature/test',
          commit_sha: 'abc123f',
          issue_url: 'https://example.com/issues/123',
          issue_number: 123,
          platform,
        };
        
        const result = markIssueCreatedSchema.parse(input);
        expect(result.platform).toBe(platform);
      });

      // Invalid platform
      expect(() => markIssueCreatedSchema.parse({
        branch_name: 'feature/test',
        commit_sha: 'abc123f',
        issue_url: 'https://example.com/issues/123',
        issue_number: 123,
        platform: 'invalid',
      })).toThrow();
    });

    it('should validate issue URL format', () => {
      expect(() => markIssueCreatedSchema.parse({
        branch_name: 'feature/test',
        commit_sha: 'abc123f',
        issue_url: 'not-a-url',
        issue_number: 123,
      })).toThrow('Invalid url');
    });

    it('should validate issue number is positive integer', () => {
      expect(() => markIssueCreatedSchema.parse({
        branch_name: 'feature/test',
        commit_sha: 'abc123f',
        issue_url: 'https://example.com/issues/123',
        issue_number: -1,
      })).toThrow('Number must be greater than 0');

      expect(() => markIssueCreatedSchema.parse({
        branch_name: 'feature/test',
        commit_sha: 'abc123f',
        issue_url: 'https://example.com/issues/123',
        issue_number: 1.5,
      })).toThrow('Expected integer');
    });
  });
});