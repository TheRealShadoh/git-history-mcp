#!/bin/bash

echo "=== Testing MCP Server Setup ==="
echo

# Load environment variables from .env file
if [ -f .env ]; then
    set -a
    source .env
    set +a
    echo "Loaded configuration from .env file"
    echo
else
    echo "Warning: .env file not found. Please copy .env.example to .env and configure your settings."
    echo "Using default values for testing..."
    echo
    export GIT_REPO_PATH="${GIT_REPO_PATH:-$(pwd)}"
fi

echo "1. Testing Git History MCP Server..."
echo "   Checking for available tools..."
TOOLS=$(echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | \
  GIT_REPO_PATH="$GIT_REPO_PATH" node ./dist/index.js 2>/dev/null | \
  jq -r '.result.tools[].name' 2>/dev/null)

if [ -n "$TOOLS" ]; then
    echo "$TOOLS"
    echo "✅ Git History MCP Server is working"
else
    echo "❌ Git History MCP Server not responding"
    echo "   Please check that the server is built: npm run build"
fi

echo

echo "2. Testing GitLab MCP Server..."
if [ -z "$GITLAB_PERSONAL_ACCESS_TOKEN" ] || [ -z "$GITLAB_API_URL" ]; then
    echo "⚠️  GitLab configuration not found in .env file"
    echo "   Please configure GITLAB_PERSONAL_ACCESS_TOKEN and GITLAB_API_URL in .env"
    echo "   Skipping GitLab MCP test..."
else
    # Check if GitLab MCP server starts up properly
    timeout 5s npx -y @zereight/mcp-gitlab 2>&1 | grep -q "Initializing server"
    if [ $? -eq 0 ]; then
        echo "✅ GitLab MCP Server is installed and starts successfully"
        echo "   Note: Full functionality requires network access to GitLab at $GITLAB_API_URL"
    else
        echo "❌ GitLab MCP Server failed to start"
        echo "   Please check your Node.js installation and try: npx -y @zereight/mcp-gitlab"
    fi
fi

echo

echo "3. Configuration Summary:"
echo "   • Environment file: .env"
echo "   • Git repository path: ${GIT_REPO_PATH:-'Not configured'}"
echo "   • GitLab API URL: ${GITLAB_API_URL:-'Not configured'}"
echo "   • Git History MCP tools: $(echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | GIT_REPO_PATH="$GIT_REPO_PATH" node ./dist/index.js 2>/dev/null | jq -r '.result.tools | length' 2>/dev/null || echo 'N/A') available"

echo

echo "4. Next Steps:"
echo "   • Configure .env file with your settings (copy from .env.example)"
echo "   • Restart Claude Code to load the new MCP servers"
echo "   • Use 'parse_git_history' to analyze your repository"
echo "   • Use 'generate_detailed_issues' to create GitLab issue data"
echo "   • Use 'generate_executive_development_summary' for executive reports"
echo "   • Use GitLab MCP 'create_issue' to create issues"
echo "   • Use 'mark_issue_created' to track completed issues"

echo
echo "=== Setup Complete! ==="