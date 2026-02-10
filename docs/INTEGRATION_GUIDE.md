# Skill Tracking Integration Guide

## Overview

This guide shows how to add **tracking** to your skills using two different approaches:

1. **JavaScript (Programmatic)** - For JavaScript/TypeScript skills
2. **Bash (SKILL.md)** - For Claude Code/Cowork skills

Both approaches capture:
- Skill invocation details
- Parameters used (JavaScript only)
- Result counts/metrics (JavaScript only)
- Execution time
- Success/failure status

---

## Approach 1: JavaScript (Programmatic Skills)

### Architecture

```
Skill Invocation
    ↓
trackSkillExecution() wrapper
    ↓
Execute actual skill logic
    ↓
Send tracking data to /api/track endpoint
    ↓
Worker logs to D1 database
    ↓
Analytics dashboard shows metrics
```

## How to Add Tracking to a Skill

### Step 1: Import the tracking helper

```javascript
import { trackSkillExecution } from './tracking.js';
```

### Step 2: Rename your main skill function

Change:
```javascript
export async function mySkill(params, context) {
  // skill logic
}
```

To:
```javascript
async function mySkillImpl(params, context) {
  // skill logic (unchanged)
}
```

### Step 3: Export wrapped version

```javascript
export async function mySkill(params, context) {
  return trackSkillExecution('my_skill_name', mySkillImpl, params, context);
}
```

## Complete Example: query-inventory.js

**Before:**
```javascript
export async function queryInventory(params, context) {
  const { apiBaseUrl, apiKey } = context;
  // ... skill logic ...
  return result;
}
```

**After:**
```javascript
import { trackSkillExecution } from './tracking.js';

async function queryInventoryImpl(params, context) {
  const { apiBaseUrl, apiKey } = context;
  // ... skill logic (unchanged) ...
  return result;
}

export async function queryInventory(params, context) {
  return trackSkillExecution('query_content_inventory', queryInventoryImpl, params, context);
}
```

## What Gets Tracked

The `trackSkillExecution` wrapper automatically logs:

### On Success:
- ✅ Skill name
- ✅ Execution duration (ms)
- ✅ Status: 'success'
- ✅ Metadata:
  - Parameter keys used
  - Result count (if available)

### On Error:
- ❌ Skill name
- ❌ Execution duration (ms)
- ❌ Status: 'error'
- ❌ Error type (e.g., 'Error', 'TypeError')
- ❌ Error message

## Applying to All Skills

You need to update each skill file:

1. ✅ **query-inventory.js** - Already done
2. ⏳ **content-gaps.js** - Todo
3. ⏳ **generate-brief.js** - Todo
4. ⏳ **brand-context.js** - Todo
5. ⏳ **related-content.js** - Todo

### Template for Remaining Skills

```javascript
// At top of file
import { trackSkillExecution } from './tracking.js';

// Rename existing function
async function skillNameImpl(params, context) {
  // ... existing logic ...
}

// Export wrapped version
export async function skillName(params, context) {
  return trackSkillExecution('skill_name', skillNameImpl, params, context);
}
```

## Testing Client-Side Tracking

### 1. Deploy the Worker with /api/track endpoint

```bash
cd /Users/pkoch/Documents/GitHub/cms-ontology/workers/ontology-api
wrangler deploy
```

### 2. Use a skill normally

The skill will automatically log tracking data to the Worker.

### 3. Check analytics

```bash
# Via API
curl "https://content-ontology.philipp-koch.workers.dev/analytics/tools?days=7"

# Via D1
wrangler d1 execute content-ontology --command \
  "SELECT tool_name, COUNT(*), AVG(duration_ms) FROM skill_usage_events GROUP BY tool_name" --remote

# Via Dashboard
open https://ontology-analytics.pages.dev
```

## Benefits of Client-Side Tracking

### vs Server-Side (MCP) Tracking:

**Server-Side (What we built):**
- ✅ Tracks MCP protocol invocations
- ✅ Network-level metrics
- ✅ User sessions (via headers)
- ❌ Doesn't see internal skill logic
- ❌ Can't track what parameters were used
- ❌ Can't track result metrics

**Client-Side (This guide):**
- ✅ Tracks actual skill execution
- ✅ Sees parameters and results
- ✅ Can add custom metadata
- ✅ More granular insights
- ❌ Requires code changes to each skill
- ❌ Depends on skill making API call

**Best Practice:** Use **both**!
- Server-side tracks who uses the skill (privacy-preserving)
- Client-side tracks what they do with it (actionable insights)

## Troubleshooting

### Tracking not appearing in analytics?

1. Check Worker logs:
   ```bash
   wrangler tail ontology-api
   ```

2. Verify /api/track endpoint exists:
   ```bash
   curl -X POST "https://content-ontology.philipp-koch.workers.dev/api/track" \
     -H "Content-Type: application/json" \
     -d '{"tool_name":"test","duration_ms":100,"status":"success"}'
   ```

3. Check D1 directly:
   ```bash
   wrangler d1 execute content-ontology --command \
     "SELECT * FROM skill_usage_events WHERE tool_category='cms_ontology' ORDER BY timestamp DESC LIMIT 5" --remote
   ```

### Skills still work without tracking?

Yes! The tracking helper uses try-catch and fails silently. If the /api/track endpoint is unavailable or errors occur, the skill continues to work normally.

---

## Approach 2: Bash (SKILL.md Files)

For **Claude Code** or **Cowork** skills defined in markdown files.

### Architecture

```
Skill Invoked (user asks Claude)
    ↓
Claude reads SKILL.md file
    ↓
Bash block executes automatically
    ↓
Helper script sends tracking data
    ↓
Worker logs to D1 database
    ↓
Analytics dashboard shows metrics
```

### Setup (One-Time)

**Step 1:** Copy the helper script to your project:

```bash
# From track-skills repository
cp client/_track.sh /path/to/your/project/skills/_track.sh
```

**Step 2:** Customize the helper script:

Edit `skills/_track.sh` and update:
- `TRACKING_ENDPOINT` - Your Worker URL
- `TOOL_CATEGORY` - Your skill category name

```bash
#!/bin/bash
TOOL_NAME=$1

# Customize these
TRACKING_ENDPOINT="https://your-worker.workers.dev/api/track"
TOOL_CATEGORY="your_category"

curl -X POST "$TRACKING_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CONTENT_ONTOLOGY_API_KEY}" \
  -d "{\"tool_name\":\"$TOOL_NAME\",\"duration_ms\":100,\"status\":\"success\",\"tool_category\":\"$TOOL_CATEGORY\"}" \
  2>/dev/null &
```

**Step 3:** Make it executable:

```bash
chmod +x skills/_track.sh
```

### How to Add Tracking to Each Skill

Add a bash block to your SKILL.md file:

**Before:**
```markdown
---
name: query-content
description: Search content inventory
---

# Query Content

Search the content inventory by topic or type.
```

**After:**
```markdown
---
name: query-content
description: Search content inventory
---

# Query Content

```bash
bash skills/_track.sh query_content
```

Search the content inventory by topic or type.
```

That's it! Only **2 lines** added.

### Complete Example

```markdown
---
name: generate-content-brief
description: Generate AI-powered content briefs
---

# Generate Content Brief

```bash
bash skills/_track.sh generate_content_brief
```

Generate a context-aware content brief based on existing brand patterns.

## When to Use This Skill

Use this skill when you need to create new content...
```

### How It Works

1. User invokes skill through Claude
2. Claude reads the SKILL.md file
3. Bash code block executes automatically
4. Helper script sends tracking data in background (non-blocking)
5. API logs event to D1 database
6. Main skill logic continues normally

**Key Features:**
- ✅ Non-blocking (runs in background with `&`)
- ✅ Fail-silent (errors suppressed with `2>/dev/null`)
- ✅ Centralized (one helper script for all skills)
- ✅ Simple (no code changes, just markdown)

### Verify It's Working

**1. Test the helper script:**
```bash
bash skills/_track.sh test_skill
```

**2. Check the database:**
```bash
wrangler d1 execute your-db --command \
  "SELECT tool_name, status, timestamp FROM skill_usage_events ORDER BY timestamp DESC LIMIT 5" \
  --remote
```

Should see `test_skill` in results.

**3. Check the dashboard:**
Visit your analytics dashboard to see real-time metrics.

### Troubleshooting

**Tracking not appearing?**

1. **Test API endpoint:**
```bash
curl -X POST "https://your-worker.workers.dev/api/track" \
  -H "Content-Type: application/json" \
  -d '{"tool_name":"test","duration_ms":100,"status":"success","tool_category":"test"}'
```

Expected: `{"success":true,"message":"Event tracked"}`

2. **Check bash syntax:**
```markdown
```bash
bash skills/_track.sh tool_name
```
```

Verify:
- Triple backticks present
- `bash` language identifier included
- Correct path to helper script
- Tool name uses underscores (not hyphens)

3. **Check helper script:**
```bash
ls -la skills/_track.sh
```

Should be executable (`-rwxr-xr-x`).

**Proxy blocking requests?**

If using Cowork, the proxy may block external domains:
- ✅ **Solution 1**: Use Claude Code instead (no proxy)
- ✅ **Solution 2**: Implement server-side MCP tracking

---

## Comparison: JavaScript vs Bash

| Feature | JavaScript | Bash (SKILL.md) |
|---------|-----------|----------------|
| **Use Case** | Programmatic skills | Claude Code/Cowork skills |
| **Integration Effort** | 3 steps per skill | 2 lines per skill |
| **Tracks Parameters** | ✅ Yes | ❌ No |
| **Tracks Results** | ✅ Yes | ❌ No |
| **Actual Duration** | ✅ Yes | ❌ No (placeholder) |
| **Simplicity** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Maintainability** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

**Best Practice:**
- Use **JavaScript** for programmatic skills (more detailed metrics)
- Use **Bash** for SKILL.md files (simpler, faster integration)

## Next Steps

1. Deploy the updated Worker with /api/track endpoint
2. Add tracking to skills using appropriate approach
3. Test with real skill invocations
4. Monitor analytics dashboard for metrics
