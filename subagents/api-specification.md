# Executive Summary Generator Agent API Specification

This document provides the complete API specification for the Executive Development Activity Summary Generator agent.

## 📋 Overview

**Agent Name**: `executive-summary-generator`  
**Version**: `1.0.0`  
**Category**: Analytics  
**Primary Function**: Generate comprehensive executive-level development activity summaries

## 🔌 Interface Specification

### Input Schema

```json
{
  "type": "object",
  "properties": {
    "repository_path": {
      "type": "string",
      "description": "Absolute path to the git repository to analyze",
      "required": true,
      "example": "/path/to/repo"
    },
    "analysis_period_days": {
      "type": "integer",
      "description": "Number of days to look back for analysis",
      "minimum": 1,
      "maximum": 3650,
      "default": 180,
      "example": 180
    },
    "organization_name": {
      "type": "string",
      "description": "Organization name for report branding and file naming",
      "minLength": 1,
      "maxLength": 100,
      "default": "Organization",
      "example": "ACME Corporation"
    },
    "output_path": {
      "type": "string",
      "description": "Directory path for generated report files",
      "default": "current working directory",
      "example": "./reports"
    },
    "include_pdf_export": {
      "type": "boolean",
      "description": "Whether to generate PDF version of the report",
      "default": true,
      "example": true
    },
    "consolidate_similar_authors": {
      "type": "boolean", 
      "description": "Whether to merge authors with similar names (e.g., same person with different email formats)",
      "default": true,
      "example": true
    },
    "major_deliverable_threshold_hours": {
      "type": "integer",
      "description": "Minimum hours required for a branch to be considered a 'major deliverable'",
      "minimum": 1,
      "maximum": 1000,
      "default": 40,
      "example": 40
    }
  },
  "required": ["repository_path"]
}
```

### Output Schema

```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "description": "Whether the analysis completed successfully"
    },
    "message": {
      "type": "string",
      "description": "Human-readable status message"
    },
    "data": {
      "type": "object",
      "description": "Analysis results and generated files",
      "properties": {
        "markdown_file": {
          "type": "string",
          "description": "Absolute path to generated markdown report"
        },
        "pdf_file": {
          "type": ["string", "null"],
          "description": "Absolute path to generated PDF report (null if not requested)"
        },
        "summary_stats": {
          "type": "object",
          "description": "High-level summary statistics",
          "properties": {
            "total_branches": {
              "type": "integer",
              "description": "Number of branches analyzed"
            },
            "total_hours": {
              "type": "number",
              "description": "Total estimated engineering hours"
            },
            "unique_developers": {
              "type": "integer",
              "description": "Number of unique developers who contributed"
            },
            "time_period_days": {
              "type": "integer",
              "description": "Actual analysis period used"
            },
            "author_consolidation": {
              "type": "boolean",
              "description": "Whether author consolidation was applied"
            },
            "organization_name": {
              "type": "string",
              "description": "Organization name used in the report"
            },
            "major_deliverables": {
              "type": "integer",
              "description": "Number of branches exceeding the major deliverable threshold"
            },
            "velocity_trend": {
              "type": "string",
              "enum": ["accelerating", "stable", "decelerating"],
              "description": "Overall team velocity trend"
            },
            "workload_ratio": {
              "type": "string",
              "description": "Ratio between highest and lowest contributor hours (e.g., '5.2')"
            }
          }
        },
        "key_insights": {
          "type": "object",
          "description": "Strategic insights for executive decision-making",
          "properties": {
            "productivity_drivers": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "description": "Factors that drive team productivity"
            },
            "retention_risks": {
              "type": "array", 
              "items": {
                "type": "string"
              },
              "description": "Potential risks to team retention"
            },
            "capacity_constraints": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "description": "Limitations on team capacity"
            },
            "resource_optimization": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "description": "Opportunities for better resource allocation"
            }
          }
        },
        "recommendations": {
          "type": "object",
          "description": "Actionable recommendations by timeframe",
          "properties": {
            "immediate": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "description": "Actions to take within 1-2 weeks"
            },
            "shortTerm": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "description": "Initiatives for 1-3 months"
            },
            "longTerm": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "description": "Strategic goals for 3-12 months"
            }
          }
        }
      }
    },
    "error": {
      "type": "string",
      "description": "Error message when success is false"
    }
  },
  "required": ["success"]
}
```

## 🛠️ Communication Protocols

### JSON-RPC 2.0 (Primary)

**Request Format:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "generate_executive_development_summary",
    "arguments": {
      "repository_path": "/path/to/repo",
      "analysis_period_days": 180,
      "organization_name": "ACME Corp",
      "include_pdf_export": true
    }
  }
}
```

**Response Format:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"success\": true, \"message\": \"Enhanced executive development summary generated successfully\", \"data\": {...}}"
      }
    ]
  }
}
```

### REST API

**Endpoint:** `POST /api/executive-summary`

**Request Headers:**
```
Content-Type: application/json
Accept: application/json
```

**Request Body:** (Same as input schema above)

**Response:** (Same as output schema above)

**HTTP Status Codes:**
- `200`: Success
- `400`: Invalid input parameters
- `404`: Repository not found
- `500`: Internal processing error

### CLI Arguments

```bash
executive-summary-generator [options]

Options:
  --repo-path <path>           Repository path (required)
  --days <number>              Analysis period in days (default: 180)
  --org-name <name>            Organization name (default: "Organization")
  --output <path>              Output directory (default: current directory)
  --pdf                        Generate PDF export (default: true)
  --no-pdf                     Skip PDF generation
  --consolidate-authors        Merge similar author names (default: true)
  --no-consolidate-authors     Keep all author variations separate
  --threshold <hours>          Major deliverable threshold (default: 40)
  --config <file>              Load configuration from file
  --verbose                    Enable verbose logging
  --help                       Show help information
  --version                    Show version information
```

## 📊 Report Structure Specification

### Markdown Report Sections

1. **Executive Dashboard Metrics**
   - Total engineering investment
   - Active team size and average contribution
   - Top contributor identification
   - Workload distribution ratio
   - Velocity trend analysis

2. **Individual Developer Analysis**
   - Tabular breakdown of hours per developer
   - Branch contribution counts
   - Average hours per branch
   - Primary specialization areas
   - Peak productivity months

3. **Temporal Analysis**
   - Monthly development hours breakdown
   - Active developer counts per month
   - Major deliverable tracking
   - Utilization rate calculations

4. **Resource Allocation**
   - Hours and percentage by category
   - Branch count by business impact type
   - Investment distribution analysis

5. **Major Deliverables**
   - Branches exceeding threshold hours
   - Primary author and reviewer information
   - Complexity and business impact ratings

6. **Key Insights**
   - Productivity drivers identification
   - Resource optimization opportunities
   - Retention risk factors
   - Capacity constraint analysis

7. **Recommendations**
   - Immediate actions (1-2 weeks)
   - Short-term initiatives (1-3 months)
   - Long-term strategy (3-12 months)

8. **Methodology**
   - Time estimation approach
   - Quality assurance overhead multipliers
   - Phase distribution percentages
   - Contribution attribution methodology

### JSON Metadata Structure

```json
{
  "report_metadata": {
    "generated_at": "2025-08-01T12:00:00Z",
    "agent_version": "1.0.0",
    "repository_analyzed": "/path/to/repo",
    "analysis_period": {
      "start_date": "2025-02-01T00:00:00Z",
      "end_date": "2025-08-01T00:00:00Z",
      "total_days": 180
    },
    "configuration": {
      "organization_name": "ACME Corp",
      "major_deliverable_threshold": 40,
      "consolidate_authors": true,
      "qa_overhead_multipliers": {
        "high": 1.30,
        "medium": 1.20,
        "low": 1.15
      }
    }
  },
  "dashboard_metrics": {
    "total_engineering_hours": 2480,
    "team_size": 8,
    "average_hours_per_developer": 310,
    "top_contributor": "Alice Johnson",
    "workload_disparity_ratio": 3.2,
    "velocity_trend": "accelerating",
    "velocity_change_percentage": 15.3
  },
  "temporal_analysis": {
    "monthly_breakdown": [
      {
        "month": "2025-02",
        "total_hours": 420,
        "active_developers": 6,
        "major_deliverables": 2,
        "utilization_rate": 87.5
      }
    ],
    "seasonal_patterns": {
      "high_productivity_periods": ["2025-03", "2025-06"],
      "low_productivity_periods": ["2025-12"],
      "explanations": ["Holiday season impact on December productivity"]
    }
  },
  "risk_assessment": {
    "single_points_of_failure": ["Alice Johnson (senior backend)"],
    "workload_imbalances": ["3.2:1 ratio between top and bottom contributors"],
    "capacity_constraints": ["2 months with >90% utilization"],
    "retention_risks": ["High-value contributor burnout potential"]
  }
}
```

## 🔍 Quality Assurance Specification

### Accuracy Metrics

- **Time Estimation Variance**: ±20% of actual effort when measurable
- **Completeness Threshold**: 95% of significant branches analyzed
- **False Positive Rate**: <5% incorrect risk or insight identification
- **Data Consistency**: 100% cross-referential accuracy within report

### Performance Requirements

- **Maximum Processing Time**: 60 seconds for repositories up to 10,000 commits
- **Memory Usage**: <512MB peak memory consumption
- **Supported Repository Size**: Up to 10,000 commits, 1,000 branches
- **Concurrent Requests**: Support for 3 simultaneous analyses

### Reliability Standards

- **Uptime Target**: 99.9% availability when deployed as service
- **Error Rate**: <0.1% of processing attempts should fail
- **Data Integrity**: No data corruption or loss during processing
- **Graceful Degradation**: Partial results when full analysis impossible

## 🚨 Error Handling Specification

### Error Categories

1. **Input Validation Errors (400)**
   ```json
   {
     "success": false,
     "error": "Invalid analysis_period_days: must be between 1 and 3650",
     "error_code": "INVALID_INPUT",
     "details": {
       "field": "analysis_period_days",
       "provided_value": 5000,
       "valid_range": "1-3650"
     }
   }
   ```

2. **Repository Access Errors (404)**
   ```json
   {
     "success": false,
     "error": "Repository not found or not accessible",
     "error_code": "REPO_NOT_FOUND",
     "details": {
       "repository_path": "/invalid/path",
       "suggestions": ["Check path exists", "Verify read permissions", "Ensure valid git repository"]
     }
   }
   ```

3. **Processing Errors (500)**
   ```json
   {
     "success": false,
     "error": "Failed to parse git history",
     "error_code": "GIT_PARSE_ERROR", 
     "details": {
       "stage": "branch_analysis",
       "partial_results_available": false,
       "retry_recommended": true
     }
   }
   ```

4. **Resource Errors (503)**
   ```json
   {
     "success": false,
     "error": "Insufficient resources to complete analysis",
     "error_code": "RESOURCE_EXHAUSTED",
     "details": {
       "memory_limit_exceeded": true,
       "repository_size": "50000 commits",
       "recommended_action": "Reduce analysis period or increase resources"
     }
   }
   ```

### Retry Logic

- **Transient Errors**: Automatic retry with exponential backoff (1s, 2s, 4s)
- **Rate Limiting**: Respect system resource constraints
- **Circuit Breaker**: Stop attempts after 3 consecutive failures
- **Partial Recovery**: Return partial results when possible

## 🔐 Security Specification

### Input Validation

- **Path Traversal Prevention**: Validate all file paths for malicious patterns
- **Resource Limits**: Enforce maximum processing time and memory usage
- **Git Command Injection**: Sanitize all git command parameters
- **Output Sanitization**: Escape HTML/XML content in generated reports

### Data Privacy

- **No Data Retention**: Don't store repository contents after processing
- **Sensitive Information**: Detect and redact potential secrets in commit messages
- **Access Logging**: Log access attempts without storing repository content
- **Minimal Permissions**: Require only read access to repository

### Authentication (When Deployed as Service)

```json
{
  "authentication": {
    "methods": ["api_key", "oauth2", "jwt"],
    "api_key_format": "Bearer sk-...",
    "rate_limiting": {
      "requests_per_hour": 100,
      "requests_per_day": 1000
    },
    "ip_restrictions": {
      "enabled": false,
      "whitelist": []
    }
  }
}
```

## 📈 Monitoring and Observability

### Metrics to Track

```json
{
  "performance_metrics": {
    "processing_time_ms": 45000,
    "memory_usage_mb": 256,
    "git_operations_count": 1200,
    "branches_processed": 47,
    "commits_analyzed": 890
  },
  "quality_metrics": {
    "estimation_confidence": 0.85,
    "data_completeness": 0.97,
    "insight_generation_success": true
  },
  "business_metrics": {
    "total_hours_estimated": 2480,
    "developers_analyzed": 8,
    "major_deliverables_identified": 6,
    "risks_identified": 3
  }
}
```

### Health Check Endpoint

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-01T12:00:00Z",
  "version": "1.0.0",
  "dependencies": {
    "git": "2.34.1",
    "node": "18.17.0"
  },
  "capabilities": {
    "max_repository_size": "10000 commits",
    "supported_formats": ["markdown", "pdf", "json"],
    "average_processing_time": "30s"
  }
}
```

## 🔄 Versioning and Compatibility

### API Versioning

- **Current Version**: `1.0.0`
- **Versioning Scheme**: Semantic Versioning (SemVer)
- **Backward Compatibility**: Maintain compatibility within major versions
- **Deprecation Policy**: 6-month notice for breaking changes

### Migration Path

```json
{
  "version_migration": {
    "from": "0.9.x",
    "to": "1.0.0",
    "breaking_changes": [
      "organization_name parameter now required for custom branding",
      "output format includes additional key_insights section"
    ],
    "migration_steps": [
      "Update organization_name parameter in requests",
      "Handle new key_insights field in responses",
      "Verify PDF generation compatibility"
    ]
  }
}
```

This API specification provides a complete reference for integrating and using the Executive Summary Generator agent across different platforms and use cases.