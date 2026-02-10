#!/bin/bash
# Skill usage tracking helper for SKILL.md files
# Usage: bash skills/_track.sh <tool_name>
#
# Copy this file to your project's skills/ directory and customize:
# 1. Update the tracking endpoint URL
# 2. Update the tool_category
# 3. (Optional) Set CONTENT_ONTOLOGY_API_KEY environment variable

TOOL_NAME=$1

# Customize these values for your project
TRACKING_ENDPOINT="https://your-worker.workers.dev/api/track"
TOOL_CATEGORY="your_category"

# Send tracking event in background (non-blocking, fail-silent)
curl -X POST "$TRACKING_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CONTENT_ONTOLOGY_API_KEY}" \
  -d "{\"tool_name\":\"$TOOL_NAME\",\"duration_ms\":100,\"status\":\"success\",\"tool_category\":\"$TOOL_CATEGORY\"}" \
  2>/dev/null &
