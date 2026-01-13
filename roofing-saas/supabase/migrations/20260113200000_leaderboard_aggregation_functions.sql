-- Migration: Leaderboard Aggregation Functions
-- Purpose: Replace slow client-side aggregations in leaderboard and weekly challenge APIs
-- Related: DOPE-DASHBOARD-PERFORMANCE.md Phase 1

-- =============================================================================
-- get_knock_leaderboard
-- Returns knock counts by user for leaderboard display
-- Replaces: Downloading ALL door_knock activities then counting in JavaScript
-- =============================================================================
CREATE OR REPLACE FUNCTION get_knock_leaderboard(
  p_tenant_id UUID,
  p_since TIMESTAMPTZ,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  knock_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.created_by AS user_id,
    COUNT(*)::BIGINT AS knock_count
  FROM activities a
  WHERE a.tenant_id = p_tenant_id
    AND a.type = 'door_knock'
    AND a.created_at >= p_since
    AND (a.is_deleted IS NULL OR a.is_deleted = false)
  GROUP BY a.created_by
  ORDER BY knock_count DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_knock_leaderboard(UUID, TIMESTAMPTZ, INT) IS
  'Returns knock counts by user for leaderboard. Replaces downloading all activities and counting in JS.';

GRANT EXECUTE ON FUNCTION get_knock_leaderboard(UUID, TIMESTAMPTZ, INT) TO authenticated;


-- =============================================================================
-- get_sales_leaderboard
-- Returns won project counts by user for leaderboard display
-- Replaces: Downloading ALL won projects then counting in JavaScript
-- =============================================================================
CREATE OR REPLACE FUNCTION get_sales_leaderboard(
  p_tenant_id UUID,
  p_since TIMESTAMPTZ,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  sales_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.created_by AS user_id,
    COUNT(*)::BIGINT AS sales_count
  FROM projects p
  WHERE p.tenant_id = p_tenant_id
    AND p.status = 'won'
    AND p.updated_at >= p_since
    AND p.is_deleted = false
  GROUP BY p.created_by
  ORDER BY sales_count DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_sales_leaderboard(UUID, TIMESTAMPTZ, INT) IS
  'Returns won project counts by user for leaderboard. Replaces downloading all won projects and counting in JS.';

GRANT EXECUTE ON FUNCTION get_sales_leaderboard(UUID, TIMESTAMPTZ, INT) TO authenticated;


-- =============================================================================
-- get_weekly_challenge_stats
-- Returns user's knock count and total participant count for weekly challenge widget
-- Replaces: Two separate queries downloading ALL activities to count
-- =============================================================================
CREATE OR REPLACE FUNCTION get_weekly_challenge_stats(
  p_tenant_id UUID,
  p_user_id UUID,
  p_since TIMESTAMPTZ
)
RETURNS TABLE (
  user_knock_count BIGINT,
  participant_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN a.created_by = p_user_id THEN 1 ELSE 0 END), 0)::BIGINT AS user_knock_count,
    COUNT(DISTINCT a.created_by)::BIGINT AS participant_count
  FROM activities a
  WHERE a.tenant_id = p_tenant_id
    AND a.type = 'door_knock'
    AND a.created_at >= p_since
    AND (a.is_deleted IS NULL OR a.is_deleted = false);
END;
$$;

COMMENT ON FUNCTION get_weekly_challenge_stats(UUID, UUID, TIMESTAMPTZ) IS
  'Returns user knock count and participant count for weekly challenge widget in a single query.';

GRANT EXECUTE ON FUNCTION get_weekly_challenge_stats(UUID, UUID, TIMESTAMPTZ) TO authenticated;


-- =============================================================================
-- get_user_knock_rank
-- Returns the current user's rank in the knock leaderboard
-- Useful for showing "You are #X" without downloading full leaderboard
-- =============================================================================
CREATE OR REPLACE FUNCTION get_user_knock_rank(
  p_tenant_id UUID,
  p_user_id UUID,
  p_since TIMESTAMPTZ
)
RETURNS TABLE (
  user_knock_count BIGINT,
  user_rank BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_user_count BIGINT;
BEGIN
  -- First get the user's knock count
  SELECT COUNT(*)::BIGINT INTO v_user_count
  FROM activities a
  WHERE a.tenant_id = p_tenant_id
    AND a.type = 'door_knock'
    AND a.created_by = p_user_id
    AND a.created_at >= p_since
    AND (a.is_deleted IS NULL OR a.is_deleted = false);

  -- Then count how many users have more knocks (rank = that count + 1)
  RETURN QUERY
  SELECT
    v_user_count AS user_knock_count,
    (
      SELECT COUNT(DISTINCT created_by) + 1
      FROM (
        SELECT created_by, COUNT(*) as cnt
        FROM activities
        WHERE tenant_id = p_tenant_id
          AND type = 'door_knock'
          AND created_at >= p_since
          AND (is_deleted IS NULL OR is_deleted = false)
        GROUP BY created_by
        HAVING COUNT(*) > v_user_count
      ) ranked_users
    )::BIGINT AS user_rank;
END;
$$;

COMMENT ON FUNCTION get_user_knock_rank(UUID, UUID, TIMESTAMPTZ) IS
  'Returns user knock count and rank without downloading full leaderboard data.';

GRANT EXECUTE ON FUNCTION get_user_knock_rank(UUID, UUID, TIMESTAMPTZ) TO authenticated;


-- =============================================================================
-- Performance Index for door_knock activities
-- Optimizes the common query pattern: tenant + type + date range
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_activities_tenant_type_created
  ON activities(tenant_id, type, created_at DESC)
  WHERE is_deleted = false OR is_deleted IS NULL;


-- =============================================================================
-- Notify PostgREST to reload schema
-- =============================================================================
NOTIFY pgrst, 'reload schema';
