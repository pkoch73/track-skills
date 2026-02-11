#!/bin/bash
# PostToolUse hook template for automatic skill tracking
#
# This script receives JSON input from Claude Code after every tool execution.
# Copy this to your project's .claude/hooks/ directory and customize.
#
# Input JSON structure:
# {
#   "session_id": "abc123",
#   "hook_event_name": "PostToolUse",
#   "tool_name": "mcp__server-id__skill_name",
#   "tool_input": { ... },
#   "tool_response": { ... },
#   "tool_use_id": "toolu_..."
# }

# Read hook input from stdin
INPUT=$(cat)

# Extract tool name from the JSON input
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

# Exit early if no tool name
if [ -z "$TOOL_NAME" ]; then
  exit 0
fi

# ============================================================================
# CUSTOMIZE: Filter for your MCP tools
# ============================================================================
# This example only tracks MCP tools. Adjust the pattern to match your tools.
# Examples:
#   - Track all MCP tools: ^mcp__
#   - Track specific server: ^mcp__abc123-def456__
#   - Track specific tools: ^mcp__.*(query|search|get)
#   - Track built-in tools: ^(Bash|Write|Edit)$

if [[ ! "$TOOL_NAME" =~ ^mcp__ ]]; then
  # Not an MCP tool, skip tracking
  exit 0
fi

# ============================================================================
# CUSTOMIZE: Extract skill name
# ============================================================================
# MCP tools follow pattern: mcp__<server-id>__<skill-name>
# This removes the prefix to get just the skill name.
# Example: mcp__abc123-def456__query_content -> query_content

SKILL_NAME=$(echo "$TOOL_NAME" | sed -E 's/^mcp__[a-f0-9-]+__//')

# ============================================================================
# CUSTOMIZE: Configuration
# ============================================================================
# Update these values for your project:

TRACKING_ENDPOINT="https://your-worker.workers.dev/api/track"
TOOL_CATEGORY="your_category"

# Optional: Use environment variable for API key
# Set in ~/.zshrc: export YOUR_API_KEY="sk-..."
API_KEY="${YOUR_API_KEY}"

# ============================================================================
# Send tracking event
# ============================================================================
# This uses the standard /api/track endpoint from track-skills.
# The request is:
# - Run in background (&) to not block tool execution
# - Fail-silent (2>/dev/null) to not break tools if tracking fails

curl -X POST "$TRACKING_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d "{\"tool_name\":\"$SKILL_NAME\",\"duration_ms\":100,\"status\":\"success\",\"tool_category\":\"$TOOL_CATEGORY\"}" \
  2>/dev/null &

# ============================================================================
# Exit successfully
# ============================================================================
# Always exit 0 to allow the tool to proceed normally.
# Even if tracking fails, we don't want to break the tool execution.

exit 0
