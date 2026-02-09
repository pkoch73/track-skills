/**
 * Example: Client-Side Skill Integration for Track-Skills
 *
 * This shows how to add tracking to your skills.
 */

import { trackSkillExecution } from '../client/tracking.js';

// ============================================
// BEFORE: Skill without tracking
// ============================================

export async function queryDataOld(params, context) {
  const { apiBaseUrl, apiKey } = context;

  const response = await fetch(`${apiBaseUrl}/api/query`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  const result = await response.json();

  return {
    success: true,
    count: result.length,
    data: result
  };
}

// ============================================
// AFTER: Skill with tracking
// ============================================

// Step 1: Rename your function to *Impl
async function queryDataImpl(params, context) {
  const { apiBaseUrl, apiKey } = context;

  const response = await fetch(`${apiBaseUrl}/api/query`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  const result = await response.json();

  return {
    success: true,
    count: result.length,
    data: result
  };
}

// Step 2: Export wrapped version with tracking
export async function queryData(params, context) {
  return trackSkillExecution('query_data', queryDataImpl, params, context);
}

// ============================================
// WHAT GETS TRACKED
// ============================================

// When queryData() is called, the wrapper automatically logs:
// {
//   tool_name: 'query_data',
//   tool_category: 'default',
//   duration_ms: 125,              // How long it took
//   status: 'success',              // Or 'error' if it failed
//   metadata: {
//     params_keys: ['topic', 'limit'],  // Which params were used
//     result_count: 42                   // Count from result (if available)
//   }
// }

// ============================================
// ADVANCED: Custom Metadata
// ============================================

// You can customize what metadata gets tracked by modifying
// the tracking.js wrapper to extract specific info from
// your params or results.

// Example: Track specific parameters
async function advancedSkillImpl(params, context) {
  // Your skill logic
  return { success: true, items: [/* ... */] };
}

export async function advancedSkill(params, context) {
  // The wrapper in tracking.js will automatically extract:
  // - params_keys: Object.keys(params)
  // - result_count: result.count || result.items?.length
  return trackSkillExecution('advanced_skill', advancedSkillImpl, params, context);
}

// ============================================
// ERROR HANDLING
// ============================================

async function skillWithErrorsImpl(params, context) {
  if (!params.required_field) {
    throw new Error('Missing required field');
  }

  // If this throws, the wrapper will catch it, log the error, and re-throw
  const response = await fetch(`${context.apiBaseUrl}/api/risky`);

  if (!response.ok) {
    throw new Error(`API failed: ${response.statusText}`);
  }

  return await response.json();
}

export async function skillWithErrors(params, context) {
  // Errors are automatically tracked with:
  // {
  //   tool_name: 'skill_with_errors',
  //   duration_ms: 50,
  //   status: 'error',
  //   error_type: 'Error',
  //   error_message: 'Missing required field'
  // }
  //
  // Then the error is re-thrown so your code can handle it normally
  return trackSkillExecution('skill_with_errors', skillWithErrorsImpl, params, context);
}
