import { FeatureBranch, GitCommit } from '../../types.js';

export const sampleCommit: GitCommit = {
  hash: 'abc123def456',
  message: 'feat: add user authentication system',
  author: 'John Doe',
  date: new Date('2024-01-15T10:30:00Z'),
  parentHashes: ['parent123'],
  isMerge: false,
  branchName: 'feature/user-authentication',
  changes: {
    insertions: 150,
    deletions: 25,
    filesChanged: ['src/auth.ts', 'src/login.tsx', 'src/types.ts'],
    summary: '3 files changed, 150 insertions(+), 25 deletions(-)',
    fileChanges: [
      {
        filename: 'src/auth.ts',
        status: 'added',
        insertions: 120,
        deletions: 0,
        patch: '@@ -0,0 +120,120 @@\n+export class AuthService {\n+  // Authentication logic\n+}',
      },
      {
        filename: 'src/login.tsx',
        status: 'added',
        insertions: 25,
        deletions: 0,
        patch: '@@ -0,0 +25,25 @@\n+export const LoginComponent = () => {\n+  // Login UI\n+}',
      },
      {
        filename: 'src/types.ts',
        status: 'modified',
        insertions: 5,
        deletions: 25,
        patch: '@@ -10,25 +10,5 @@\n-export interface OldInterface {}\n+export interface User {\n+  id: string;\n+  email: string;\n+}',
      },
    ],
  },
};

export const sampleFeatureBranch: FeatureBranch = {
  name: 'feature/user-authentication',
  commits: [sampleCommit],
  mergeCommit: {
    hash: 'merge456def789',
    message: 'Merge branch "feature/user-authentication"',
    author: 'John Doe',
    date: new Date('2024-01-20T14:00:00Z'),
    parentHashes: ['abc123def456', 'main123'],
    isMerge: true,
    changes: {
      insertions: 0,
      deletions: 0,
      filesChanged: [],
      summary: 'Merge commit',
      fileChanges: [],
    },
  },
  mergedDate: new Date('2024-01-20T14:00:00Z'),
  description: 'Added user authentication system with login component',
  status: 'merged',
  contributors: [
    {
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'author',
      commitCount: 1,
      linesAdded: 150,
      linesRemoved: 25,
    },
  ],
  keyTakeaways: [
    'User authentication system',
    'Login component',
    'User type definitions',
  ],
};

export const sampleBugfixBranch: FeatureBranch = {
  name: 'bugfix/login-validation',
  commits: [
    {
      hash: 'def456ghi789',
      message: 'fix: resolve login validation issue',
      author: 'Jane Smith',
      date: new Date('2024-01-18T09:00:00Z'),
      parentHashes: ['parent456'],
      isMerge: false,
      branchName: 'bugfix/login-validation',
      changes: {
        insertions: 10,
        deletions: 5,
        filesChanged: ['src/login.tsx'],
        summary: '1 file changed, 10 insertions(+), 5 deletions(-)',
        fileChanges: [
          {
            filename: 'src/login.tsx',
            status: 'modified',
            insertions: 10,
            deletions: 5,
            patch: '@@ -20,5 +20,10 @@\n-if (!email) return;\n+if (!email || !isValidEmail(email)) return;',
          },
        ],
      },
    },
  ],
  mergeCommit: {
    hash: 'merge789abc123',
    message: 'Merge branch "bugfix/login-validation"',
    author: 'Jane Smith',
    date: new Date('2024-01-18T09:15:00Z'),
    parentHashes: ['def456ghi789', 'main456'],
    isMerge: true,
    changes: {
      insertions: 0,
      deletions: 0,
      filesChanged: [],
      summary: 'Merge commit',
      fileChanges: [],
    },
  },
  mergedDate: new Date('2024-01-18T09:15:00Z'),
  description: 'Fixed login validation issue',
  status: 'merged',
  contributors: [
    {
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      role: 'author',
      commitCount: 1,
      linesAdded: 10,
      linesRemoved: 5,
    },
  ],
  keyTakeaways: ['Login validation fix'],
};

export const sampleBranches: FeatureBranch[] = [
  sampleFeatureBranch,
  sampleBugfixBranch,
];