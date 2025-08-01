# Executive Summary Agent Integration Examples

This document provides practical examples for integrating the Executive Summary Generator agent into various systems and workflows.

## 📋 Table of Contents

1. [Claude Code Integration](#claude-code-integration)
2. [MCP Server Integration](#mcp-server-integration)
3. [CLI Integration](#cli-integration)
4. [API Integration](#api-integration)
5. [GitHub Actions Integration](#github-actions-integration)
6. [Docker Integration](#docker-integration)
7. [Custom System Integration](#custom-system-integration)

## 🤖 Claude Code Integration

### Using the Agent Prompt

```markdown
Load the executive summary agent from: `subagents/executive-summary-agent.md`

Then use it with:
```

**Example Usage:**
```
You are now the Executive Development Activity Summary Generator Agent. 

Analyze this repository and generate an executive summary for "ACME Corporation" covering the last 180 days. Include PDF export and focus on identifying any retention risks or capacity constraints.

Repository path: /path/to/repo
Analysis period: 180 days
Organization: ACME Corporation
Output requirements: Markdown + PDF
```

### Multi-Turn Analysis

```markdown
1. First, analyze the git history for basic metrics
2. Then, focus on individual developer contributions
3. Finally, provide specific recommendations for resource optimization
```

## 🔧 MCP Server Integration

### Direct Tool Call

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
      "output_path": "./reports",
      "include_pdf": true,
      "consolidate_authors": true
    }
  }
}
```

### Response Handling

```javascript
const response = await mcpClient.request({
  method: "tools/call",
  params: {
    name: "generate_executive_development_summary",
    arguments: {
      since_days: 90,
      organization_name: "TechCorp",
      include_pdf: false
    }
  }
});

if (response.result.content[0].text) {
  const data = JSON.parse(response.result.content[0].text);
  if (data.success) {
    console.log(`Report generated: ${data.data.markdown_file}`);
    console.log(`Total hours: ${data.data.summary_stats.total_hours}`);
    console.log(`Developers: ${data.data.summary_stats.unique_developers}`);
  }
}
```

## 💻 CLI Integration

### Node.js CLI Wrapper

Create `cli-wrapper.js`:

```javascript
#!/usr/bin/env node
import { spawn } from 'child_process';
import { readFileSync } from 'fs';

const args = process.argv.slice(2);
const config = {
  since_days: parseInt(args[0]) || 180,
  organization_name: args[1] || 'Organization',
  output_path: args[2] || './reports',
  include_pdf: args[3] !== 'false'
};

const request = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "generate_executive_development_summary",
    arguments: config
  }
};

const child = spawn('node', ['./dist/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

child.stdin.write(JSON.stringify(request));
child.stdin.end();

child.stdout.on('data', (data) => {
  try {
    const response = JSON.parse(data.toString());
    if (response.result) {
      const result = JSON.parse(response.result.content[0].text);
      console.log('✅ Executive Summary Generated');
      console.log(`📄 Report: ${result.data.markdown_file}`);
      if (result.data.pdf_file) {
        console.log(`📊 PDF: ${result.data.pdf_file}`);
      }
      console.log(`👥 ${result.data.summary_stats.unique_developers} developers analyzed`);
      console.log(`⏱️  ${result.data.summary_stats.total_hours} total hours`);
    }
  } catch (error) {
    console.error('Error parsing response:', error);
  }
});
```

### Usage:

```bash
# Basic usage
node cli-wrapper.js 180 "ACME Corp" ./reports true

# Quick analysis (90 days, no PDF)
node cli-wrapper.js 90 "StartupCorp" ./reports false
```

## 🌐 API Integration

### Express.js REST API

```javascript
import express from 'express';
import { spawn } from 'child_process';

const app = express();
app.use(express.json());

app.post('/api/executive-summary', async (req, res) => {
  const {
    repository_path = process.cwd(),
    since_days = 180,
    organization_name = 'Organization',
    include_pdf = true,
    consolidate_authors = true
  } = req.body;

  try {
    const request = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: "generate_executive_development_summary",
        arguments: {
          since_days,
          organization_name,
          include_pdf,
          consolidate_authors
        }
      }
    };

    const child = spawn('node', ['./dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: repository_path
    });

    let output = '';
    child.stdout.on('data', (data) => output += data.toString());

    child.stdin.write(JSON.stringify(request));
    child.stdin.end();

    child.on('close', (code) => {
      if (code === 0) {
        try {
          const lines = output.trim().split('\n');
          const jsonLine = lines.find(line => line.startsWith('{"result"'));
          
          if (jsonLine) {
            const response = JSON.parse(jsonLine);
            const result = JSON.parse(response.result.content[0].text);
            res.json(result);
          } else {
            res.status(500).json({ error: 'No valid response found' });
          }
        } catch (error) {
          res.status(500).json({ error: 'Failed to parse response' });
        }
      } else {
        res.status(500).json({ error: 'Process failed' });
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Executive Summary API running on port 3000');
});
```

### Client Usage:

```javascript
const response = await fetch('http://localhost:3000/api/executive-summary', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    repository_path: '/path/to/repo',
    since_days: 90,
    organization_name: 'TechStartup',
    include_pdf: false
  })
});

const data = await response.json();
console.log(`Generated report: ${data.data.markdown_file}`);
```

## 🚀 GitHub Actions Integration

Create `.github/workflows/executive-summary.yml`:

```yaml
name: Weekly Executive Summary

on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM
  workflow_dispatch:
    inputs:
      days:
        description: 'Analysis period in days'
        default: '7'
        required: false
      include_pdf:
        description: 'Generate PDF report'
        type: boolean
        default: true

jobs:
  generate-summary:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v4
      with:
        fetch-depth: 0  # Full history for analysis
        
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        
    - name: Install git-history-mcp
      run: npm install -g git-history-mcp
      
    - name: Generate Executive Summary
      run: |
        cat << EOF | node -e "
        const { spawn } = require('child_process');
        const request = {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'generate_executive_development_summary',
            arguments: {
              since_days: ${{ github.event.inputs.days || 7 }},
              organization_name: '${{ github.repository_owner }}',
              include_pdf: ${{ github.event.inputs.include_pdf || true }},
              output_path: './reports'
            }
          }
        };
        
        const child = spawn('git-history-mcp', [], { stdio: ['pipe', 'inherit', 'inherit'] });
        child.stdin.write(JSON.stringify(request));
        child.stdin.end();
        "
        
    - name: Upload Reports
      uses: actions/upload-artifact@v4
      with:
        name: executive-summary-reports
        path: ./reports/*
        
    - name: Create Issue with Summary
      if: github.event_name == 'schedule'
      uses: actions/github-script@v7
      with:
        script: |
          const fs = require('fs');
          const reportPath = './reports/';
          const files = fs.readdirSync(reportPath);
          const mdFile = files.find(f => f.endsWith('.md'));
          
          if (mdFile) {
            const content = fs.readFileSync(`${reportPath}${mdFile}`, 'utf8');
            
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `Weekly Executive Summary - ${new Date().toLocaleDateString()}`,
              body: content,
              labels: ['executive-summary', 'weekly-report']
            });
          }
```

## 🐋 Docker Integration

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install git
RUN apk add --no-cache git

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY dist/ ./dist/
COPY subagents/ ./subagents/

# Create reports directory
RUN mkdir -p /reports

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('OK')" || exit 1

CMD ["node", "dist/index.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  executive-summary-api:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./repositories:/repositories:ro
      - ./reports:/reports
    environment:
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "node", "-e", "console.log('OK')"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./reports:/usr/share/nginx/html/reports:ro
    depends_on:
      - executive-summary-api
    restart: unless-stopped
```

### Usage:

```bash
# Build and run
docker-compose up -d

# Generate report
curl -X POST http://localhost:3000/api/executive-summary \
  -H "Content-Type: application/json" \
  -d '{
    "repository_path": "/repositories/my-project",
    "since_days": 30,
    "organization_name": "My Company",
    "include_pdf": true
  }'
```

## 🔌 Custom System Integration

### Python Integration

```python
import subprocess
import json
import os
from pathlib import Path

class ExecutiveSummaryGenerator:
    def __init__(self, mcp_server_path: str):
        self.mcp_server_path = mcp_server_path
    
    def generate_summary(self, 
                        repository_path: str,
                        since_days: int = 180,
                        organization_name: str = "Organization",
                        include_pdf: bool = True,
                        output_path: str = None) -> dict:
        
        if output_path is None:
            output_path = os.getcwd()
            
        request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": "generate_executive_development_summary",
                "arguments": {
                    "since_days": since_days,
                    "organization_name": organization_name,
                    "output_path": output_path,
                    "include_pdf": include_pdf,
                    "consolidate_authors": True
                }
            }
        }
        
        try:
            process = subprocess.Popen(
                ['node', self.mcp_server_path],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=repository_path,
                text=True
            )
            
            stdout, stderr = process.communicate(json.dumps(request))
            
            if process.returncode == 0:
                # Parse the JSON-RPC response
                lines = stdout.strip().split('\n')
                for line in lines:
                    if line.startswith('{"result"'):
                        response = json.loads(line)
                        return json.loads(response['result']['content'][0]['text'])
                        
            raise Exception(f"Process failed: {stderr}")
            
        except Exception as e:
            return {"success": False, "error": str(e)}

# Usage example
generator = ExecutiveSummaryGenerator("./dist/index.js")

result = generator.generate_summary(
    repository_path="/path/to/repo",
    since_days=90,
    organization_name="TechCorp",
    include_pdf=True
)

if result.get('success'):
    print(f"✅ Report generated: {result['data']['markdown_file']}")
    print(f"👥 Developers: {result['data']['summary_stats']['unique_developers']}")
    print(f"⏱️ Total hours: {result['data']['summary_stats']['total_hours']}")
else:
    print(f"❌ Error: {result.get('error', 'Unknown error')}")
```

### Ruby Integration

```ruby
require 'json'
require 'open3'

class ExecutiveSummaryGenerator
  def initialize(mcp_server_path)
    @mcp_server_path = mcp_server_path
  end
  
  def generate_summary(repository_path:, 
                      since_days: 180,
                      organization_name: "Organization",
                      include_pdf: true,
                      output_path: nil)
    
    output_path ||= Dir.pwd
    
    request = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "generate_executive_development_summary",
        arguments: {
          since_days: since_days,
          organization_name: organization_name,
          output_path: output_path,
          include_pdf: include_pdf,
          consolidate_authors: true
        }
      }
    }
    
    begin
      Dir.chdir(repository_path) do
        stdout, stderr, status = Open3.capture3(
          'node', @mcp_server_path,
          stdin_data: request.to_json,
          binmode: true
        )
        
        if status.success?
          lines = stdout.strip.split("\n")
          json_line = lines.find { |line| line.start_with?('{"result"') }
          
          if json_line
            response = JSON.parse(json_line)
            return JSON.parse(response['result']['content'][0]['text'])
          end
        end
        
        raise "Process failed: #{stderr}"
      end
      
    rescue => e
      { success: false, error: e.message }
    end
  end
end

# Usage
generator = ExecutiveSummaryGenerator.new('./dist/index.js')

result = generator.generate_summary(
  repository_path: '/path/to/repo',
  since_days: 60,
  organization_name: 'RubyCorps',
  include_pdf: false
)

if result[:success]
  puts "✅ Report: #{result[:data][:markdown_file]}"
  puts "👥 Developers: #{result[:data][:summary_stats][:unique_developers]}"
else
  puts "❌ Error: #{result[:error]}"
end
```

## 📚 Integration Best Practices

### Error Handling

```javascript
async function generateSummaryWithRetry(config, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await generateExecutiveSummary(config);
      
      if (result.success) {
        return result;
      }
      
      if (attempt === maxRetries) {
        throw new Error(`Failed after ${maxRetries} attempts: ${result.error}`);
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      console.warn(`Attempt ${attempt} failed: ${error.message}`);
    }
  }
}
```

### Configuration Management

```yaml
# config.yaml
executive_summary:
  default_analysis_period: 180
  organization_name: "ACME Corporation"
  output_directory: "./reports"
  quality_settings:
    major_deliverable_threshold: 40
    qa_overhead_multipliers:
      high: 1.30
      medium: 1.20
      low: 1.15
  integration:
    retry_attempts: 3
    timeout_seconds: 120
    enable_caching: true
```

### Monitoring and Logging

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'executive-summary.log' })
  ]
});

async function monitoredGeneration(config) {
  const startTime = Date.now();
  
  logger.info('Starting executive summary generation', {
    repository: config.repository_path,
    organization: config.organization_name,
    analysis_period: config.since_days
  });
  
  try {
    const result = await generateExecutiveSummary(config);
    const duration = Date.now() - startTime;
    
    logger.info('Executive summary generated successfully', {
      duration_ms: duration,
      total_hours: result.data?.summary_stats?.total_hours,
      developers: result.data?.summary_stats?.unique_developers,
      report_file: result.data?.markdown_file
    });
    
    return result;
    
  } catch (error) {
    logger.error('Executive summary generation failed', {
      error: error.message,
      duration_ms: Date.now() - startTime
    });
    throw error;
  }
}
```

These integration examples provide comprehensive patterns for using the Executive Summary Generator agent across different platforms and use cases. Choose the integration method that best fits your system architecture and requirements.