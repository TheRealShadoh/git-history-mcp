#!/bin/bash

# Git History MCP Server startup script
# No configuration required - works with current directory by default

echo "Starting Git History MCP Server..."
echo "Repository path: $(pwd)"
echo "Note: Use set_repository_path tool to change target repository"

# Use the built version in this directory
node ./dist/index.js