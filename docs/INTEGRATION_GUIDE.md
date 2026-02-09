# Client-Side Skill Tracking Guide

## Overview

This guide shows how to add **client-side tracking** to your skills. Client-side tracking captures what happens inside the skill logic itself, including:
- Skill invocation details
- Parameters used
- Result counts/metrics
- Execution time
- Success/failure status

## Architecture

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

## Next Steps

1. Deploy the updated Worker with /api/track endpoint
2. Update all 5 skill files with tracking wrapper
3. Test with real skill invocations
4. Monitor analytics dashboard for client-side metrics
