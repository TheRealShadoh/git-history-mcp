/**
 * Tool annotations for MCP 2025-03-26 specification
 * These annotations provide richer context and control metadata about tool behavior
 */

export interface ToolAnnotations {
  /**
   * Human-readable title for UI display
   */
  title?: string;
  
  /**
   * Indicates this tool doesn't modify its environment
   */
  readOnlyHint?: boolean;
  
  /**
   * Indicates this tool interacts with external entities
   */
  openWorldHint?: boolean;
  
  /**
   * Indicates this tool performs expensive operations
   */
  costHint?: boolean;
  
  /**
   * Categories for tool organization
   */
  categories?: string[];
  
  /**
   * Tags for tool discovery
   */
  tags?: string[];
}

/**
 * Tool annotations configuration for all available tools
 */
export const toolAnnotations: Record<string, ToolAnnotations> = {
  // Git Analysis Tools (Read-only, local operations)
  parse_git_history: {
    title: 'Git History Parser',
    readOnlyHint: true,
    openWorldHint: false,
    costHint: false,
    categories: ['git', 'analysis'],
    tags: ['branches', 'commits', 'history'],
  },
  
  get_commit_diff: {
    title: 'Commit Diff Viewer',
    readOnlyHint: true,
    openWorldHint: false,
    costHint: false,
    categories: ['git', 'analysis'],
    tags: ['diff', 'changes', 'files'],
  },
  
  suggest_commit_message: {
    title: 'Commit Message Suggester',
    readOnlyHint: true,
    openWorldHint: false,
    costHint: false,
    categories: ['git', 'ai'],
    tags: ['commit', 'message', 'suggestions'],
  },
  
  find_similar_commits: {
    title: 'Similar Commit Finder',
    readOnlyHint: true,
    openWorldHint: false,
    costHint: true, // Can be expensive for large repos
    categories: ['git', 'analysis'],
    tags: ['similarity', 'patterns', 'search'],
  },

  // Documentation & Release Management (Read-only, local)
  generate_changelog: {
    title: 'Changelog Generator',
    readOnlyHint: true,
    openWorldHint: false,
    costHint: false,
    categories: ['documentation', 'release'],
    tags: ['changelog', 'release-notes', 'history'],
  },
  
  generate_release_notes: {
    title: 'Release Notes Generator',
    readOnlyHint: true,
    openWorldHint: false,
    costHint: false,
    categories: ['documentation', 'release'],
    tags: ['release', 'notes', 'summary'],
  },

  // Team & Code Analysis (Read-only, expensive)
  analyze_code_ownership: {
    title: 'Code Ownership Analyzer',
    readOnlyHint: true,
    openWorldHint: false,
    costHint: true,
    categories: ['analysis', 'team'],
    tags: ['ownership', 'contributors', 'expertise'],
  },
  
  analyze_commit_patterns: {
    title: 'Commit Pattern Analyzer',
    readOnlyHint: true,
    openWorldHint: false,
    costHint: true,
    categories: ['analysis', 'productivity'],
    tags: ['patterns', 'productivity', 'metrics'],
  },

  // Repository Management (Modifying, local)
  set_repository_path: {
    title: 'Repository Path Setter',
    readOnlyHint: false,
    openWorldHint: false,
    costHint: false,
    categories: ['repository', 'configuration'],
    tags: ['path', 'configuration', 'workspace'],
  },
  
  clone_repository: {
    title: 'Repository Cloner',
    readOnlyHint: false,
    openWorldHint: true, // Accesses external git repositories
    costHint: true, // Network operation, potentially large downloads
    categories: ['repository', 'git'],
    tags: ['clone', 'download', 'external'],
  },
  
  checkout_branch: {
    title: 'Branch Checkout',
    readOnlyHint: false,
    openWorldHint: false,
    costHint: false,
    categories: ['repository', 'git'],
    tags: ['branch', 'checkout', 'switch'],
  },
  
  pull_repository: {
    title: 'Repository Puller',
    readOnlyHint: false,
    openWorldHint: true, // Network operation
    costHint: false,
    categories: ['repository', 'git'],
    tags: ['pull', 'update', 'sync'],
  },

  // Issue Tracking (Local storage)
  check_issue_exists: {
    title: 'Issue Existence Checker',
    readOnlyHint: true,
    openWorldHint: false,
    costHint: false,
    categories: ['issue-tracking', 'utilities'],
    tags: ['issues', 'tracking', 'duplicate-check'],
  },
  
  mark_issue_created: {
    title: 'Issue Creation Marker',
    readOnlyHint: false,
    openWorldHint: false,
    costHint: false,
    categories: ['issue-tracking', 'utilities'],
    tags: ['issues', 'tracking', 'persistence'],
  },
  
  get_issue_tracker_stats: {
    title: 'Issue Tracker Statistics',
    readOnlyHint: true,
    openWorldHint: false,
    costHint: false,
    categories: ['issue-tracking', 'statistics'],
    tags: ['stats', 'metrics', 'tracking'],
  },
  
  reset_issue_tracker: {
    title: 'Issue Tracker Reset',
    readOnlyHint: false,
    openWorldHint: false,
    costHint: false,
    categories: ['issue-tracking', 'utilities'],
    tags: ['reset', 'cleanup', 'maintenance'],
  },

  // Export & Utilities (File system operations)
  export_markdown_to_pdf: {
    title: 'Markdown to PDF Exporter',
    readOnlyHint: false,
    openWorldHint: false,
    costHint: true, // Puppeteer rendering is expensive
    categories: ['export', 'utilities'],
    tags: ['pdf', 'markdown', 'export'],
  },
  
  generate_detailed_issues: {
    title: 'Detailed Issue Generator',
    readOnlyHint: true,
    openWorldHint: false,
    costHint: true, // Complex analysis
    categories: ['issue-tracking', 'analysis'],
    tags: ['issues', 'generation', 'analysis'],
  },
  
  generate_executive_development_summary: {
    title: 'Executive Development Summary',
    readOnlyHint: true,
    openWorldHint: false,
    costHint: true,
    categories: ['reporting', 'executive'],
    tags: ['summary', 'executive', 'development'],
  },

  // Git History Modification (Dangerous operations)
  plan_commit_message_rewrite: {
    title: 'Commit Message Rewrite Planner',
    readOnlyHint: true,
    openWorldHint: false,
    costHint: false,
    categories: ['git-modification', 'planning'],
    tags: ['rewrite', 'planning', 'history'],
  },
  
  execute_commit_rewrite: {
    title: 'Commit Rewrite Executor',
    readOnlyHint: false,
    openWorldHint: false,
    costHint: true, // Potentially dangerous operation
    categories: ['git-modification', 'execution'],
    tags: ['rewrite', 'execution', 'dangerous'],
  },
  
  rollback_history_changes: {
    title: 'History Changes Rollback',
    readOnlyHint: false,
    openWorldHint: false,
    costHint: false,
    categories: ['git-modification', 'recovery'],
    tags: ['rollback', 'recovery', 'undo'],
  },

  // API Integration (External services)
  configure_api_provider: {
    title: 'API Provider Configuration',
    readOnlyHint: false,
    openWorldHint: false,
    costHint: false,
    categories: ['api', 'configuration'],
    tags: ['api', 'configuration', 'providers'],
  },
  
  get_repository_info: {
    title: 'Repository Information',
    readOnlyHint: true,
    openWorldHint: true, // External API call
    costHint: false,
    categories: ['api', 'repository'],
    tags: ['repository', 'info', 'metadata'],
  },
  
  get_pull_requests: {
    title: 'Pull Requests Fetcher',
    readOnlyHint: true,
    openWorldHint: true,
    costHint: false,
    categories: ['api', 'pull-requests'],
    tags: ['pull-requests', 'github', 'gitlab'],
  },
  
  create_pull_request: {
    title: 'Pull Request Creator',
    readOnlyHint: false,
    openWorldHint: true,
    costHint: false,
    categories: ['api', 'pull-requests'],
    tags: ['pull-requests', 'creation', 'github'],
  },
  
  get_issues: {
    title: 'Issues Fetcher',
    readOnlyHint: true,
    openWorldHint: true,
    costHint: false,
    categories: ['api', 'issues'],
    tags: ['issues', 'github', 'gitlab'],
  },
  
  create_issue: {
    title: 'Issue Creator',
    readOnlyHint: false,
    openWorldHint: true,
    costHint: false,
    categories: ['api', 'issues'],
    tags: ['issues', 'creation', 'github'],
  },
  
  get_releases: {
    title: 'Releases Fetcher',
    readOnlyHint: true,
    openWorldHint: true,
    costHint: false,
    categories: ['api', 'releases'],
    tags: ['releases', 'github', 'versions'],
  },
  
  create_release: {
    title: 'Release Creator',
    readOnlyHint: false,
    openWorldHint: true,
    costHint: false,
    categories: ['api', 'releases'],
    tags: ['releases', 'creation', 'publishing'],
  },
  
  get_branches: {
    title: 'Branches Fetcher',
    readOnlyHint: true,
    openWorldHint: true,
    costHint: false,
    categories: ['api', 'git'],
    tags: ['branches', 'github', 'remote'],
  },
  
  get_commits: {
    title: 'Commits Fetcher',
    readOnlyHint: true,
    openWorldHint: true,
    costHint: false,
    categories: ['api', 'git'],
    tags: ['commits', 'github', 'history'],
  },

  // Hour Estimation (Analysis)
  estimate_branch_hours: {
    title: 'Branch Hour Estimator',
    readOnlyHint: true,
    openWorldHint: false,
    costHint: true, // Complex analysis
    categories: ['estimation', 'analysis'],
    tags: ['estimation', 'hours', 'complexity'],
  },
  
  analyze_copied_code: {
    title: 'Copied Code Analyzer',
    readOnlyHint: true,
    openWorldHint: false,
    costHint: true,
    categories: ['analysis', 'quality'],
    tags: ['copied-code', 'originality', 'analysis'],
  },
  
  generate_accurate_executive_summary: {
    title: 'Accurate Executive Summary',
    readOnlyHint: true,
    openWorldHint: false,
    costHint: true,
    categories: ['reporting', 'executive', 'estimation'],
    tags: ['summary', 'executive', 'accurate'],
  },
};

/**
 * Get annotations for a specific tool
 */
export function getToolAnnotations(toolName: string): ToolAnnotations | undefined {
  return toolAnnotations[toolName];
}

/**
 * Get all tools in a specific category
 */
export function getToolsByCategory(category: string): string[] {
  return Object.entries(toolAnnotations)
    .filter(([_, annotations]) => annotations.categories?.includes(category))
    .map(([toolName]) => toolName);
}

/**
 * Get all tools with a specific tag
 */
export function getToolsByTag(tag: string): string[] {
  return Object.entries(toolAnnotations)
    .filter(([_, annotations]) => annotations.tags?.includes(tag))
    .map(([toolName]) => toolName);
}

/**
 * Get all read-only tools
 */
export function getReadOnlyTools(): string[] {
  return Object.entries(toolAnnotations)
    .filter(([_, annotations]) => annotations.readOnlyHint === true)
    .map(([toolName]) => toolName);
}

/**
 * Get all tools that interact with external services
 */
export function getExternalTools(): string[] {
  return Object.entries(toolAnnotations)
    .filter(([_, annotations]) => annotations.openWorldHint === true)
    .map(([toolName]) => toolName);
}

/**
 * Get all expensive/costly tools
 */
export function getExpensiveTools(): string[] {
  return Object.entries(toolAnnotations)
    .filter(([_, annotations]) => annotations.costHint === true)
    .map(([toolName]) => toolName);
}