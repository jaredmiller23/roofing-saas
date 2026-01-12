-- Migration: Dashboard Metrics Aggregate Functions
-- Purpose: Replace slow client-side aggregations with efficient database functions
-- Related: Tiered dashboard metrics API optimization

-- =============================================================================
-- get_pipeline_summary
-- Returns pipeline metrics aggregated by status for the dashboard
-- Replaces: Downloading all active projects and aggregating in JavaScript
-- =============================================================================
CREATE OR REPLACE FUNCTION get_pipeline_summary(p_tenant_id UUID)
RETURNS TABLE (
  status TEXT,
  count BIGINT,
  total_value NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.status::TEXT,
    COUNT(*)::BIGINT,
    COALESCE(SUM(
      COALESCE(p.final_value, p.approved_value, p.estimated_value, 0)
    ), 0)::NUMERIC
  FROM projects p
  WHERE p.tenant_id = p_tenant_id
    AND p.is_deleted = false
    AND p.status NOT IN ('won', 'lost')
  GROUP BY p.status
  ORDER BY p.status;
END;
$$;

COMMENT ON FUNCTION get_pipeline_summary(UUID) IS
  'Returns pipeline metrics (count, total value) grouped by status for dashboard display';

GRANT EXECUTE ON FUNCTION get_pipeline_summary(UUID) TO authenticated;


-- =============================================================================
-- get_conversion_counts
-- Returns total and won project counts for conversion rate calculation
-- Replaces: Downloading ALL projects just to count statuses
-- =============================================================================
CREATE OR REPLACE FUNCTION get_conversion_counts(p_tenant_id UUID)
RETURNS TABLE (
  total_projects BIGINT,
  won_projects BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_projects,
    SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END)::BIGINT AS won_projects
  FROM projects
  WHERE tenant_id = p_tenant_id
    AND is_deleted = false;
END;
$$;

COMMENT ON FUNCTION get_conversion_counts(UUID) IS
  'Returns total and won project counts for conversion rate calculation';

GRANT EXECUTE ON FUNCTION get_conversion_counts(UUID) TO authenticated;


-- =============================================================================
-- get_activity_summary
-- Returns activity counts grouped by type for a date range
-- Replaces: Downloading all activities and filtering by type in JavaScript
-- =============================================================================
CREATE OR REPLACE FUNCTION get_activity_summary(
  p_tenant_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ DEFAULT NOW(),
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  activity_type TEXT,
  count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.type::TEXT AS activity_type,
    COUNT(*)::BIGINT
  FROM activities a
  WHERE a.tenant_id = p_tenant_id
    AND a.is_deleted = false
    AND a.created_at >= p_start_date
    AND a.created_at <= p_end_date
    AND (p_user_id IS NULL OR a.created_by = p_user_id)
  GROUP BY a.type
  ORDER BY COUNT(*) DESC;
END;
$$;

COMMENT ON FUNCTION get_activity_summary(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) IS
  'Returns activity counts by type for a date range, optionally filtered by user';

GRANT EXECUTE ON FUNCTION get_activity_summary(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO authenticated;


-- =============================================================================
-- get_revenue_summary
-- Returns revenue totals for current and previous month
-- Optimized single query instead of two separate fetches
-- =============================================================================
CREATE OR REPLACE FUNCTION get_revenue_summary(p_tenant_id UUID)
RETURNS TABLE (
  current_month_revenue NUMERIC,
  previous_month_revenue NUMERIC,
  current_month_count BIGINT,
  previous_month_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_start_of_month TIMESTAMPTZ;
  v_start_of_prev_month TIMESTAMPTZ;
  v_end_of_prev_month TIMESTAMPTZ;
BEGIN
  v_start_of_month := DATE_TRUNC('month', CURRENT_TIMESTAMP);
  v_start_of_prev_month := DATE_TRUNC('month', CURRENT_TIMESTAMP - INTERVAL '1 month');
  v_end_of_prev_month := v_start_of_month - INTERVAL '1 second';

  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE
      WHEN p.updated_at >= v_start_of_month
      THEN COALESCE(p.final_value, p.approved_value, p.estimated_value, 0)
      ELSE 0
    END), 0)::NUMERIC AS current_month_revenue,
    COALESCE(SUM(CASE
      WHEN p.updated_at >= v_start_of_prev_month AND p.updated_at <= v_end_of_prev_month
      THEN COALESCE(p.final_value, p.approved_value, p.estimated_value, 0)
      ELSE 0
    END), 0)::NUMERIC AS previous_month_revenue,
    COUNT(CASE WHEN p.updated_at >= v_start_of_month THEN 1 END)::BIGINT AS current_month_count,
    COUNT(CASE WHEN p.updated_at >= v_start_of_prev_month AND p.updated_at <= v_end_of_prev_month THEN 1 END)::BIGINT AS previous_month_count
  FROM projects p
  WHERE p.tenant_id = p_tenant_id
    AND p.is_deleted = false
    AND p.status = 'won'
    AND p.updated_at >= v_start_of_prev_month;
END;
$$;

COMMENT ON FUNCTION get_revenue_summary(UUID) IS
  'Returns revenue totals for current and previous month in a single query';

GRANT EXECUTE ON FUNCTION get_revenue_summary(UUID) TO authenticated;


-- =============================================================================
-- get_revenue_trend
-- Returns monthly revenue trend for the last N months
-- Replaces: Downloading 6 months of projects and grouping in JavaScript
-- =============================================================================
CREATE OR REPLACE FUNCTION get_revenue_trend(
  p_tenant_id UUID,
  p_months INTEGER DEFAULT 6
)
RETURNS TABLE (
  month_key TEXT,
  month_date DATE,
  revenue NUMERIC,
  deal_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(DATE_TRUNC('month', p.updated_at), 'Mon YYYY') AS month_key,
    DATE_TRUNC('month', p.updated_at)::DATE AS month_date,
    COALESCE(SUM(
      COALESCE(p.final_value, p.approved_value, p.estimated_value, 0)
    ), 0)::NUMERIC AS revenue,
    COUNT(*)::BIGINT AS deal_count
  FROM projects p
  WHERE p.tenant_id = p_tenant_id
    AND p.is_deleted = false
    AND p.status = 'won'
    AND p.updated_at >= DATE_TRUNC('month', CURRENT_DATE) - ((p_months - 1) || ' months')::INTERVAL
  GROUP BY DATE_TRUNC('month', p.updated_at)
  ORDER BY DATE_TRUNC('month', p.updated_at);
END;
$$;

COMMENT ON FUNCTION get_revenue_trend(UUID, INTEGER) IS
  'Returns monthly revenue trend for dashboard charts';

GRANT EXECUTE ON FUNCTION get_revenue_trend(UUID, INTEGER) TO authenticated;


-- =============================================================================
-- Notify PostgREST to reload schema
-- =============================================================================
NOTIFY pgrst, 'reload schema';
