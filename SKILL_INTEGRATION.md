# Adding Tracking to Your Skills

Simple guide to add usage tracking to any skill in 2 minutes.

## What You'll Track

Every time your skill runs, you'll automatically capture:
- ✅ How long it took to execute
- ✅ Whether it succeeded or failed
- ✅ What error occurred (if any)
- ✅ Anonymous user identification

## Choose Your Approach

Track Skills supports two integration methods:

1. **JavaScript (Programmatic)** - For JavaScript/TypeScript skills (see below)
2. **Bash (SKILL.md)** - For Claude Code/Cowork skills (see [Bash Integration](#bash-integration-skillmd))

---

## JavaScript Integration (Programmatic Skills)

### The Pattern

**Step 1:** Import the tracking wrapper
```javascript
import { trackSkillExecution } from './track-skills/client/tracking.js';
```

**Step 2:** Rename your main function to end with `Impl`
```javascript
// Before: export async function mySkill(params, context)
// After:  async function mySkillImpl(params, context)
```

**Step 3:** Export a new wrapper function
```javascript
export async function mySkill(params, context) {
  return trackSkillExecution('my_skill_name', mySkillImpl, params, context);
}
```

That's it!

## Complete Example

### Before (No Tracking)

```javascript
/**
 * Query Content Skill
 */

export async function queryContent(params, context) {
  const { apiBaseUrl, apiKey } = context;

  const response = await fetch(`${apiBaseUrl}/api/query`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Query failed: ${response.statusText}`);
  }

  const result = await response.json();

  return {
    success: true,
    count: result.count,
    pages: result.pages
  };
}

export default queryContent;
```

### After (With Tracking)

```javascript
/**
 * Query Content Skill
 */

import { trackSkillExecution } from '../../track-skills/client/tracking.js';

async function queryContentImpl(params, context) {
  const { apiBaseUrl, apiKey } = context;

  const response = await fetch(`${apiBaseUrl}/api/query`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Query failed: ${response.statusText}`);
  }

  const result = await response.json();

  return {
    success: true,
    count: result.count,
    pages: result.pages
  };
}

// Export wrapped version with tracking
export async function queryContent(params, context) {
  return trackSkillExecution('query_content', queryContentImpl, params, context);
}

export default queryContent;
```

## What Changed?

1. **Added import** at the top
2. **Renamed** `queryContent` → `queryContentImpl`
3. **Added wrapper** export that calls `trackSkillExecution()`

Your skill logic stays **exactly the same**. No other changes needed.

## Naming Your Skill

Choose a descriptive `tool_name` for tracking:

```javascript
// Good names (clear and specific)
trackSkillExecution('query_content', ...)
trackSkillExecution('get_content_gaps', ...)
trackSkillExecution('generate_brief', ...)

// Bad names (too generic)
trackSkillExecution('query', ...)
trackSkillExecution('get', ...)
trackSkillExecution('skill1', ...)
```

Use snake_case and make it match your function name for clarity.

## How It Works

When your skill runs:

1. Tracking starts a timer
2. Your `*Impl` function executes normally
3. If successful: logs success + execution time
4. If error occurs: logs error details + execution time
5. Either way, your result/error is returned unchanged

**Important:** Tracking never affects your skill's behavior. If tracking fails, your skill still works normally.

## Verify It's Working

After adding tracking and deploying:

```bash
# Check that events are being logged
wrangler d1 execute your-db --command \
  "SELECT * FROM skill_usage_events ORDER BY timestamp DESC LIMIT 5" --remote
```

You should see entries with your skill's `tool_name`.

## Multiple Skills

Just repeat the pattern for each skill:

```javascript
// skills/skill-a.js
import { trackSkillExecution } from '../../track-skills/client/tracking.js';
async function skillAImpl(params, context) { /* ... */ }
export async function skillA(params, context) {
  return trackSkillExecution('skill_a', skillAImpl, params, context);
}

// skills/skill-b.js
import { trackSkillExecution } from '../../track-skills/client/tracking.js';
async function skillBImpl(params, context) { /* ... */ }
export async function skillB(params, context) {
  return trackSkillExecution('skill_b', skillBImpl, params, context);
}
```

Each skill gets tracked independently with its own stats.

## Advanced: Custom Metadata

Want to track additional context? Pass it in the `context` object:

```javascript
export async function mySkill(params, context) {
  // Add custom tracking metadata
  const enrichedContext = {
    ...context,
    _trackingMetadata: {
      feature_flag: 'new_algorithm',
      user_tier: 'premium'
    }
  };

  return trackSkillExecution('my_skill', mySkillImpl, params, enrichedContext);
}
```

This metadata will be stored in the `metadata` JSON field.

## Troubleshooting

**Import path wrong?**

Adjust the relative path based on your file location:
```javascript
// If skill is in skills/ folder and track-skills is a sibling
import { trackSkillExecution } from '../../track-skills/client/tracking.js';

// If skill is in root folder
import { trackSkillExecution } from './track-skills/client/tracking.js';
```

**Tracking not appearing in dashboard?**

1. Check Worker logs: `wrangler tail your-worker`
2. Verify `/api/track` endpoint exists in your Worker
3. Check D1 database has data: `wrangler d1 execute ... --command "SELECT COUNT(*) FROM skill_usage_events"`

**Skill errors after adding tracking?**

Tracking uses try-catch to fail silently. If your skill breaks, it's likely an import path issue or syntax error, not the tracking itself.

---

## Bash Integration (SKILL.md)

For **Claude Code** or **Cowork** skills defined in SKILL.md files, use the bash helper script approach.

### Setup (One-Time)

**Step 1:** Create `skills/_track.sh` helper script:

```bash
#!/bin/bash
# Skill usage tracking helper
# Usage: bash skills/_track.sh <tool_name>

TOOL_NAME=$1

curl -X POST "https://your-worker.workers.dev/api/track" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CONTENT_ONTOLOGY_API_KEY}" \
  -d "{\"tool_name\":\"$TOOL_NAME\",\"duration_ms\":100,\"status\":\"success\",\"tool_category\":\"your_category\"}" \
  2>/dev/null &
```

**Step 2:** Make it executable:
```bash
chmod +x skills/_track.sh
```

**Step 3:** (Optional) Set environment variable:
```bash
export CONTENT_ONTOLOGY_API_KEY="your-api-key"
```

### Adding Tracking to Each Skill

Add a bash block to your SKILL.md file:

**Before:**
```markdown
---
name: query-content
description: Search content inventory
---

# Query Content

Search the content inventory by topic, type, or stage.
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

Search the content inventory by topic, type, or stage.
```

**That's it!** Only **2 lines** needed per skill.

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

Generate a context-aware content brief based on existing brand patterns, topics, and audience data from the content ontology.

## When to Use This Skill

Use this skill when you need to:
- Create a new piece of content
- Get AI suggestions based on proven patterns
- Understand what topics to cover
```

### How It Works

1. **Skill Invoked** - User asks Claude to use the skill
2. **Claude Reads SKILL.md** - Processes the markdown file
3. **Bash Block Executes** - Runs `skills/_track.sh` automatically
4. **Helper Script Calls API** - Sends tracking data in background
5. **API Logs to D1** - Event stored in database
6. **Skill Continues** - Main skill logic runs normally

**Key Benefits:**
- ✅ **Non-blocking** - Runs in background (`&`)
- ✅ **Fail-silent** - Skills work even if tracking fails (`2>/dev/null`)
- ✅ **Centralized** - One helper script for all skills
- ✅ **Simple** - No code changes, just markdown

### Naming Convention

Use **snake_case** for tool names:
- ✅ `query_content`
- ✅ `generate_content_brief`
- ✅ `get_brand_context`
- ❌ `query-content` (avoid hyphens)
- ❌ `queryContent` (avoid camelCase)

### Verify It's Working

After adding tracking:

**1. Test the helper script directly:**
```bash
bash skills/_track.sh test_skill
```

**2. Check the database:**
```bash
wrangler d1 execute your-db --command \
  "SELECT tool_name, status, timestamp FROM skill_usage_events ORDER BY timestamp DESC LIMIT 5" \
  --remote
```

**3. View the dashboard:**
Visit your analytics dashboard to see real-time metrics.

### Troubleshooting

**Tracking not appearing?**

1. **Test API endpoint directly:**
```bash
curl -X POST "https://your-worker.workers.dev/api/track" \
  -H "Content-Type: application/json" \
  -d '{"tool_name":"test","duration_ms":100,"status":"success","tool_category":"test"}'
```

Expected: `{"success":true,"message":"Event tracked"}`

2. **Check bash block syntax:**
```markdown
```bash
bash skills/_track.sh tool_name
```
```

Make sure:
- Triple backticks are correct
- `bash` language identifier is present
- Path is `skills/_track.sh`
- Tool name uses underscores

3. **Verify helper script location:**
```bash
ls -la skills/_track.sh
```

Should be executable (`-rwxr-xr-x`).

**Proxy blocking requests?**

If using Cowork, the proxy may block external domains. Two solutions:

1. **Use Claude Code instead** - No proxy restrictions
2. **Implement server-side tracking** - Track at MCP protocol level

### Environment Variables (Optional)

Set `CONTENT_ONTOLOGY_API_KEY` for authenticated tracking:

**Bash/Zsh:**
```bash
echo 'export CONTENT_ONTOLOGY_API_KEY="your-api-key"' >> ~/.zshrc
source ~/.zshrc
```

**Note:** Currently optional if your API doesn't enforce authentication.

### Multiple Skills

Just repeat the pattern for each skill:

```markdown
<!-- skills/skill-a/SKILL.md -->
```bash
bash skills/_track.sh skill_a
```

<!-- skills/skill-b/SKILL.md -->
```bash
bash skills/_track.sh skill_b
```

<!-- skills/skill-c/SKILL.md -->
```bash
bash skills/_track.sh skill_c
```
```

Each skill tracks independently with its own metrics.

---

**That's all you need!**

- **JavaScript approach**: Three simple steps per skill
- **Bash approach**: Two lines per SKILL.md file

For setup instructions (database, Worker endpoints, dashboard), see the [main README](README.md).
