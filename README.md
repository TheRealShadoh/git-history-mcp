# Git History MCP v2.1

An enhanced Model Context Protocol (MCP) server that analyzes git history to generate comprehensive GitLab issue data with detailed code analysis, contributor information, time estimates, PDF export capabilities, and integration prompts for automated issue creation.

![Version](https://img.shields.io/badge/version-2.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

## 🚀 Features

### Core Capabilities
- **Comprehensive Git Analysis**: Parse git history to extract feature branches with detailed commit analysis
- **Detailed Issue Generation**: Create comprehensive GitLab issues with:
  - Full contributor information and roles
  - Technical implementation details
  - Benefits and impact analysis
  - Realistic time estimates with task breakdowns
  - Code diffs with analysis
  - Automated labeling and categorization

### PDF Export & Visualization ⭐ NEW
- **Markdown to PDF Export**: Convert markdown reports to professional PDFs
- **Mermaid Chart Rendering**: Automatically render mermaid diagrams in PDFs
- **Configurable Formatting**: Support for A4, Letter, and A3 page formats
- **Custom Styling**: Professional styling with proper typography and layout
- **Chart Integration**: Seamless integration of flowcharts, pie charts, timelines, and more

### Tracking & Validation
- **Commit-Based Tracking**: Track processed issues by commit hash (improved from branch-based)
- **Duplicate Prevention**: Check for existing issues before creation
- **GitLab Integration**: Direct integration with GitLab MCP for automated issue creation
- **State Management**: Support for creating issues as opened or closed

### Advanced Analysis
- **Technology Detection**: Automatically detect technologies (Ansible, Docker, Kubernetes, etc.)
- **Change Categorization**: Classify changes by type (features, bugfixes, refactoring)
- **Complexity Assessment**: Analyze code complexity for accurate time estimation
- **File Pattern Analysis**: Understand project structure and change patterns

## 📦 Installation

```bash
git clone <repository-url>
cd git-history-mcp
npm install
npm run build
```

## ⚙️ Configuration

### Environment Setup

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Edit `.env` with your configuration:
```bash
# Required: Set your git repository path
GIT_REPO_PATH=/path/to/your/git/repository

# Optional: GitLab integration (if using GitLab MCP)
GITLAB_PERSONAL_ACCESS_TOKEN=your_token_here
GITLAB_API_URL=https://your-gitlab-instance.com/api/v4
GITLAB_READ_ONLY_MODE=false
```

### Claude Code MCP Configuration
```json
{
  "mcpServers": {
    "git-history": {
      "command": "node",
      "args": ["/path/to/git-history-mcp/dist/index.js"],
      "env": {
        "GIT_REPO_PATH": "/path/to/your/repository"
      }
    },
    "gitlab": {
      "command": "npx",
      "args": ["-y", "@zereight/mcp-gitlab"],
      "env": {
        "GITLAB_PERSONAL_ACCESS_TOKEN": "your_token_here",
        "GITLAB_API_URL": "https://your-gitlab-instance.com/api/v4",
        "GITLAB_READ_ONLY_MODE": "false"
      }
    }
  }
}
```

## 🛠️ Available Tools

### 1. `parse_git_history`
Parse git history to extract feature branches and their commits.

**Parameters:**
- `since_days` (number): Days to look back (default: 90)

**Example:**
```json
{
  "name": "parse_git_history",
  "arguments": {
    "since_days": 180
  }
}
```

### 2. `generate_detailed_issues` ⭐ 
Generate comprehensive GitLab issue data with full analysis.

**Parameters:**
- `since_days` (number): Days to look back (default: 90)  
- `filter_processed` (boolean): Skip already processed branches (default: true)
- `include_code_diffs` (boolean): Include code diffs in descriptions (default: true)
- `default_state` (string): Default issue state "opened" or "closed" (default: "closed")
- `default_labels` (array): Default labels for all issues (default: ["automated", "historical"])
- `time_estimate_multiplier` (number): Multiplier for time estimates (default: 1.0)

**Example:**
```json
{
  "name": "generate_detailed_issues", 
  "arguments": {
    "since_days": 90,
    "include_code_diffs": true,
    "default_state": "closed",
    "default_labels": ["feature", "automated", "historical"],
    "time_estimate_multiplier": 1.2
  }
}
```

### 3. `export_markdown_to_pdf` ⭐ NEW
Export markdown files to PDF with mermaid chart rendering.

**Parameters:**
- `markdown_file_path` (string): Path to the markdown file to convert
- `output_path` (string): Output path for PDF file (optional, defaults to same directory)
- `include_charts` (boolean): Whether to render mermaid charts (default: true)
- `page_format` (string): PDF page format - "A4", "Letter", or "A3" (default: "A4")
- `margins` (object): PDF margins with top, right, bottom, left properties

**Example:**
```json
{
  "name": "export_markdown_to_pdf",
  "arguments": {
    "markdown_file_path": "/path/to/report.md",
    "include_charts": true,
    "page_format": "A4",
    "margins": {
      "top": "1in",
      "right": "0.8in",
      "bottom": "1in",
      "left": "0.8in"
    }
  }
}
```

### 4. `check_issue_exists`
Check if an issue already exists for a specific commit.

**Parameters:**
- `commit_hash` (string): The commit hash to check

### 5. `mark_issue_created`
Mark an issue as successfully created in GitLab.

**Parameters:**
- `branch_name` (string): The branch name
- `commit_hash` (string): The merge commit hash
- `issue_id` (number): The created GitLab issue ID

### 6. `get_issue_tracker_stats`
Get statistics about processed issues.

### 7. `reset_issue_tracker`
Reset the issue tracker (useful for testing).

## 🔗 Integration with GitLab MCP

The enhanced git-history MCP is designed to work seamlessly with the GitLab MCP. Here's a typical workflow:

### Basic Workflow
```typescript
// 1. Generate comprehensive issues
const issues = await gitHistoryMcp.generate_detailed_issues({
  since_days: 90,
  default_state: "closed",
  include_code_diffs: true
});

// 2. Create each issue in GitLab
for (const issue of issues.data.issues) {
  // Check if issue already exists
  const exists = await gitHistoryMcp.check_issue_exists({
    commit_hash: issue.merge_commit_hash
  });
  
  if (!exists.data.exists) {
    // Create issue in GitLab
    const created = await gitlabMcp.create_issue({
      project_id: "1",
      title: issue.title,
      description: issue.description,
      labels: issue.labels.split(','),
      state_event: issue.state_event
    });
    
    // Track the created issue
    await gitHistoryMcp.mark_issue_created({
      branch_name: issue.branch_name,
      commit_hash: issue.merge_commit_hash,
      issue_id: created.iid
    });
  }
}

// 3. Export comprehensive reports to PDF
await gitHistoryMcp.export_markdown_to_pdf({
  markdown_file_path: "/path/to/development-summary.md",
  include_charts: true,
  page_format: "A4"
});
```

## 📄 PDF Export Features

### Supported Chart Types
The PDF export tool supports all mermaid diagram types:
- **Flowcharts**: Process flows and architecture diagrams
- **Pie Charts**: Distribution and percentage data
- **Timeline**: Development roadmaps and schedules
- **Quadrant Charts**: Priority and impact analysis
- **XY Charts**: Quantitative data visualization
- **Git Graphs**: Contributor activity and branching
- **Sequence Diagrams**: System interactions

### Professional Styling
- **Typography**: Clean, readable fonts optimized for print
- **Color Schemes**: Professional color palette with print-friendly options
- **Layout**: Proper margins, spacing, and page breaks
- **Tables**: Styled tables with alternating row colors
- **Code Blocks**: Syntax highlighting and proper formatting
- **Charts**: Centered charts with proper spacing and shadows

### Example Usage
```bash
# Convert development summary to PDF
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "export_markdown_to_pdf", "arguments": {"markdown_file_path": "/path/to/report.md", "include_charts": true}}}' | node dist/index.js

# Custom page format and margins
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "export_markdown_to_pdf", "arguments": {"markdown_file_path": "/path/to/report.md", "page_format": "Letter", "margins": {"top": "1.5in", "bottom": "1.5in"}}}}' | node dist/index.js
```

## 📊 Generated Issue Format

The enhanced MCP generates comprehensive issues with this structure:

```markdown
## Feature Branch: branch-name

**Merged:** July 27, 2025
**Merge Commit:** abc1234567890
**Author:** Developer Name

### Contributors
| Name | Role | Commits | Lines Changed |
|------|------|---------|---------------|
| John Smith | Author | 3 | 450 |
| Jane Doe | Co-Author | 1 | 120 |

### Changes Summary
- **Files Modified:** 23
- **Lines Added:** 611  
- **Lines Removed:** 51
- **Total Changes:** 662 lines
- **Commits:** 4

### Overview
This feature implementation modifies 23 files with 611 additions and 51 deletions. The changes focus on VDI GPU virtualization, infrastructure automation, security enhancements.

### Key Features
- NVIDIA vGPU support for VDI environments
- GPU acceleration for virtual desktops
- Enhanced graphics performance
- Resource optimization algorithms

### Technical Implementation  
- Python script modifications for GPU management
- YAML configuration updates for Ansible playbooks
- Shell script automation for deployment
- Configuration management for vGPU profiles

### Benefits
- Enhanced graphics performance for virtual desktops
- Improved resource utilization
- Better user experience for graphics applications
- Scalable GPU virtualization

### Time Estimate
**Estimated Development Time:** 24-32 hours

This estimate includes:
- Requirements analysis and design (4 hours)
- Implementation and coding (13 hours)  
- Testing and validation (6 hours)
- Code review and refactoring (5 hours)
- Documentation and deployment (4 hours)

### Key Code Changes
#### roles/vdi/templates/vgpu.conf.j2
*New file added with 45 lines of vGPU configuration*
```diff
+{% for gpu in vgpu_profiles %}
+device_vgpu_{{ gpu.name }} {
+    vendor_id = {{ gpu.vendor_id }}
+    device_id = {{ gpu.device_id }}
+    ...
+}
+{% endfor %}
```
```

## ⏱️ Time Estimation Logic

The MCP uses intelligent time estimation based on:

### Base Calculation
- **Base Hours**: 1 hour per 100 lines changed (minimum 4 hours)
- **File Complexity**: Additional time for file count
- **Technology Complexity**: Multipliers for complex technologies (security: 1.2x, refactoring: 1.3x, migration: 1.5x)
- **Team Size**: Adjustments for multiple contributors

### Task Breakdown Distribution
- **Requirements analysis and design** (15%)
- **Implementation and coding** (40%)
- **Testing and validation** (20%)
- **Code review and refactoring** (15%)
- **Documentation and deployment** (10%)

### Complexity Factors
- Database changes: +30%
- Security implementations: +20%
- Multi-contributor projects: +20%
- Refactoring projects: +30%

## 🏷️ Automated Label Generation

Labels are automatically generated based on:

### Change Type
- `feature` - New functionality
- `bugfix` - Bug fixes and patches
- `refactoring` - Code restructuring
- `enhancement` - Improvements to existing features

### Technology Stack
- `ansible` - Ansible automation
- `docker` - Container technology
- `kubernetes` - Kubernetes deployments
- `security` - Security-related changes
- `database` - Database modifications
- `python` - Python scripts
- `javascript` - JS/TS code

### Change Size
- `size/small` - <100 lines changed
- `size/medium` - 100-500 lines changed 
- `size/large` - 500-2000 lines changed
- `size/xlarge` - >2000 lines changed

### Custom Labels
- User-defined default labels
- Project-specific categorization
- Priority indicators

## 📈 Tracking System

### Commit Hash-Based Tracking
The tracking system uses commit hashes for better accuracy:

- **Unique Identification**: Commit hashes are globally unique
- **Merge Commit Focus**: Specifically tracks merge commits
- **Backward Compatibility**: Automatically migrates old branch-based format
- **Validation**: Built-in validation against GitLab issues

### Tracking File Location
- **File**: `.git-issues-tracker.json` 
- **Format**: JSON with commit hash keys
- **Data**: Branch name, issue ID, creation date, status

### Tracking Methods
```typescript
// Check if issue exists for a commit
const exists = await checkIssueExists({ commit_hash: "abc123..." });

// Get issue details by commit
const issue = await getIssueByCommit("abc123...");

// Track successful creation
await markIssueCreated({
  branch_name: "feature-branch",
  commit_hash: "abc123...",
  issue_id: 42
});
```

## 🔧 Development

### Build and Run
```bash
npm install
npm run build
npm start
```

### Development Mode
```bash
npm run dev
```

### Testing
```bash
npm test
```

### Manual Testing
```bash
# Test git history parsing
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "parse_git_history", "arguments": {"since_days": 30}}}' | node dist/index.js

# Test issue generation  
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "generate_detailed_issues", "arguments": {"since_days": 30, "include_code_diffs": false}}}' | node dist/index.js

# Test PDF export
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "export_markdown_to_pdf", "arguments": {"markdown_file_path": "/path/to/file.md", "include_charts": true}}}' | node dist/index.js
```

## 🚨 Error Handling

### Graceful Degradation
- Missing git repository → Clear error message
- Unreadable commits → Skip with warning
- Missing contributor data → Use fallback values
- Large diffs → Truncate with notification
- PDF generation errors → Detailed error reporting

### Validation
- Commit hash validation
- Branch name sanitization
- Time estimate bounds checking
- Label format validation
- File path validation for PDF export

### Logging
- Structured error logging
- Debug mode support
- Performance metrics
- Issue creation tracking
- PDF generation monitoring

## 📋 Migration from v2.0

### New Features in v2.1
- **PDF Export**: Complete markdown to PDF conversion with mermaid support
- **Enhanced Styling**: Professional PDF formatting and layout
- **Chart Rendering**: Automatic mermaid diagram rendering in PDFs
- **Configurable Formats**: Support for multiple page formats and margins

### Backward Compatibility
All existing v2.0 features remain fully compatible. No changes required to existing workflows.

## 📚 Examples

### Quick Start
```bash
# Generate and create issues for last 3 months
node -e "
const mcp = require('./dist/index.js');
mcp.generateDetailedIssues({
  since_days: 90,
  default_state: 'closed',
  include_code_diffs: true
}).then(console.log);
"
```

### PDF Export Workflow
```bash
# Generate comprehensive report and export to PDF
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "generate_detailed_issues", "arguments": {"since_days": 180}}}' | node dist/index.js > report.json

# Export markdown report to PDF
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "export_markdown_to_pdf", "arguments": {"markdown_file_path": "/path/to/report.md", "include_charts": true, "page_format": "A4"}}}' | node dist/index.js
```

### Custom Configuration
```typescript
const config = {
  since_days: 180,
  filter_processed: true,
  include_code_diffs: true,
  default_state: 'closed',
  default_labels: ['completed', 'automated', 'historical'],
  time_estimate_multiplier: 1.3
};

const issues = await gitHistoryMcp.generate_detailed_issues(config);

// Export to PDF with custom settings
await gitHistoryMcp.export_markdown_to_pdf({
  markdown_file_path: '/path/to/report.md',
  output_path: '/path/to/custom-report.pdf',
  include_charts: true,
  page_format: 'Letter',
  margins: {
    top: '1.5in',
    bottom: '1.5in',
    left: '1in',
    right: '1in'
  }
});
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Add tests for new functionality
- Update documentation
- Use conventional commit messages

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Related Projects

- [GitLab MCP Server](https://github.com/zereight/gitlab-mcp) - GitLab API integration
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP specification
- [Claude Code](https://claude.ai/code) - AI-powered development assistant
- [Puppeteer](https://pptr.dev/) - PDF generation engine
- [Mermaid](https://mermaid.js.org/) - Diagram and flowchart generation

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/git-history-mcp/issues)
- **Documentation**: [GitHub Wiki](https://github.com/your-repo/git-history-mcp/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/git-history-mcp/discussions)

---

**Git History MCP v2.1** - Transforming git history into comprehensive project documentation with intelligent analysis, seamless GitLab integration, and professional PDF export capabilities.