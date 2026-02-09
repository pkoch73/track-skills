# Adding Tracking to Your Skills

Simple guide to add usage tracking to any skill in 2 minutes.

## What You'll Track

Every time your skill runs, you'll automatically capture:
- ✅ How long it took to execute
- ✅ Whether it succeeded or failed
- ✅ What error occurred (if any)
- ✅ Anonymous user identification

## The Pattern

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

**That's all you need!** Three simple steps per skill, and you're tracking usage analytics.

For setup instructions (database, Worker endpoints, dashboard), see [QUICKSTART.md](QUICKSTART.md).
