# PostToolUse Hook Integration

This guide shows how to use **Claude Code's PostToolUse hooks** for automatic skill tracking. This is a third integration approach alongside JavaScript wrappers and bash blocks.

## Overview

PostToolUse hooks fire automatically after every MCP tool or skill invocation in Claude Code, providing **zero-effort automatic tracking** for all your skills.

### Why Use Hooks?

**Comparison with other approaches:**

| Feature | JavaScript Wrapper | Bash Blocks | PostToolUse Hook |
|---------|-------------------|-------------|------------------|
| Per-skill effort | Wrap each function | 2 lines per SKILL.md | **Zero (automatic)** |
| Works in Claude Code | ✅ | ✅ | ✅ |
| Works in Cowork | ✅ | ❌ (proxy blocks) | ✅ |
| New skills | Manual wrapper | Manual bash block | **Auto-tracked** |
| Maintenance | Per-file updates | Per-file updates | **One config file** |

**Use PostToolUse hooks when:**
- You have multiple skills to track
- You want automatic tracking for all future skills
- You need tracking in both Claude Code and Cowork
- You want zero maintenance per skill

---

## How It Works

```
User invokes skill
    ↓
MCP tool executes
    ↓
PostToolUse hook fires automatically
    ↓
Hook script extracts tool name
    ↓
Sends tracking data to /api/track endpoint
    ↓
Worker logs to D1 database
```

The hook receives JSON input with `tool_name`, `tool_input`, and `tool_response` for every tool invocation.

---

## Setup (One-Time)

### Step 1: Create Hook Script

Create `.claude/hooks/track-skill.sh` in your project:

```bash
#!/bin/bash
# PostToolUse hook for automatic skill tracking
# Receives JSON input via stdin with tool_name, tool_input, tool_response

# Read hook input from stdin
INPUT=$(cat)

# Extract tool name from the JSON input
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

# Filter for MCP tools only (optional - customize pattern to match your tools)
if [[ ! "$TOOL_NAME" =~ ^mcp__ ]]; then
  # Not an MCP tool, skip tracking
  exit 0
fi

# Extract the skill name (remove mcp__<server-id>__ prefix)
# Example: mcp__abc123-def456__query_content -> query_content
SKILL_NAME=$(echo "$TOOL_NAME" | sed -E 's/^mcp__[a-f0-9-]+__//')

# Configuration (customize these)
TRACKING_ENDPOINT="https://your-worker.workers.dev/api/track"
TOOL_CATEGORY="your_category"

# Send tracking event in background (non-blocking, fail-silent)
curl -X POST "$TRACKING_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${YOUR_API_KEY_ENV_VAR}" \
  -d "{\"tool_name\":\"$SKILL_NAME\",\"duration_ms\":100,\"status\":\"success\",\"tool_category\":\"$TOOL_CATEGORY\"}" \
  2>/dev/null &

# Exit successfully (allows the tool to proceed normally)
exit 0
```

**Make it executable:**
```bash
chmod +x .claude/hooks/track-skill.sh
```

### Step 2: Configure PostToolUse Hook

Create or update `.claude/settings.json` in your project:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "mcp__.*",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/track-skill.sh",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

**Configuration explanation:**
- `PostToolUse`: Event that fires after tool execution
- `matcher`: Regex to filter which tools to track
  - `"mcp__.*"` matches all MCP tools
  - `"mcp__your-server-id__.*"` matches tools from specific MCP server
  - `"Bash|Write|Edit"` matches specific built-in tools
- `timeout`: Max seconds for hook to run (5 is plenty for tracking)
- `$CLAUDE_PROJECT_DIR`: Project root path (handles spaces in path)

### Step 3: Customize for Your Project

**1. Update the hook script** (`.claude/hooks/track-skill.sh`):
- Set `TRACKING_ENDPOINT` to your Worker URL
- Set `TOOL_CATEGORY` to your category name
- Update environment variable name if needed
- Customize the MCP tool filter pattern

**2. Update the hook matcher** (`.claude/settings.json`):
- Change `"mcp__.*"` to match your specific tools
- Examples:
  - `"mcp__abc123.*"` - Only tools from server ID abc123
  - `"mcp__(abc123|def456).*"` - Tools from multiple servers
  - `".*"` - Track ALL tools (including Bash, Write, etc.)

### Step 4: Set Environment Variable (Optional)

If your API requires authentication:

```bash
# Add to ~/.zshrc or ~/.bashrc
export YOUR_API_KEY_ENV_VAR="your-api-key-here"
```

---

## Testing

### Test 1: Verify Hook Script Works

Simulate Claude Code sending hook input:

```bash
cd /path/to/your/project

# Simulate hook invocation
echo '{
  "tool_name": "mcp__abc123-def456__test_skill",
  "tool_input": {},
  "tool_response": {}
}' | .claude/hooks/track-skill.sh

# Check database for event
wrangler d1 execute your-db --command \
  "SELECT tool_name, status, timestamp FROM skill_usage_events WHERE tool_name='test_skill' ORDER BY timestamp DESC LIMIT 1" \
  --remote
```

Expected: Should see `test_skill` event in database.

### Test 2: Verify Hook Configuration

**In Claude Code:**
```
/hooks
```

Should see:
```
[Project] PostToolUse - mcp__.*
```

If grayed out or missing, check `.claude/settings.json` syntax.

### Test 3: Test with Real Skill

**In Claude Code, invoke any skill/tool:**
```
[Use your skill]
```

**Check tracking:**
```bash
wrangler d1 execute your-db --command \
  "SELECT tool_name, COUNT(*) as count FROM skill_usage_events GROUP BY tool_name ORDER BY count DESC LIMIT 10" \
  --remote
```

---

## Advanced Configuration

### Track Specific MCP Servers Only

If you have multiple MCP servers but only want to track specific ones:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "mcp__(server-id-1|server-id-2)__.*",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/track-skill.sh"
          }
        ]
      }
    ]
  }
}
```

### Track Built-In Tools

To track Bash, Write, Edit, etc:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash|Write|Edit|Read",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/track-builtin-tools.sh"
          }
        ]
      }
    ]
  }
}
```

### Multiple Hooks

Track different tool types with different handlers:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "mcp__.*",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/track-mcp-tools.sh"
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/track-bash-commands.sh"
          }
        ]
      }
    ]
  }
}
```

### Capture Tool Input/Output

Enhanced hook script that tracks parameters and results:

```bash
#!/bin/bash
INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
TOOL_INPUT=$(echo "$INPUT" | jq -c '.tool_input // {}')
TOOL_RESPONSE=$(echo "$INPUT" | jq -c '.tool_response // {}')

# Extract skill name
SKILL_NAME=$(echo "$TOOL_NAME" | sed -E 's/^mcp__[a-f0-9-]+__//')

# Build metadata with input/output
METADATA=$(jq -n \
  --arg input "$TOOL_INPUT" \
  --arg response "$TOOL_RESPONSE" \
  '{input: $input, response: $response}' | jq -c)

curl -X POST "$TRACKING_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "{\"tool_name\":\"$SKILL_NAME\",\"duration_ms\":100,\"status\":\"success\",\"tool_category\":\"$TOOL_CATEGORY\",\"metadata\":\"$METADATA\"}" \
  2>/dev/null &

exit 0
```

---

## Troubleshooting

### Hook Not Firing

**1. Enable debug mode:**
```bash
claude --debug
```

Look for:
```
[DEBUG] Executing hooks for PostToolUse:mcp__...
[DEBUG] Hook command completed with status 0
```

**2. Check hook is enabled:**
```
/hooks
```

Should show your PostToolUse hook. If grayed out, check settings syntax.

**3. Verify settings file:**
```bash
cat .claude/settings.json | jq '.hooks.PostToolUse'
```

**4. Test script manually:**
```bash
echo '{"tool_name":"mcp__test__example"}' | .claude/hooks/track-skill.sh
```

### Events Not Appearing in Database

**1. Test API endpoint:**
```bash
curl -X POST "https://your-worker.workers.dev/api/track" \
  -H "Content-Type: application/json" \
  -d '{"tool_name":"test","duration_ms":100,"status":"success","tool_category":"test"}'
```

Expected: `{"success":true,"message":"Event tracked"}`

**2. Check Worker logs:**
```bash
wrangler tail your-worker
```

**3. Verify database:**
```bash
wrangler d1 execute your-db --command \
  "SELECT COUNT(*) FROM skill_usage_events" \
  --remote
```

### Script Permissions

```bash
chmod +x .claude/hooks/track-skill.sh
ls -la .claude/hooks/track-skill.sh
# Should show: -rwxr-xr-x
```

### Matcher Not Working

**Debug matcher pattern:**
- `"mcp__.*"` - Matches all MCP tools
- `"mcp__abc.*"` - Matches MCP tools from server starting with abc
- `".*"` - Matches ALL tools (be careful!)

Check actual tool names in debug logs:
```bash
claude --debug
# Look for: "tool_name": "mcp__xxx__yyy"
```

---

## Migrating from Bash Blocks

If you currently use bash blocks in SKILL.md files:

### Option 1: Run Both in Parallel

Keep bash blocks and add PostToolUse hook:
- Provides redundancy
- Duplicate tracking events (acceptable temporarily)
- Validate hook works before removing bash blocks

### Option 2: Migrate to Hook Only

1. **Verify hook works** (test for 1-2 weeks)
2. **Remove bash blocks** from all SKILL.md files
3. **Delete** `skills/_track.sh` helper script
4. **Update docs** to reflect automatic tracking

**Benefits:**
- Zero maintenance per skill
- Cleaner SKILL.md files
- Automatic tracking for new skills

---

## Example: Complete Setup

Here's a complete example for a project with MCP tools:

**`.claude/hooks/track-skill.sh`:**
```bash
#!/bin/bash
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

if [[ ! "$TOOL_NAME" =~ ^mcp__ ]]; then
  exit 0
fi

SKILL_NAME=$(echo "$TOOL_NAME" | sed -E 's/^mcp__[a-f0-9-]+__//')

curl -X POST "https://my-worker.workers.dev/api/track" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${MY_API_KEY}" \
  -d "{\"tool_name\":\"$SKILL_NAME\",\"duration_ms\":100,\"status\":\"success\",\"tool_category\":\"my_skills\"}" \
  2>/dev/null &

exit 0
```

**`.claude/settings.json`:**
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "mcp__.*",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/track-skill.sh",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

**`~/.zshrc`:**
```bash
export MY_API_KEY="sk-..."
```

---

## Best Practices

1. **Keep hook script simple** - Fast execution, fail-silent
2. **Run in background** - Use `&` to not block tool execution
3. **Filter carefully** - Only track tools you care about
4. **Test thoroughly** - Verify with manual tests before relying on it
5. **Monitor initially** - Watch for duplicate or missing events
6. **Document** - Add comment in settings.json explaining the hook

---

## Resources

- **Claude Code Hooks Documentation**: https://code.claude.com/docs/en/hooks
- **PostToolUse Reference**: https://code.claude.com/docs/en/hooks#posttooluse
- **Track-Skills Main README**: [README.md](README.md)
- **Worker Integration Example**: [examples/worker-integration.js](examples/worker-integration.js)

---

## Summary

PostToolUse hooks provide **automatic, zero-maintenance tracking** for all your skills:

- ✅ **One-time setup** - Configure once, tracks forever
- ✅ **Automatic** - New skills auto-tracked
- ✅ **Works everywhere** - Claude Code and Cowork
- ✅ **Team-friendly** - No tracking code for developers to add
- ✅ **Uses existing infrastructure** - Same `/api/track` endpoint

For other integration approaches, see:
- [SKILL_INTEGRATION.md](SKILL_INTEGRATION.md) - JavaScript and bash approaches
- [docs/INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md) - Detailed integration guide
