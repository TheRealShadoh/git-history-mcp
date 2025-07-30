#!/bin/bash

echo "=== Testing Git History MCP Server Setup ==="
echo

echo "1. Testing Git History MCP Server..."
echo "   Repository path: $(pwd)"
echo "   Checking for available tools..."
TOOLS=$(echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | \
  node ./dist/index.js 2>/dev/null | \
  jq -r '.result.tools[].name' 2>/dev/null)

if [ -n "$TOOLS" ]; then
    echo "$TOOLS"
    echo "✅ Git History MCP Server is working"
    TOOL_COUNT=$(echo "$TOOLS" | wc -l)
    echo "   $TOOL_COUNT tools available"
else
    echo "❌ Git History MCP Server not responding"
    echo "   Please check that the server is built: npm run build"
fi

echo

echo "2. Configuration Summary:"
echo "   • Repository path: $(pwd)"
echo "   • Git repository: $([ -d .git ] && echo "✅ Valid" || echo "❌ Not found")"
echo "   • Tools available: $(echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | node ./dist/index.js 2>/dev/null | jq -r '.result.tools | length' 2>/dev/null || echo 'N/A')"

echo

echo "3. Next Steps:"
echo "   • Restart Claude Code to load the new MCP server"
echo "   • Use 'parse_git_history' to analyze your repository"
echo "   • Use 'clone_repository' to work with remote repositories"
echo "   • Use 'checkout_branch' to switch branches"
echo "   • Use 'generate_detailed_issues' to create issue data"
echo "   • Use 'generate_executive_development_summary' for executive reports"

echo
echo "=== Setup Complete! ==="