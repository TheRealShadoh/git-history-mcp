# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Git History MCP Server - A Model Context Protocol server that analyzes git history to generate comprehensive development reports with detailed code analysis, contributor information, time estimates, PDF export capabilities, and repository management tools.

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
No environment setup required. The server works with any Git repository in the current working directory or can be configured to work with remote repositories using the built-in repository management tools.

## Architecture

### Core Structure
- **index.ts**: MCP server entry point implementing STDIO transport and tool handlers
- **git-parser.ts**: Extracts git history, analyzes branches, and identifies features
- **issue-generator.ts**: Transforms git data into detailed issue format
- **executive-summary-generator.ts**: Enhanced executive summary generator with accurate time estimation
- **issue-tracker.ts**: Persistent tracking of created issues to prevent duplicates
- **pdf-generator.ts**: Converts markdown to PDF with mermaid chart rendering via Puppeteer
- **types.ts**: TypeScript interfaces for data structures

### Key Design Patterns
1. **MCP Tool Pattern**: Each major function exposed as an MCP tool with structured inputs/outputs
2. **Async Pipeline**: Git parsing → Issue generation → PDF export flows asynchronously
3. **Persistent State**: Issue tracker uses JSON file storage for cross-session tracking
4. **Chart Generation**: Dynamic mermaid charts embedded in markdown and rendered in PDFs
5. **Enhanced Analytics**: Evidence-based time estimation with quality assurance overhead multipliers

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

### Repository Management (4 tools)
- `set_repository_path`: Switch to a different local repository path
- `clone_repository`: Clone remote repositories for analysis
- `checkout_branch`: Switch branches within the current repository  
- `pull_repository`: Pull latest changes from remote repositories

### Issue Data & Reporting (2 tools)
- `generate_detailed_issues`: Creates comprehensive issue data from git history
- `generate_executive_development_summary`: Creates enhanced executive-level development reports with accurate time estimation, individual developer analysis, temporal patterns, and actionable recommendations

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
3. **File Permissions**: Issue tracker writes to `.git-history-issue-tracker.json`
4. **Security**: Repository operations use standard Git protocols
5. **PDF Generation**: Requires headless Chrome via Puppeteer

## Common Development Tasks

When implementing new features:
1. Add tool definition in index.ts following existing pattern
2. Implement core logic in separate module
3. Update types.ts with new interfaces
4. Test via direct JSON-RPC before MCP client integration
5. Ensure no stdout output in implementation

## 📊 Enhanced Executive Summary Generator

The `generate_executive_development_summary` tool has been significantly enhanced with a comprehensive analytics engine that provides accurate, evidence-based reporting for executive decision-making.

### Key Features

#### 1. Accurate Time Estimation Methodology
- **Base Development Time**: Calculated from actual code changes and file modifications
- **Quality Assurance Overhead**: Applied based on complexity category:
  - High complexity (Security, Infrastructure, Architecture): +30% 
  - Medium complexity (Features, Integration): +20%
  - Low complexity (Bug fixes, Documentation): +15%
- **Phase Distribution**: Research (15%), Development (40%), Testing (25%), Review (15%), Documentation (5%)
- **Contribution Attribution**: Hours distributed based on actual code contribution percentages

#### 2. Individual Developer Analysis
- **Total Hours**: Accurate effort investment including all development phases
- **Specialization Areas**: Automatically identified based on file patterns and commit history
- **Peak Productivity Patterns**: Monthly analysis and contribution trends
- **Skills Deployment**: Breakdown across infrastructure, features, security, bugfixes, and documentation
- **Branch Contributions**: Detailed role analysis (primary, secondary, reviewer) with complexity ratings

#### 3. Temporal Analysis
- **Monthly Breakdown**: Hours, active developers, major deliverables, and utilization rates
- **Seasonal Patterns**: Identification of high/low productivity periods with explanations
- **Sprint Effectiveness**: Cycle time analysis, release frequency, and velocity trends
- **Capacity Planning**: Utilization tracking and constraint identification

#### 4. Executive Dashboard Metrics
- **Team Metrics**: Total developers, average hours per developer, workload distribution ratios
- **Velocity Trends**: Month-over-month comparison with percentage changes
- **Resource Distribution**: Investment breakdown by category (features, infrastructure, fixes)
- **Critical Path Analysis**: Major deliverables, blockers, and risk area identification

#### 5. Key Insights & Recommendations
- **Productivity Drivers**: Evidence-based identification of what drives team performance
- **Resource Optimization**: Opportunities for better resource allocation
- **Retention Risks**: Single points of failure and workload imbalance warnings
- **Capacity Constraints**: Over-utilization periods and planning recommendations
- **Actionable Recommendations**: Immediate, short-term, and long-term action items

#### 6. Reporting Integrity
- **Unfiltered Accuracy**: Reports actual contribution disparities without artificial balancing
- **Evidence-Based**: All estimates grounded in observable git data
- **Transparent Methodology**: Clear documentation of all estimation assumptions
- **Executive Ready**: Structured for leadership consumption with key insights highlighted

### Usage

```bash
# Basic usage
{
  "tool": "generate_executive_development_summary",
  "arguments": {
    "since_days": 180,
    "organization_name": "ACME Corp",
    "include_pdf": true
  }
}
```

### Output Structure

The enhanced generator produces:
1. **Executive Summary**: Key findings and recommendations
2. **Individual Developer Analysis**: Detailed contribution breakdown with hours
3. **Temporal Analysis**: Monthly patterns and seasonal trends
4. **Resource Allocation**: Investment distribution across categories
5. **Major Deliverables**: High-effort branches with complexity analysis
6. **Key Insights**: Productivity drivers, risks, and constraints
7. **Recommendations**: Immediate, short-term, and long-term actions
8. **Methodology**: Transparent explanation of estimation approach

## 🚀 Improvement Plan (2025)

This section outlines the comprehensive improvement plan to enhance the git-history-mcp server for better accuracy, robustness, and adoption.

### Phase 1: Type Safety & Validation (HIGH PRIORITY)

#### 1.1 Implement Zod Schema Validation
- [ ] Install Zod as a dependency (`npm install zod`)
- [ ] Create `src/schemas/` directory for all validation schemas
- [ ] Convert all tool parameter definitions to Zod schemas
- [ ] Implement runtime validation for all tool inputs
- [ ] Add type inference from Zod schemas for better TypeScript integration
- [ ] Create validation utilities in `src/validation.ts` using Zod

#### 1.2 Type System Improvements
- [ ] Fix missing `HourEstimate` type definition in `types.ts`
- [ ] Add comprehensive JSDoc comments to all exported types
- [ ] Implement stricter TypeScript configuration (enable all strict checks)
- [ ] Create type guards for runtime type checking
- [ ] Add generic types for API responses

### Phase 2: Error Handling & Reliability (HIGH PRIORITY)

#### 2.1 Implement "Logic Throws, Handler Catches" Pattern
- [ ] Refactor each tool into separate logic and registration files
- [ ] Create `src/tools/` directory with subdirectories for each tool category
- [ ] Implement structured error classes in `src/errors.ts`
- [ ] Add error codes following MCP specification
- [ ] Replace all `console.error` with proper MCP error responses

#### 2.2 Logging & Debugging
- [ ] Create stderr-based logging system for debugging
- [ ] Add debug mode with environment variable control
- [ ] Implement request/response logging for troubleshooting
- [ ] Add performance metrics logging

### Phase 3: Testing Suite (HIGH PRIORITY)

#### 3.1 Unit Testing Setup
- [ ] Create `src/__tests__/` directory structure
- [ ] Write unit tests for all core modules:
  - [ ] `git-parser.test.ts`
  - [ ] `issue-generator.test.ts`
  - [ ] `commit-analyzer.test.ts`
  - [ ] `code-ownership.test.ts`
  - [ ] `hour-estimator.test.ts`
- [ ] Achieve minimum 80% code coverage
- [ ] Add test fixtures for git repositories

#### 3.2 Integration Testing
- [ ] Create integration tests for MCP communication
- [ ] Test all tools with various input scenarios
- [ ] Add error scenario testing
- [ ] Implement CI/CD pipeline with GitHub Actions

### Phase 4: New Tools & Enhanced Functionality (MEDIUM PRIORITY)

#### 4.1 Advanced Git Analysis Tools
- [ ] `analyze_merge_conflicts`: Analyze and suggest resolutions for merge conflicts
- [ ] `generate_dependency_graph`: Create visual dependency graphs between files
- [ ] `analyze_technical_debt`: Identify areas of technical debt based on commit patterns
- [ ] `generate_architecture_diagram`: Auto-generate architecture diagrams from codebase
- [ ] `analyze_pr_review_patterns`: Analyze PR review patterns and turnaround times

#### 4.2 AI-Enhanced Tools
- [ ] `generate_code_review_checklist`: AI-powered code review checklist based on patterns
- [ ] `suggest_refactoring_opportunities`: Identify code that needs refactoring
- [ ] `generate_test_scenarios`: Generate test scenarios based on code changes
- [ ] `analyze_security_patterns`: Identify potential security issues in commit history

#### 4.3 Project Management Tools
- [ ] `generate_sprint_retrospective`: Generate sprint retrospectives from git data
- [ ] `estimate_feature_complexity`: Estimate feature complexity based on historical data
- [ ] `generate_team_velocity_report`: Calculate and visualize team velocity
- [ ] `analyze_deployment_patterns`: Analyze deployment frequency and patterns

### Phase 5: Remote Server & OAuth Support (MEDIUM PRIORITY)

#### 5.1 HTTP Transport Implementation
- [ ] Add HTTP+SSE transport alongside STDIO
- [ ] Implement transport abstraction layer
- [ ] Create `src/transports/` directory with modular transports
- [ ] Add WebSocket transport for real-time updates
- [ ] Implement connection pooling for remote repositories

#### 5.2 Authentication & Security
- [ ] Implement OAuth 2.0 flow for GitHub/GitLab/Bitbucket
- [ ] Add API key authentication option
- [ ] Implement rate limiting for API calls
- [ ] Add request signing for security
- [ ] Create authentication middleware

### Phase 6: MCP 2025 Specification Compliance (MEDIUM PRIORITY)

#### 6.1 Tool Annotations
- [ ] Add tool annotations to all existing tools:
  - [ ] `readOnlyHint` for analysis tools
  - [ ] `openWorldHint` for tools that access external services
  - [ ] `costHint` for expensive operations
- [ ] Implement metadata for better tool discovery
- [ ] Add tool categories and tags

#### 6.2 Resource & Prompt Support
- [ ] Implement MCP Resources for read-only data access
- [ ] Create prompts for common workflows
- [ ] Add resource caching for performance
- [ ] Implement resource versioning

### Phase 7: Documentation & Developer Experience (MEDIUM PRIORITY)

#### 7.1 Comprehensive Documentation
- [ ] Create `docs/` directory with structured documentation
- [ ] Write tool-specific documentation with examples
- [ ] Add architecture decision records (ADRs)
- [ ] Create troubleshooting guide
- [ ] Add migration guide from v1 to v2

#### 7.2 Developer Tools
- [ ] Create CLI for server management
- [ ] Add development mode with hot reloading
- [ ] Implement tool scaffolding generator
- [ ] Create VS Code extension for easier development
- [ ] Add Docker support for containerized deployment

### Phase 8: Performance & Scalability (LOW PRIORITY)

#### 8.1 Performance Optimization
- [ ] Implement caching layer for git operations
- [ ] Add parallel processing for large repositories
- [ ] Optimize memory usage for large datasets
- [ ] Implement streaming for large responses
- [ ] Add repository indexing for faster queries

#### 8.2 Scalability Features
- [ ] Add support for distributed git repositories
- [ ] Implement queue-based processing for long operations
- [ ] Add horizontal scaling support
- [ ] Create monitoring and alerting system
- [ ] Implement graceful shutdown handling

### Implementation Order

1. **Immediate Actions** (Week 1-2):
   - Commit pending changes (`hour-estimator.ts`, modified files)
   - Implement Zod validation for existing tools
   - Fix type safety issues
   - Add basic error handling improvements

2. **Short Term** (Week 3-4):
   - Create comprehensive test suite
   - Implement "Logic Throws, Handler Catches" pattern
   - Add tool annotations for MCP 2025 spec

3. **Medium Term** (Month 2):
   - Add new analysis tools
   - Implement HTTP transport
   - Create developer documentation

4. **Long Term** (Month 3+):
   - OAuth implementation
   - Performance optimizations
   - Advanced AI-enhanced tools

### Success Metrics

- **Code Quality**: 80%+ test coverage, zero TypeScript errors
- **Reliability**: <0.1% error rate in production
- **Performance**: <100ms response time for basic operations
- **Adoption**: 1000+ GitHub stars, 50+ active contributors
- **Documentation**: 100% API coverage, <5 min onboarding time

This improvement plan transforms git-history-mcp into a production-ready, enterprise-grade MCP server that sets the standard for git analysis tools in the AI ecosystem.