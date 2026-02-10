# Track-Skills Quick Start

Get tracking up and running in 5 minutes.

## Prerequisites

- Cloudflare account
- Wrangler CLI installed (`npm install -g wrangler`)
- A Cloudflare Worker project

## Step 1: Create D1 Database (2 min)

```bash
# Create database
wrangler d1 create track-skills-db

# Copy the database ID from output, add to wrangler.toml:
# database_id = "abc-123-def"

# Run migration
wrangler d1 execute track-skills-db --file=server/001_create_usage_tracking.sql --remote
```

## Step 2: Add Tracking Endpoint to Worker (3 min)

Copy the tracking code from `examples/worker-integration.js` to your Worker.

Key parts:
```javascript
// 1. Import
import { hashUserId } from './track-skills/server/tracking-utils.js';
import { getSummary, getToolStats, getRetentionStats, getRecentErrors } from './track-skills/analytics/analytics.js';

// 2. Add /api/track endpoint (see examples/worker-integration.js)

// 3. Add analytics endpoints (see examples/worker-integration.js)
```

Deploy:
```bash
wrangler deploy
```

## Step 3: Add Tracking to Your Skills (2 min)

### Option A: JavaScript Skills

In your skill file:

```javascript
import { trackSkillExecution } from './track-skills/client/tracking.js';

// Rename function
async function mySkillImpl(params, context) {
  // your logic
}

// Export wrapped version
export async function mySkill(params, context) {
  return trackSkillExecution('my_skill', mySkillImpl, params, context);
}
```

### Option B: SKILL.md Files (Claude Code/Cowork)

1. Copy helper script:
```bash
cp track-skills/client/_track.sh your-project/skills/_track.sh
```

2. Customize endpoint in `skills/_track.sh`

3. Add to each SKILL.md:
```markdown
```bash
bash skills/_track.sh my_skill_name
```
```

## Step 4: Deploy Dashboard (1 min)

```bash
cd dashboard

# Update app.js with your Worker URL
# const API_BASE = 'https://your-worker.workers.dev';

wrangler pages project create my-analytics --production-branch=main
wrangler pages deploy . --project-name=my-analytics --commit-dirty=true
```

## Step 5: Test It! (1 min)

```bash
# Test tracking endpoint
curl -X POST "https://your-worker.workers.dev/api/track" \
  -H "Content-Type: application/json" \
  -d '{"tool_name":"test","duration_ms":100,"status":"success"}'

# Check analytics
curl "https://your-worker.workers.dev/analytics/summary?days=7"

# Open dashboard
open https://my-analytics.pages.dev
```

## ✅ Done!

You now have:
- ✅ Client-side tracking in your skills
- ✅ Analytics API endpoints
- ✅ Live dashboard with charts

## Next Steps

1. **Add tracking to all skills** - Follow the pattern in Step 3
2. **Customize dashboard** - Edit `dashboard/` files
3. **Add authentication** - Protect analytics endpoints (see README.md)
4. **Monitor usage** - Check dashboard for insights

## Troubleshooting

**Tracking not working?**
```bash
# Check Worker logs
wrangler tail your-worker

# Verify database
wrangler d1 execute track-skills-db --command \
  "SELECT * FROM skill_usage_events LIMIT 5" --remote
```

**Dashboard not loading?**
- Check `dashboard/app.js` has correct `API_BASE` URL
- Verify CORS headers in Worker
- Check browser console for errors

## Support

- 📖 Full docs: [README.md](README.md)
- 🔧 Integration guide: [docs/INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md)
- 💡 Examples: [examples/](examples/)
