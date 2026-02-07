-- Migration: Materialized Views for Dashboard Aggregates
-- Date: 2026-02-07
-- Purpose: Pre-compute expensive dashboard aggregations to prepare for scale
-- Impact: Dashboard queries can use materialized views instead of live aggregation
-- Rollback: See rollback section at end of file

-- =============================================================================
-- 1. Tenant Project Summary (pipeline counts and values by status)
-- =============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_tenant_project_summary AS
SELECT
  p.tenant_id,
  -- Overall metrics
  COUNT(*) FILTER (WHERE p.status NOT IN ('won', 'lost') AND p.is_deleted = false) AS active_projects,
  COUNT(*) FILTER (WHERE p.status = 'won' AND p.is_deleted = false) AS won_projects,
  COUNT(*) FILTER (WHERE p.status = 'lost' AND p.is_deleted = false) AS lost_projects,
  COUNT(*) FILTER (WHERE p.is_deleted = false) AS total_projects,

  -- Pipeline value (active projects only)
  COALESCE(SUM(COALESCE(p.final_value, p.approved_value, p.estimated_value, 0))
    FILTER (WHERE p.status NOT IN ('won', 'lost') AND p.is_deleted = false), 0) AS pipeline_value,

  -- Revenue (won projects)
  COALESCE(SUM(COALESCE(p.final_value, p.approved_value, p.estimated_value, 0))
    FILTER (WHERE p.status = 'won' AND p.is_deleted = false), 0) AS total_revenue,

  -- Current month revenue
  COALESCE(SUM(COALESCE(p.final_value, p.approved_value, p.estimated_value, 0))
    FILTER (WHERE p.status = 'won'
      AND p.is_deleted = false
      AND p.updated_at >= DATE_TRUNC('month', CURRENT_DATE)), 0) AS current_month_revenue,

  -- Previous month revenue
  COALESCE(SUM(COALESCE(p.final_value, p.approved_value, p.estimated_value, 0))
    FILTER (WHERE p.status = 'won'
      AND p.is_deleted = false
      AND p.updated_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
      AND p.updated_at < DATE_TRUNC('month', CURRENT_DATE)), 0) AS previous_month_revenue,

  -- Average job value (won projects)
  COALESCE(AVG(COALESCE(p.final_value, p.approved_value, p.estimated_value, 0))
    FILTER (WHERE p.status = 'won' AND p.is_deleted = false), 0) AS avg_job_value,

  -- Average sales cycle (days from created to won)
  COALESCE(AVG(EXTRACT(EPOCH FROM (p.updated_at - p.created_at)) / 86400)
    FILTER (WHERE p.status = 'won' AND p.is_deleted = false), 0) AS avg_sales_cycle_days,

  -- Conversion rate (%)
  CASE
    WHEN COUNT(*) FILTER (WHERE p.is_deleted = false) > 0
    THEN ROUND((COUNT(*) FILTER (WHERE p.status = 'won' AND p.is_deleted = false)::NUMERIC
      / COUNT(*) FILTER (WHERE p.is_deleted = false)::NUMERIC * 100), 1)
    ELSE 0
  END AS conversion_rate_percent,

  -- Last refresh timestamp
  NOW() AS refreshed_at
FROM projects p
WHERE p.tenant_id IS NOT NULL
GROUP BY p.tenant_id;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS mv_tenant_project_summary_tenant_idx
  ON mv_tenant_project_summary (tenant_id);

COMMENT ON MATERIALIZED VIEW mv_tenant_project_summary IS
  'Per-tenant project summary: counts, pipeline value, revenue, conversion rate. Refreshed via refresh_materialized_views().';

-- =============================================================================
-- 2. Tenant Project Summary by Status (detailed pipeline breakdown)
-- =============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_tenant_pipeline_by_status AS
SELECT
  p.tenant_id,
  p.status,
  COUNT(*) AS project_count,
  COALESCE(SUM(COALESCE(p.final_value, p.approved_value, p.estimated_value, 0)), 0) AS total_value,
  COALESCE(AVG(COALESCE(p.final_value, p.approved_value, p.estimated_value, 0)), 0) AS avg_value,
  NOW() AS refreshed_at
FROM projects p
WHERE p.is_deleted = false
  AND p.status NOT IN ('won', 'lost')
  AND p.tenant_id IS NOT NULL
GROUP BY p.tenant_id, p.status;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS mv_tenant_pipeline_by_status_idx
  ON mv_tenant_pipeline_by_status (tenant_id, status);

COMMENT ON MATERIALIZED VIEW mv_tenant_pipeline_by_status IS
  'Per-tenant pipeline breakdown by status (excludes won/lost). Refreshed via refresh_materialized_views().';

-- =============================================================================
-- 3. Tenant Activity Summary (activity counts by type and period)
-- =============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_tenant_activity_summary AS
SELECT
  a.tenant_id,

  -- Total activity counts
  COUNT(*) AS total_activities,
  COUNT(*) FILTER (WHERE a.type = 'door_knock') AS total_knocks,
  COUNT(*) FILTER (WHERE a.type = 'call') AS total_calls,
  COUNT(*) FILTER (WHERE a.type = 'email') AS total_emails,
  COUNT(*) FILTER (WHERE a.type = 'meeting') AS total_meetings,

  -- Last 7 days
  COUNT(*) FILTER (WHERE a.created_at >= CURRENT_DATE - INTERVAL '7 days') AS activities_7d,
  COUNT(*) FILTER (WHERE a.type = 'door_knock' AND a.created_at >= CURRENT_DATE - INTERVAL '7 days') AS knocks_7d,
  COUNT(*) FILTER (WHERE a.type = 'call' AND a.created_at >= CURRENT_DATE - INTERVAL '7 days') AS calls_7d,
  COUNT(*) FILTER (WHERE a.type = 'email' AND a.created_at >= CURRENT_DATE - INTERVAL '7 days') AS emails_7d,

  -- Last 30 days
  COUNT(*) FILTER (WHERE a.created_at >= CURRENT_DATE - INTERVAL '30 days') AS activities_30d,
  COUNT(*) FILTER (WHERE a.type = 'door_knock' AND a.created_at >= CURRENT_DATE - INTERVAL '30 days') AS knocks_30d,
  COUNT(*) FILTER (WHERE a.type = 'call' AND a.created_at >= CURRENT_DATE - INTERVAL '30 days') AS calls_30d,
  COUNT(*) FILTER (WHERE a.type = 'email' AND a.created_at >= CURRENT_DATE - INTERVAL '30 days') AS emails_30d,

  -- Current month
  COUNT(*) FILTER (WHERE a.created_at >= DATE_TRUNC('month', CURRENT_DATE)) AS activities_current_month,

  -- Unique active users (7 days)
  COUNT(DISTINCT a.created_by) FILTER (WHERE a.created_at >= CURRENT_DATE - INTERVAL '7 days') AS active_users_7d,

  NOW() AS refreshed_at
FROM activities a
WHERE a.tenant_id IS NOT NULL
  AND (a.is_deleted IS NULL OR a.is_deleted = false)
GROUP BY a.tenant_id;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS mv_tenant_activity_summary_tenant_idx
  ON mv_tenant_activity_summary (tenant_id);

COMMENT ON MATERIALIZED VIEW mv_tenant_activity_summary IS
  'Per-tenant activity summary: counts by type and time period. Refreshed via refresh_materialized_views().';

-- =============================================================================
-- 4. Tenant Contact Summary
-- =============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_tenant_contact_summary AS
SELECT
  c.tenant_id,

  -- Total counts
  COUNT(*) FILTER (WHERE c.is_deleted = false) AS total_contacts,

  -- By stage
  COUNT(*) FILTER (WHERE c.is_deleted = false AND c.stage = 'lead') AS leads,
  COUNT(*) FILTER (WHERE c.is_deleted = false AND c.stage = 'prospect') AS prospects,
  COUNT(*) FILTER (WHERE c.is_deleted = false AND c.stage = 'customer') AS customers,

  -- Time-based
  COUNT(*) FILTER (WHERE c.is_deleted = false AND c.created_at >= CURRENT_DATE - INTERVAL '7 days') AS new_contacts_7d,
  COUNT(*) FILTER (WHERE c.is_deleted = false AND c.created_at >= CURRENT_DATE - INTERVAL '30 days') AS new_contacts_30d,
  COUNT(*) FILTER (WHERE c.is_deleted = false AND c.created_at >= DATE_TRUNC('month', CURRENT_DATE)) AS new_contacts_current_month,

  NOW() AS refreshed_at
FROM contacts c
WHERE c.tenant_id IS NOT NULL
GROUP BY c.tenant_id;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS mv_tenant_contact_summary_tenant_idx
  ON mv_tenant_contact_summary (tenant_id);

COMMENT ON MATERIALIZED VIEW mv_tenant_contact_summary IS
  'Per-tenant contact summary: counts by stage and time period. Refreshed via refresh_materialized_views().';

-- =============================================================================
-- 5. Tenant Revenue Trend by Month (for charts)
-- =============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_tenant_revenue_by_month AS
SELECT
  p.tenant_id,
  DATE_TRUNC('month', p.updated_at)::DATE AS month_date,
  TO_CHAR(DATE_TRUNC('month', p.updated_at), 'Mon YYYY') AS month_label,
  COUNT(*) AS projects_won,
  COALESCE(SUM(COALESCE(p.final_value, p.approved_value, p.estimated_value, 0)), 0) AS revenue,
  NOW() AS refreshed_at
FROM projects p
WHERE p.tenant_id IS NOT NULL
  AND p.is_deleted = false
  AND p.status = 'won'
  AND p.updated_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months')
GROUP BY p.tenant_id, DATE_TRUNC('month', p.updated_at);

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS mv_tenant_revenue_by_month_idx
  ON mv_tenant_revenue_by_month (tenant_id, month_date);

COMMENT ON MATERIALIZED VIEW mv_tenant_revenue_by_month IS
  'Per-tenant monthly revenue trend (last 12 months). Refreshed via refresh_materialized_views().';

-- =============================================================================
-- 6. User Activity Summary (for leaderboards)
-- =============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_activity_summary AS
SELECT
  a.tenant_id,
  a.created_by AS user_id,

  -- All-time counts
  COUNT(*) AS total_activities,
  COUNT(*) FILTER (WHERE a.type = 'door_knock') AS total_knocks,

  -- Last 7 days (for weekly leaderboards)
  COUNT(*) FILTER (WHERE a.created_at >= CURRENT_DATE - INTERVAL '7 days') AS activities_7d,
  COUNT(*) FILTER (WHERE a.type = 'door_knock' AND a.created_at >= CURRENT_DATE - INTERVAL '7 days') AS knocks_7d,

  -- Last 30 days
  COUNT(*) FILTER (WHERE a.created_at >= CURRENT_DATE - INTERVAL '30 days') AS activities_30d,
  COUNT(*) FILTER (WHERE a.type = 'door_knock' AND a.created_at >= CURRENT_DATE - INTERVAL '30 days') AS knocks_30d,

  NOW() AS refreshed_at
FROM activities a
WHERE a.tenant_id IS NOT NULL
  AND a.created_by IS NOT NULL
  AND (a.is_deleted IS NULL OR a.is_deleted = false)
GROUP BY a.tenant_id, a.created_by;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS mv_user_activity_summary_idx
  ON mv_user_activity_summary (tenant_id, user_id);

COMMENT ON MATERIALIZED VIEW mv_user_activity_summary IS
  'Per-user activity summary for leaderboards. Refreshed via refresh_materialized_views().';

-- =============================================================================
-- 7. User Sales Summary (for sales leaderboards)
-- =============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_sales_summary AS
SELECT
  p.tenant_id,
  p.created_by AS user_id,

  -- All-time
  COUNT(*) FILTER (WHERE p.status = 'won') AS total_deals_won,
  COALESCE(SUM(COALESCE(p.final_value, p.approved_value, p.estimated_value, 0))
    FILTER (WHERE p.status = 'won'), 0) AS total_revenue,

  -- Last 7 days (for weekly leaderboards)
  COUNT(*) FILTER (WHERE p.status = 'won' AND p.updated_at >= CURRENT_DATE - INTERVAL '7 days') AS deals_won_7d,
  COALESCE(SUM(COALESCE(p.final_value, p.approved_value, p.estimated_value, 0))
    FILTER (WHERE p.status = 'won' AND p.updated_at >= CURRENT_DATE - INTERVAL '7 days'), 0) AS revenue_7d,

  -- Last 30 days
  COUNT(*) FILTER (WHERE p.status = 'won' AND p.updated_at >= CURRENT_DATE - INTERVAL '30 days') AS deals_won_30d,
  COALESCE(SUM(COALESCE(p.final_value, p.approved_value, p.estimated_value, 0))
    FILTER (WHERE p.status = 'won' AND p.updated_at >= CURRENT_DATE - INTERVAL '30 days'), 0) AS revenue_30d,

  NOW() AS refreshed_at
FROM projects p
WHERE p.tenant_id IS NOT NULL
  AND p.created_by IS NOT NULL
  AND p.is_deleted = false
GROUP BY p.tenant_id, p.created_by;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS mv_user_sales_summary_idx
  ON mv_user_sales_summary (tenant_id, user_id);

COMMENT ON MATERIALIZED VIEW mv_user_sales_summary IS
  'Per-user sales summary for leaderboards. Refreshed via refresh_materialized_views().';

-- =============================================================================
-- Refresh Function
-- =============================================================================

CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS TABLE (
  view_name TEXT,
  status TEXT,
  duration_ms INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start TIMESTAMPTZ;
  v_duration INTEGER;
BEGIN
  -- Refresh all dashboard materialized views concurrently (non-blocking)
  -- Using CONCURRENTLY requires unique indexes (created above)

  -- 1. Tenant project summary
  v_start := clock_timestamp();
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tenant_project_summary;
    v_duration := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INTEGER;
    view_name := 'mv_tenant_project_summary';
    status := 'success';
    duration_ms := v_duration;
    RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    v_duration := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INTEGER;
    view_name := 'mv_tenant_project_summary';
    status := 'error: ' || SQLERRM;
    duration_ms := v_duration;
    RETURN NEXT;
  END;

  -- 2. Pipeline by status
  v_start := clock_timestamp();
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tenant_pipeline_by_status;
    v_duration := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INTEGER;
    view_name := 'mv_tenant_pipeline_by_status';
    status := 'success';
    duration_ms := v_duration;
    RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    v_duration := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INTEGER;
    view_name := 'mv_tenant_pipeline_by_status';
    status := 'error: ' || SQLERRM;
    duration_ms := v_duration;
    RETURN NEXT;
  END;

  -- 3. Activity summary
  v_start := clock_timestamp();
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tenant_activity_summary;
    v_duration := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INTEGER;
    view_name := 'mv_tenant_activity_summary';
    status := 'success';
    duration_ms := v_duration;
    RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    v_duration := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INTEGER;
    view_name := 'mv_tenant_activity_summary';
    status := 'error: ' || SQLERRM;
    duration_ms := v_duration;
    RETURN NEXT;
  END;

  -- 4. Contact summary
  v_start := clock_timestamp();
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tenant_contact_summary;
    v_duration := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INTEGER;
    view_name := 'mv_tenant_contact_summary';
    status := 'success';
    duration_ms := v_duration;
    RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    v_duration := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INTEGER;
    view_name := 'mv_tenant_contact_summary';
    status := 'error: ' || SQLERRM;
    duration_ms := v_duration;
    RETURN NEXT;
  END;

  -- 5. Revenue by month
  v_start := clock_timestamp();
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tenant_revenue_by_month;
    v_duration := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INTEGER;
    view_name := 'mv_tenant_revenue_by_month';
    status := 'success';
    duration_ms := v_duration;
    RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    v_duration := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INTEGER;
    view_name := 'mv_tenant_revenue_by_month';
    status := 'error: ' || SQLERRM;
    duration_ms := v_duration;
    RETURN NEXT;
  END;

  -- 6. User activity summary
  v_start := clock_timestamp();
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_activity_summary;
    v_duration := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INTEGER;
    view_name := 'mv_user_activity_summary';
    status := 'success';
    duration_ms := v_duration;
    RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    v_duration := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INTEGER;
    view_name := 'mv_user_activity_summary';
    status := 'error: ' || SQLERRM;
    duration_ms := v_duration;
    RETURN NEXT;
  END;

  -- 7. User sales summary
  v_start := clock_timestamp();
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_sales_summary;
    v_duration := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INTEGER;
    view_name := 'mv_user_sales_summary';
    status := 'success';
    duration_ms := v_duration;
    RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    v_duration := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INTEGER;
    view_name := 'mv_user_sales_summary';
    status := 'error: ' || SQLERRM;
    duration_ms := v_duration;
    RETURN NEXT;
  END;

  RETURN;
END;
$$;

COMMENT ON FUNCTION refresh_materialized_views() IS
  'Refresh all dashboard materialized views concurrently. Returns status and duration for each view. Call via: SELECT * FROM refresh_materialized_views();';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION refresh_materialized_views() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_materialized_views() TO service_role;

-- Grant select permissions on materialized views to authenticated users
-- (RLS is not enforced on materialized views, but the views are already filtered by tenant_id)
GRANT SELECT ON mv_tenant_project_summary TO authenticated;
GRANT SELECT ON mv_tenant_pipeline_by_status TO authenticated;
GRANT SELECT ON mv_tenant_activity_summary TO authenticated;
GRANT SELECT ON mv_tenant_contact_summary TO authenticated;
GRANT SELECT ON mv_tenant_revenue_by_month TO authenticated;
GRANT SELECT ON mv_user_activity_summary TO authenticated;
GRANT SELECT ON mv_user_sales_summary TO authenticated;

-- =============================================================================
-- Initial population
-- =============================================================================
-- Populate views on first run (non-concurrent for initial creation)
REFRESH MATERIALIZED VIEW mv_tenant_project_summary;
REFRESH MATERIALIZED VIEW mv_tenant_pipeline_by_status;
REFRESH MATERIALIZED VIEW mv_tenant_activity_summary;
REFRESH MATERIALIZED VIEW mv_tenant_contact_summary;
REFRESH MATERIALIZED VIEW mv_tenant_revenue_by_month;
REFRESH MATERIALIZED VIEW mv_user_activity_summary;
REFRESH MATERIALIZED VIEW mv_user_sales_summary;

-- =============================================================================
-- Rollback
-- =============================================================================
-- To rollback this migration:
--
-- DROP FUNCTION IF EXISTS refresh_materialized_views();
-- DROP MATERIALIZED VIEW IF EXISTS mv_user_sales_summary;
-- DROP MATERIALIZED VIEW IF EXISTS mv_user_activity_summary;
-- DROP MATERIALIZED VIEW IF EXISTS mv_tenant_revenue_by_month;
-- DROP MATERIALIZED VIEW IF EXISTS mv_tenant_contact_summary;
-- DROP MATERIALIZED VIEW IF EXISTS mv_tenant_activity_summary;
-- DROP MATERIALIZED VIEW IF EXISTS mv_tenant_pipeline_by_status;
-- DROP MATERIALIZED VIEW IF EXISTS mv_tenant_project_summary;
