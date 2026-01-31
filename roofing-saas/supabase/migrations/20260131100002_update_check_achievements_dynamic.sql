-- Migration: Update check_achievements to read from achievement_configs dynamically
-- Purpose: Replace 6 hardcoded achievements with tenant-configurable achievement definitions
-- Executed on NAS: 2026-01-31
--
-- Changes:
-- 1. Seeded 6 default achievements into achievement_configs for Appalachian Storm tenant
-- 2. Updated check_achievements() to:
--    - Look up user's tenant via tenant_users
--    - Read active achievements from achievement_configs for that tenant
--    - Check against gamification_scores stats (doors_knocked, appointments_set, deals_closed, total_points)
--    - Backwards-compatible with old achievements (checks by name)
--    - Awards bonus points from achievement_configs.points_reward
-- 3. Refreshed PostgREST schema cache

-- Seed default achievements (idempotent)
INSERT INTO achievement_configs (tenant_id, name, description, icon, requirement_type, requirement_value, requirement_config, points_reward, tier, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'First Steps', 'Knock on your first door', '🚪', 'count', 1, '{"metric": "doors_knocked"}', 10, 'bronze', true),
  ('00000000-0000-0000-0000-000000000000', 'Appointment Setter', 'Schedule your first appointment', '📅', 'count', 1, '{"metric": "appointments_set"}', 25, 'bronze', true),
  ('00000000-0000-0000-0000-000000000000', 'Closer', 'Close your first sale', '🎯', 'count', 1, '{"metric": "deals_closed"}', 50, 'silver', true),
  ('00000000-0000-0000-0000-000000000000', 'Door Warrior', 'Knock on 100 doors', '🏆', 'count', 100, '{"metric": "doors_knocked"}', 100, 'gold', true),
  ('00000000-0000-0000-0000-000000000000', 'Team Player', 'Earn 1000 total points', '⭐', 'points', 1000, '{}', 0, 'silver', true),
  ('00000000-0000-0000-0000-000000000000', 'Legend', 'Earn 5000 total points', '🌟', 'points', 5000, '{}', 0, 'platinum', true)
ON CONFLICT DO NOTHING;

-- Updated check_achievements function (dynamic, reads from achievement_configs)
CREATE OR REPLACE FUNCTION public.check_achievements(
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_total_points INTEGER;
  v_doors_knocked INTEGER;
  v_appointments INTEGER;
  v_deals_closed INTEGER;
  v_existing_achievements JSONB;
  v_new_achievements JSONB := '[]'::jsonb;
  v_tenant_id UUID;
  v_achievement RECORD;
  v_metric_value INTEGER;
  v_achievement_id TEXT;
BEGIN
  -- Get user stats
  SELECT
    total_points, doors_knocked, appointments_set, deals_closed,
    COALESCE(achievements, '[]'::jsonb)
  INTO v_total_points, v_doors_knocked, v_appointments, v_deals_closed, v_existing_achievements
  FROM public.gamification_scores
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Get user tenant
  SELECT tenant_id INTO v_tenant_id
  FROM public.tenant_users
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Check each active achievement config
  FOR v_achievement IN
    SELECT id, name, description, icon, requirement_type, requirement_value,
           requirement_config, points_reward, tier
    FROM public.achievement_configs
    WHERE tenant_id = v_tenant_id AND is_active = true
  LOOP
    v_achievement_id := v_achievement.id::text;

    -- Skip if already earned (check by ID)
    IF v_existing_achievements @> jsonb_build_array(jsonb_build_object('id', v_achievement_id)) THEN
      CONTINUE;
    END IF;

    -- Also check by name for backwards compatibility
    DECLARE
      v_has_by_name BOOLEAN := false;
      v_elem JSONB;
    BEGIN
      FOR v_elem IN SELECT * FROM jsonb_array_elements(v_existing_achievements)
      LOOP
        IF v_elem->>'name' = v_achievement.name THEN
          v_has_by_name := true;
          EXIT;
        END IF;
      END LOOP;
      IF v_has_by_name THEN
        CONTINUE;
      END IF;
    END;

    -- Determine metric value
    IF v_achievement.requirement_type = 'points' THEN
      v_metric_value := v_total_points;
    ELSIF v_achievement.requirement_type = 'count' THEN
      CASE v_achievement.requirement_config->>'metric'
        WHEN 'doors_knocked' THEN v_metric_value := v_doors_knocked;
        WHEN 'appointments_set' THEN v_metric_value := v_appointments;
        WHEN 'deals_closed' THEN v_metric_value := v_deals_closed;
        ELSE v_metric_value := 0;
      END CASE;
    ELSE
      v_metric_value := 0;
    END IF;

    -- Check if requirement is met
    IF v_metric_value >= v_achievement.requirement_value THEN
      v_new_achievements := v_new_achievements || jsonb_build_object(
        'id', v_achievement_id,
        'name', v_achievement.name,
        'description', v_achievement.description,
        'icon', v_achievement.icon,
        'tier', v_achievement.tier,
        'earned_at', NOW()
      );

      -- Award bonus points if configured
      IF v_achievement.points_reward > 0 THEN
        v_total_points := v_total_points + v_achievement.points_reward;
      END IF;
    END IF;
  END LOOP;

  -- Update achievements and bonus points
  IF jsonb_array_length(v_new_achievements) > 0 THEN
    UPDATE public.gamification_scores
    SET
      achievements = COALESCE(achievements, '[]'::jsonb) || v_new_achievements,
      total_points = v_total_points,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;

  RETURN v_new_achievements;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
