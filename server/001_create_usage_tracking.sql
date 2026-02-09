-- Migration: 001_create_usage_tracking.sql
-- Create skill_usage_events table for tracking tool usage analytics
-- Run using: wrangler d1 execute content-ontology --file=migrations/001_create_usage_tracking.sql

CREATE TABLE IF NOT EXISTS skill_usage_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- User identification (privacy-preserving)
  user_id_hash TEXT NOT NULL,

  -- Tool identification
  tool_name TEXT NOT NULL,
  tool_category TEXT DEFAULT 'cms_ontology',

  -- Timing metrics
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  duration_ms INTEGER,

  -- Status tracking
  status TEXT NOT NULL CHECK(status IN ('success', 'error', 'timeout')),
  error_type TEXT,
  error_message TEXT,

  -- Request metadata
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,

  -- Context (optional, for debugging)
  metadata TEXT
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_hash ON skill_usage_events(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_tool_name ON skill_usage_events(tool_name);
CREATE INDEX IF NOT EXISTS idx_timestamp ON skill_usage_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_status ON skill_usage_events(status);
CREATE INDEX IF NOT EXISTS idx_tool_timestamp ON skill_usage_events(tool_name, timestamp);
CREATE INDEX IF NOT EXISTS idx_user_timestamp ON skill_usage_events(user_id_hash, timestamp);
