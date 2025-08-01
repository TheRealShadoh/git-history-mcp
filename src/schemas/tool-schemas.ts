import { z } from 'zod';

// Git Analysis Tools Schemas
export const parseGitHistorySchema = z.object({
  since_days: z.number().min(1).max(3650).optional().default(90),
});

export const generateDetailedIssuesSchema = z.object({
  since_days: z.number().min(1).max(3650).default(90).optional(),
  filter_processed: z.boolean().default(true).optional(),
  include_code_diffs: z.boolean().default(true).optional(),
  include_hour_estimates: z.boolean().default(true).optional(),
  branch_pattern: z.string().optional(),
});

export const getCommitDiffSchema = z.object({
  commit_sha: z.string().regex(/^[a-f0-9]{7,40}$/i, 'Invalid commit SHA'),
  context_lines: z.number().min(0).max(10).default(3).optional(),
});

export const suggestCommitMessageSchema = z.object({
  commit_sha: z.string().regex(/^[a-f0-9]{7,40}$/i, 'Invalid commit SHA'),
});

export const findSimilarCommitsSchema = z.object({
  commit_sha: z.string().regex(/^[a-f0-9]{7,40}$/i, 'Invalid commit SHA'),
  threshold: z.number().min(0).max(1).default(0.7).optional(),
  limit: z.number().min(1).max(100).default(10).optional(),
});

// Documentation & Release Management Schemas
export const generateChangelogSchema = z.object({
  from_ref: z.string().min(1),
  to_ref: z.string().min(1).default('HEAD').optional(),
  format: z.enum(['markdown', 'conventional']).default('markdown').optional(),
  group_by_type: z.boolean().default(true).optional(),
});

export const generateReleaseNotesSchema = z.object({
  from_ref: z.string().min(1),
  to_ref: z.string().min(1).default('HEAD').optional(),
  include_stats: z.boolean().default(true).optional(),
  include_contributors: z.boolean().default(true).optional(),
});

// Team & Code Analysis Schemas
export const analyzeCodeOwnershipSchema = z.object({
  path: z.string().optional(),
  since_days: z.number().min(1).max(3650).default(365).optional(),
  min_contributions: z.number().min(1).default(5).optional(),
});

export const analyzeCommitPatternsSchema = z.object({
  author: z.string().optional(),
  since_days: z.number().min(1).max(3650).default(90).optional(),
  timezone: z.string().default('UTC').optional(),
});

// Repository Management Schemas
export const setRepositoryPathSchema = z.object({
  path: z.string().min(1),
});

export const cloneRepositorySchema = z.object({
  url: z.string().url(),
  path: z.string().min(1),
  branch: z.string().optional(),
  depth: z.number().min(1).optional(),
});

export const checkoutBranchSchema = z.object({
  branch: z.string().min(1),
  create: z.boolean().default(false).optional(),
});

export const pullRepositorySchema = z.object({
  remote: z.string().default('origin').optional(),
  branch: z.string().optional(),
  rebase: z.boolean().default(false).optional(),
});

// Issue Tracking Schemas
export const checkIssueExistsSchema = z.object({
  branch_name: z.string().min(1),
  commit_sha: z.string().regex(/^[a-f0-9]{7,40}$/i, 'Invalid commit SHA'),
});

export const markIssueCreatedSchema = z.object({
  branch_name: z.string().min(1),
  commit_sha: z.string().regex(/^[a-f0-9]{7,40}$/i, 'Invalid commit SHA'),
  issue_url: z.string().url(),
  issue_number: z.number().int().positive(),
  platform: z.enum(['github', 'gitlab', 'jira', 'other']).default('github'),
});

export const getIssueTrackerStatsSchema = z.object({});

export const resetIssueTrackerSchema = z.object({
  confirm: z.boolean(),
});

// Export & Utilities Schemas
export const exportMarkdownToPdfSchema = z.object({
  markdown_content: z.string().min(1),
  output_filename: z.string().regex(/^[a-zA-Z0-9_\-]+\.pdf$/, 'Must be a valid PDF filename'),
  options: z.object({
    format: z.enum(['A4', 'Letter', 'Legal']).default('Letter').optional(),
    margin: z.object({
      top: z.string().default('20mm').optional(),
      right: z.string().default('20mm').optional(),
      bottom: z.string().default('20mm').optional(),
      left: z.string().default('20mm').optional(),
    }).optional(),
    displayHeaderFooter: z.boolean().default(true).optional(),
    headerTemplate: z.string().optional(),
    footerTemplate: z.string().optional(),
    printBackground: z.boolean().default(true).optional(),
    landscape: z.boolean().default(false).optional(),
  }).optional(),
});

export const generateExecutiveDevelopmentSummarySchema = z.object({
  since_days: z.number().min(1).max(3650).default(90).optional(),
  include_charts: z.boolean().default(true).optional(),
  include_recommendations: z.boolean().default(true).optional(),
  export_pdf: z.boolean().default(false).optional(),
  output_filename: z.string().regex(/^[a-zA-Z0-9_\-]+\.pdf$/, 'Must be a valid PDF filename').optional(),
});

// Git History Modification Schemas
export const planCommitMessageRewriteSchema = z.object({
  branch: z.string().min(1),
  from_commit: z.string().regex(/^[a-f0-9]{7,40}$/i, 'Invalid commit SHA').optional(),
  dry_run: z.boolean().default(true).optional(),
});

export const executeCommitRewriteSchema = z.object({
  plan_id: z.string().min(1),
  force: z.boolean().default(false).optional(),
});

export const rollbackHistoryChangesSchema = z.object({
  backup_ref: z.string().min(1),
  branch: z.string().min(1),
  force: z.boolean().default(false).optional(),
});

// API Configuration Schemas
export const configureApiProviderSchema = z.object({
  provider: z.enum(['github', 'gitlab', 'bitbucket']),
  config: z.object({
    baseUrl: z.string().url().optional(),
    token: z.string().min(1).optional(),
    username: z.string().optional(),
    password: z.string().optional(),
  }),
});

export const getRepositoryInfoSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
});

export const getPullRequestsSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  state: z.enum(['open', 'closed', 'all']).default('open').optional(),
  page: z.number().int().positive().default(1).optional(),
  per_page: z.number().int().min(1).max(100).default(30).optional(),
});

export const getPullRequestSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  pr_number: z.number().int().positive(),
});

export const createPullRequestSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  title: z.string().min(1).max(255),
  body: z.string().optional(),
  head: z.string().min(1),
  base: z.string().min(1),
  draft: z.boolean().default(false).optional(),
});

export const getIssuesSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  state: z.enum(['open', 'closed', 'all']).default('open').optional(),
  labels: z.array(z.string()).optional(),
  assignee: z.string().optional(),
  page: z.number().int().positive().default(1).optional(),
  per_page: z.number().int().min(1).max(100).default(30).optional(),
});

export const createIssueSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  title: z.string().min(1).max(255),
  body: z.string().optional(),
  labels: z.array(z.string()).optional(),
  assignees: z.array(z.string()).optional(),
  milestone: z.number().int().positive().optional(),
});

export const getReleasesSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  page: z.number().int().positive().default(1).optional(),
  per_page: z.number().int().min(1).max(100).default(30).optional(),
});

export const createReleaseSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  tag_name: z.string().min(1),
  name: z.string().min(1),
  body: z.string().optional(),
  draft: z.boolean().default(false).optional(),
  prerelease: z.boolean().default(false).optional(),
  target_commitish: z.string().optional(),
});

export const getBranchesSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  page: z.number().int().positive().default(1).optional(),
  per_page: z.number().int().min(1).max(100).default(30).optional(),
});

export const getCommitsSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  sha: z.string().optional(),
  path: z.string().optional(),
  author: z.string().optional(),
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
  page: z.number().int().positive().default(1).optional(),
  per_page: z.number().int().min(1).max(100).default(30).optional(),
});

// Hour Estimation Schemas
export const estimateBranchHoursSchema = z.object({
  branch_name: z.string().min(1),
});

export const analyzeCopiedCodeSchema = z.object({
  branch_name: z.string().min(1),
});

export const generateAccurateExecutiveSummarySchema = z.object({
  since_days: z.number().min(1).max(3650).default(90).optional(),
  export_pdf: z.boolean().default(false).optional(),
  output_filename: z.string().regex(/^[a-zA-Z0-9_\-]+\.pdf$/, 'Must be a valid PDF filename').optional(),
});

// Export all schemas as a map for easy access
export const toolSchemas = {
  parse_git_history: parseGitHistorySchema,
  generate_detailed_issues: generateDetailedIssuesSchema,
  get_commit_diff: getCommitDiffSchema,
  suggest_commit_message: suggestCommitMessageSchema,
  find_similar_commits: findSimilarCommitsSchema,
  generate_changelog: generateChangelogSchema,
  generate_release_notes: generateReleaseNotesSchema,
  analyze_code_ownership: analyzeCodeOwnershipSchema,
  analyze_commit_patterns: analyzeCommitPatternsSchema,
  set_repository_path: setRepositoryPathSchema,
  clone_repository: cloneRepositorySchema,
  checkout_branch: checkoutBranchSchema,
  pull_repository: pullRepositorySchema,
  check_issue_exists: checkIssueExistsSchema,
  mark_issue_created: markIssueCreatedSchema,
  get_issue_tracker_stats: getIssueTrackerStatsSchema,
  reset_issue_tracker: resetIssueTrackerSchema,
  export_markdown_to_pdf: exportMarkdownToPdfSchema,
  generate_executive_development_summary: generateExecutiveDevelopmentSummarySchema,
  plan_commit_message_rewrite: planCommitMessageRewriteSchema,
  execute_commit_rewrite: executeCommitRewriteSchema,
  rollback_history_changes: rollbackHistoryChangesSchema,
  configure_api_provider: configureApiProviderSchema,
  get_repository_info: getRepositoryInfoSchema,
  get_pull_requests: getPullRequestsSchema,
  get_pull_request: getPullRequestSchema,
  create_pull_request: createPullRequestSchema,
  get_issues: getIssuesSchema,
  create_issue: createIssueSchema,
  get_releases: getReleasesSchema,
  create_release: createReleaseSchema,
  get_branches: getBranchesSchema,
  get_commits: getCommitsSchema,
  estimate_branch_hours: estimateBranchHoursSchema,
  analyze_copied_code: analyzeCopiedCodeSchema,
  generate_accurate_executive_summary: generateAccurateExecutiveSummarySchema,
} as const;

// Type exports for use in other files
export type ParseGitHistoryInput = z.infer<typeof parseGitHistorySchema>;
export type GenerateDetailedIssuesInput = z.infer<typeof generateDetailedIssuesSchema>;
export type GetCommitDiffInput = z.infer<typeof getCommitDiffSchema>;
export type ExportMarkdownToPdfInput = z.infer<typeof exportMarkdownToPdfSchema>;
// ... Add more type exports as needed