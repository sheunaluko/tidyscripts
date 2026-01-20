-- ============================================================================
-- InsightsClient Database Schema for SurrealDB
-- ============================================================================
--
-- This schema defines the insights_events table for tracking application
-- events across Cortex, RAI, and future applications.
--
-- Features:
-- - OTel-compatible structure (spans, traces, attributes)
-- - Event chains (parent_event_id + trace_id)
-- - Flexible payload for app-specific data
-- - Flexible event types (strings, not enums)
-- - Comprehensive indexing for common query patterns
--
-- ============================================================================

-- Define the main events table with schema enforcement
DEFINE TABLE insights_events SCHEMAFULL;

-- ============================================================================
-- Base Fields
-- ============================================================================

-- Event identity
DEFINE FIELD event_id ON insights_events TYPE string
  ASSERT $value != NONE;

DEFINE FIELD event_type ON insights_events TYPE string
  ASSERT $value != NONE;

DEFINE FIELD app_name ON insights_events TYPE string
  ASSERT $value != NONE;

DEFINE FIELD app_version ON insights_events TYPE string
  ASSERT $value != NONE;

-- Context
DEFINE FIELD user_id ON insights_events TYPE string
  ASSERT $value != NONE;

DEFINE FIELD session_id ON insights_events TYPE string
  ASSERT $value != NONE;

DEFINE FIELD timestamp ON insights_events TYPE datetime
  ASSERT $value != NONE;

-- ============================================================================
-- Event Chain Fields (OTel: parent span + trace)
-- ============================================================================

DEFINE FIELD parent_event_id ON insights_events TYPE option<string>;

DEFINE FIELD trace_id ON insights_events TYPE option<string>;

-- ============================================================================
-- Flexible Payload (OTel: attributes)
-- ============================================================================

-- JSON object for app-specific data
DEFINE FIELD payload ON insights_events TYPE object
  ASSERT $value != NONE;

-- ============================================================================
-- Metadata
-- ============================================================================

-- Flexible tags (e.g., ["error", "slow", "retry"])
DEFINE FIELD tags ON insights_events TYPE option<array>;

-- Duration in milliseconds
DEFINE FIELD duration_ms ON insights_events TYPE option<int>;

-- Client information (browser only)
DEFINE FIELD client_info ON insights_events TYPE option<object>;
DEFINE FIELD client_info.user_agent ON insights_events TYPE option<string>;
DEFINE FIELD client_info.viewport_size ON insights_events TYPE option<string>;

-- ============================================================================
-- Indexes for Common Query Patterns
-- ============================================================================

-- Query events by app, user, and time range
DEFINE INDEX idx_app_user_time ON insights_events
  FIELDS app_name, user_id, timestamp;

-- Query events by type and app
DEFINE INDEX idx_event_type ON insights_events
  FIELDS event_type, app_name;

-- Query events by session (chronological)
DEFINE INDEX idx_session ON insights_events
  FIELDS session_id, timestamp;

-- Query event chains by trace_id
DEFINE INDEX idx_trace ON insights_events
  FIELDS trace_id, timestamp;

-- Query events by tags
DEFINE INDEX idx_tags ON insights_events
  FIELDS tags;

-- Quickly find errors
DEFINE INDEX idx_errors ON insights_events
  FIELDS tags WHERE 'error' IN tags;

-- ============================================================================
-- Example Queries
-- ============================================================================

-- View all events for a session:
-- SELECT * FROM insights_events
-- WHERE session_id = 'ses_12345'
-- ORDER BY timestamp;

-- View event chain (trace):
-- SELECT * FROM insights_events
-- WHERE trace_id = 'trc_abc123'
-- ORDER BY timestamp;

-- Error rate by model:
-- SELECT
--   payload.model as model,
--   COUNT(*) as total,
--   array::len(array::filter(tags, |tag| tag = 'error')) as errors
-- FROM insights_events
-- WHERE event_type = 'llm_invocation'
-- GROUP BY payload.model;

-- Slow operations:
-- SELECT event_type, app_name, duration_ms, payload
-- FROM insights_events
-- WHERE duration_ms > 5000
-- ORDER BY duration_ms DESC
-- LIMIT 20;

-- Cross-app insights:
-- SELECT
--   app_name,
--   event_type,
--   COUNT(*) as count,
--   math::mean(duration_ms) as avg_duration
-- FROM insights_events
-- WHERE timestamp > time::now() - 1d
-- GROUP BY app_name, event_type;

-- ============================================================================
-- Notes
-- ============================================================================
--
-- 1. Event IDs are deterministic in the API using:
--    type::thing('insights_events', event_id)
--
-- 2. The payload field is completely flexible - apps can store any JSON data
--
-- 3. Event types are strings, not enums, for maximum flexibility
--
-- 4. Tags are also strings for easy extension
--
-- 5. Timestamps are stored as datetime for proper time-based queries
--
-- 6. All indexes support common analytics queries without full table scans
--
-- ============================================================================
