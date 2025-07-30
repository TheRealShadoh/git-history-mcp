# Git History MCP Server

A Model Context Protocol (MCP) server that analyzes git repository history to generate comprehensive GitLab issue data, executive summaries, and PDF reports with detailed code analysis.

## Features

### 🔍 Core Git Analysis
- **Git History Analysis**: Parse git commits and branches to extract feature development history
- **Commit Diff Analysis**: Get detailed file-level changes and patches for any commit
- **Commit Message Enhancement**: AI-powered suggestions for better commit messages using conventional format
- **Similar Commit Detection**: Find related commits based on file overlap and content similarity

### 📊 Team & Code Analysis  
- **Code Ownership Analysis**: Identify file owners, contributors, and expertise domains
- **Developer Productivity**: Analyze commit patterns, peak hours, and coding habits
- **Team Collaboration**: Track cross-team contributions and knowledge distribution

### 📋 Documentation & Release Management
- **Automated Changelogs**: Generate conventional commit-based changelogs between any two references
- **Professional Release Notes**: Create comprehensive release documentation with highlights and statistics
- **GitLab Issue Generation**: Convert git history into detailed, trackable issues with time estimates
- **Executive Reporting**: Generate high-level development summaries with metrics and visualizations

### 📄 Export & Integration
- **PDF Export**: Convert markdown reports to professional PDFs with mermaid chart rendering
- **Multiple Formats**: Support for JSON and Markdown output across all tools
- **GitLab Integration**: Full compatibility with GitLab API for automated issue creation
- **Duplicate Prevention**: Smart tracking to avoid creating duplicate issues

### 🚀 Advanced Capabilities
- **Conventional Commits**: Parse and generate conventional commit formats automatically
- **Breaking Change Detection**: Identify and highlight breaking changes across releases
- **Multi-format Output**: JSON for API integration, Markdown for human consumption
- **Performance Optimized**: Configurable patch inclusion and filtering for large repositories

## Installation

### Via npm (recommended)

```bash
npm install -g git-history-mcp-server
```

### From source

```bash
git clone https://github.com/yourusername/git-history-mcp
cd git-history-mcp
npm install
npm run build
```

## Configuration

### Environment Variables

Create a `.env` file in your working directory:

```env
# Target git repository to analyze (defaults to current directory)
GIT_REPO_PATH=/path/to/your/repo

# GitLab configuration (optional, for issue creation)
GITLAB_PERSONAL_ACCESS_TOKEN=your-token-here
GITLAB_API_URL=https://gitlab.example.com
GITLAB_READ_ONLY_MODE=true  # Set to false to enable issue creation
```

### MCP Client Configuration

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "git-history": {
      "command": "git-history-mcp",
      "args": [],
      "env": {
        "GIT_REPO_PATH": "/path/to/your/repo"
      }
    }
  }
}
```

## Available Tools

### Core Git Analysis Tools

#### 1. `parse_git_history`
Analyzes git branches and commits to extract feature development history.

**Parameters:**
- `since_days` (number, optional): Days to look back in history (default: 90)

**Returns:** List of feature branches with commit details, contributors, and metrics.

#### 2. `get_commit_diff`
Get detailed diff information for a specific commit including file changes and patches.

**Parameters:**
- `commit_hash` (string, required): The commit hash to analyze
- `include_patch` (boolean, optional): Whether to include patch data (default: true)

**Returns:** Comprehensive commit diff with file-level changes, statistics, and optional patch data.

### Changelog & Documentation Tools

#### 3. `generate_changelog`
Generate a changelog between two git references (branches, tags, commits).

**Parameters:**
- `from_ref` (string, required): Starting reference (branch, tag, or commit hash)
- `to_ref` (string, optional): Ending reference (default: HEAD)
- `format` (string, optional): Output format - "markdown" or "json" (default: "markdown")

**Returns:** Structured changelog with features, fixes, breaking changes, and conventional commit formatting.

#### 4. `generate_release_notes`
Generate comprehensive release notes between two references.

**Parameters:**
- `from_ref` (string, required): Starting reference (previous release tag/branch)
- `to_ref` (string, optional): Ending reference (default: HEAD)
- `format` (string, optional): Output format - "markdown" or "json" (default: "markdown")
- `include_breaking_changes` (boolean, optional): Highlight breaking changes (default: true)

**Returns:** Professional release notes with summary statistics, highlights, and contributor information.

### Commit Enhancement Tools

#### 5. `suggest_commit_message`
Suggest an improved commit message based on the actual changes in a commit.

**Parameters:**
- `commit_hash` (string, required): The commit hash to analyze

**Returns:** AI-suggested commit message following conventional commit format with reasoning and confidence score.

#### 6. `find_similar_commits`
Find commits with similar changes or patterns to a given commit.

**Parameters:**
- `commit_hash` (string, required): The commit hash to find similarities for
- `limit` (number, optional): Maximum number of similar commits to return (default: 10, max: 50)

**Returns:** List of similar commits with similarity scores and reasoning.

### Code Ownership & Analysis Tools

#### 7. `analyze_code_ownership`
Analyze code ownership and expertise for files or directories.

**Parameters:**
- `path` (string, optional): Path to file or directory to analyze (default: entire repository)
- `min_ownership_percentage` (number, optional): Minimum ownership percentage to include (default: 5)

**Returns:** Detailed ownership analysis with primary owners, contributors, and expertise domains.

#### 8. `analyze_commit_patterns`
Analyze commit patterns and developer productivity metrics.

**Parameters:**
- `author` (string, optional): Specific author to analyze (analyzes all if not specified)
- `days` (number, optional): Number of days to analyze (default: 90, max: 365)

**Returns:** Comprehensive productivity analysis including commit frequency, peak hours, file types, and patterns.

### Git History Modification Tools ⚠️

> **SECURITY WARNING**: These tools can modify git history and are potentially destructive. Actual history rewriting is currently **DISABLED FOR SAFETY**. Only planning and analysis are enabled.

#### 16. `plan_commit_message_rewrite`
🔒 **SAFE** - Creates a comprehensive plan for rewriting commit messages with AI-generated improvements.

**Parameters:**
- `commit_hashes` (array, required): List of commit hashes to analyze and improve
- `dry_run` (boolean, optional): Generate plan without executing (default: true)

**Returns:** Detailed rewrite plan with safety checks, backup strategy, and confirmation token.

**Safety Features:**
- Comprehensive safety checks (uncommitted changes, pushed commits, protected branches)
- Risk assessment and warnings for merge commits and old commits
- Backup strategy with branch and tag creation
- Confirmation token system with expiration

#### 17. `execute_commit_rewrite`
🚫 **DISABLED** - Execute a previously planned commit message rewrite (currently disabled for safety).

**Parameters:**
- `confirmation_token` (string, required): Token from the rewrite plan
- `force` (boolean, optional): Override safety warnings (default: false)

**Status:** This tool is intentionally disabled to prevent accidental history corruption. Manual alternatives are provided in the plan output.

#### 18. `rollback_history_changes`
🔒 **SAFE** - Rollback to a backup reference if history modification goes wrong.

**Parameters:**
- `backup_ref` (string, required): Backup branch or tag name to restore
- `confirm` (boolean, required): Must be true to proceed with rollback

**Returns:** Success status and rollback details.

**Manual History Modification:**
If you need to rewrite commit messages, use these safe manual approaches:
1. **Interactive Rebase**: `git rebase -i HEAD~n` for recent commits
2. **Amend Last Commit**: `git commit --amend` for the most recent commit
3. **Filter Branch**: `git filter-branch --msg-filter` for complex rewrites

Always create backups before modifying history:
```bash
# Create backup branch
git branch backup-$(date +%Y%m%d-%H%M%S)

# Create backup tag  
git tag backup-tag-$(date +%Y%m%d-%H%M%S)
```

### GitLab Integration Tools

#### 9. `generate_detailed_issues`
Creates comprehensive GitLab issue data from git history.

**Parameters:**
- `since_days` (number, optional): Days to look back (default: 90)
- `filter_processed` (boolean, optional): Skip already processed branches (default: true)
- `include_code_diffs` (boolean, optional): Include code diffs in issues (default: true)
- `default_state` (string, optional): Issue state - "opened" or "closed" (default: "closed")
- `default_labels` (array, optional): Labels to apply (default: ["automated", "historical"])
- `time_estimate_multiplier` (number, optional): Adjust time estimates (default: 1.0)

**Returns:** GitLab-compatible issue data with detailed descriptions and metadata.

#### 10. `generate_executive_development_summary`
Creates executive-level development reports with visualizations.

**Parameters:**
- `since_days` (number, optional): Days to analyze (default: 180)
- `output_path` (string, optional): Output directory (default: current directory)
- `include_pdf` (boolean, optional): Generate PDF version (default: true)
- `consolidate_authors` (boolean, optional): Merge similar author names (default: true)

**Returns:** Markdown and PDF reports with development metrics and charts.

### Export & Formatting Tools

#### 11. `export_markdown_to_pdf`
Converts markdown files to PDF with mermaid chart rendering.

**Parameters:**
- `markdown_file_path` (string, required): Path to markdown file
- `output_path` (string, optional): Output PDF path
- `include_charts` (boolean, optional): Render mermaid charts (default: true)
- `page_format` (string, optional): "A4", "Letter", or "A3" (default: "A4")
- `margins` (object, optional): Page margins configuration

### Issue Tracking Tools

#### 12-15. Issue Management
- `check_issue_exists`: Verify if an issue was already created for a commit
- `mark_issue_created`: Record successful issue creation
- `get_issue_tracker_stats`: View tracking statistics
- `reset_issue_tracker`: Clear tracking data

#### 16-18. Git History Modification (Safety Mode)
- `plan_commit_message_rewrite`: Plan safe commit message improvements
- `execute_commit_rewrite`: Execute rewrite plan (currently disabled)
- `rollback_history_changes`: Restore from backup if needed

## Usage Examples

### Basic Git History Analysis

```javascript
// Analyze last 30 days of git history
{
  "tool": "parse_git_history",
  "arguments": {
    "since_days": 30
  }
}
```

### Commit Analysis & Enhancement

```javascript
// Get detailed diff for a specific commit
{
  "tool": "get_commit_diff",
  "arguments": {
    "commit_hash": "abc123def456",
    "include_patch": true
  }
}

// Suggest improved commit message
{
  "tool": "suggest_commit_message",
  "arguments": {
    "commit_hash": "abc123def456"
  }
}

// Find similar commits
{
  "tool": "find_similar_commits",
  "arguments": {
    "commit_hash": "abc123def456",
    "limit": 5
  }
}
```

### Changelog & Release Management

```javascript
// Generate changelog between versions
{
  "tool": "generate_changelog",
  "arguments": {
    "from_ref": "v1.0.0",
    "to_ref": "v2.0.0",
    "format": "markdown"
  }
}

// Create comprehensive release notes
{
  "tool": "generate_release_notes",
  "arguments": {
    "from_ref": "v1.5.0",
    "to_ref": "HEAD",
    "format": "markdown",
    "include_breaking_changes": true
  }
}
```

### Code Ownership & Team Analysis

```javascript
// Analyze code ownership for specific directory
{
  "tool": "analyze_code_ownership",
  "arguments": {
    "path": "src/components",
    "min_ownership_percentage": 10
  }
}

// Analyze developer commit patterns
{
  "tool": "analyze_commit_patterns",
  "arguments": {
    "author": "john.doe@company.com",
    "days": 30
  }
}

// Analyze all developers' patterns
{
  "tool": "analyze_commit_patterns",
  "arguments": {
    "days": 90
  }
}
```

### GitLab Integration

```javascript
// Generate issues for unprocessed branches
{
  "tool": "generate_detailed_issues",
  "arguments": {
    "since_days": 90,
    "filter_processed": true,
    "default_labels": ["automated", "historical", "backlog"]
  }
}
```

### Executive Reporting

```javascript
// Generate comprehensive development report
{
  "tool": "generate_executive_development_summary",
  "arguments": {
    "since_days": 180,
    "include_pdf": true,
    "consolidate_authors": true
  }
}
```

### Git History Modification (Safety Mode)

```javascript
// Plan commit message improvements (safe analysis only)
{
  "tool": "plan_commit_message_rewrite",
  "arguments": {
    "commit_hashes": ["abc123", "def456", "ghi789"],
    "dry_run": true
  }
}

// Rollback to backup if needed
{
  "tool": "rollback_history_changes",
  "arguments": {
    "backup_ref": "backup-main-2024-01-15-143022",
    "confirm": true
  }
}
```

> **Note**: The `execute_commit_rewrite` tool is intentionally disabled for safety. The planning tool provides manual instructions for safe history modification.

## Development

### Setup

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev
```

### Testing

```bash
# Test with MCP Inspector
npm run inspector

# Direct JSON-RPC testing
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | node ./dist/index.js
```

### Project Structure

```
git-history-mcp/
├── src/
│   ├── index.ts          # MCP server entry point
│   ├── git-parser.ts     # Git history extraction
│   ├── issue-generator.ts # GitLab issue generation
│   ├── issue-tracker.ts  # Duplicate prevention
│   ├── pdf-generator.ts  # PDF export functionality
│   └── types.ts          # TypeScript interfaces
├── dist/                 # Compiled JavaScript
├── .env                  # Environment configuration
└── package.json          # Project configuration
```

## Requirements

- Node.js 18 or higher
- Git repository with merge commit history
- (Optional) GitLab access for issue creation
- (Optional) Chrome/Chromium for PDF generation

## Security Notes

- Never commit `.env` files or expose access tokens
- Use `GITLAB_READ_ONLY_MODE=true` for testing
- The server runs with read-only git access by default
- All GitLab operations require explicit token configuration

## Troubleshooting

### Common Issues

1. **"No feature branches found"**
   - Ensure your repository uses merge commits (not squash)
   - Check the `since_days` parameter
   - Verify the `GIT_REPO_PATH` is correct

2. **PDF generation fails**
   - Puppeteer requires Chrome/Chromium
   - May need additional system dependencies on Linux
   - Check file write permissions

3. **STDIO transport errors**
   - Ensure no console.log statements in code
   - All output must go through MCP protocol
   - Check for proper JSON-RPC formatting

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

Built with:
- [Model Context Protocol SDK](https://modelcontextprotocol.io)
- [Simple Git](https://github.com/steveukx/git-js)
- [Puppeteer](https://pptr.dev/)
- [Mermaid](https://mermaid.js.org/)