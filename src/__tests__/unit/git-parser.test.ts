import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GitHistoryParser } from '../../git-parser.js';
import { FeatureBranch, CommitChanges } from '../../types.js';
import simpleGit from 'simple-git';

// Mock simple-git
vi.mock('simple-git');

describe('GitHistoryParser', () => {
  let parser: GitHistoryParser;
  let mockGit: any;

  beforeEach(() => {
    // Create mock git instance
    mockGit = {
      branch: vi.fn(),
      log: vi.fn(),
      show: vi.fn(),
      raw: vi.fn(),
      diff: vi.fn(),
    };

    // Mock simple-git to return our mock instance
    (simpleGit as any).mockReturnValue(mockGit);

    parser = new GitHistoryParser('/test/repo');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getFeatureBranches', () => {
    it('should retrieve feature branches', async () => {
      // Mock git branch response
      mockGit.branch.mockResolvedValue({
        all: ['main', 'feature/test-branch', 'bugfix/fix-issue'],
        current: 'main',
      });

      // Mock git log response for feature branch
      mockGit.log.mockResolvedValue({
        all: [
          {
            hash: 'abc123',
            date: '2024-01-15T10:00:00Z',
            message: 'feat: add new feature',
            author_name: 'Test User',
            author_email: 'test@example.com',
          },
        ],
        total: 1,
      });

      const branches = await parser.getFeatureBranches(30);

      expect(Array.isArray(branches)).toBe(true);
      expect(mockGit.branch).toHaveBeenCalled();
    });

    it('should handle empty repository', async () => {
      mockGit.branch.mockResolvedValue({
        all: ['main'],
        current: 'main',
      });

      mockGit.log.mockResolvedValue({
        all: [],
        total: 0,
      });

      const branches = await parser.getFeatureBranches(30);

      expect(Array.isArray(branches)).toBe(true);
    });

    it('should throw error for invalid repository', async () => {
      mockGit.branch.mockRejectedValue(new Error('not a git repository'));

      await expect(
        parser.getFeatureBranches(30)
      ).rejects.toThrow('not a git repository');
    });
  });

  describe('parseCommitChanges', () => {
    it('should parse commit changes successfully', async () => {
      const mockDiffStat = '3 files changed, 150 insertions(+), 25 deletions(-)';
      const mockDiffNumstat = '120\t0\tsrc/auth.ts\n25\t0\tsrc/login.tsx\n5\t25\tsrc/types.ts';
      const mockDiffNameStatus = 'A\tsrc/auth.ts\nA\tsrc/login.tsx\nM\tsrc/types.ts';
      const mockFullDiff = 'diff --git a/src/auth.ts b/src/auth.ts\nnew file mode 100644\nindex 0000000..abc123\n--- /dev/null\n+++ b/src/auth.ts\n@@ -0,0 +120,120 @@\n+export class AuthService {};';

      mockGit.diff.mockImplementation((args: string[]) => {
        if (args.includes('--stat')) return Promise.resolve(mockDiffStat);
        if (args.includes('--numstat')) return Promise.resolve(mockDiffNumstat);
        if (args.includes('--name-status')) return Promise.resolve(mockDiffNameStatus);
        return Promise.resolve(mockFullDiff);
      });

      const changes = await parser.parseCommitChanges('abc123');

      expect(changes.insertions).toBe(150);
      expect(changes.deletions).toBe(25);
      expect(changes.filesChanged).toContain('src/auth.ts');
      expect(changes.fileChanges).toHaveLength(3);
      expect(changes.summary).toContain('files changed');
    });

    it('should handle commits with no changes', async () => {
      mockGit.diff.mockResolvedValue('');

      const changes = await parser.parseCommitChanges('abc123');

      expect(changes.insertions).toBe(0);
      expect(changes.deletions).toBe(0);
      expect(changes.filesChanged).toHaveLength(0);
      expect(changes.fileChanges).toHaveLength(0);
    });
  });

  describe('getAllMergeCommits', () => {
    it('should retrieve merge commits', async () => {
      mockGit.log.mockResolvedValue({
        all: [
          {
            hash: 'merge123',
            date: '2024-01-15T10:00:00Z',
            message: 'Merge branch "feature/test"',
            author_name: 'Test User',
            author_email: 'test@example.com',
          },
        ],
        total: 1,
      });

      const commits = await parser.getAllMergeCommits(30);

      expect(Array.isArray(commits)).toBe(true);
      expect(mockGit.log).toHaveBeenCalled();
    });
  });
});