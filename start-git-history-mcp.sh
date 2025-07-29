#!/bin/bash

# Git History MCP Server startup script
# Make sure to create .env file with your settings first

# Load environment variables from .env file
if [ -f .env ]; then
    set -a
    source .env
    set +a
    echo "Loaded configuration from .env file"
else
    echo "Warning: .env file not found. Please copy .env.example to .env and configure your settings."
    exit 1
fi

echo "Starting Git History MCP Server..."
echo "Repository path: ${GIT_REPO_PATH:-$(pwd)}"

# Use the built version in this directory
node ./dist/index.js