/**
 * Usage Tracking Utilities
 *
 * Provides functions for privacy-preserving usage tracking of MCP tools.
 * Tracks invocations, performance, and errors while hashing user identifiers.
 */

/**
 * Generates a consistent hashed user ID from an identifier string
 * Uses SHA-256 for anonymization while maintaining consistency
 * @param {string} identifier - User identifier (session ID, auth header, or IP+UA)
 * @returns {Promise<string>} 32-character hex hash
 */
export async function hashUserId(identifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(identifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

/**
 * Extract user identifier from request headers
 * Priority: session ID > authorization header > IP + user agent
 * @param {Request} request - The incoming request
 * @returns {string} User identifier
 */
export function extractUserIdentifier(request) {
  return (
    request.headers.get('mcp-session-id') ||
    request.headers.get('authorization') ||
    `${request.headers.get('cf-connecting-ip')}_${request.headers.get('user-agent')}`
  );
}

/**
 * Log usage event to D1 database (async, non-blocking)
 * Fails silently to avoid disrupting tool execution
 * @param {Object} env - Worker environment with DB binding
 * @param {Object} event - Event data (userIdHash, toolName, durationMs, status, etc.)
 */
export async function logUsageEvent(env, event) {
  try {
    const stmt = env.DB.prepare(`
      INSERT INTO skill_usage_events
      (user_id_hash, tool_name, tool_category, duration_ms, status, error_type, error_message, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    await stmt.bind(
      event.userIdHash,
      event.toolName,
      event.toolCategory || 'cms_ontology',
      event.durationMs,
      event.status,
      event.errorType || null,
      event.errorMessage || null,
      event.metadata ? JSON.stringify(event.metadata) : null
    ).run();
  } catch (error) {
    // Fail silently - don't break tool execution due to tracking errors
    console.error('Failed to log usage event:', error);
  }
}

/**
 * Create a tracking context for a request
 * Tracks start time and provides completion helper
 * @param {string} userIdHash - Hashed user identifier
 * @param {string} toolName - Name of the tool being tracked
 * @returns {Object} Tracking context with complete() method
 */
export function createTrackingContext(userIdHash, toolName) {
  return {
    userIdHash,
    toolName,
    startTime: Date.now(),

    complete(status, error = null) {
      return {
        userIdHash: this.userIdHash,
        toolName: this.toolName,
        durationMs: Date.now() - this.startTime,
        status,
        errorType: error?.type || null,
        errorMessage: error?.message || null,
      };
    }
  };
}
