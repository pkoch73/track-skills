/**
 * Example: Cloudflare Worker Integration for Track-Skills
 *
 * This shows how to integrate the tracking system into your Worker.
 */

import { hashUserId } from '../server/tracking-utils.js';
import { getSummary, getToolStats, getRetentionStats, getRecentErrors } from '../analytics/analytics.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Client-side tracking endpoint
    if (url.pathname === '/api/track' && request.method === 'POST') {
      try {
        const event = await request.json();

        // Generate anonymous user hash from IP
        const userIdentifier = request.headers.get('cf-connecting-ip') || 'anonymous';
        const userIdHash = await hashUserId(userIdentifier);

        // Log to D1
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

        return new Response(JSON.stringify({ success: true, message: 'Event tracked' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Analytics endpoints
    if (url.pathname === '/analytics/summary') {
      const days = parseInt(url.searchParams.get('days') || '7');
      const data = await getSummary(env, days);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/analytics/tools') {
      const days = parseInt(url.searchParams.get('days') || '7');
      const data = await getToolStats(env, days);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/analytics/retention') {
      const days = parseInt(url.searchParams.get('days') || '30');
      const data = await getRetentionStats(env, days);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/analytics/errors') {
      const days = parseInt(url.searchParams.get('days') || '7');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const data = await getRecentErrors(env, days, limit);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Your other endpoints here...
    return new Response('Not found', { status: 404 });
  }
};
