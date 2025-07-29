export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: Date;
  parentHashes: string[];
  isMerge: boolean;
  branchName?: string;
  changes: CommitChanges;
}

export interface CommitChanges {
  filesChanged: string[];
  insertions: number;
  deletions: number;
  fileChanges: FileChange[];
  summary: string;
}

export interface FileChange {
  filename: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  insertions: number;
  deletions: number;
  patch?: string;
}

export interface FeatureBranch {
  name: string;
  commits: GitCommit[];
  mergeCommit: GitCommit;
  mergedDate: Date;
  description: string;
  status: 'merged' | 'closed';
  contributors: Contributor[];
  pullRequestInfo?: PullRequestInfo;
  keyTakeaways?: string[];
}

export interface Contributor {
  name: string;
  email: string;
  commitCount: number;
  linesAdded: number;
  linesRemoved: number;
  role: 'author' | 'co-author' | 'merger';
}

export interface PullRequestInfo {
  title?: string;
  number?: string;
  mergedBy?: string;
  reviewers?: string[];
  source?: string;
}

export interface DetailedIssueData {
  // Core Information
  title: string;
  description: string;
  
  // Branch Information
  branch: string;
  mergeCommitHash: string;
  mergedDate: string;
  
  // Contributors
  contributors: {
    name: string;
    role: string;
    commits: number;
    linesChanged: number;
  }[];
  
  // Change Summary
  changeSummary: {
    filesModified: number;
    linesAdded: number;
    linesRemoved: number;
    totalChanges: number;
    commits: number;
  };
  
  // Overview and Analysis
  overview: string;
  keyFeatures: string[];
  technicalImplementation: string[];
  benefits: string[];
  
  // Time Estimate
  timeEstimate: {
    minHours: number;
    maxHours: number;
    breakdown: {
      task: string;
      hours: number;
    }[];
  };
  
  // Code Diffs
  codeDiffs?: {
    file: string;
    changes: string;
    analysis: string;
  }[];
  
  // GitLab Integration
  labels: string[];
  assignees?: string[];
  state: 'opened' | 'closed';
  milestone?: string;
  dueDate?: string;
  weight?: number;
  
  // Tracking
  processedCommitIds: string[];
}

export interface ProcessedIssue {
  commitHash: string;  // Changed from compound key to just commit hash
  branchName: string;
  issueId?: number;
  created: boolean;
  createdAt: Date;
  error?: string;
}

export interface IssueGenerationConfig {
  sinceDays: number;
  filterProcessed: boolean;
  includeCodeDiffs: boolean;
  maxDiffSize: number;
  defaultState: 'opened' | 'closed';
  defaultLabels: string[];
  timeEstimateMultiplier: number;
  templatePrompts?: {
    overview?: string;
    keyFeatures?: string;
    technicalImplementation?: string;
    benefits?: string;
    timeEstimate?: string;
  };
}

export interface IssueTemplate {
  name: string;
  description: string;
  template: string;
  variables: string[];
}