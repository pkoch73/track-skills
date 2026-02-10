# Example: Bash/SKILL.md Integration for Track-Skills

This shows how to add tracking to SKILL.md files for Claude Code and Cowork.

For JavaScript skills, see: `skill-integration.js`
For complete documentation, see: `../SKILL_INTEGRATION.md`

---

## Setup (One-Time)

### Step 1: Copy the helper script

```bash
cp ../client/_track.sh your-project/skills/_track.sh
cd your-project/skills
chmod +x _track.sh
```

### Step 2: Customize the helper script

Edit `skills/_track.sh`:

```bash
#!/bin/bash
TOOL_NAME=$1

# Customize these values
TRACKING_ENDPOINT="https://your-worker.workers.dev/api/track"
TOOL_CATEGORY="your_category"

curl -X POST "$TRACKING_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CONTENT_ONTOLOGY_API_KEY}" \
  -d "{\"tool_name\":\"$TOOL_NAME\",\"duration_ms\":100,\"status\":\"success\",\"tool_category\":\"$TOOL_CATEGORY\"}" \
  2>/dev/null &
```

---

## Adding Tracking to Skills

### Example 1: Simple Skill

**Before:**
```markdown
---
name: list-pages
description: List all pages in the content inventory
---

# List Pages

List all pages with their metadata, topics, and funnel stages.

## When to Use This Skill

Use this skill when you need to see all available pages.
```

**After:**
```markdown
---
name: list-pages
description: List all pages in the content inventory
---

# List Pages

```bash
bash skills/_track.sh list_pages
```

List all pages with their metadata, topics, and funnel stages.

## When to Use This Skill

Use this skill when you need to see all available pages.
```

**Only 2 lines added!**

---

### Example 2: Skill with Parameters

**Before:**
```markdown
---
name: query-content
description: Search the content inventory
---

# Query Content

Search the content inventory by topic, content type, or funnel stage.

## Parameters

- `topic` (optional) - Filter by topic
- `content_type` (optional) - Filter by content type
- `funnel_stage` (optional) - Filter by funnel stage
```

**After:**
```markdown
---
name: query-content
description: Search the content inventory
---

# Query Content

```bash
bash skills/_track.sh query_content
```

Search the content inventory by topic, content type, or funnel stage.

## Parameters

- `topic` (optional) - Filter by topic
- `content_type` (optional) - Filter by content type
- `funnel_stage` (optional) - Filter by funnel stage
```

---

### Example 3: Complex Skill

**Before:**
```markdown
---
name: generate-content-brief
description: Generate AI-powered content briefs
---

# Generate Content Brief

Generate a context-aware content brief based on existing brand patterns, topics, and proven content structures from the ontology.

## When to Use This Skill

Use this skill when you need to:
- Create a new piece of content
- Get AI suggestions based on proven patterns
- Understand what topics and structure work best
- Ensure consistency with existing brand voice

## Parameters

- `topic` (required) - The primary topic for the brief
- `content_type` (optional) - Type of content (article, adventure, etc.)
- `audience` (optional) - Target audience segment
- `funnel_stage` (optional) - Marketing funnel stage

## What It Does

1. Analyzes existing content patterns for the topic
2. Identifies successful structures and approaches
3. Extracts brand voice and terminology
4. Generates a brief with suggested sections and key points
```

**After:**
```markdown
---
name: generate-content-brief
description: Generate AI-powered content briefs
---

# Generate Content Brief

```bash
bash skills/_track.sh generate_content_brief
```

Generate a context-aware content brief based on existing brand patterns, topics, and proven content structures from the ontology.

## When to Use This Skill

Use this skill when you need to:
- Create a new piece of content
- Get AI suggestions based on proven patterns
- Understand what topics and structure work best
- Ensure consistency with existing brand voice

## Parameters

- `topic` (required) - The primary topic for the brief
- `content_type` (optional) - Type of content (article, adventure, etc.)
- `audience` (optional) - Target audience segment
- `funnel_stage` (optional) - Marketing funnel stage

## What It Does

1. Analyzes existing content patterns for the topic
2. Identifies successful structures and approaches
3. Extracts brand voice and terminology
4. Generates a brief with suggested sections and key points
```

---

## What Gets Tracked

When the skill runs, the tracking script logs:

```json
{
  "tool_name": "generate_content_brief",
  "duration_ms": 100,
  "status": "success",
  "tool_category": "your_category",
  "timestamp": "2026-02-10 20:13:31",
  "user_id_hash": "sha256_hash..."
}
```

**Note:** The bash approach tracks invocation only, not parameters or results (unlike the JavaScript approach).

---

## Verification

### Test the helper script:
```bash
bash skills/_track.sh test_skill
```

### Check the database:
```bash
wrangler d1 execute your-db --command \
  "SELECT tool_name, status, timestamp FROM skill_usage_events ORDER BY timestamp DESC LIMIT 5" \
  --remote
```

### Expected output:
```
tool_name     | status  | timestamp
test_skill    | success | 2026-02-10 20:13:31
```

---

## Naming Convention

Use **snake_case** for tool names:

✅ Good:
- `list_pages`
- `query_content`
- `generate_content_brief`
- `get_brand_context`

❌ Avoid:
- `list-pages` (hyphens)
- `listPages` (camelCase)
- `List_Pages` (PascalCase)

---

## Multiple Skills

Just repeat the pattern for each skill:

```
skills/
├── _track.sh                         # Helper script (shared)
├── list-pages/
│   └── SKILL.md                     # bash skills/_track.sh list_pages
├── query-content/
│   └── SKILL.md                     # bash skills/_track.sh query_content
├── generate-content-brief/
│   └── SKILL.md                     # bash skills/_track.sh generate_content_brief
└── get-brand-context/
    └── SKILL.md                     # bash skills/_track.sh get_brand_context
```

Each skill tracks independently with its own metrics.

---

## Key Benefits

- ✅ **Simple** - Only 2 lines per skill
- ✅ **Non-blocking** - Runs in background
- ✅ **Fail-silent** - Skills work even if tracking fails
- ✅ **Centralized** - One helper script for all skills
- ✅ **No code changes** - Just markdown

---

For complete documentation, see: [SKILL_INTEGRATION.md](../SKILL_INTEGRATION.md)
