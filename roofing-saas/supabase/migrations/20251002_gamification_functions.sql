-- =====================================================
-- GAMIFICATION FUNCTIONS
-- Date: 2025-10-02
-- Create database functions for points tracking
-- =====================================================

-- Function to award points to a user
-- Works with existing gamification_scores table
CREATE OR REPLACE FUNCTION public.award_points(
  p_user_id UUID,
  p_points INTEGER,
  p_reason TEXT,
  p_activity_id UUID DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_tenant_id UUID;
  v_current_points INTEGER;
  v_current_level INTEGER;
BEGIN
  -- Get user's tenant_id
  SELECT tenant_id INTO v_tenant_id
  FROM public.tenant_users
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User % not found in any tenant', p_user_id;
  END IF;

  -- Insert or update gamification_scores
  INSERT INTO public.gamification_scores (
    tenant_id, user_id, total_points, current_level, updated_at
  ) VALUES (
    v_tenant_id, p_user_id, p_points, 1, NOW()
  )
  ON CONFLICT (tenant_id, user_id)
  DO UPDATE SET
    total_points = gamification_scores.total_points + p_points,
    current_level = FLOOR((gamification_scores.total_points + p_points) / 100) + 1,
    updated_at = NOW();

  -- Log the activity
  INSERT INTO public.gamification_activities (
    tenant_id, user_id, activity_type, points_earned, entity_id, details
  ) VALUES (
    v_tenant_id, p_user_id, p_reason, p_points, p_activity_id,
    jsonb_build_object('reason', p_reason, 'awarded_at', NOW())
  );

  -- Update weekly points (reset on Monday)
  UPDATE public.gamification_scores
  SET
    points_this_week = CASE
      WHEN EXTRACT(DOW FROM last_activity_date) > EXTRACT(DOW FROM CURRENT_DATE)
        OR (last_activity_date IS NULL OR last_activity_date < CURRENT_DATE - INTERVAL '7 days')
      THEN p_points
      ELSE COALESCE(points_this_week, 0) + p_points
    END,
    points_this_month = CASE
      WHEN EXTRACT(MONTH FROM last_activity_date) <> EXTRACT(MONTH FROM CURRENT_DATE)
        OR last_activity_date IS NULL
      THEN p_points
      ELSE COALESCE(points_this_month, 0) + p_points
    END,
    last_activity_date = CURRENT_DATE
  WHERE user_id = p_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for new achievements
-- Returns array of newly earned achievements
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
BEGIN
  -- Get user stats
  SELECT
    total_points,
    doors_knocked,
    appointments_set,
    deals_closed,
    COALESCE(achievements, '[]'::jsonb)
  INTO
    v_total_points,
    v_doors_knocked,
    v_appointments,
    v_deals_closed,
    v_existing_achievements
  FROM public.gamification_scores
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Check achievements and add new ones
  -- First Steps: 1+ doors knocked
  IF v_doors_knocked >= 1 AND NOT v_existing_achievements ? 'first_steps' THEN
    v_new_achievements := v_new_achievements || jsonb_build_object(
      'id', 'first_steps',
      'name', 'First Steps',
      'description', 'Knock on your first door',
      'icon', '🚪',
      'earned_at', NOW()
    );
  END IF;

  -- Appointment Setter: 1+ appointments
  IF v_appointments >= 1 AND NOT v_existing_achievements ? 'appointment_setter' THEN
    v_new_achievements := v_new_achievements || jsonb_build_object(
      'id', 'appointment_setter',
      'name', 'Appointment Setter',
      'description', 'Schedule your first appointment',
      'icon', '📅',
      'earned_at', NOW()
    );
  END IF;

  -- Closer: 1+ deals closed
  IF v_deals_closed >= 1 AND NOT v_existing_achievements ? 'closer' THEN
    v_new_achievements := v_new_achievements || jsonb_build_object(
      'id', 'closer',
      'name', 'Closer',
      'description', 'Close your first sale',
      'icon', '🎯',
      'earned_at', NOW()
    );
  END IF;

  -- Door Warrior: 100+ doors
  IF v_doors_knocked >= 100 AND NOT v_existing_achievements ? 'door_warrior' THEN
    v_new_achievements := v_new_achievements || jsonb_build_object(
      'id', 'door_warrior',
      'name', 'Door Warrior',
      'description', 'Knock on 100 doors',
      'icon', '🏆',
      'earned_at', NOW()
    );
  END IF;

  -- Team Player: 1000+ points
  IF v_total_points >= 1000 AND NOT v_existing_achievements ? 'team_player' THEN
    v_new_achievements := v_new_achievements || jsonb_build_object(
      'id', 'team_player',
      'name', 'Team Player',
      'description', 'Earn 1000 total points',
      'icon', '⭐',
      'earned_at', NOW()
    );
  END IF;

  -- Legend: 5000+ points
  IF v_total_points >= 5000 AND NOT v_existing_achievements ? 'legend' THEN
    v_new_achievements := v_new_achievements || jsonb_build_object(
      'id', 'legend',
      'name', 'Legend',
      'description', 'Earn 5000 total points',
      'icon', '🌟',
      'earned_at', NOW()
    );
  END IF;

  -- Update achievements if any new ones earned
  IF jsonb_array_length(v_new_achievements) > 0 THEN
    UPDATE public.gamification_scores
    SET
      achievements = COALESCE(achievements, '[]'::jsonb) || v_new_achievements,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;

  RETURN v_new_achievements;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining functions
COMMENT ON FUNCTION public.award_points IS
'Awards points to a user and logs the activity. Automatically updates weekly/monthly points.';

COMMENT ON FUNCTION public.check_achievements IS
'Checks if user has earned any new achievements based on current stats. Returns array of newly earned achievements.';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '=== Gamification Functions Created ===';
  RAISE NOTICE 'Created award_points(user_id, points, reason, activity_id)';
  RAISE NOTICE 'Created check_achievements(user_id)';
  RAISE NOTICE 'Functions work with existing gamification_scores and gamification_activities tables';
END $$;
