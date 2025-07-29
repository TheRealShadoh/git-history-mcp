#!/bin/bash

# GitLab MCP Server startup script
# Make sure to create .env file with your GitLab configuration first

# Load environment variables from .env file
if [ -f .env ]; then
    set -a
    source .env
    set +a
    echo "Loaded configuration from .env file"
else
    echo "Warning: .env file not found. Please copy .env.example to .env and configure your GitLab settings."
    exit 1
fi

# Validate required GitLab environment variables
if [ -z "$GITLAB_PERSONAL_ACCESS_TOKEN" ] || [ -z "$GITLAB_API_URL" ]; then
    echo "Error: Missing required GitLab configuration in .env file:"
    echo "  - GITLAB_PERSONAL_ACCESS_TOKEN"
    echo "  - GITLAB_API_URL"
    exit 1
fi

echo "Starting GitLab MCP Server..."
echo "GitLab API URL: $GITLAB_API_URL"
echo "Read-only mode: ${GITLAB_READ_ONLY_MODE:-false}"
echo "TLS verification: ${NODE_TLS_REJECT_UNAUTHORIZED:-1}"

npx -y @zereight/mcp-gitlab