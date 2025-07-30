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

// New types for enhanced functionality
export interface CommitDiff {
  commitHash: string;
  shortHash: string;
  author: string;
  date: Date;
  message: string;
  parentHash?: string;
  stats: {
    filesChanged: number;
    insertions: number;
    deletions: number;
  };
  files: FileDiff[];
}

export interface FileDiff {
  filename: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  oldPath?: string; // For renamed files
  additions: number;
  deletions: number;
  changes: number;
  patch: string;
  language?: string;
  binary: boolean;
}

export interface ChangelogEntry {
  version?: string;
  date: Date;
  commits: {
    hash: string;
    type: 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'perf' | 'test' | 'chore' | 'build' | 'ci';
    scope?: string;
    subject: string;
    body?: string;
    breaking?: boolean;
    author: string;
    pr?: string;
  }[];
  summary: {
    features: string[];
    fixes: string[];
    breaking: string[];
    other: string[];
  };
}

export interface ImprovedCommitMessage {
  original: string;
  suggested: string;
  type: string;
  scope?: string;
  subject: string;
  body?: string[];
  reasoning: string;
  confidence: number;
}

export interface CodeOwnership {
  file: string;
  primaryOwner: {
    name: string;
    email: string;
    percentage: number;
    lastModified: Date;
  };
  contributors: {
    name: string;
    email: string;
    commits: number;
    linesContributed: number;
    percentage: number;
  }[];
  expertise: {
    domain: string;
    score: number;
  }[];
}

export interface SimilarCommit {
  hash: string;
  message: string;
  author: string;
  date: Date;
  similarity: {
    score: number;
    fileOverlap: number;
    contentSimilarity: number;
    reasons: string[];
  };
}

export interface ReleaseNotes {
  fromRef: string;
  toRef: string;
  period: {
    from: Date;
    to: Date;
  };
  summary: {
    commits: number;
    contributors: number;
    filesChanged: number;
    additions: number;
    deletions: number;
  };
  highlights: {
    majorFeatures: string[];
    improvements: string[];
    bugFixes: string[];
    breakingChanges: string[];
  };
  contributors: {
    name: string;
    commits: number;
    additions: number;
    deletions: number;
  }[];
  changelog: ChangelogEntry[];
}

export interface CommitPattern {
  author: string;
  patterns: {
    commitFrequency: {
      daily: number[];
      weekly: number[];
      hourly: number[];
    };
    commitSize: {
      average: number;
      median: number;
      large: number;
      small: number;
    };
    fileTypes: {
      [key: string]: number;
    };
    commitTypes: {
      [key: string]: number;
    };
  };
  productivity: {
    avgCommitsPerDay: number;
    avgLinesPerCommit: number;
    peakHours: number[];
    peakDays: string[];
  };
}

// Git History Modification Types
export interface HistoryModificationSafetyCheck {
  safe: boolean;
  reason?: string;
  warnings: string[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface CommitRewritePreview {
  commitHash: string;
  shortHash: string;
  originalMessage: string;
  suggestedMessage: string;
  confidence: number;
  reasoning: string;
  changeType: 'format' | 'enhancement' | 'complete_rewrite';
  preserveMetadata: {
    author: boolean;
    date: boolean;
    coAuthors: boolean;
  };
}

export interface HistoryRewritePlan {
  targetCommits: CommitRewritePreview[];
  safetyAssessment: HistoryModificationSafetyCheck;
  backupStrategy: {
    branchName: string;
    tagName: string;
    remoteBackup: boolean;
  };
  impactAnalysis: {
    affectedCommits: number;
    affectedBranches: string[];
    dependentBranches: string[];
    estimatedDuration: string;
    reversible: boolean;
  };
  confirmationToken: string;
  expiresAt: Date;
}

export interface HistoryRewriteResult {
  success: boolean;
  processedCommits: {
    originalHash: string;
    newHash?: string;
    success: boolean;
    error?: string;
  }[];
  backupRefs: {
    branch?: string;
    tag?: string;
  };
  rollbackInstructions?: string;
  warnings: string[];
  duration: number;
}