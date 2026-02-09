/**
 * Client-Side Skill Tracking
 *
 * Logs skill usage metrics directly from skill execution.
 * Sends tracking data to the analytics API.
 */

/**
 * Log skill usage event
 * @param {Object} context - Skill context with apiBaseUrl and apiKey
 * @param {Object} event - Event data
 */
export async function logSkillEvent(context, event) {
  try {
    const { apiBaseUrl, apiKey } = context;

    // Send to tracking endpoint
    await fetch(`${apiBaseUrl}/api/track`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tool_name: event.skillName,
        tool_category: event.category || 'cms_ontology',
        duration_ms: event.duration,
        status: event.status,
        error_type: event.errorType || null,
        error_message: event.errorMessage || null,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null
      })
    });
  } catch (error) {
    // Fail silently - don't break skill execution
    console.error('[TRACKING]', error.message);
  }
}

/**
 * Wrap skill execution with tracking
 * @param {string} skillName - Name of the skill
 * @param {Function} skillFn - Skill function to execute
 * @param {Object} params - Skill parameters
 * @param {Object} context - Skill context
 */
export async function trackSkillExecution(skillName, skillFn, params, context) {
  const startTime = Date.now();

  try {
    const result = await skillFn(params, context);

    // Log success with metadata about what was done
    await logSkillEvent(context, {
      skillName,
      duration: Date.now() - startTime,
      status: 'success',
      metadata: {
        params_keys: Object.keys(params),
        result_count: result.count || result.pages?.length || null
      }
    });

    return result;
  } catch (error) {
    // Log error
    await logSkillEvent(context, {
      skillName,
      duration: Date.now() - startTime,
      status: 'error',
      errorType: error.name,
      errorMessage: error.message
    });

    throw error;
  }
}
