/**
 * Analytics API Module
 *
 * Provides analytics query functions for skill usage tracking.
 * Queries the skill_usage_events table to generate insights.
 */

/**
 * Get overall usage summary for a time period
 * @param {Object} env - Worker environment with DB binding
 * @param {number} days - Number of days to look back (default: 7)
 * @returns {Promise<Object>} Summary metrics
 */
export async function getSummary(env, days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const stmt = env.DB.prepare(`
    SELECT
      COUNT(*) as total_invocations,
      COUNT(DISTINCT user_id_hash) as unique_users,
      AVG(duration_ms) as avg_duration_ms,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
      SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count
    FROM skill_usage_events
    WHERE timestamp >= ?
  `);

  const result = await stmt.bind(since.toISOString()).first();

  // Handle case where there are no events
  if (!result || result.total_invocations === 0) {
    return {
      period: `${days} days`,
      total_invocations: 0,
      unique_users: 0,
      avg_duration_ms: 0,
      success_rate: '0.00',
      error_rate: '0.00',
    };
  }

  return {
    period: `${days} days`,
    total_invocations: result.total_invocations,
    unique_users: result.unique_users,
    avg_duration_ms: Math.round(result.avg_duration_ms || 0),
    success_rate: (result.success_count / result.total_invocations * 100).toFixed(2),
    error_rate: (result.error_count / result.total_invocations * 100).toFixed(2),
  };
}

/**
 * Get per-tool usage statistics
 * @param {Object} env - Worker environment with DB binding
 * @param {number} days - Number of days to look back (default: 7)
 * @returns {Promise<Array>} Array of tool stats
 */
export async function getToolStats(env, days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const stmt = env.DB.prepare(`
    SELECT
      tool_name,
      COUNT(*) as invocations,
      AVG(duration_ms) as avg_duration_ms,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
      SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count
    FROM skill_usage_events
    WHERE timestamp >= ?
    GROUP BY tool_name
    ORDER BY invocations DESC
  `);

  const results = await stmt.bind(since.toISOString()).all();

  return results.results.map(row => ({
    tool_name: row.tool_name,
    invocations: row.invocations,
    avg_duration_ms: Math.round(row.avg_duration_ms || 0),
    success_rate: (row.success_count / row.invocations * 100).toFixed(2),
    error_rate: (row.error_count / row.invocations * 100).toFixed(2),
  }));
}

/**
 * Get retention statistics (DAU/WAU)
 * @param {Object} env - Worker environment with DB binding
 * @param {number} days - Number of days to look back (default: 30)
 * @returns {Promise<Object>} Retention metrics
 */
export async function getRetentionStats(env, days = 30) {
  // Daily Active Users
  const dauStmt = env.DB.prepare(`
    SELECT
      DATE(timestamp) as date,
      COUNT(DISTINCT user_id_hash) as dau
    FROM skill_usage_events
    WHERE timestamp >= datetime('now', '-${days} days')
    GROUP BY DATE(timestamp)
    ORDER BY date DESC
  `);

  // Weekly Active Users (rolling 7-day window)
  const wauStmt = env.DB.prepare(`
    SELECT COUNT(DISTINCT user_id_hash) as wau
    FROM skill_usage_events
    WHERE timestamp >= datetime('now', '-7 days')
  `);

  const [dauResults, wauResult] = await Promise.all([
    dauStmt.all(),
    wauStmt.first()
  ]);

  return {
    daily_active_users: dauResults.results,
    weekly_active_users: wauResult?.wau || 0,
    period: `${days} days`,
  };
}

/**
 * Get recent errors for debugging
 * @param {Object} env - Worker environment with DB binding
 * @param {number} days - Number of days to look back (default: 7)
 * @param {number} limit - Maximum number of errors to return (default: 50)
 * @returns {Promise<Object>} Error log
 */
export async function getRecentErrors(env, days = 7, limit = 50) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const stmt = env.DB.prepare(`
    SELECT
      timestamp,
      tool_name,
      error_type,
      error_message,
      duration_ms
    FROM skill_usage_events
    WHERE status = 'error' AND timestamp >= ?
    ORDER BY timestamp DESC
    LIMIT ?
  `);

  const results = await stmt.bind(since.toISOString(), limit).all();

  return {
    errors: results.results,
    count: results.results.length,
  };
}
