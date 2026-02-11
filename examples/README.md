# Track-Skills Examples

This directory contains working examples for integrating Track-Skills into your project.

## Files

### Server-Side (Required for all approaches)

- **[worker-integration.js](worker-integration.js)** - How to add tracking endpoints to your Cloudflare Worker
  - Required for all approaches (JavaScript, Bash, Hook)
  - Includes `/api/track` endpoint
  - Includes analytics endpoints (`/analytics/summary`, `/analytics/tools`, etc.)

### Client-Side (Choose one or use multiple)

- **[skill-integration.js](skill-integration.js)** - JavaScript/TypeScript skill tracking
  - Use for programmatic skills
  - Tracks execution time, parameters, results
  - More detailed metrics

- **[skill-integration-bash.md](skill-integration-bash.md)** - Bash/SKILL.md tracking
  - Use for Claude Code/Cowork skills
  - Simple 2-line integration
  - Tracks invocations only

- **[posttooluse-hook.sh](posttooluse-hook.sh)** ⭐ NEW - PostToolUse hook template
  - Use for automatic zero-effort tracking
  - Copy to `.claude/hooks/` and customize
  - All skills auto-tracked

- **[claude-settings.json](claude-settings.json)** - Hook configuration example
  - Example `.claude/settings.json` for PostToolUse hook
  - Copy to project root and adjust matcher pattern

## Quick Start

### 1. Set up your Worker

Copy the tracking endpoint from `worker-integration.js` to your Worker:

```javascript
// Add to your Worker's fetch handler
if (url.pathname === '/api/track' && request.method === 'POST') {
  // ... see worker-integration.js
}
```

### 2. Choose your tracking approach

**Option A: JavaScript Skills**

Follow `skill-integration.js`:
```javascript
import { trackSkillExecution } from '../client/tracking.js';

async function mySkillImpl(params, context) {
  // Your logic
}

export async function mySkill(params, context) {
  return trackSkillExecution('my_skill', mySkillImpl, params, context);
}
```

**Option B: SKILL.md Files**

Follow `skill-integration-bash.md`:
```markdown
```bash
bash skills/_track.sh my_skill_name
```
```

**Option C: PostToolUse Hook (Automatic)**

Follow `posttooluse-hook.sh` and `claude-settings.json`:
1. Copy `posttooluse-hook.sh` to `.claude/hooks/track-skill.sh`
2. Customize the endpoint and category
3. Add hook config to `.claude/settings.json`
4. Done! All skills auto-tracked.

### 3. Deploy and test

```bash
# Deploy Worker
wrangler deploy

# Test tracking
curl -X POST "https://your-worker.workers.dev/api/track" \
  -H "Content-Type: application/json" \
  -d '{"tool_name":"test","duration_ms":100,"status":"success"}'
```

## Which Approach Should I Use?

| Use Case | Recommended Approach |
|----------|---------------------|
| JavaScript/TypeScript skills | `skill-integration.js` |
| Claude Code skills (SKILL.md) | `skill-integration-bash.md` OR `posttooluse-hook.sh` |
| Cowork plugin skills | `posttooluse-hook.sh` (works in Cowork!) |
| Multiple skills, want automation | `posttooluse-hook.sh` ⭐ |
| Both types of skills | Use both JS + Hook! |

## Complete Documentation

- [Main README](../README.md) - Overview and features
- [SKILL_INTEGRATION.md](../SKILL_INTEGRATION.md) - JavaScript and Bash integration
- [HOOK_INTEGRATION.md](../HOOK_INTEGRATION.md) - PostToolUse hook integration
- [QUICKSTART.md](../QUICKSTART.md) - 5-minute setup guide
- [docs/INTEGRATION_GUIDE.md](../docs/INTEGRATION_GUIDE.md) - Detailed integration guide

## Need Help?

1. Check the [Troubleshooting section](../SKILL_INTEGRATION.md#troubleshooting) in SKILL_INTEGRATION.md
2. Review the complete examples in this directory
3. Open an issue on GitHub
