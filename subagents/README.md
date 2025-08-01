# Executive Summary Generator Subagent

A specialized AI agent for generating comprehensive executive-level development activity summaries with accurate time estimation and actionable insights.

## 🎯 Overview

This subagent transforms git repository history into executive-ready reports that provide unfiltered, accurate insights for leadership decision-making. It analyzes developer contributions, identifies patterns, estimates effort accurately, and generates actionable recommendations.

## 📁 Files Structure

```
subagents/
├── README.md                    # This file - overview and quick start
├── executive-summary-agent.md   # Complete agent prompt and instructions
├── agent-config.json           # Agent configuration and capabilities
├── agent-manifest.yaml         # Deployment manifest and specifications
├── integration-examples.md     # Platform-specific integration examples
└── api-specification.md        # Complete API reference and schemas
```

## 🚀 Quick Start

### 1. Use with Claude Code

```markdown
Load the executive summary agent from: `subagents/executive-summary-agent.md`

Then prompt:
"You are now the Executive Development Activity Summary Generator Agent. 

Analyze this repository and generate an executive summary for "ACME Corporation" covering the last 180 days. Include PDF export and focus on identifying any retention risks or capacity constraints.

Repository path: /path/to/repo"
```

### 2. Use with MCP Server

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "generate_executive_development_summary",
    "arguments": {
      "since_days": 180,
      "organization_name": "ACME Corporation",
      "include_pdf": true
    }
  }
}
```

### 3. CLI Integration

```bash
# Using the MCP server directly
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "generate_executive_development_summary", "arguments": {"since_days": 90, "organization_name": "TechCorp"}}}' | node ./dist/index.js
```

## 🎨 Key Features

### 💡 **Accurate Time Estimation**
- Evidence-based methodology (not just commit counts)
- Quality assurance overhead multipliers
- Phase-based effort distribution
- Realistic project complexity assessment

### 👥 **Individual Developer Analysis**
- **Unfiltered reporting** of actual contribution disparities
- Specialization identification based on code patterns
- Peak productivity period analysis
- Skills deployment across project types

### 📈 **Executive-Ready Insights**
- Resource allocation optimization opportunities
- Retention risk identification
- Capacity constraint analysis
- Velocity trend monitoring

### 🎯 **Actionable Recommendations**
- Immediate actions (1-2 weeks)
- Short-term initiatives (1-3 months)
- Long-term strategic goals (3-12 months)

## 📊 Sample Output

```markdown
# ACME Corporation Executive Development Activity Summary

**Analysis Period:** 2/1/2025 - 8/1/2025 (180 days)

## 📊 Executive Dashboard Metrics

- **Total Engineering Investment:** 2,480 hours
- **Active Team Size:** 8 developers
- **Average Contribution:** 310 hours per developer
- **Top Contributor:** Alice Johnson
- **Workload Ratio:** 3.2:1 (highest:lowest)
- **Velocity Trend:** accelerating (+15.3% vs last period)

## 👥 Individual Developer Analysis

| Developer | Total Hours | Branches | Primary Specializations |
|-----------|-------------|----------|------------------------|
| Alice Johnson | **620** | 12 | Backend, Infrastructure |
| Bob Smith | **380** | 8 | Frontend, UI/UX |
| Carol Davis | **310** | 6 | Database, API |
| Dave Wilson | **290** | 7 | Testing, DevOps |
| Eve Brown | **280** | 5 | Security, Auth |
| Frank Miller | **260** | 4 | Documentation |
| Grace Lee | **210** | 3 | Mobile, React |
| Henry Taylor | **130** | 2 | Intern, Learning |

## 💡 Key Insights

### Retention Risks
⚠️ Alice Johnson contributed 4.8x more hours than Henry Taylor
⚠️ Single point of failure in backend infrastructure knowledge

### Resource Optimization Opportunities
- 45% of effort on features vs 30% on infrastructure
- Consider pairing junior developers with seniors
- Backend expertise concentrated in one person

## 🎯 Recommendations

### Immediate Actions (1-2 weeks)
- Implement knowledge sharing sessions for Alice's infrastructure work
- Review Henry's workload and provide additional mentoring
- Document critical backend systems and processes

### Short-term Initiatives (1-3 months)
- Cross-train at least 2 developers on infrastructure
- Establish pair programming rotations
- Create technical debt reduction sprints
```

## 🔧 Integration Options

| Platform | Complexity | File to Use |
|----------|------------|-------------|
| **Claude Code** | Easy | `executive-summary-agent.md` |
| **MCP Server** | Easy | Use existing implementation |
| **REST API** | Medium | `integration-examples.md` |
| **CLI Tool** | Medium | `integration-examples.md` |
| **GitHub Actions** | Medium | `integration-examples.md` |
| **Docker** | Advanced | `integration-examples.md` |
| **Custom System** | Advanced | `api-specification.md` |

## 📋 Configuration Options

```json
{
  "analysis_period_days": 180,
  "organization_name": "Your Company",
  "include_pdf_export": true,
  "consolidate_similar_authors": true,
  "major_deliverable_threshold_hours": 40,
  "qa_overhead_multipliers": {
    "high_complexity": 1.30,
    "medium_complexity": 1.20,
    "low_complexity": 1.15
  }
}
```

## 🎯 Core Principles

### **Accuracy Over Equity**
Reports actual contribution disparities without artificial balancing. If Developer A contributed 480 hours and Developer B contributed 32 hours, this is stated explicitly.

### **Evidence-Based Estimation**
All time estimates are grounded in observable git data, not proxies like commit counts or lines of code.

### **Executive Readiness**
Reports are structured for leadership consumption with clear insights and actionable recommendations.

### **Transparent Methodology**
All estimation assumptions and calculations are documented and explained.

## 🚨 Important Notes

### Time Estimation Methodology

The agent uses a sophisticated methodology that includes:

- **Base Development Time**: Calculated from actual code changes and file modifications
- **Quality Assurance Overhead**: Applied based on complexity:
  - High complexity (Security, Infrastructure): +30%
  - Medium complexity (Features, Integration): +20%
  - Low complexity (Bug fixes, Documentation): +15%
- **Phase Distribution**: Research (15%), Development (40%), Testing (25%), Review (15%), Documentation (5%)

### Data Privacy and Security

- No repository contents are stored after processing
- Only git metadata and statistics are analyzed
- Generated reports contain aggregated insights, not sensitive code
- All file paths are validated to prevent directory traversal

## 📚 Documentation

- **`executive-summary-agent.md`**: Complete agent prompt with detailed instructions
- **`integration-examples.md`**: Platform-specific integration examples and code samples
- **`api-specification.md`**: Complete API reference with schemas and error handling
- **`agent-config.json`**: Configuration options and capabilities
- **`agent-manifest.yaml`**: Deployment specifications and requirements

## 🆘 Support and Troubleshooting

### Common Issues

1. **"Repository not found"**
   - Verify the repository path exists and is accessible
   - Ensure it's a valid git repository with commit history
   - Check file system permissions

2. **"No branches found"**
   - Increase the analysis period (try 365 days)
   - Check if there are any merged branches in the timeframe
   - Verify git history exists for the specified period

3. **Time estimation seems incorrect**
   - Review the methodology section in generated reports
   - Consider adjusting complexity multipliers in configuration
   - Check for unusual commit patterns or bulk imports

### Performance Tips

- For large repositories (>5k commits), consider reducing analysis period
- Use `consolidate_similar_authors: true` to improve accuracy
- Set appropriate `major_deliverable_threshold_hours` for your team size

## 🏗️ Architecture

The agent follows these design patterns:

1. **Evidence-Based Analysis**: All insights derived from observable git data
2. **Quality Overhead Modeling**: Realistic time estimates including testing and review
3. **Executive Focus**: Structured reporting for leadership decision-making
4. **Transparent Methodology**: Clear documentation of all assumptions and calculations

## 🔄 Version History

- **v1.0.0**: Initial release with comprehensive executive summary generation
  - Accurate time estimation with QA overhead multipliers
  - Individual developer analysis with specialization identification
  - Temporal pattern analysis and resource allocation insights
  - Actionable recommendations by timeframe
  - Multi-format output (Markdown, PDF, JSON)

---

**Ready to get started?** Choose your integration method from the table above and refer to the corresponding documentation file for detailed instructions.