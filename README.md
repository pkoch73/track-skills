# Track Skills

A complete, privacy-preserving usage tracking system for cloud-deployed skills and tools. Built for Cloudflare Workers + D1, with client-side skill tracking and real-time analytics dashboard.

## 🎯 Features

- **Client-Side Tracking** - Track skill execution from within your code
- **Privacy-Preserving** - SHA-256 hashed user IDs (anonymous but consistent)
- **Real-Time Analytics** - Live dashboard with Chart.js visualizations
- **Cloudflare Native** - Workers, D1 database, Pages hosting
- **Zero Performance Impact** - Async logging, fail-silent design
- **Extensible** - Easy to add to any skill or tool

## 📊 What Gets Tracked

- **Invocation counts** - Which skills are used most
- **Success/failure rates** - Skill reliability metrics
- **Performance** - Execution time per skill
- **User retention** - DAU/WAU trends
- **Error tracking** - Type, message, timestamp for debugging

## 🏗️ Architecture

```
Skill Execution (Client)
    ↓
trackSkillExecution() wrapper
    ↓
Skill logic runs
    ↓
POST to /api/track endpoint
    ↓
Worker logs to D1 database
    ↓
Analytics API (/analytics/*)
    ↓
Dashboard visualizes data
```

## 📁 Project Structure

```
track-skills/
├── server/              # Server-side (Cloudflare Worker)
│   ├── tracking-utils.js           # Hashing, logging utilities
│   └── 001_create_usage_tracking.sql  # D1 database schema
├── analytics/           # Analytics queries
│   └── analytics.js                # Summary, tools, retention, errors
├── client/              # Client-side tracking
│   └── tracking.js                 # Skill execution wrapper
├── dashboard/           # Analytics dashboard
│   ├── index.html                  # Dashboard UI
│   ├── app.js                      # Dashboard logic
│   ├── styles.css                  # Dashboard styles
│   └── _headers                    # CORS configuration
└── docs/                # Documentation
    ├── INTEGRATION_GUIDE.md        # How to integrate
    └── API.md                      # API reference
```

## 🚀 Quick Start

### 1. Set Up Database

Create the D1 tracking table:

```bash
wrangler d1 execute your-database --file=server/001_create_usage_tracking.sql --remote
```

### 2. Add Server Endpoint

In your Cloudflare Worker, add the tracking endpoint:

```javascript
import { hashUserId } from './track-skills/server/tracking-utils.js';
import { getSummary, getToolStats, getRetentionStats, getRecentErrors } from './track-skills/analytics/analytics.js';

// In your fetch handler:
if (url.pathname === '/api/track' && request.method === 'POST') {
  const event = await request.json();
  const userIdHash = await hashUserId(request.headers.get('cf-connecting-ip') || 'anonymous');

  await env.DB.prepare(`
    INSERT INTO skill_usage_events
    (user_id_hash, tool_name, tool_category, duration_ms, status, error_type, error_message, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    userIdHash,
    event.tool_name,
    event.tool_category || 'default',
    event.duration_ms,
    event.status,
    event.error_type || null,
    event.error_message || null,
    event.metadata || null
  ).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Add analytics endpoints
if (url.pathname === '/analytics/summary') {
  const days = parseInt(url.searchParams.get('days') || '7');
  const data = await getSummary(env, days);
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
}
// Add other analytics endpoints (tools, retention, errors)
```

### 3. Add Client-Side Tracking

In your skill file:

```javascript
import { trackSkillExecution } from './track-skills/client/tracking.js';

// Rename your skill function to *Impl
async function mySkillImpl(params, context) {
  // Your skill logic here
  return { success: true, data: results };
}

// Export wrapped version with tracking
export async function mySkill(params, context) {
  return trackSkillExecution('my_skill_name', mySkillImpl, params, context);
}
```

### 4. Deploy Dashboard

```bash
cd dashboard
wrangler pages project create my-analytics --production-branch=main
wrangler pages deploy . --project-name=my-analytics
```

## 📖 Integration Guide

### Example: Adding Tracking to a Skill

**Before:**
```javascript
export async function queryData(params, context) {
  const response = await fetch(`${context.apiBaseUrl}/api/query`);
  return response.json();
}
```

**After:**
```javascript
import { trackSkillExecution } from './track-skills/client/tracking.js';

async function queryDataImpl(params, context) {
  const response = await fetch(`${context.apiBaseUrl}/api/query`);
  return response.json();
}

export async function queryData(params, context) {
  return trackSkillExecution('query_data', queryDataImpl, params, context);
}
```

That's it! The skill now logs:
- ✅ Execution time
- ✅ Success/failure status
- ✅ Parameters used
- ✅ Result metadata

## 📊 Analytics Dashboard

Access your live dashboard to see:

- **Summary Cards**
  - Total invocations
  - Unique users
  - Success rate
  - Average duration

- **Charts**
  - Tool usage distribution (bar chart)
  - Success vs error rates (doughnut chart)
  - Daily active users trend (line chart)

- **Error Log**
  - Recent errors with timestamps
  - Error types and messages
  - Tool name for debugging

**Features:**
- Auto-refreshes every 60 seconds
- Time range selector (24h, 7d, 30d)
- Responsive design (mobile-friendly)

## 🔧 API Reference

### POST /api/track

Log a skill usage event.

**Request Body:**
```json
{
  "tool_name": "my_skill",
  "tool_category": "analytics",
  "duration_ms": 150,
  "status": "success",
  "error_type": null,
  "error_message": null,
  "metadata": "{\"params_count\":3}"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Event tracked"
}
```

### GET /analytics/summary?days=7

Get overall usage summary.

**Response:**
```json
{
  "period": "7 days",
  "total_invocations": 42,
  "unique_users": 8,
  "avg_duration_ms": 125,
  "success_rate": "95.24",
  "error_rate": "4.76"
}
```

### GET /analytics/tools?days=7

Get per-tool statistics.

**Response:**
```json
[
  {
    "tool_name": "query_data",
    "invocations": 25,
    "avg_duration_ms": 110,
    "success_rate": "100.00",
    "error_rate": "0.00"
  }
]
```

### GET /analytics/retention?days=30

Get user retention metrics.

**Response:**
```json
{
  "daily_active_users": [
    {"date": "2026-02-09", "dau": 5},
    {"date": "2026-02-08", "dau": 3}
  ],
  "weekly_active_users": 12,
  "period": "30 days"
}
```

### GET /analytics/errors?days=7&limit=50

Get recent errors.

**Response:**
```json
{
  "errors": [
    {
      "timestamp": "2026-02-09 21:30:00",
      "tool_name": "query_data",
      "error_type": "internal",
      "error_message": "Connection timeout",
      "duration_ms": 5000
    }
  ],
  "count": 1
}
```

## 🔐 Privacy & Security

### User Privacy
- **Anonymous IDs**: SHA-256 hashed (cannot reverse)
- **No PII**: No emails, names, or personal data stored
- **Consistent tracking**: Same user = same hash across sessions
- **IP-based fallback**: Uses IP + User-Agent only if no session ID

### Data Retention
- Recommended: Delete events older than 90 days
- GDPR-compliant with proper retention policies

### Optional: API Authentication

Add authentication to analytics endpoints:

```javascript
function requireAuth(request, env) {
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== env.ANALYTICS_API_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }
}
```

## 💰 Cost Estimate

**Cloudflare Free Tier:**
- D1: 5M rows free
- Workers: 100k requests/day free
- Pages: Unlimited bandwidth free

**At 1,000 skill calls/day:**
- D1: 30k rows/month = **FREE**
- Workers: 1k requests/day = **FREE**
- Total: **$0/month**

**At 100k calls/day:**
- D1: 3M rows/month = Still under 5M limit = **FREE**
- Workers: At free tier limit (consider $5/mo plan)
- Total: **$0-5/month**

## 📝 Database Schema

```sql
CREATE TABLE skill_usage_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id_hash TEXT NOT NULL,           -- SHA-256 hashed user ID
  tool_name TEXT NOT NULL,               -- Skill/tool identifier
  tool_category TEXT DEFAULT 'default', -- Category grouping
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  duration_ms INTEGER,                   -- Execution time
  status TEXT NOT NULL,                  -- 'success', 'error', 'timeout'
  error_type TEXT,                       -- Error classification
  error_message TEXT,                    -- Error details
  request_size_bytes INTEGER,            -- Optional
  response_size_bytes INTEGER,           -- Optional
  metadata TEXT                          -- JSON for extensibility
);
```

**Indexes:** Optimized for queries by user, tool, timestamp, status

## 🛠️ Troubleshooting

### Tracking not working?

1. **Check Worker logs:**
   ```bash
   wrangler tail your-worker
   ```

2. **Test /api/track endpoint:**
   ```bash
   curl -X POST "https://your-worker.workers.dev/api/track" \
     -H "Content-Type: application/json" \
     -d '{"tool_name":"test","duration_ms":100,"status":"success"}'
   ```

3. **Verify D1 data:**
   ```bash
   wrangler d1 execute your-db --command \
     "SELECT * FROM skill_usage_events ORDER BY timestamp DESC LIMIT 5" --remote
   ```

### Skills work without tracking?

Yes! The tracking wrapper uses try-catch and fails silently. If the tracking endpoint is unavailable, skills continue to work normally.

## 🤝 Contributing

This is a foundational tracking library. To extend:

1. **Add new metrics** - Extend the D1 schema `metadata` field
2. **Custom analytics** - Create new query functions in `analytics/analytics.js`
3. **Dashboard enhancements** - Add charts to `dashboard/`

## 📄 License

MIT

## 🔗 Related Projects

- Built for **Claude Skills** and **MCP Tools**
- Works with **Cloudflare Workers** ecosystem
- Compatible with **any JavaScript/TypeScript** project

---

**Built with ❤️ for privacy-preserving skill analytics**
