# Changelog

All notable changes to Track-Skills will be documented in this file.

## [1.0.0] - 2026-02-09

### Added
- Initial release of Track-Skills
- Client-side skill tracking with `trackSkillExecution()` wrapper
- Server-side tracking utilities (`hashUserId`, `logUsageEvent`)
- D1 database schema for `skill_usage_events`
- Analytics API with 4 endpoints:
  - `/analytics/summary` - Overall metrics
  - `/analytics/tools` - Per-tool statistics
  - `/analytics/retention` - DAU/WAU trends
  - `/analytics/errors` - Recent error log
- Real-time analytics dashboard with Chart.js
  - Summary cards (invocations, users, success rate, duration)
  - Tool usage bar chart
  - Success rates doughnut chart
  - Daily active users line chart
  - Errors table
  - Time range selector (24h, 7d, 30d)
  - Auto-refresh every 60s
- Privacy-preserving tracking (SHA-256 hashed user IDs)
- Cloudflare-native (Workers + D1 + Pages)
- Zero performance impact (async, fail-silent)
- Comprehensive documentation:
  - README.md with full guide
  - QUICKSTART.md for 5-minute setup
  - INTEGRATION_GUIDE.md for skill integration
  - Example Worker integration
  - Example skill integration
- Production-ready code examples
- MIT License

### Architecture
- Client-side tracking in skills (JavaScript)
- Worker endpoint `/api/track` for receiving events
- D1 database for persistent storage
- Analytics API for querying data
- Cloudflare Pages dashboard for visualization

### Metrics Tracked
- Invocation counts per skill
- Success/failure rates
- Execution duration (ms)
- User retention (DAU/WAU)
- Error types and messages
- Custom metadata (extensible)

### Privacy & Security
- SHA-256 hashed user IDs (cannot reverse)
- No PII stored
- Anonymous but consistent tracking
- CORS headers configured
- Optional API key authentication

### Cost
- Free tier: 5M D1 rows, 100k Worker requests/day
- $0/month for typical usage (< 1k calls/day)
- $0-5/month at scale (100k calls/day)

## [Unreleased]

### Planned Features
- [ ] Batch tracking (reduce API calls)
- [ ] Webhook support for alerts
- [ ] Custom dashboard widgets
- [ ] Export data to CSV/JSON
- [ ] Aggregate hourly/daily statistics
- [ ] Integration with external analytics (PostHog, Mixpanel)
- [ ] TypeScript definitions
- [ ] Automated data retention/cleanup
- [ ] Performance optimization for high-volume
- [ ] Multi-database support (beyond D1)

### Ideas
- Real-time WebSocket updates for dashboard
- A/B testing support
- Funnel tracking
- Cohort analysis
- Custom alerts (email, Slack)
- Comparison mode (compare time periods)
- Geographic distribution (if IP tracking enabled)
