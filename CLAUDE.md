# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Git History MCP Server - A Model Context Protocol server that analyzes git history to generate comprehensive GitLab issue data with detailed code analysis, contributor information, time estimates, PDF export capabilities, and integration prompts for automated issue creation.

## Key Commands

### Development
```bash
# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Run in development mode (with tsx)
npm run dev

# Run the built server
npm start

# Test MCP communication directly
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | node ./dist/index.js

# Test with MCP Inspector (interactive UI)
npm run inspector
```

### Environment Setup
Create a `.env` file with:
```
GIT_REPO_PATH=/path/to/target/repo
GITLAB_PERSONAL_ACCESS_TOKEN=your-token
GITLAB_API_URL=https://gitlab.example.com
GITLAB_READ_ONLY_MODE=true  # Set to false to enable GitLab writes
```

## Architecture

### Core Structure
- **index.ts**: MCP server entry point implementing STDIO transport and tool handlers
- **git-parser.ts**: Extracts git history, analyzes branches, and identifies features
- **issue-generator.ts**: Transforms git data into detailed GitLab issue format
- **issue-tracker.ts**: Persistent tracking of created issues to prevent duplicates
- **pdf-generator.ts**: Converts markdown to PDF with mermaid chart rendering via Puppeteer
- **types.ts**: TypeScript interfaces for data structures

### Key Design Patterns
1. **MCP Tool Pattern**: Each major function exposed as an MCP tool with structured inputs/outputs
2. **Async Pipeline**: Git parsing → Issue generation → PDF export flows asynchronously
3. **Persistent State**: Issue tracker uses JSON file storage for cross-session tracking
4. **Chart Generation**: Dynamic mermaid charts embedded in markdown and rendered in PDFs

## Distribution Requirements ✅

### NPM Publishing Configuration (COMPLETED)
1. **package.json updates** ✅:
   - Added `"bin": { "git-history-mcp": "./dist/index.js" }`
   - Added `"files": ["dist", "README.md", "LICENSE"]`
   - Added `"prepare": "npm run build"`

2. **Build script enhancements** ✅:
   - Build script sets executable permissions: `tsc && chmod +x dist/index.js`
   - Shebang (`#!/usr/bin/env node`) is preserved in built files

3. **STDIO Transport Rules**:
   - **NEVER** write to stdout - it corrupts JSON-RPC messages
   - All logging must go to stderr or be disabled

### Testing
- Added MCP Inspector script: `npm run inspector`
- Verified STDIO transport works correctly
- Confirmed executable permissions are set

## MCP Tools Reference

### Core Git Analysis (4 tools)
- `parse_git_history`: Analyzes git branches and commits with detailed change analysis
- `get_commit_diff`: Gets detailed diff information for specific commits with file changes and patches
- `suggest_commit_message`: Suggests improved commit messages based on actual changes using conventional format
- `find_similar_commits`: Finds commits with similar changes or patterns

### Documentation & Release Management (2 tools)
- `generate_changelog`: Generates changelogs between git references with conventional commit formatting
- `generate_release_notes`: Creates comprehensive release notes with highlights and contributor statistics

### Team & Code Analysis (2 tools)
- `analyze_code_ownership`: Analyzes code ownership and expertise for files/directories
- `analyze_commit_patterns`: Analyzes developer productivity metrics and commit patterns

### GitLab Integration (2 tools)
- `generate_detailed_issues`: Creates comprehensive GitLab issue data from git history
- `generate_executive_development_summary`: Creates executive-level development reports

### Export & Utilities (5 tools)
- `export_markdown_to_pdf`: Converts markdown reports to PDF with mermaid chart rendering
- `check_issue_exists`: Verifies if an issue was already created for a commit
- `mark_issue_created`: Records successful issue creation in tracking system
- `get_issue_tracker_stats`: Shows tracking statistics and processed issue counts
- `reset_issue_tracker`: Clears all tracking data (useful for testing)

## Testing MCP Server

```bash
# After building, test tools listing
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | node ./dist/index.js

# Test a specific tool (parse_git_history)
echo '{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "parse_git_history", "arguments": {"repoPath": ".", "targetBranch": "main"}}}' | node ./dist/index.js
```

## Important Constraints

1. **STDIO Transport**: Server uses stdin/stdout for JSON-RPC - no console.log allowed
2. **Async Operations**: All git operations and PDF generation are async
3. **File Permissions**: Issue tracker writes to `.gitlab-issue-tracker.json`
4. **Security**: Never commit `.env` file or expose tokens
5. **PDF Generation**: Requires headless Chrome via Puppeteer

## Common Development Tasks

When implementing new features:
1. Add tool definition in index.ts following existing pattern
2. Implement core logic in separate module
3. Update types.ts with new interfaces
4. Test via direct JSON-RPC before MCP client integration
5. Ensure no stdout output in implementation