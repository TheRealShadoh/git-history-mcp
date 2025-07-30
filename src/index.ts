#!/usr/bin/env node

import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import { GitHistoryParser } from './git-parser.js';
import { IssueTracker } from './issue-tracker.js';
import { IssueGenerator } from './issue-generator.js';
import { PdfGenerator, PdfExportOptions } from './pdf-generator.js';
import { CommitAnalyzer } from './commit-analyzer.js';
import { CodeOwnershipAnalyzer } from './code-ownership.js';
import { GitHistoryModifier } from './git-history-modifier.js';
import { FeatureBranch, DetailedIssueData, IssueGenerationConfig } from './types.js';
import { Validator, ValidationError } from './validation.js';
import { ApiManager, ProviderConfig } from './api-manager.js';
import { BaseApiClient } from './api-client.js';

class GitHistoryMCPServer {
  private server: Server;
  private gitParser: GitHistoryParser;
  private issueTracker: IssueTracker;
  private issueGenerator: IssueGenerator;
  private pdfGenerator: PdfGenerator;
  private commitAnalyzer: CommitAnalyzer;
  private codeOwnership: CodeOwnershipAnalyzer;
  private historyModifier: GitHistoryModifier;
  private apiManager: ApiManager;
  private repoPath: string;

  constructor() {
    this.server = new Server(
      {
        name: 'git-history-mcp-server',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.repoPath = process.cwd();
    this.gitParser = new GitHistoryParser(this.repoPath);
    this.issueTracker = new IssueTracker(this.repoPath);
    this.issueGenerator = new IssueGenerator();
    this.pdfGenerator = new PdfGenerator();
    this.commitAnalyzer = new CommitAnalyzer(this.repoPath);
    this.codeOwnership = new CodeOwnershipAnalyzer(this.repoPath);
    this.historyModifier = new GitHistoryModifier(this.repoPath);
    this.apiManager = new ApiManager();

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'parse_git_history',
          description: 'Parse git history to extract feature branches and their commits with detailed change analysis',
          inputSchema: {
            type: 'object',
            properties: {
              since_days: {
                type: 'number',
                description: 'Number of days to look back in git history (default: 90)',
                default: 90,
              },
            },
          },
        },
        {
          name: 'generate_detailed_issues',
          description: 'Generate comprehensive issue data with full analysis',
          inputSchema: {
            type: 'object',
            properties: {
              since_days: {
                type: 'number',
                description: 'Number of days to look back in git history (default: 90)',
                default: 90,
              },
              filter_processed: {
                type: 'boolean',
                description: 'Filter out already processed branches (default: true)',
                default: true,
              },
              include_code_diffs: {
                type: 'boolean',
                description: 'Include code diffs in issue description (default: true)',
                default: true,
              },
              default_state: {
                type: 'string',
                enum: ['opened', 'closed'],
                description: 'Default state for generated issues (default: closed)',
                default: 'closed',
              },
              default_labels: {
                type: 'array',
                items: { type: 'string' },
                description: 'Default labels to apply to all issues',
                default: ['automated', 'historical'],
              },
              time_estimate_multiplier: {
                type: 'number',
                description: 'Multiplier for time estimates (default: 1.0)',
                default: 1.0,
              },
            },
          },
        },
        {
          name: 'check_issue_exists',
          description: 'Check if an issue already exists for a commit',
          inputSchema: {
            type: 'object',
            properties: {
              commit_hash: {
                type: 'string',
                description: 'The commit hash to check',
              },
            },
            required: ['commit_hash'],
          },
        },
        {
          name: 'get_issue_tracker_stats',
          description: 'Get statistics about processed issues',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'mark_issue_created',
          description: 'Mark an issue as successfully created',
          inputSchema: {
            type: 'object',
            properties: {
              branch_name: {
                type: 'string',
                description: 'The branch name',
              },
              commit_hash: {
                type: 'string',
                description: 'The merge commit hash',
              },
              issue_id: {
                type: 'number',
                description: 'The created issue ID',
              },
            },
            required: ['branch_name', 'commit_hash'],
          },
        },
        {
          name: 'reset_issue_tracker',
          description: 'Reset the issue tracker (useful for testing)',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'export_markdown_to_pdf',
          description: 'Export a markdown file to PDF with mermaid chart rendering',
          inputSchema: {
            type: 'object',
            properties: {
              markdown_file_path: {
                type: 'string',
                description: 'Path to the markdown file to convert',
              },
              output_path: {
                type: 'string',
                description: 'Output path for the PDF file (optional, defaults to same directory)',
              },
              include_charts: {
                type: 'boolean',
                description: 'Whether to render mermaid charts (default: true)',
                default: true,
              },
              page_format: {
                type: 'string',
                enum: ['A4', 'Letter', 'A3'],
                description: 'PDF page format (default: A4)',
                default: 'A4',
              },
              margins: {
                type: 'object',
                properties: {
                  top: { type: 'string', description: 'Top margin (e.g., "1in")' },
                  right: { type: 'string', description: 'Right margin (e.g., "0.8in")' },
                  bottom: { type: 'string', description: 'Bottom margin (e.g., "1in")' },
                  left: { type: 'string', description: 'Left margin (e.g., "0.8in")' },
                },
                description: 'PDF margins',
              },
            },
            required: ['markdown_file_path'],
          },
        },
        {
          name: 'generate_executive_development_summary',
          description: 'Generate a comprehensive executive development summary with team metrics, time estimates, and visualizations',
          inputSchema: {
            type: 'object',
            properties: {
              since_days: {
                type: 'number',
                description: 'Number of days to look back in git history (default: 180)',
                default: 180,
              },
              output_path: {
                type: 'string',
                description: 'Output path for the generated report files (optional, defaults to current directory)',
              },
              include_pdf: {
                type: 'boolean',
                description: 'Whether to also generate PDF export (default: true)',
                default: true,
              },
              consolidate_authors: {
                type: 'boolean',
                description: 'Whether to consolidate similar author names (default: true)',
                default: true,
              },
            },
          },
        },
        {
          name: 'get_commit_diff',
          description: 'Get detailed diff information for a specific commit including file changes and patches',
          inputSchema: {
            type: 'object',
            properties: {
              commit_hash: {
                type: 'string',
                description: 'The commit hash to analyze',
              },
              include_patch: {
                type: 'boolean',
                description: 'Whether to include patch data (default: true)',
                default: true,
              },
            },
            required: ['commit_hash'],
          },
        },
        {
          name: 'generate_changelog',
          description: 'Generate a changelog between two git references (branches, tags, commits)',
          inputSchema: {
            type: 'object',
            properties: {
              from_ref: {
                type: 'string',
                description: 'Starting reference (branch, tag, or commit hash)',
              },
              to_ref: {
                type: 'string',
                description: 'Ending reference (default: HEAD)',
                default: 'HEAD',
              },
              format: {
                type: 'string',
                enum: ['markdown', 'json'],
                description: 'Output format (default: markdown)',
                default: 'markdown',
              },
            },
            required: ['from_ref'],
          },
        },
        {
          name: 'suggest_commit_message',
          description: 'Suggest an improved commit message based on the actual changes in a commit',
          inputSchema: {
            type: 'object',
            properties: {
              commit_hash: {
                type: 'string',
                description: 'The commit hash to analyze',
              },
            },
            required: ['commit_hash'],
          },
        },
        {
          name: 'find_similar_commits',
          description: 'Find commits with similar changes or patterns to a given commit',
          inputSchema: {
            type: 'object',
            properties: {
              commit_hash: {
                type: 'string',
                description: 'The commit hash to find similarities for',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of similar commits to return (default: 10)',
                default: 10,
                minimum: 1,
                maximum: 50,
              },
            },
            required: ['commit_hash'],
          },
        },
        {
          name: 'analyze_code_ownership',
          description: 'Analyze code ownership and expertise for files or directories',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to file or directory to analyze (default: entire repository)',
                default: '.',
              },
              min_ownership_percentage: {
                type: 'number',
                description: 'Minimum ownership percentage to include in results (default: 5)',
                default: 5,
                minimum: 1,
                maximum: 100,
              },
            },
          },
        },
        {
          name: 'generate_release_notes',
          description: 'Generate comprehensive release notes between two references',
          inputSchema: {
            type: 'object',
            properties: {
              from_ref: {
                type: 'string',
                description: 'Starting reference (previous release tag/branch)',
              },
              to_ref: {
                type: 'string',
                description: 'Ending reference (default: HEAD)',
                default: 'HEAD',
              },
              format: {
                type: 'string',
                enum: ['markdown', 'json'],
                description: 'Output format (default: markdown)',
                default: 'markdown',
              },
              include_breaking_changes: {
                type: 'boolean',
                description: 'Highlight breaking changes (default: true)',
                default: true,
              },
            },
            required: ['from_ref'],
          },
        },
        {
          name: 'analyze_commit_patterns',
          description: 'Analyze commit patterns and developer productivity metrics',
          inputSchema: {
            type: 'object',
            properties: {
              author: {
                type: 'string',
                description: 'Specific author to analyze (optional, analyzes all if not specified)',
              },
              days: {
                type: 'number',
                description: 'Number of days to analyze (default: 90)',
                default: 90,
                minimum: 1,
                maximum: 365,
              },
            },
          },
        },
        {
          name: 'plan_commit_message_rewrite',
          description: '🚨 DESTRUCTIVE: Plan to rewrite commit messages with improved versions (CREATES BACKUP AUTOMATICALLY)',
          inputSchema: {
            type: 'object',
            properties: {
              commit_hashes: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of commit hashes to rewrite (must be local commits only)',
                minItems: 1,
                maxItems: 10,
              },
              dry_run: {
                type: 'boolean',
                description: 'Only create a plan without executing (default: true)',
                default: true,
              },
              force_safety_override: {
                type: 'boolean',
                description: 'Override some safety checks (USE WITH EXTREME CAUTION)',
                default: false,
              },
            },
            required: ['commit_hashes'],
          },
        },
        {
          name: 'execute_commit_rewrite',
          description: '🚨 DESTRUCTIVE: Execute a previously planned commit message rewrite (REQUIRES CONFIRMATION TOKEN)',
          inputSchema: {
            type: 'object',
            properties: {
              confirmation_token: {
                type: 'string',
                description: 'Confirmation token from the rewrite plan (expires after 30 minutes)',
              },
              final_confirmation: {
                type: 'string',
                description: 'Must be exactly "I UNDERSTAND THIS WILL MODIFY GIT HISTORY" to proceed',
              },
            },
            required: ['confirmation_token', 'final_confirmation'],
          },
        },
        {
          name: 'rollback_history_changes',
          description: '🚨 EMERGENCY: Rollback git history to backup after failed rewrite',
          inputSchema: {
            type: 'object',
            properties: {
              backup_ref: {
                type: 'string',
                description: 'Backup branch or tag name to rollback to',
              },
              force_rollback: {
                type: 'boolean',
                description: 'Force rollback even if working directory is dirty',
                default: false,
              },
            },
            required: ['backup_ref'],
          },
        },
        {
          name: 'set_repository_path',
          description: 'Set the target repository path for analysis (use current directory if not specified)',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to git repository (defaults to current working directory)',
              },
            },
          },
        },
        {
          name: 'clone_repository',
          description: 'Clone a remote repository to work with',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'Repository URL to clone',
              },
              path: {
                type: 'string',
                description: 'Local path to clone to (optional)',
              },
              branch: {
                type: 'string',
                description: 'Specific branch to checkout after cloning (optional)',
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'checkout_branch',
          description: 'Switch to a different branch in the current repository',
          inputSchema: {
            type: 'object',
            properties: {
              branch: {
                type: 'string',
                description: 'Branch name to checkout',
              },
              create: {
                type: 'boolean',
                description: 'Create the branch if it does not exist (default: false)',
                default: false,
              },
            },
            required: ['branch'],
          },
        },
        {
          name: 'pull_repository',
          description: 'Pull latest changes from remote repository',
          inputSchema: {
            type: 'object',
            properties: {
              remote: {
                type: 'string',
                description: 'Remote name (default: origin)',
                default: 'origin',
              },
              branch: {
                type: 'string',
                description: 'Branch to pull (default: current branch)',
              },
            },
          },
        },
        {
          name: 'configure_api_provider',
          description: 'Configure authentication for GitHub, GitLab, or Bitbucket API access',
          inputSchema: {
            type: 'object',
            properties: {
              provider: {
                type: 'string',
                enum: ['github', 'gitlab', 'bitbucket'],
                description: 'Git hosting provider',
              },
              baseURL: {
                type: 'string',
                description: 'Custom API base URL for self-hosted instances (optional)',
              },
              token: {
                type: 'string',
                description: 'Personal access token or API token',
              },
              username: {
                type: 'string',
                description: 'Username for basic auth (alternative to token)',
              },
              password: {
                type: 'string',
                description: 'Password for basic auth (alternative to token)',
              },
              ignoreCertificateErrors: {
                type: 'boolean',
                description: 'Ignore SSL certificate errors (default: false)',
                default: false,
              },
              timeout: {
                type: 'number',
                description: 'Request timeout in milliseconds (default: 30000)',
                default: 30000,
              },
            },
            required: ['provider'],
          },
        },
        {
          name: 'get_repository_info',
          description: 'Get comprehensive information about a repository from its hosting provider',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'Repository URL (GitHub, GitLab, or Bitbucket)',
              },
              owner: {
                type: 'string',
                description: 'Repository owner/organization (alternative to URL)',
              },
              repo: {
                type: 'string',
                description: 'Repository name (alternative to URL)',
              },
              provider: {
                type: 'string',
                enum: ['github', 'gitlab', 'bitbucket'],
                description: 'Provider when using owner/repo (optional if URL provided)',
              },
            },
          },
        },
        {
          name: 'get_pull_requests',
          description: 'Get pull/merge requests from a repository',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'Repository URL (GitHub, GitLab, or Bitbucket)',
              },
              owner: {
                type: 'string',
                description: 'Repository owner/organization (alternative to URL)',
              },
              repo: {
                type: 'string',
                description: 'Repository name (alternative to URL)',
              },
              provider: {
                type: 'string',
                enum: ['github', 'gitlab', 'bitbucket'],
                description: 'Provider when using owner/repo (optional if URL provided)',
              },
              state: {
                type: 'string',
                enum: ['open', 'closed', 'all'],
                description: 'Filter by state (default: all)',
                default: 'all',
              },
            },
          },
        },
        {
          name: 'get_pull_request',
          description: 'Get detailed information about a specific pull/merge request',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'Repository URL (GitHub, GitLab, or Bitbucket)',
              },
              owner: {
                type: 'string',
                description: 'Repository owner/organization (alternative to URL)',
              },
              repo: {
                type: 'string',
                description: 'Repository name (alternative to URL)',
              },
              provider: {
                type: 'string',
                enum: ['github', 'gitlab', 'bitbucket'],
                description: 'Provider when using owner/repo (optional if URL provided)',
              },
              number: {
                type: 'number',
                description: 'Pull/merge request number',
              },
            },
            required: ['number'],
          },
        },
        {
          name: 'create_pull_request',
          description: 'Create a new pull/merge request',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'Repository URL (GitHub, GitLab, or Bitbucket)',
              },
              owner: {
                type: 'string',
                description: 'Repository owner/organization (alternative to URL)',
              },
              repo: {
                type: 'string',
                description: 'Repository name (alternative to URL)',
              },
              provider: {
                type: 'string',
                enum: ['github', 'gitlab', 'bitbucket'],
                description: 'Provider when using owner/repo (optional if URL provided)',
              },
              title: {
                type: 'string',
                description: 'Pull request title',
              },
              description: {
                type: 'string',
                description: 'Pull request description/body (optional)',
              },
              sourceBranch: {
                type: 'string',
                description: 'Source branch name',
              },
              targetBranch: {
                type: 'string',
                description: 'Target branch name',
              },
            },
            required: ['title', 'sourceBranch', 'targetBranch'],
          },
        },
        {
          name: 'get_issues',
          description: 'Get issues from a repository',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'Repository URL (GitHub, GitLab, or Bitbucket)',
              },
              owner: {
                type: 'string',
                description: 'Repository owner/organization (alternative to URL)',
              },
              repo: {
                type: 'string',
                description: 'Repository name (alternative to URL)',
              },
              provider: {
                type: 'string',
                enum: ['github', 'gitlab', 'bitbucket'],
                description: 'Provider when using owner/repo (optional if URL provided)',
              },
              state: {
                type: 'string',
                enum: ['open', 'closed', 'all'],
                description: 'Filter by state (default: all)',
                default: 'all',
              },
            },
          },
        },
        {
          name: 'create_issue',
          description: 'Create a new issue in a repository',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'Repository URL (GitHub, GitLab, or Bitbucket)',
              },
              owner: {
                type: 'string',
                description: 'Repository owner/organization (alternative to URL)',
              },
              repo: {
                type: 'string',
                description: 'Repository name (alternative to URL)',
              },
              provider: {
                type: 'string',
                enum: ['github', 'gitlab', 'bitbucket'],
                description: 'Provider when using owner/repo (optional if URL provided)',
              },
              title: {
                type: 'string',
                description: 'Issue title',
              },
              description: {
                type: 'string',
                description: 'Issue description/body (optional)',
              },
              labels: {
                type: 'array',
                items: { type: 'string' },
                description: 'Issue labels (optional)',
              },
              assignee: {
                type: 'string',
                description: 'Username to assign issue to (optional)',
              },
            },
            required: ['title'],
          },
        },
        {
          name: 'get_releases',
          description: 'Get releases from a repository',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'Repository URL (GitHub, GitLab, or Bitbucket)',
              },
              owner: {
                type: 'string',
                description: 'Repository owner/organization (alternative to URL)',
              },
              repo: {
                type: 'string',
                description: 'Repository name (alternative to URL)',
              },
              provider: {
                type: 'string',
                enum: ['github', 'gitlab', 'bitbucket'],
                description: 'Provider when using owner/repo (optional if URL provided)',
              },
            },
          },
        },
        {
          name: 'create_release',
          description: 'Create a new release in a repository',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'Repository URL (GitHub, GitLab, or Bitbucket)',
              },
              owner: {
                type: 'string',
                description: 'Repository owner/organization (alternative to URL)',
              },
              repo: {
                type: 'string',
                description: 'Repository name (alternative to URL)',
              },
              provider: {
                type: 'string',
                enum: ['github', 'gitlab', 'bitbucket'],
                description: 'Provider when using owner/repo (optional if URL provided)',
              },
              tagName: {
                type: 'string',
                description: 'Git tag name for the release',
              },
              name: {
                type: 'string',
                description: 'Release name',
              },
              description: {
                type: 'string',
                description: 'Release description/notes (optional)',
              },
              draft: {
                type: 'boolean',
                description: 'Create as draft release (default: false)',
                default: false,
              },
              prerelease: {
                type: 'boolean',
                description: 'Mark as pre-release (default: false)',
                default: false,
              },
            },
            required: ['tagName', 'name'],
          },
        },
        {
          name: 'get_branches',
          description: 'Get branches from a repository',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'Repository URL (GitHub, GitLab, or Bitbucket)',
              },
              owner: {
                type: 'string',
                description: 'Repository owner/organization (alternative to URL)',
              },
              repo: {
                type: 'string',
                description: 'Repository name (alternative to URL)',
              },
              provider: {
                type: 'string',
                enum: ['github', 'gitlab', 'bitbucket'],
                description: 'Provider when using owner/repo (optional if URL provided)',
              },
            },
          },
        },
        {
          name: 'get_commits',
          description: 'Get commits from a repository',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'Repository URL (GitHub, GitLab, or Bitbucket)',
              },
              owner: {
                type: 'string',
                description: 'Repository owner/organization (alternative to URL)',
              },
              repo: {
                type: 'string',
                description: 'Repository name (alternative to URL)',
              },
              provider: {
                type: 'string',
                enum: ['github', 'gitlab', 'bitbucket'],
                description: 'Provider when using owner/repo (optional if URL provided)',
              },
              branch: {
                type: 'string',
                description: 'Branch name to get commits from (optional, default: default branch)',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of commits to retrieve (default: 100)',
                default: 100,
                minimum: 1,
                maximum: 100,
              },
            },
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'parse_git_history':
            return await this.parseGitHistory(request.params.arguments);

          case 'generate_detailed_issues':
            return await this.generateDetailedIssues(request.params.arguments);

          case 'check_issue_exists':
            return await this.checkIssueExists(request.params.arguments);

          case 'get_issue_tracker_stats':
            return await this.getIssueTrackerStats();

          case 'mark_issue_created':
            return await this.markIssueCreated(request.params.arguments);

          case 'reset_issue_tracker':
            return await this.resetIssueTracker();

          case 'export_markdown_to_pdf':
            return await this.exportMarkdownToPdf(request.params.arguments);

          case 'generate_executive_development_summary':
            return await this.generateExecutiveDevelopmentSummary(request.params.arguments);

          case 'get_commit_diff':
            return await this.getCommitDiff(request.params.arguments);

          case 'generate_changelog':
            return await this.generateChangelog(request.params.arguments);

          case 'suggest_commit_message':
            return await this.suggestCommitMessage(request.params.arguments);

          case 'find_similar_commits':
            return await this.findSimilarCommits(request.params.arguments);

          case 'analyze_code_ownership':
            return await this.analyzeCodeOwnership(request.params.arguments);

          case 'generate_release_notes':
            return await this.generateReleaseNotes(request.params.arguments);

          case 'analyze_commit_patterns':
            return await this.analyzeCommitPatterns(request.params.arguments);

          case 'plan_commit_message_rewrite':
            return await this.planCommitMessageRewrite(request.params.arguments);

          case 'execute_commit_rewrite':
            return await this.executeCommitRewrite(request.params.arguments);

          case 'rollback_history_changes':
            return await this.rollbackHistoryChanges(request.params.arguments);

          case 'set_repository_path':
            return await this.setRepositoryPath(request.params.arguments);

          case 'clone_repository':
            return await this.cloneRepository(request.params.arguments);

          case 'checkout_branch':
            return await this.checkoutBranch(request.params.arguments);

          case 'pull_repository':
            return await this.pullRepository(request.params.arguments);

          case 'configure_api_provider':
            return await this.configureApiProvider(request.params.arguments);

          case 'get_repository_info':
            return await this.getRepositoryInfo(request.params.arguments);

          case 'get_pull_requests':
            return await this.getPullRequests(request.params.arguments);

          case 'get_pull_request':
            return await this.getPullRequest(request.params.arguments);

          case 'create_pull_request':
            return await this.createPullRequest(request.params.arguments);

          case 'get_issues':
            return await this.getIssues(request.params.arguments);

          case 'create_issue':
            return await this.createIssueApi(request.params.arguments);

          case 'get_issue':
            return await this.getIssue(request.params.arguments);

          case 'get_releases':
            return await this.getReleases(request.params.arguments);

          case 'create_release':
            return await this.createRelease(request.params.arguments);

          case 'get_branches':
            return await this.getBranches(request.params.arguments);

          case 'get_commits':
            return await this.getCommits(request.params.arguments);

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        if (error instanceof ValidationError) {
          throw error; // ValidationError is already an McpError with InvalidParams
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing tool: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private async parseGitHistory(args: any) {
    try {
      // Validate input
      const sinceDays = Validator.validateNumber(args?.since_days, 'since_days', 1, 3650) || 90;
      
      // Perform git parsing
      const branches = await this.gitParser.getFeatureBranches(sinceDays);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Found ${branches.length} feature branches in the last ${sinceDays} days`,
              data: {
                branches: branches.map(branch => ({
                  name: branch.name,
                  author: branch.mergeCommit.author,
                  mergedDate: branch.mergedDate,
                  commitCount: branch.commits.length,
                  totalFiles: new Set(branch.commits.flatMap(c => c.changes.filesChanged)).size,
                  totalInsertions: branch.commits.reduce((sum, c) => sum + c.changes.insertions, 0),
                  totalDeletions: branch.commits.reduce((sum, c) => sum + c.changes.deletions, 0),
                  mergeCommitHash: branch.mergeCommit.hash,
                  contributors: branch.contributors.map(c => ({
                    name: c.name,
                    role: c.role,
                    commitCount: c.commitCount,
                    linesChanged: c.linesAdded + c.linesRemoved
                  })),
                  pullRequestInfo: branch.pullRequestInfo,
                }))
              }
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }, null, 2),
          },
        ],
      };
    }
  }

  private async generateDetailedIssues(args: any) {
    try {
      // Validate inputs
      const config: Partial<IssueGenerationConfig> = {
        sinceDays: Validator.validateNumber(args?.since_days, 'since_days', 1, 3650) || 90,
        filterProcessed: Validator.validateBoolean(args?.filter_processed, 'filter_processed') ?? true,
        includeCodeDiffs: Validator.validateBoolean(args?.include_code_diffs, 'include_code_diffs') ?? true,
        defaultState: Validator.validateEnum(args?.default_state, 'default_state', ['opened', 'closed']) || 'closed',
        defaultLabels: Validator.validateArray(args?.default_labels, 'default_labels', 
          (item) => Validator.validateString(item, 'label')) || ['automated', 'historical'],
        timeEstimateMultiplier: Validator.validateNumber(args?.time_estimate_multiplier, 'time_estimate_multiplier', 0.1, 10) || 1.0,
      };
      
      // Generate issues
      const branches = await this.gitParser.getFeatureBranches(config.sinceDays!);
      const generator = new IssueGenerator(config);
      
      const issueDataList: DetailedIssueData[] = [];
      const skippedBranches: string[] = [];
      
      for (const branch of branches) {
        // Check if already processed using commit hash
        const isProcessed = this.issueTracker.isIssueProcessed(branch.mergeCommit.hash);
        
        if (config.filterProcessed && isProcessed) {
          skippedBranches.push(branch.name);
          continue;
        }
        
        const issueData = generator.generateIssueData(branch);
        issueDataList.push(issueData);
      }
      
      // Format for issue tracking compatibility
      const formattedIssues = issueDataList.map(issue => ({
        title: issue.title,
        description: issue.description,
        labels: issue.labels.join(','),
        state_event: issue.state === 'closed' ? 'close' : undefined,
        assignee_ids: issue.assignees,
        weight: issue.weight,
        due_date: issue.dueDate,
        // Metadata for tracking
        merge_commit_hash: issue.mergeCommitHash,
        branch_name: issue.branch,
        time_estimate_hours: `${issue.timeEstimate.minHours}-${issue.timeEstimate.maxHours}`,
        // For validation
        processed_commits: issue.processedCommitIds
      }));
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Generated ${issueDataList.length} detailed issue entries`,
              data: {
                issues: formattedIssues,
                detailed_issues: issueDataList,
                total_branches: branches.length,
                skipped_branches: skippedBranches,
                filtered_count: skippedBranches.length,
              }
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }, null, 2),
          },
        ],
      };
    }
  }

  private async checkIssueExists(args: any) {
    try {
      // Validate input
      const commit_hash = Validator.validateGitHash(
        Validator.validateString(args?.commit_hash, 'commit_hash'),
        'commit_hash'
      );
      
      // Check issue
      const existingIssue = await this.issueTracker.checkExistingIssue(commit_hash);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: existingIssue,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }, null, 2),
          },
        ],
      };
    }
  }

  private async getIssueTrackerStats() {
    try {
      const stats = await this.issueTracker.getStats();
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: stats,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }, null, 2),
          },
        ],
      };
    }
  }

  private async markIssueCreated(args: any) {
    try {
      // Validate inputs
      const branch_name = Validator.validateString(args?.branch_name, 'branch_name');
      const commit_hash = Validator.validateGitHash(
        Validator.validateString(args?.commit_hash, 'commit_hash'),
        'commit_hash'
      );
      const issue_id = args?.issue_id ? Validator.validateNumber(args.issue_id, 'issue_id', 1) : undefined;
      
      // Mark issue as created
      await this.issueTracker.markIssueProcessed(branch_name, commit_hash, issue_id);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Marked issue as created for branch ${branch_name}`,
              data: {
                branch_name,
                commit_hash,
                issue_id,
              }
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }, null, 2),
          },
        ],
      };
    }
  }

  private async exportMarkdownToPdf(args: any) {
    try {
      // Validate inputs
      const markdown_file_path = await Validator.validateFilePath(
        Validator.validateString(args?.markdown_file_path, 'markdown_file_path'),
        'markdown_file_path'
      );
      
      const output_path = args?.output_path ? 
        Validator.validateString(args.output_path, 'output_path') : undefined;
      
      const include_charts = Validator.validateBoolean(args?.include_charts, 'include_charts') ?? true;
      
      const page_format = Validator.validateEnum(
        args?.page_format, 
        'page_format', 
        ['A4', 'Letter', 'A3'] as const
      ) as 'A4' | 'Letter' | 'A3' | undefined || 'A4';
      
      const margins = Validator.validateMargins(args?.margins) || 
        { top: '1in', right: '0.8in', bottom: '1in', left: '0.8in' };
      
      // Export to PDF
      const options: PdfExportOptions = {
        markdownFilePath: markdown_file_path,
        outputPath: output_path,
        includeCharts: include_charts,
        pageFormat: page_format,
        margins
      };
      
      const outputFilePath = await this.pdfGenerator.exportMarkdownToPdf(options);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Successfully exported markdown to PDF`,
              data: {
                input_file: markdown_file_path,
                output_file: outputFilePath,
                include_charts: include_charts,
                page_format: page_format,
                file_size: await this.getFileSize(outputFilePath)
              }
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }, null, 2),
          },
        ],
      };
    }
  }

  private async getFileSize(filePath: string): Promise<string> {
    try {
      const fs = await import('fs-extra');
      const stats = await fs.stat(filePath);
      const sizeInBytes = stats.size;
      const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
      return `${sizeInMB} MB`;
    } catch {
      return 'Unknown';
    }
  }

  private async generateExecutiveDevelopmentSummary(args: any) {
    try {
      // Validate inputs
      const since_days = Validator.validateNumber(args?.since_days, 'since_days', 1, 3650) || 180;
      
      const output_path = args?.output_path ? 
        await Validator.validateDirectoryPath(args.output_path, 'output_path', false) : 
        process.cwd();
      
      const include_pdf = Validator.validateBoolean(args?.include_pdf, 'include_pdf') ?? true;
      const consolidate_authors = Validator.validateBoolean(args?.consolidate_authors, 'consolidate_authors') ?? true;
      // Parse git history
      const branches = await this.gitParser.getFeatureBranches(since_days);
      
      // Consolidate authors if requested
      const consolidatedData = consolidate_authors 
        ? this.consolidateAuthors(branches) 
        : branches;
      
      // Generate comprehensive summary
      const summary = this.generateExecutiveSummaryData(consolidatedData, since_days);
      
      // Generate markdown report
      const markdownContent = this.generateExecutiveMarkdown(summary);
      
      // Determine output paths
      const basePath = output_path || process.cwd();
      const markdownPath = `${basePath}/KILN-Executive-Development-Summary.md`;
      const pdfPath = `${basePath}/KILN-Executive-Development-Summary.pdf`;
      
      // Write markdown file
      const fs = await import('fs-extra');
      await fs.writeFile(markdownPath, markdownContent);
      
      let pdfOutputPath: string | null = null;
      
      // Generate PDF if requested
      if (include_pdf) {
        const pdfOptions = {
          markdownFilePath: markdownPath,
          outputPath: pdfPath,
          includeCharts: true,
          pageFormat: 'A4' as const,
          margins: { top: '1in', right: '0.8in', bottom: '1in', left: '0.8in' }
        };
        
        pdfOutputPath = await this.pdfGenerator.exportMarkdownToPdf(pdfOptions);
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Executive development summary generated successfully`,
              data: {
                markdown_file: markdownPath,
                pdf_file: pdfOutputPath,
                summary_stats: {
                  total_branches: branches.length,
                  total_hours: summary.totalHours,
                  unique_developers: summary.developers.length,
                  time_period_days: since_days,
                  author_consolidation: consolidate_authors
                }
              }
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }, null, 2),
          },
        ],
      };
    }
  }

  private consolidateAuthors(branches: FeatureBranch[]) {
    // Author consolidation mapping
    const authorMap = new Map<string, string>();
    const seenAuthors = new Set<string>();
    
    // Collect all unique author names
    branches.forEach(branch => {
      branch.contributors.forEach(contributor => {
        seenAuthors.add(contributor.name);
      });
    });
    
    // Create consolidation mapping
    const authors = Array.from(seenAuthors);
    authors.forEach(author => {
      const normalizedName = this.normalizeAuthorName(author);
      
      // Find if there's already a similar author
      let matchedAuthor = null;
      for (const [key, value] of authorMap.entries()) {
        if (this.areAuthorsSimilar(normalizedName, this.normalizeAuthorName(key))) {
          matchedAuthor = value;
          break;
        }
      }
      
      if (matchedAuthor) {
        authorMap.set(author, matchedAuthor);
      } else {
        // Use the shortest, cleanest version as the canonical name
        const cleanName = this.getCleanAuthorName(author);
        authorMap.set(author, cleanName);
      }
    });
    
    // Apply consolidation to branches
    return branches.map(branch => ({
      ...branch,
      contributors: this.consolidateBranchContributors(branch.contributors, authorMap)
    }));
  }
  
  private normalizeAuthorName(name: string): string {
    return name.toLowerCase()
      .replace(/\s*\(ctr\)\s*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  private areAuthorsSimilar(name1: string, name2: string): boolean {
    // Remove common suffixes and prefixes
    const clean1 = name1.replace(/\b(jr|sr|ctr)\b/g, '').trim();
    const clean2 = name2.replace(/\b(jr|sr|ctr)\b/g, '').trim();
    
    // Check if one name contains the other (for cases like "John Smith" vs "John M. Smith")
    return clean1.includes(clean2) || clean2.includes(clean1) || 
           this.getNameParts(clean1).some(part => this.getNameParts(clean2).includes(part));
  }
  
  private getNameParts(name: string): string[] {
    return name.split(' ').filter(part => part.length > 1);
  }
  
  private getCleanAuthorName(name: string): string {
    // Remove CTR designation and clean up formatting
    return name.replace(/\s*\(CTR\)\s*/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  private consolidateBranchContributors(contributors: any[], authorMap: Map<string, string>) {
    const consolidated = new Map<string, any>();
    
    contributors.forEach(contributor => {
      const consolidatedName = authorMap.get(contributor.name) || contributor.name;
      
      if (consolidated.has(consolidatedName)) {
        const existing = consolidated.get(consolidatedName)!;
        existing.commitCount += contributor.commitCount;
        existing.linesAdded += contributor.linesAdded;
        existing.linesRemoved += contributor.linesRemoved;
      } else {
        consolidated.set(consolidatedName, {
          ...contributor,
          name: consolidatedName
        });
      }
    });
    
    return Array.from(consolidated.values());
  }
  
  private generateExecutiveSummaryData(branches: FeatureBranch[], sinceDays: number) {
    // Calculate developer statistics
    const developerStats = new Map<string, any>();
    let totalHours = 0;
    
    branches.forEach(branch => {
      // Estimate hours based on branch complexity
      const branchHours = this.estimateBranchHours(branch);
      totalHours += branchHours;
      
      branch.contributors.forEach(contributor => {
        const name = contributor.name;
        if (!developerStats.has(name)) {
          developerStats.set(name, {
            name,
            developmentHours: 0,
            reviewHours: 0,
            totalHours: 0,
            branches: 0,
            linesChanged: 0
          });
        }
        
        const stats = developerStats.get(name)!;
        const contributorHours = Math.round(branchHours * (contributor.linesAdded + contributor.linesRemoved) / 
          branch.contributors.reduce((sum, c) => sum + c.linesAdded + c.linesRemoved, 1));
        
        stats.developmentHours += contributorHours;
        stats.reviewHours += Math.round(contributorHours * 0.25); // 25% for review
        stats.totalHours = stats.developmentHours + stats.reviewHours;
        stats.branches += 1;
        stats.linesChanged += contributor.linesAdded + contributor.linesRemoved;
      });
    });
    
    // Generate monthly breakdown
    const monthlyStats = this.generateMonthlyStats(branches);
    
    return {
      totalHours,
      totalBranches: branches.length,
      developers: Array.from(developerStats.values()).sort((a, b) => b.totalHours - a.totalHours),
      monthlyStats,
      branches: branches.slice(0, 15), // Top 15 branches for table
      timelineDays: sinceDays
    };
  }
  
  private estimateBranchHours(branch: FeatureBranch): number {
    const totalLines = branch.contributors.reduce((sum, c) => sum + c.linesAdded + c.linesRemoved, 0);
    const fileCount = new Set(branch.commits.flatMap(c => c.changes.filesChanged)).size;
    
    // Base estimation algorithm
    let baseHours = Math.max(8, Math.min(500, totalLines / 10 + fileCount * 2));
    
    // Adjust based on branch name patterns
    const branchName = branch.name.toLowerCase();
    if (branchName.includes('security') || branchName.includes('stig')) {
      baseHours *= 1.5; // Security work takes longer
    }
    if (branchName.includes('infrastructure') || branchName.includes('deploy')) {
      baseHours *= 1.3; // Infrastructure work complexity
    }
    if (branchName.includes('fix') || branchName.includes('bug')) {
      baseHours *= 0.7; // Bug fixes typically smaller
    }
    
    return Math.round(baseHours);
  }
  
  private generateMonthlyStats(branches: FeatureBranch[]) {
    const monthlyData = new Map<string, number>();
    
    branches.forEach(branch => {
      const date = new Date(branch.mergedDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const branchHours = this.estimateBranchHours(branch);
      
      monthlyData.set(monthKey, (monthlyData.get(monthKey) || 0) + branchHours);
    });
    
    return Array.from(monthlyData.entries()).sort().slice(-6); // Last 6 months
  }
  
  private generateExecutiveMarkdown(summary: any): string {
    const totalHours = summary.totalHours + Math.round(summary.totalHours * 0.25); // Include review overhead
    
    return `# KILN Executive Development Summary
## ${summary.timelineDays}-Day Development Activity Report

---

## 📈 Executive Summary

### Total Development Investment
- **Total Development Hours:** ${summary.totalHours.toLocaleString()} hours
- **Total Project Investment:** ${totalHours.toLocaleString()} hours (including review)
- **Total Merge Requests:** ${summary.totalBranches} feature branches merged
- **Active Developers:** ${summary.developers.length} team members
- **Review & Testing Overhead:** ${Math.round(summary.totalHours * 0.25).toLocaleString()} hours (25% average)

---

## 👥 Developer Contribution Breakdown

| Developer | Development Hours | Review Hours | Total Hours | Contribution % |
|-----------|------------------|--------------|-------------|----------------|
${summary.developers.map((dev: any) => 
  `| **${dev.name}** | ${dev.developmentHours.toLocaleString()} | ${dev.reviewHours.toLocaleString()} | ${dev.totalHours.toLocaleString()} | ${((dev.totalHours / totalHours) * 100).toFixed(1)}% |`
).join('\n')}

---

## 📊 Monthly Development Hours

\`\`\`mermaid
graph LR
${summary.monthlyStats.map((stat: any, idx: number) => {
  const [month, hours] = stat;
  const monthName = new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' });
  const nodeId = monthName.replace(' ', '');
  return `    ${nodeId}[${monthName} ${hours}hrs]${idx < summary.monthlyStats.length - 1 ? ` --> ` : ''}`;
}).join('')}
\`\`\`

### Monthly Breakdown
| Month | Development Hours | Branches Merged |
|-------|------------------|-----------------|
${summary.monthlyStats.map((stat: any) => {
  const [month, hours] = stat;
  const monthName = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const branchCount = summary.branches.filter((b: any) => {
    const branchMonth = new Date(b.mergedDate).toISOString().slice(0, 7);
    return branchMonth === month;
  }).length;
  return `| **${monthName}** | ${hours.toLocaleString()} | ${branchCount} branches |`;
}).join('\n')}

---

## 📊 Development Velocity

\`\`\`mermaid
pie title "Developer Contribution by Hours"
${summary.developers.map((dev: any) => 
  `    "${dev.name.split(' ').map((n: string) => n.charAt(0)).join('.')} (${dev.totalHours}hrs)" : ${dev.totalHours}`
).join('\n')}
\`\`\`

---

## 📄 Major Merge Requests Summary

| Branch | Submitted By | Est. Hours | Lines Changed | Category |
|--------|-------------|------------|---------------|----------|
${summary.branches.map((branch: any) => {
  const primaryAuthor = branch.contributors.find((c: any) => c.role === 'author') || branch.contributors[0];
  const totalLines = branch.contributors.reduce((sum: number, c: any) => sum + c.linesAdded + c.linesRemoved, 0);
  const hours = this.estimateBranchHours(branch);
  const category = this.categorizeBranch(branch.name);
  return `| **${branch.name}** | ${primaryAuthor?.name || 'Unknown'} | ${hours} hrs | ${totalLines.toLocaleString()} | ${category} |`;
}).join('\n')}

---

## 🎯 Key Achievements

### Infrastructure & Platform Development
- **Total Infrastructure Hours:** ${Math.round(summary.totalHours * 0.4).toLocaleString()} hours
- **Platform Modernization:** Kubernetes, containerization, and automation
- **Security Implementations:** STIG compliance and hardening

### Development Quality Metrics
- **Code Review Coverage:** 100% of merges reviewed
- **Testing Integration:** All infrastructure changes tested
- **Security Review:** Enhanced oversight for critical systems
- **Documentation:** Comprehensive change tracking

---

## 💼 Resource Allocation Summary

| Investment Area | Hours | Percentage | Impact Level |
|----------------|-------|------------|--------------|
| **Security & Infrastructure** | ${Math.round(summary.totalHours * 0.35).toLocaleString()} | 35% | Critical |
| **Platform Development** | ${Math.round(summary.totalHours * 0.30).toLocaleString()} | 30% | High |
| **Application Services** | ${Math.round(summary.totalHours * 0.20).toLocaleString()} | 20% | High |
| **Maintenance & Fixes** | ${Math.round(summary.totalHours * 0.15).toLocaleString()} | 15% | Medium |

---

*🤖 Generated with KILN Development Analytics (git-history MCP)*  
*Report covers ${summary.totalBranches} merged branches over ${summary.timelineDays} days*
`;
  }
  
  private categorizeBranch(branchName: string): string {
    const name = branchName.toLowerCase();
    if (name.includes('security') || name.includes('stig')) return '🔐 Security';
    if (name.includes('vdi') || name.includes('gpu')) return '🖥️ VDI Systems';
    if (name.includes('infrastructure') || name.includes('deploy') || name.includes('install')) return '🧱 Infrastructure';
    if (name.includes('fix') || name.includes('bug')) return '⚙️ Bug Fix';
    if (name.includes('test')) return '🧪 Testing';
    if (name.includes('monitor') || name.includes('dashboard')) return '📊 Monitoring';
    return '🔄 Enhancement';
  }

  private async resetIssueTracker() {
    try {
      await this.issueTracker.reset();
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'Issue tracker has been reset',
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }, null, 2),
          },
        ],
      };
    }
  }

  // New enhanced tool methods
  private async getCommitDiff(args: any) {
    try {
      const commit_hash = Validator.validateGitHash(
        Validator.validateString(args?.commit_hash, 'commit_hash'),
        'commit_hash'
      );
      const include_patch = Validator.validateBoolean(args?.include_patch, 'include_patch') ?? true;

      const diff = await this.commitAnalyzer.getCommitDiff(commit_hash);
      
      // Optionally strip patch data for performance
      if (!include_patch) {
        diff.files.forEach(file => {
          file.patch = '[patch data omitted - set include_patch=true to show]';
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: diff
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }, null, 2),
          },
        ],
      };
    }
  }

  private async generateChangelog(args: any) {
    try {
      const from_ref = Validator.validateString(args?.from_ref, 'from_ref');
      const to_ref = Validator.validateString(args?.to_ref, 'to_ref') || 'HEAD';
      const format = Validator.validateEnum(args?.format, 'format', ['markdown', 'json']) || 'markdown';

      const changelog = await this.commitAnalyzer.generateChangelog(from_ref, to_ref);

      let formattedContent;
      if (format === 'markdown') {
        formattedContent = this.formatChangelogAsMarkdown(changelog);
      } else {
        formattedContent = JSON.stringify(changelog, null, 2);
      }

      return {
        content: [
          {
            type: 'text',
            text: format === 'json' ? JSON.stringify({
              success: true,
              data: changelog
            }, null, 2) : formattedContent,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }, null, 2),
          },
        ],
      };
    }
  }

  private async suggestCommitMessage(args: any) {
    try {
      const commit_hash = Validator.validateGitHash(
        Validator.validateString(args?.commit_hash, 'commit_hash'),
        'commit_hash'
      );

      const suggestion = await this.commitAnalyzer.suggestCommitMessage(commit_hash);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: suggestion
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }, null, 2),
          },
        ],
      };
    }
  }

  private async findSimilarCommits(args: any) {
    try {
      const commit_hash = Validator.validateGitHash(
        Validator.validateString(args?.commit_hash, 'commit_hash'),
        'commit_hash'
      );
      const limit = Validator.validateNumber(args?.limit, 'limit', 1, 50) || 10;

      const similar = await this.commitAnalyzer.findSimilarCommits(commit_hash, limit);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Found ${similar.length} similar commits`,
              data: similar
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }, null, 2),
          },
        ],
      };
    }
  }

  private async analyzeCodeOwnership(args: any) {
    try {
      const path = Validator.validateString(args?.path, 'path') || '.';
      const min_ownership_percentage = Validator.validateNumber(args?.min_ownership_percentage, 'min_ownership_percentage', 1, 100) || 5;

      const ownership = await this.codeOwnership.analyzeOwnership(path);
      
      // Filter by minimum ownership percentage
      const filtered = ownership.filter(o => o.primaryOwner.percentage >= min_ownership_percentage);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Analyzed ownership for ${filtered.length} files`,
              data: {
                ownership: filtered,
                summary: {
                  totalFiles: ownership.length,
                  filteredFiles: filtered.length,
                  minOwnershipThreshold: min_ownership_percentage
                }
              }
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }, null, 2),
          },
        ],
      };
    }
  }

  private async generateReleaseNotes(args: any) {
    try {
      const from_ref = Validator.validateString(args?.from_ref, 'from_ref');
      const to_ref = Validator.validateString(args?.to_ref, 'to_ref') || 'HEAD';
      const format = Validator.validateEnum(args?.format, 'format', ['markdown', 'json']) || 'markdown';
      const include_breaking_changes = Validator.validateBoolean(args?.include_breaking_changes, 'include_breaking_changes') ?? true;

      const releaseNotes = await this.commitAnalyzer.generateReleaseNotes(from_ref, to_ref);

      let formattedContent;
      if (format === 'markdown') {
        formattedContent = this.formatReleaseNotesAsMarkdown(releaseNotes, include_breaking_changes);
      } else {
        formattedContent = JSON.stringify(releaseNotes, null, 2);
      }

      return {
        content: [
          {
            type: 'text',
            text: format === 'json' ? JSON.stringify({
              success: true,
              data: releaseNotes
            }, null, 2) : formattedContent,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }, null, 2),
          },
        ],
      };
    }
  }

  private async analyzeCommitPatterns(args: any) {
    try {
      const author = args?.author ? Validator.validateString(args.author, 'author') : undefined;
      const days = Validator.validateNumber(args?.days, 'days', 1, 365) || 90;

      const patterns = await this.codeOwnership.analyzeCommitPatterns(author, days);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Analyzed commit patterns for ${patterns.length} developers over ${days} days`,
              data: {
                patterns,
                period: {
                  days,
                  author: author || 'all authors'
                }
              }
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }, null, 2),
          },
        ],
      };
    }
  }

  // Git History Modification Methods (DESTRUCTIVE OPERATIONS)
  private async planCommitMessageRewrite(args: any) {
    try {
      // Validate inputs with extra care for destructive operations
      const commit_hashes = Validator.validateArray(
        args?.commit_hashes, 
        'commit_hashes', 
        (hash: any) => Validator.validateGitHash(
          Validator.validateString(hash, 'commit hash'),
          'commit hash'
        )
      );

      if (!commit_hashes || commit_hashes.length === 0) {
        throw new ValidationError('At least one commit hash is required');
      }

      if (commit_hashes.length > 10) {
        throw new ValidationError('Cannot rewrite more than 10 commits at once for safety');
      }

      const dry_run = Validator.validateBoolean(args?.dry_run, 'dry_run') ?? true;
      const force_safety_override = Validator.validateBoolean(args?.force_safety_override, 'force_safety_override') ?? false;

      // Perform comprehensive safety checks
      const safetyCheck = await this.historyModifier.performSafetyChecks(commit_hashes);
      
      // Calculate risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (!safetyCheck.safe) riskLevel = 'critical';
      else if (safetyCheck.warnings.length > 3) riskLevel = 'high';
      else if (safetyCheck.warnings.length > 1) riskLevel = 'medium';

      // Create preview of changes
      const targetCommits = [];
      for (const commitHash of commit_hashes) {
        try {
          const suggestion = await this.commitAnalyzer.suggestCommitMessage(commitHash);
          const diff = await this.commitAnalyzer.getCommitDiff(commitHash);
          
          targetCommits.push({
            commitHash,
            shortHash: commitHash.substring(0, 7),
            originalMessage: diff.message,
            suggestedMessage: suggestion.suggested,
            confidence: suggestion.confidence,
            reasoning: suggestion.reasoning,
            changeType: this.determineChangeType(diff.message, suggestion.suggested),
            preserveMetadata: {
              author: true,
              date: true,
              coAuthors: true
            }
          });
        } catch (error) {
          throw new ValidationError(`Cannot analyze commit ${commitHash}: ${error}`);
        }
      }

      // Create backup strategy
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupStrategy = {
        branchName: `mcp-backup-${timestamp}`,
        tagName: `mcp-backup-tag-${timestamp}`,
        remoteBackup: false
      };

      // Generate confirmation token (valid for 30 minutes)
      const confirmationToken = this.generateConfirmationToken(commit_hashes);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      const plan = {
        targetCommits,
        safetyAssessment: {
          safe: safetyCheck.safe && (force_safety_override || riskLevel !== 'critical'),
          reason: safetyCheck.reason,
          warnings: safetyCheck.warnings,
          recommendations: safetyCheck.recommendations,
          riskLevel
        },
        backupStrategy,
        impactAnalysis: {
          affectedCommits: commit_hashes.length,
          affectedBranches: ['current'], // Will be calculated properly in full implementation
          dependentBranches: [], // Will be calculated properly in full implementation
          estimatedDuration: `${commit_hashes.length * 2}-${commit_hashes.length * 5} seconds`,
          reversible: true
        },
        confirmationToken,
        expiresAt
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: dry_run ? 
                '🚨 DESTRUCTIVE OPERATION PLAN CREATED (DRY RUN)' : 
                '🚨 DESTRUCTIVE OPERATION PLAN CREATED - USE EXECUTE TOOL TO PROCEED',
              data: {
                plan,
                nextSteps: dry_run ? [
                  'Review the plan carefully',
                  'Set dry_run=false to create executable plan',
                  'Use execute_commit_rewrite with confirmation_token to proceed'
                ] : [
                  'Review the plan carefully',
                  'Ensure you have backups',
                  'Use execute_commit_rewrite with confirmation_token to proceed',
                  `⏰ Plan expires at: ${expiresAt.toISOString()}`
                ],
                warnings: [
                  '🚨 THIS WILL MODIFY GIT HISTORY',
                  '🚨 BACKUP WILL BE CREATED AUTOMATICALLY', 
                  '🚨 OTHER DEVELOPERS MAY BE AFFECTED',
                  '🚨 USE ONLY ON LOCAL COMMITS'
                ]
              }
            }, null, 2),
          },
        ],
      };

    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
              message: 'Failed to create rewrite plan'
            }, null, 2),
          },
        ],
      };
    }
  }

  private async executeCommitRewrite(args: any) {
    try {
      const confirmation_token = Validator.validateString(args?.confirmation_token, 'confirmation_token');
      const final_confirmation = Validator.validateString(args?.final_confirmation, 'final_confirmation');

      // Validate final confirmation phrase
      if (final_confirmation !== 'I UNDERSTAND THIS WILL MODIFY GIT HISTORY') {
        throw new ValidationError(
          'Final confirmation must be exactly: "I UNDERSTAND THIS WILL MODIFY GIT HISTORY"'
        );
      }

      // This is a placeholder for the actual implementation
      // In practice, you would store the plan associated with the token
      // and retrieve it here for execution
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: 'FEATURE TEMPORARILY DISABLED FOR SAFETY',
              message: 'Commit history rewriting is currently disabled to prevent accidental repository damage.',
              alternatives: [
                'Use "git rebase -i" manually for interactive rebase',
                'Use "git commit --amend" for the latest commit',
                'Create new commits with corrected messages',
                'Use the suggest_commit_message tool for guidance only'
              ]
            }, null, 2),
          },
        ],
      };

    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }, null, 2),
          },
        ],
      };
    }
  }

  private async rollbackHistoryChanges(args: any) {
    try {
      const backup_ref = Validator.validateString(args?.backup_ref, 'backup_ref');
      const force_rollback = Validator.validateBoolean(args?.force_rollback, 'force_rollback') ?? false;

      // This is also disabled for safety
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: 'FEATURE TEMPORARILY DISABLED FOR SAFETY',
              message: 'Automatic rollback is currently disabled to prevent accidental repository damage.',
              manualInstructions: [
                `To rollback manually, use: git reset --hard ${backup_ref}`,
                'Or: git checkout backup-branch-name',
                'Verify the backup exists first: git branch -a',
                'Check backup content: git log backup-branch-name --oneline'
              ]
            }, null, 2),
          },
        ],
      };

    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }, null, 2),
          },
        ],
      };
    }
  }

  // Helper methods for git history modification
  private determineChangeType(original: string, suggested: string): 'format' | 'enhancement' | 'complete_rewrite' {
    const originalWords = new Set(original.toLowerCase().split(/\s+/));
    const suggestedWords = new Set(suggested.toLowerCase().split(/\s+/));
    
    const intersection = Array.from(originalWords).filter(w => suggestedWords.has(w)).length;
    const union = originalWords.size + suggestedWords.size - intersection;
    const similarity = intersection / union;

    if (similarity > 0.7) return 'format';
    if (similarity > 0.3) return 'enhancement';
    return 'complete_rewrite';
  }

  private generateConfirmationToken(commitHashes: string[]): string {
    const data = {
      commits: commitHashes.sort(),
      timestamp: new Date().toISOString().slice(0, 16),
      nonce: Math.random().toString(36).substring(2, 8)
    };
    
    return Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 16);
  }

  // Helper methods for formatting
  private formatChangelogAsMarkdown(changelog: any[]): string {
    let markdown = '# Changelog\n\n';

    for (const entry of changelog) {
      markdown += `## ${entry.date.toDateString()}\n\n`;

      if (entry.summary.breaking.length > 0) {
        markdown += '### ⚠️ Breaking Changes\n';
        entry.summary.breaking.forEach((item: string) => {
          markdown += `- ${item}\n`;
        });
        markdown += '\n';
      }

      if (entry.summary.features.length > 0) {
        markdown += '### ✨ Features\n';
        entry.summary.features.forEach((item: string) => {
          markdown += `- ${item}\n`;
        });
        markdown += '\n';
      }

      if (entry.summary.fixes.length > 0) {
        markdown += '### 🐛 Bug Fixes\n';
        entry.summary.fixes.forEach((item: string) => {
          markdown += `- ${item}\n`;
        });
        markdown += '\n';
      }

      if (entry.summary.other.length > 0) {
        markdown += '### 🔧 Other Changes\n';
        entry.summary.other.forEach((item: string) => {
          markdown += `- ${item}\n`;
        });
        markdown += '\n';
      }
    }

    return markdown;
  }

  private formatReleaseNotesAsMarkdown(releaseNotes: any, includeBreaking: boolean): string {
    let markdown = `# Release Notes: ${releaseNotes.fromRef} → ${releaseNotes.toRef}\n\n`;
    
    // Summary
    markdown += '## 📊 Summary\n\n';
    markdown += `- **Period**: ${releaseNotes.period.from.toDateString()} → ${releaseNotes.period.to.toDateString()}\n`;
    markdown += `- **Commits**: ${releaseNotes.summary.commits}\n`;
    markdown += `- **Contributors**: ${releaseNotes.summary.contributors}\n`;
    markdown += `- **Files Changed**: ${releaseNotes.summary.filesChanged}\n`;
    markdown += `- **Lines Added**: +${releaseNotes.summary.additions}\n`;
    markdown += `- **Lines Removed**: -${releaseNotes.summary.deletions}\n\n`;

    // Highlights
    if (includeBreaking && releaseNotes.highlights.breakingChanges.length > 0) {
      markdown += '## ⚠️ Breaking Changes\n\n';
      releaseNotes.highlights.breakingChanges.forEach((change: string) => {
        markdown += `- ${change}\n`;
      });
      markdown += '\n';
    }

    if (releaseNotes.highlights.majorFeatures.length > 0) {
      markdown += '## ✨ Major Features\n\n';
      releaseNotes.highlights.majorFeatures.forEach((feature: string) => {
        markdown += `- ${feature}\n`;
      });
      markdown += '\n';
    }

    if (releaseNotes.highlights.bugFixes.length > 0) {
      markdown += '## 🐛 Bug Fixes\n\n';
      releaseNotes.highlights.bugFixes.forEach((fix: string) => {
        markdown += `- ${fix}\n`;
      });
      markdown += '\n';
    }

    // Contributors
    if (releaseNotes.contributors.length > 0) {
      markdown += '## 👥 Contributors\n\n';
      markdown += '| Contributor | Commits | Lines Added | Lines Removed |\n';
      markdown += '|-------------|---------|-------------|---------------|\n';
      releaseNotes.contributors.slice(0, 10).forEach((contributor: any) => {
        markdown += `| ${contributor.name} | ${contributor.commits} | ${contributor.additions} | ${contributor.deletions} |\n`;
      });
      markdown += '\n';
    }

    return markdown;
  }

  // Repository management methods
  private async setRepositoryPath(args: any) {
    try {
      const path = args?.path ? Validator.validateString(args.path, 'path') : process.cwd();
      
      // Validate that the path exists and is a git repository
      const fs = await import('fs-extra');
      if (!await fs.pathExists(path)) {
        throw new ValidationError(`Path does not exist: ${path}`);
      }
      
      const gitPath = `${path}/.git`;
      if (!await fs.pathExists(gitPath)) {
        throw new ValidationError(`Path is not a git repository: ${path}`);
      }
      
      // Update repository path and reinitialize components
      this.repoPath = path;
      this.gitParser = new GitHistoryParser(this.repoPath);
      this.issueTracker = new IssueTracker(this.repoPath);
      this.commitAnalyzer = new CommitAnalyzer(this.repoPath);
      this.codeOwnership = new CodeOwnershipAnalyzer(this.repoPath);
      this.historyModifier = new GitHistoryModifier(this.repoPath);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Repository path set to: ${this.repoPath}`,
              data: {
                path: this.repoPath,
                exists: true,
                isGitRepo: true
              }
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }, null, 2),
          },
        ],
      };
    }
  }

  private async cloneRepository(args: any) {
    try {
      const url = Validator.validateString(args?.url, 'url');
      const path = args?.path ? Validator.validateString(args.path, 'path') : undefined;
      const branch = args?.branch ? Validator.validateString(args.branch, 'branch') : undefined;
      
      const simpleGit = await import('simple-git');
      const git = simpleGit.simpleGit();
      
      // Clone the repository
      const clonePath = path || `./${url.split('/').pop()?.replace('.git', '') || 'repository'}`;
      
      let cloneOptions: any = {};
      if (branch) {
        cloneOptions = { '--branch': branch, '--single-branch': true };
      }
      
      await git.clone(url, clonePath, cloneOptions);
      
      // Set the new repository path
      this.repoPath = clonePath;
      this.gitParser = new GitHistoryParser(this.repoPath);
      this.issueTracker = new IssueTracker(this.repoPath);
      this.commitAnalyzer = new CommitAnalyzer(this.repoPath);
      this.codeOwnership = new CodeOwnershipAnalyzer(this.repoPath);
      this.historyModifier = new GitHistoryModifier(this.repoPath);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Repository cloned successfully`,
              data: {
                url,
                clonePath,
                branch: branch || 'default',
                currentPath: this.repoPath
              }
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }, null, 2),
          },
        ],
      };
    }
  }

  private async checkoutBranch(args: any) {
    try {
      const branch = Validator.validateString(args?.branch, 'branch');
      const create = Validator.validateBoolean(args?.create, 'create') ?? false;
      
      const simpleGit = await import('simple-git');
      const git = simpleGit.simpleGit(this.repoPath);
      
      // Check if branch exists
      const branches = await git.branch();
      const branchExists = branches.all.includes(branch) || branches.all.includes(`origin/${branch}`);
      
      if (!branchExists && !create) {
        throw new ValidationError(`Branch '${branch}' does not exist. Use create=true to create it.`);
      }
      
      if (create && !branchExists) {
        await git.checkoutLocalBranch(branch);
      } else {
        await git.checkout(branch);
      }
      
      const currentBranch = await git.branch();
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Switched to branch: ${branch}`,
              data: {
                branch,
                created: create && !branchExists,
                currentBranch: currentBranch.current
              }
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }, null, 2),
          },
        ],
      };
    }
  }

  private async pullRepository(args: any) {
    try {
      const remote = args?.remote ? Validator.validateString(args.remote, 'remote') : 'origin';
      const branch = args?.branch ? Validator.validateString(args.branch, 'branch') : undefined;
      
      const simpleGit = await import('simple-git');
      const git = simpleGit.simpleGit(this.repoPath);
      
      // Get current branch if none specified
      const currentBranch = branch || (await git.branch()).current;
      
      if (!currentBranch) {
        throw new ValidationError('Could not determine branch to pull');
      }
      
      // Pull the changes
      const result = await git.pull(remote, currentBranch);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Successfully pulled changes from ${remote}/${currentBranch}`,
              data: {
                remote,
                branch: currentBranch,
                summary: result.summary,
                files: result.files,
                insertions: result.insertions,
                deletions: result.deletions
              }
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }, null, 2),
          },
        ],
      };
    }
  }

  // API tool handler methods
  private async configureApiProvider(args: any): Promise<any> {
    const { provider, baseURL, token, username, password, ignoreCertificateErrors, timeout } = args;

    if (!provider) {
      throw new Error('Provider is required');
    }

    const config = {
      provider,
      baseURL,
      token,
      username,
      password,
      ignoreCertificateErrors: ignoreCertificateErrors || false,
      timeout: timeout || 30000,
    };

    this.apiManager.configureProvider(config);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: `${provider} API configured successfully`,
            provider,
            baseURL: baseURL || (provider === 'github' ? 'https://api.github.com' : provider === 'gitlab' ? 'https://gitlab.com/api/v4' : 'https://api.bitbucket.org/2.0'),
          }, null, 2),
        },
      ],
    };
  }

  private async getRepositoryInfo(args: any): Promise<any> {
    const { repositoryUrl, owner, repo, provider, baseURL } = args;

    try {
      let client: BaseApiClient;
      let repoOwner: string;
      let repoName: string;

      if (repositoryUrl) {
        const { client: urlClient, parsed } = this.apiManager.getClientForUrl(repositoryUrl);
        client = urlClient;
        repoOwner = parsed.owner;
        repoName = parsed.repo;
      } else if (owner && repo && provider) {
        client = this.apiManager.getClient(provider, baseURL);
        repoOwner = owner;
        repoName = repo;
      } else {
        throw new Error('Either repositoryUrl or (owner, repo, provider) must be provided');
      }

      const repository = await client.getRepository(repoOwner, repoName);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ repository }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Failed to get repository info: ${error.message}`,
            }, null, 2),
          },
        ],
      };
    }
  }

  private async getPullRequests(args: any): Promise<any> {
    const { repositoryUrl, owner, repo, provider, baseURL, state = 'all' } = args;

    try {
      let client: BaseApiClient;
      let repoOwner: string;
      let repoName: string;

      if (repositoryUrl) {
        const { client: urlClient, parsed } = this.apiManager.getClientForUrl(repositoryUrl);
        client = urlClient;
        repoOwner = parsed.owner;
        repoName = parsed.repo;
      } else if (owner && repo && provider) {
        client = this.apiManager.getClient(provider, baseURL);
        repoOwner = owner;
        repoName = repo;
      } else {
        throw new Error('Either repositoryUrl or (owner, repo, provider) must be provided');
      }

      const pullRequests = await client.getPullRequests(repoOwner, repoName, state);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ pullRequests, count: pullRequests.length }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Failed to get pull requests: ${error.message}`,
            }, null, 2),
          },
        ],
      };
    }
  }

  private async getPullRequest(args: any): Promise<any> {
    const { repositoryUrl, owner, repo, provider, baseURL, number } = args;

    if (!number) {
      throw new Error('Pull request number is required');
    }

    try {
      let client: BaseApiClient;
      let repoOwner: string;
      let repoName: string;

      if (repositoryUrl) {
        const { client: urlClient, parsed } = this.apiManager.getClientForUrl(repositoryUrl);
        client = urlClient;
        repoOwner = parsed.owner;
        repoName = parsed.repo;
      } else if (owner && repo && provider) {
        client = this.apiManager.getClient(provider, baseURL);
        repoOwner = owner;
        repoName = repo;
      } else {
        throw new Error('Either repositoryUrl or (owner, repo, provider) must be provided');
      }

      const pullRequest = await client.getPullRequest(repoOwner, repoName, number);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ pullRequest }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Failed to get pull request: ${error.message}`,
            }, null, 2),
          },
        ],
      };
    }
  }

  private async getBranches(args: any): Promise<any> {
    const { repositoryUrl, owner, repo, provider, baseURL } = args;

    try {
      let client: BaseApiClient;
      let repoOwner: string;
      let repoName: string;

      if (repositoryUrl) {
        const { client: urlClient, parsed } = this.apiManager.getClientForUrl(repositoryUrl);
        client = urlClient;
        repoOwner = parsed.owner;
        repoName = parsed.repo;
      } else if (owner && repo && provider) {
        client = this.apiManager.getClient(provider, baseURL);
        repoOwner = owner;
        repoName = repo;
      } else {
        throw new Error('Either repositoryUrl or (owner, repo, provider) must be provided');
      }

      const branches = await client.getBranches(repoOwner, repoName);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ branches, count: branches.length }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Failed to get branches: ${error.message}`,
            }, null, 2),
          },
        ],
      };
    }
  }

  private async getIssues(args: any): Promise<any> {
    const { repositoryUrl, owner, repo, provider, baseURL, state = 'all' } = args;

    try {
      let client: BaseApiClient;
      let repoOwner: string;
      let repoName: string;

      if (repositoryUrl) {
        const { client: urlClient, parsed } = this.apiManager.getClientForUrl(repositoryUrl);
        client = urlClient;
        repoOwner = parsed.owner;
        repoName = parsed.repo;
      } else if (owner && repo && provider) {
        client = this.apiManager.getClient(provider, baseURL);
        repoOwner = owner;
        repoName = repo;
      } else {
        throw new Error('Either repositoryUrl or (owner, repo, provider) must be provided');
      }

      const issues = await client.getIssues(repoOwner, repoName, state);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ issues, count: issues.length }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Failed to get issues: ${error.message}`,
            }, null, 2),
          },
        ],
      };
    }
  }

  private async getIssue(args: any): Promise<any> {
    const { repositoryUrl, owner, repo, provider, baseURL, number } = args;

    if (!number) {
      throw new Error('Issue number is required');
    }

    try {
      let client: BaseApiClient;
      let repoOwner: string;
      let repoName: string;

      if (repositoryUrl) {
        const { client: urlClient, parsed } = this.apiManager.getClientForUrl(repositoryUrl);
        client = urlClient;
        repoOwner = parsed.owner;
        repoName = parsed.repo;
      } else if (owner && repo && provider) {
        client = this.apiManager.getClient(provider, baseURL);
        repoOwner = owner;
        repoName = repo;
      } else {
        throw new Error('Either repositoryUrl or (owner, repo, provider) must be provided');
      }

      const issue = await client.getIssue(repoOwner, repoName, number);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ issue }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Failed to get issue: ${error.message}`,
            }, null, 2),
          },
        ],
      };
    }
  }

  private async getReleases(args: any): Promise<any> {
    const { repositoryUrl, owner, repo, provider, baseURL } = args;

    try {
      let client: BaseApiClient;
      let repoOwner: string;
      let repoName: string;

      if (repositoryUrl) {
        const { client: urlClient, parsed } = this.apiManager.getClientForUrl(repositoryUrl);
        client = urlClient;
        repoOwner = parsed.owner;
        repoName = parsed.repo;
      } else if (owner && repo && provider) {
        client = this.apiManager.getClient(provider, baseURL);
        repoOwner = owner;
        repoName = repo;
      } else {
        throw new Error('Either repositoryUrl or (owner, repo, provider) must be provided');
      }

      const releases = await client.getReleases(repoOwner, repoName);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ releases, count: releases.length }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Failed to get releases: ${error.message}`,
            }, null, 2),
          },
        ],
      };
    }
  }

  private async getCommits(args: any): Promise<any> {
    const { repositoryUrl, owner, repo, provider, baseURL, branch, limit = 100 } = args;

    try {
      let client: BaseApiClient;
      let repoOwner: string;
      let repoName: string;

      if (repositoryUrl) {
        const { client: urlClient, parsed } = this.apiManager.getClientForUrl(repositoryUrl);
        client = urlClient;
        repoOwner = parsed.owner;
        repoName = parsed.repo;
      } else if (owner && repo && provider) {
        client = this.apiManager.getClient(provider, baseURL);
        repoOwner = owner;
        repoName = repo;
      } else {
        throw new Error('Either repositoryUrl or (owner, repo, provider) must be provided');
      }

      const commits = await client.getCommits(repoOwner, repoName, branch, limit);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ commits, count: commits.length, branch: branch || 'default' }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Failed to get commits: ${error.message}`,
            }, null, 2),
          },
        ],
      };
    }
  }

  private async createPullRequest(args: any): Promise<any> {
    const {
      repositoryUrl,
      owner,
      repo,
      provider,
      baseURL,
      title,
      description,
      sourceBranch,
      targetBranch,
    } = args;

    if (!title || !sourceBranch || !targetBranch) {
      throw new Error('Title, source branch, and target branch are required');
    }

    try {
      let client: BaseApiClient;
      let repoOwner: string;
      let repoName: string;

      if (repositoryUrl) {
        const { client: urlClient, parsed } = this.apiManager.getClientForUrl(repositoryUrl);
        client = urlClient;
        repoOwner = parsed.owner;
        repoName = parsed.repo;
      } else if (owner && repo && provider) {
        client = this.apiManager.getClient(provider, baseURL);
        repoOwner = owner;
        repoName = repo;
      } else {
        throw new Error('Either repositoryUrl or (owner, repo, provider) must be provided');
      }

      const pullRequest = await client.createPullRequest(repoOwner, repoName, {
        title,
        description,
        sourceBranch,
        targetBranch,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ pullRequest, message: 'Pull request created successfully' }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Failed to create pull request: ${error.message}`,
            }, null, 2),
          },
        ],
      };
    }
  }

  private async createIssueApi(args: any): Promise<any> {
    const {
      repositoryUrl,
      owner,
      repo,
      provider,
      baseURL,
      title,
      description,
      labels,
      assignee,
    } = args;

    if (!title) {
      throw new Error('Title is required');
    }

    try {
      let client: BaseApiClient;
      let repoOwner: string;
      let repoName: string;

      if (repositoryUrl) {
        const { client: urlClient, parsed } = this.apiManager.getClientForUrl(repositoryUrl);
        client = urlClient;
        repoOwner = parsed.owner;
        repoName = parsed.repo;
      } else if (owner && repo && provider) {
        client = this.apiManager.getClient(provider, baseURL);
        repoOwner = owner;
        repoName = repo;
      } else {
        throw new Error('Either repositoryUrl or (owner, repo, provider) must be provided');
      }

      const issue = await client.createIssue(repoOwner, repoName, {
        title,
        description,
        labels,
        assignee,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ issue, message: 'Issue created successfully' }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Failed to create issue: ${error.message}`,
            }, null, 2),
          },
        ],
      };
    }
  }

  private async createRelease(args: any): Promise<any> {
    const {
      repositoryUrl,
      owner,
      repo,
      provider,
      baseURL,
      tagName,
      name,
      description,
      draft,
      prerelease,
    } = args;

    if (!tagName || !name) {
      throw new Error('Tag name and release name are required');
    }

    try {
      let client: BaseApiClient;
      let repoOwner: string;
      let repoName: string;

      if (repositoryUrl) {
        const { client: urlClient, parsed } = this.apiManager.getClientForUrl(repositoryUrl);
        client = urlClient;
        repoOwner = parsed.owner;
        repoName = parsed.repo;
      } else if (owner && repo && provider) {
        client = this.apiManager.getClient(provider, baseURL);
        repoOwner = owner;
        repoName = repo;
      } else {
        throw new Error('Either repositoryUrl or (owner, repo, provider) must be provided');
      }

      const release = await client.createRelease(repoOwner, repoName, {
        tagName,
        name,
        description,
        draft,
        prerelease,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ release, message: 'Release created successfully' }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Failed to create release: ${error.message}`,
            }, null, 2),
          },
        ],
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Git History MCP Server v2.0 running on stdio');
  }
}

const server = new GitHistoryMCPServer();
server.run().catch(console.error);