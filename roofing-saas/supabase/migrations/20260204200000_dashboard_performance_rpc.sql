-- Migration: Consolidated Dashboard RPC Function
-- Date: 2026-02-04
-- Purpose: Replace 17+ HTTP round trips with a single database call
-- Impact: Dashboard API response drops from 10-15s to <100ms
-- Rollback: DROP FUNCTION IF EXISTS get_dashboard_all;

CREATE OR REPLACE FUNCTION get_dashboard_all(
  p_tenant_id UUID,
  p_user_id UUID,
  p_scope TEXT DEFAULT 'company',
  p_mode TEXT DEFAULT 'full'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_7_days_ago TIMESTAMPTZ := NOW() - INTERVAL '7 days';
  v_30_days_ago TIMESTAMPTZ := NOW() - INTERVAL '30 days';
  v_start_of_month TIMESTAMPTZ := DATE_TRUNC('month', NOW());
  v_start_of_prev_month TIMESTAMPTZ := DATE_TRUNC('month', NOW() - INTERVAL '1 month');

  -- Result sections
  v_knocks JSONB;
  v_recent_wins JSONB;
  v_pipeline_status JSONB;
  v_pipeline_value NUMERIC;
  v_pipeline_count BIGINT;
  v_conversion JSONB;
  v_revenue JSONB;
  v_revenue_trend JSONB;
  v_activity_trend JSONB;
  v_total_contacts BIGINT;
  v_active_projects BIGINT;
  v_avg_job_value NUMERIC;
  v_avg_sales_cycle NUMERIC;
  v_user_info JSONB;
  v_activity_feed JSONB;
  v_knock_leaderboard JSONB;
  v_sales_leaderboard JSONB;
  v_challenge JSONB;
  v_points JSONB;

  -- Intermediate values
  v_knock_count BIGINT;
  v_total_projects BIGINT;
  v_won_projects BIGINT;
  v_current_revenue NUMERIC;
  v_prev_revenue NUMERIC;
  v_revenue_change NUMERIC;
  v_conversion_rate NUMERIC;
  v_user_knock_count BIGINT;
  v_participant_count BIGINT;
BEGIN

  -- ================================================================
  -- METRICS: Knock count (personal, 7 days)
  -- ================================================================
  SELECT COUNT(*) INTO v_knock_count
  FROM activities
  WHERE tenant_id = p_tenant_id
    AND type = 'door_knock'
    AND created_by = p_user_id
    AND created_at >= v_7_days_ago;

  v_knocks := jsonb_build_object(
    'value', v_knock_count,
    'change', 0,
    'trend', CASE WHEN v_knock_count > 0 THEN 'up' ELSE 'down' END
  );

  -- ================================================================
  -- METRICS: Recent wins (personal, 30 days, limit 5)
  -- ================================================================
  SELECT COALESCE(jsonb_agg(row_to_json(w)::jsonb), '[]'::jsonb)
  INTO v_recent_wins
  FROM (
    SELECT
      id,
      name,
      COALESCE(final_value, approved_value, estimated_value, 0) AS value,
      updated_at AS date
    FROM projects
    WHERE tenant_id = p_tenant_id
      AND is_deleted = false
      AND status = 'won'
      AND created_by = p_user_id
      AND updated_at >= v_30_days_ago
    ORDER BY updated_at DESC
    LIMIT 5
  ) w;

  -- ================================================================
  -- METRICS: Pipeline summary (all non-won/lost projects)
  -- ================================================================
  SELECT
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'status', INITCAP(ps.status),
        'count', ps.cnt,
        'value', ps.total_val
      )
    ), '[]'::jsonb),
    COALESCE(SUM(ps.total_val), 0),
    COALESCE(SUM(ps.cnt), 0)
  INTO v_pipeline_status, v_pipeline_value, v_pipeline_count
  FROM (
    SELECT
      status::TEXT AS status,
      COUNT(*)::BIGINT AS cnt,
      COALESCE(SUM(COALESCE(final_value, approved_value, estimated_value, 0)), 0)::NUMERIC AS total_val
    FROM projects
    WHERE tenant_id = p_tenant_id
      AND is_deleted = false
      AND status NOT IN ('won', 'lost')
    GROUP BY status
    ORDER BY status
  ) ps;

  -- ================================================================
  -- METRICS: Conversion counts
  -- ================================================================
  SELECT COUNT(*), SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END)
  INTO v_total_projects, v_won_projects
  FROM projects
  WHERE tenant_id = p_tenant_id
    AND is_deleted = false;

  v_conversion_rate := CASE
    WHEN v_total_projects > 0
    THEN ROUND((v_won_projects::NUMERIC / v_total_projects * 100)::NUMERIC, 1)
    ELSE 0
  END;

  v_conversion := jsonb_build_object(
    'value', v_conversion_rate,
    'change', 0,
    'trend', CASE WHEN v_conversion_rate > 20 THEN 'up' ELSE 'down' END
  );

  -- ================================================================
  -- METRICS: Revenue summary (current month vs previous month)
  -- ================================================================
  SELECT
    COALESCE(SUM(CASE
      WHEN updated_at >= v_start_of_month
      THEN COALESCE(final_value, approved_value, estimated_value, 0)
      ELSE 0 END), 0),
    COALESCE(SUM(CASE
      WHEN updated_at >= v_start_of_prev_month AND updated_at < v_start_of_month
      THEN COALESCE(final_value, approved_value, estimated_value, 0)
      ELSE 0 END), 0)
  INTO v_current_revenue, v_prev_revenue
  FROM projects
  WHERE tenant_id = p_tenant_id
    AND is_deleted = false
    AND status = 'won'
    AND updated_at >= v_start_of_prev_month;

  v_revenue_change := CASE
    WHEN v_prev_revenue > 0
    THEN ROUND(((v_current_revenue - v_prev_revenue) / v_prev_revenue * 100)::NUMERIC, 0)
    ELSE 0
  END;

  v_revenue := jsonb_build_object(
    'value', v_current_revenue,
    'change', v_revenue_change,
    'trend', CASE WHEN v_revenue_change >= 0 THEN 'up' ELSE 'down' END
  );

  -- ================================================================
  -- METRICS: Revenue trend (6 months)
  -- ================================================================
  SELECT COALESCE(jsonb_agg(row_to_json(rt)::jsonb ORDER BY rt.month_date), '[]'::jsonb)
  INTO v_revenue_trend
  FROM (
    SELECT
      TO_CHAR(DATE_TRUNC('month', updated_at), 'Mon YYYY') AS month,
      DATE_TRUNC('month', updated_at)::DATE AS month_date,
      COALESCE(SUM(COALESCE(final_value, approved_value, estimated_value, 0)), 0)::NUMERIC AS revenue
    FROM projects
    WHERE tenant_id = p_tenant_id
      AND is_deleted = false
      AND status = 'won'
      AND updated_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'
    GROUP BY DATE_TRUNC('month', updated_at)
    ORDER BY DATE_TRUNC('month', updated_at)
  ) rt;

  -- ================================================================
  -- METRICS: Counts
  -- ================================================================
  SELECT COUNT(*) INTO v_total_contacts
  FROM contacts
  WHERE tenant_id = p_tenant_id AND is_deleted = false;

  SELECT COUNT(*) INTO v_active_projects
  FROM projects
  WHERE tenant_id = p_tenant_id
    AND is_deleted = false
    AND status NOT IN ('won', 'lost');

  -- ================================================================
  -- METRICS: Avg job value and avg sales cycle from won projects
  -- ================================================================
  SELECT
    COALESCE(AVG(COALESCE(final_value, approved_value, estimated_value, 0)), 0),
    COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400), 0)
  INTO v_avg_job_value, v_avg_sales_cycle
  FROM (
    SELECT final_value, approved_value, estimated_value, created_at, updated_at
    FROM projects
    WHERE tenant_id = p_tenant_id
      AND is_deleted = false
      AND status = 'won'
    ORDER BY updated_at DESC
    LIMIT 100
  ) won;

  -- ================================================================
  -- METRICS: Activity trend (7 days)
  -- ================================================================
  SELECT COALESCE(jsonb_agg(row_to_json(at_row)::jsonb ORDER BY at_row.day_date), '[]'::jsonb)
  INTO v_activity_trend
  FROM (
    SELECT
      d.day_date,
      TO_CHAR(d.day_date, 'Mon DD') AS date,
      COALESCE(SUM(1) FILTER (WHERE a.id IS NOT NULL), 0)::BIGINT AS count,
      COALESCE(SUM(1) FILTER (WHERE a.type = 'door_knock'), 0)::BIGINT AS "doorKnocks",
      COALESCE(SUM(1) FILTER (WHERE a.type = 'call'), 0)::BIGINT AS calls,
      COALESCE(SUM(1) FILTER (WHERE a.type = 'email'), 0)::BIGINT AS emails
    FROM generate_series(
      (v_now - INTERVAL '6 days')::DATE,
      v_now::DATE,
      '1 day'::INTERVAL
    ) AS d(day_date)
    LEFT JOIN activities a ON
      a.tenant_id = p_tenant_id
      AND a.created_at::DATE = d.day_date::DATE
      AND a.created_at >= v_7_days_ago
    GROUP BY d.day_date
    ORDER BY d.day_date
  ) at_row;

  -- ================================================================
  -- USER INFO MAP (for activity feed and leaderboards)
  -- ================================================================
  SELECT COALESCE(jsonb_object_agg(
    tu.user_id::TEXT,
    jsonb_build_object(
      'name', COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', au.email, 'Unknown'),
      'avatar_url', au.raw_user_meta_data->>'avatar_url'
    )
  ), '{}'::jsonb)
  INTO v_user_info
  FROM tenant_users tu
  JOIN auth.users au ON au.id = tu.user_id
  WHERE tu.tenant_id = p_tenant_id AND tu.status = 'active';

  -- ================================================================
  -- ACTIVITY FEED (recent projects + contacts, last 7 days)
  -- ================================================================
  SELECT COALESCE(jsonb_agg(row_to_json(af)::jsonb ORDER BY af.timestamp DESC), '[]'::jsonb)
  INTO v_activity_feed
  FROM (
    (
      -- Project activities
      SELECT
        'project_' || CASE
          WHEN p.status = 'won' THEN 'won'
          WHEN p.status = 'lost' THEN 'lost'
          ELSE 'created'
        END || '_' || p.id AS id,
        CASE
          WHEN p.status = 'won' THEN 'project_won'
          WHEN p.status = 'lost' THEN 'project_lost'
          ELSE 'project_created'
        END AS type,
        CASE
          WHEN p.status = 'won' THEN 'Deal Won!'
          WHEN p.status = 'lost' THEN 'Deal Lost'
          ELSE 'New Project'
        END AS title,
        CASE
          WHEN p.status = 'won' THEN 'Closed deal with ' || COALESCE(TRIM(c.first_name || ' ' || c.last_name), p.name)
          WHEN p.status = 'lost' THEN COALESCE(TRIM(c.first_name || ' ' || c.last_name), '') || ' - ' || p.name
          ELSE p.name || ' added to pipeline'
        END AS description,
        p.updated_at AS timestamp,
        jsonb_build_object(
          'user', COALESCE((v_user_info->(p.created_by::TEXT))->>'name', 'Team Member'),
          'project_name', p.name,
          'contact_name', COALESCE(TRIM(c.first_name || ' ' || c.last_name), p.name),
          'value', COALESCE(p.final_value, p.approved_value, p.estimated_value, 0)
        ) AS metadata
      FROM projects p
      LEFT JOIN contacts c ON c.id = p.contact_id
      WHERE p.tenant_id = p_tenant_id
        AND p.is_deleted = false
        AND p.updated_at >= v_7_days_ago
        AND (p.status IN ('won', 'lost') OR p.created_at = p.updated_at)
      ORDER BY p.updated_at DESC
      LIMIT 20
    )

    UNION ALL

    (
      -- Contact activities
      SELECT
        'contact_added_' || ct.id AS id,
        'contact_added' AS type,
        'New Contact' AS title,
        TRIM(ct.first_name || ' ' || ct.last_name) || ' added to ' || COALESCE(ct.stage, 'pipeline') AS description,
        ct.created_at AS timestamp,
        jsonb_build_object(
          'user', COALESCE((v_user_info->(ct.created_by::TEXT))->>'name', 'Team Member'),
          'contact_name', TRIM(ct.first_name || ' ' || ct.last_name)
        ) AS metadata
      FROM contacts ct
      WHERE ct.tenant_id = p_tenant_id
        AND ct.is_deleted = false
        AND ct.created_at >= v_7_days_ago
      ORDER BY ct.created_at DESC
      LIMIT 10
    )
  ) af
  LIMIT 15;

  -- ================================================================
  -- KNOCK LEADERBOARD (top 10, weekly)
  -- ================================================================
  SELECT COALESCE(jsonb_agg(row_to_json(kl)::jsonb), '[]'::jsonb)
  INTO v_knock_leaderboard
  FROM (
    SELECT
      ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) AS rank,
      a.created_by AS user_id,
      COALESCE((v_user_info->(a.created_by::TEXT))->>'name', 'Unknown') AS name,
      (v_user_info->(a.created_by::TEXT))->>'avatar_url' AS avatar_url,
      NULL AS role,
      COUNT(*)::BIGINT AS points,
      (COUNT(*) / 100 + 1)::BIGINT AS level,
      (a.created_by = p_user_id) AS "isCurrentUser"
    FROM activities a
    WHERE a.tenant_id = p_tenant_id
      AND a.type = 'door_knock'
      AND a.created_at >= v_7_days_ago
      AND (a.is_deleted IS NULL OR a.is_deleted = false)
    GROUP BY a.created_by
    ORDER BY COUNT(*) DESC
    LIMIT 10
  ) kl;

  -- ================================================================
  -- SALES LEADERBOARD (top 10, weekly)
  -- ================================================================
  SELECT COALESCE(jsonb_agg(row_to_json(sl)::jsonb), '[]'::jsonb)
  INTO v_sales_leaderboard
  FROM (
    SELECT
      ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) AS rank,
      p.created_by AS user_id,
      COALESCE((v_user_info->(p.created_by::TEXT))->>'name', 'Unknown') AS name,
      (v_user_info->(p.created_by::TEXT))->>'avatar_url' AS avatar_url,
      NULL AS role,
      COUNT(*)::BIGINT AS points,
      (COUNT(*) / 100 + 1)::BIGINT AS level,
      (p.created_by = p_user_id) AS "isCurrentUser"
    FROM projects p
    WHERE p.tenant_id = p_tenant_id
      AND p.status = 'won'
      AND p.updated_at >= v_7_days_ago
      AND p.is_deleted = false
    GROUP BY p.created_by
    ORDER BY COUNT(*) DESC
    LIMIT 10
  ) sl;

  -- ================================================================
  -- WEEKLY CHALLENGE (rolling 7-day knock count)
  -- ================================================================
  SELECT
    COALESCE(SUM(CASE WHEN a.created_by = p_user_id THEN 1 ELSE 0 END), 0),
    COUNT(DISTINCT a.created_by)
  INTO v_user_knock_count, v_participant_count
  FROM activities a
  WHERE a.tenant_id = p_tenant_id
    AND a.type = 'door_knock'
    AND a.created_at >= v_7_days_ago
    AND (a.is_deleted IS NULL OR a.is_deleted = false);

  v_challenge := jsonb_build_object(
    'id', 'weekly-knock-challenge',
    'title', 'Weekly Knock Challenge',
    'description', 'Complete 50 door knocks in 7 days to earn the bonus!',
    'startDate', v_7_days_ago,
    'endDate', v_now,
    'target', 50,
    'current', v_user_knock_count,
    'unit', 'knocks',
    'timeRemaining', 'rolling',
    'participants', v_participant_count,
    'reward', '$500 bonus for hitting the target',
    'status', 'active'
  );

  -- ================================================================
  -- USER POINTS (gamification)
  -- ================================================================
  SELECT COALESCE(
    (SELECT jsonb_build_object(
      'user_id', gs.user_id,
      'total_points', COALESCE(gs.total_points, 0),
      'current_level', COALESCE(gs.current_level, 1),
      'daily_points', 0,
      'weekly_points', COALESCE(gs.points_this_week, 0),
      'monthly_points', COALESCE(gs.points_this_month, 0),
      'all_time_best_daily', 0,
      'all_time_best_weekly', 0,
      'all_time_best_monthly', 0
    ) FROM gamification_scores gs
      WHERE gs.user_id = p_user_id
      LIMIT 1
    ),
    jsonb_build_object(
      'user_id', p_user_id,
      'total_points', 0,
      'current_level', 1,
      'daily_points', 0,
      'weekly_points', 0,
      'monthly_points', 0,
      'all_time_best_daily', 0,
      'all_time_best_weekly', 0,
      'all_time_best_monthly', 0
    )
  ) INTO v_points;

  -- ================================================================
  -- RETURN CONSOLIDATED RESULT
  -- ================================================================
  RETURN jsonb_build_object(
    'metrics', jsonb_build_object(
      'knocks', v_knocks,
      'recentWins', v_recent_wins,
      'pipeline', jsonb_build_object(
        'value', v_pipeline_value,
        'change', v_pipeline_count,
        'trend', CASE WHEN v_pipeline_count > 0 THEN 'up' ELSE 'down' END
      ),
      'conversion', v_conversion,
      'pipelineStatus', v_pipeline_status,
      'revenue', v_revenue,
      'revenueTrend', v_revenue_trend,
      'activityTrend', v_activity_trend,
      'totalContacts', v_total_contacts,
      'activeProjects', v_active_projects,
      'avgJobValue', ROUND(v_avg_job_value),
      'avgSalesCycle', ROUND(v_avg_sales_cycle::NUMERIC, 1)
    ),
    'activity', jsonb_build_object(
      'activities', v_activity_feed,
      'count', jsonb_array_length(v_activity_feed)
    ),
    'challenge', v_challenge,
    'knockLeaderboard', jsonb_build_object(
      'period', 'weekly',
      'type', 'knocks',
      'leaderboard', v_knock_leaderboard,
      'currentUserRank', (
        SELECT rank FROM (
          SELECT created_by, ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) AS rank
          FROM activities
          WHERE tenant_id = p_tenant_id AND type = 'door_knock' AND created_at >= v_7_days_ago
            AND (is_deleted IS NULL OR is_deleted = false)
          GROUP BY created_by
        ) ranks WHERE created_by = p_user_id
      )
    ),
    'salesLeaderboard', jsonb_build_object(
      'period', 'weekly',
      'type', 'sales',
      'leaderboard', v_sales_leaderboard,
      'currentUserRank', (
        SELECT rank FROM (
          SELECT created_by, ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) AS rank
          FROM projects
          WHERE tenant_id = p_tenant_id AND status = 'won' AND updated_at >= v_7_days_ago AND is_deleted = false
          GROUP BY created_by
        ) ranks WHERE created_by = p_user_id
      )
    ),
    'points', v_points
  );
END;
$$;

-- Grant execute to authenticated users and service role
GRANT EXECUTE ON FUNCTION get_dashboard_all TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_all TO service_role;

COMMENT ON FUNCTION get_dashboard_all IS 'Consolidated dashboard data in a single call. Replaces 17+ HTTP round trips with 1 database call.';
