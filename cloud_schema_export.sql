


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."lead_priority" AS ENUM (
    'urgent',
    'high',
    'normal',
    'low'
);


ALTER TYPE "public"."lead_priority" OWNER TO "postgres";


CREATE TYPE "public"."pipeline_stage" AS ENUM (
    'prospect',
    'qualified',
    'quote_sent',
    'negotiation',
    'won',
    'production',
    'complete',
    'lost'
);


ALTER TYPE "public"."pipeline_stage" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."award_activity_points"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_points INTEGER;
  v_user_id UUID;
  v_tenant_id UUID;
BEGIN
  -- Get user and tenant from the activity
  v_user_id := NEW.created_by;
  v_tenant_id := NEW.tenant_id;
  
  -- Skip if no user assigned
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Determine points based on activity type
  v_points := CASE NEW.type
    WHEN 'door_knock' THEN 10
    WHEN 'appointment_set' THEN 25
    WHEN 'contact_made' THEN 15
    WHEN 'follow_up' THEN 5
    WHEN 'proposal_sent' THEN 30
    WHEN 'deal_closed' THEN 100
    WHEN 'referral_obtained' THEN 50
    WHEN 'phone_call' THEN 5
    WHEN 'email' THEN 3
    WHEN 'sms' THEN 3
    ELSE 1
  END;
  
  -- Record in gamification_activities
  INSERT INTO gamification_activities (
    tenant_id,
    user_id,
    activity_type,
    points_earned,
    entity_type,
    entity_id,
    details
  ) VALUES (
    v_tenant_id,
    v_user_id,
    NEW.type,
    v_points,
    'activity',
    NEW.id,
    jsonb_build_object(
      'subject', NEW.subject,
      'contact_id', NEW.contact_id,
      'project_id', NEW.project_id
    )
  );
  
  -- Update user's total score
  INSERT INTO gamification_scores (
    tenant_id,
    user_id,
    total_points,
    points_this_week,
    points_this_month,
    doors_knocked,
    contacts_made,
    appointments_set,
    deals_closed
  ) VALUES (
    v_tenant_id,
    v_user_id,
    v_points,
    v_points,
    v_points,
    CASE WHEN NEW.type = 'door_knock' THEN 1 ELSE 0 END,
    CASE WHEN NEW.type = 'contact_made' THEN 1 ELSE 0 END,
    CASE WHEN NEW.type = 'appointment_set' THEN 1 ELSE 0 END,
    CASE WHEN NEW.type = 'deal_closed' THEN 1 ELSE 0 END
  )
  ON CONFLICT (tenant_id, user_id) DO UPDATE
  SET 
    total_points = gamification_scores.total_points + v_points,
    points_this_week = gamification_scores.points_this_week + v_points,
    points_this_month = gamification_scores.points_this_month + v_points,
    doors_knocked = gamification_scores.doors_knocked + 
      CASE WHEN NEW.type = 'door_knock' THEN 1 ELSE 0 END,
    contacts_made = gamification_scores.contacts_made + 
      CASE WHEN NEW.type = 'contact_made' THEN 1 ELSE 0 END,
    appointments_set = gamification_scores.appointments_set + 
      CASE WHEN NEW.type = 'appointment_set' THEN 1 ELSE 0 END,
    deals_closed = gamification_scores.deals_closed + 
      CASE WHEN NEW.type = 'deal_closed' THEN 1 ELSE 0 END,
    last_activity_date = CURRENT_DATE,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."award_activity_points"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."award_manual_points"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_points" integer, "p_reason" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Record in gamification_activities
  INSERT INTO gamification_activities (
    tenant_id,
    user_id,
    activity_type,
    points_earned,
    details
  ) VALUES (
    p_tenant_id,
    p_user_id,
    'manual_award',
    p_points,
    jsonb_build_object('reason', p_reason)
  );
  
  -- Update score
  INSERT INTO gamification_scores (
    tenant_id,
    user_id,
    total_points,
    points_this_week,
    points_this_month
  ) VALUES (
    p_tenant_id,
    p_user_id,
    p_points,
    p_points,
    p_points
  )
  ON CONFLICT (tenant_id, user_id) DO UPDATE
  SET 
    total_points = gamification_scores.total_points + p_points,
    points_this_week = gamification_scores.points_this_week + p_points,
    points_this_month = gamification_scores.points_this_month + p_points,
    updated_at = NOW();
END;
$$;


ALTER FUNCTION "public"."award_manual_points"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_points" integer, "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."award_points"("p_user_id" "uuid", "p_points" integer, "p_reason" "text", "p_activity_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."award_points"("p_user_id" "uuid", "p_points" integer, "p_reason" "text", "p_activity_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."award_points"("p_user_id" "uuid", "p_points" integer, "p_reason" "text", "p_activity_id" "uuid") IS 'Awards points to a user and logs the activity. Fixed ON CONFLICT to use (tenant_id, user_id) composite key.';



CREATE OR REPLACE FUNCTION "public"."award_points"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_action_type" "text", "p_activity_id" "uuid" DEFAULT NULL::"uuid", "p_contact_id" "uuid" DEFAULT NULL::"uuid", "p_project_id" "uuid" DEFAULT NULL::"uuid", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_points INTEGER;
  v_point_id UUID;
BEGIN
  -- Get points value for action
  SELECT points_value INTO v_points
  FROM public.point_rules
  WHERE action_type = p_action_type
  AND is_active = true;

  IF v_points IS NULL THEN
    RAISE EXCEPTION 'Invalid action type or inactive rule: %', p_action_type;
  END IF;

  -- Insert points record
  INSERT INTO public.user_points (
    tenant_id, user_id, action_type, points_earned,
    activity_id, contact_id, project_id, metadata
  ) VALUES (
    p_tenant_id, p_user_id, p_action_type, v_points,
    p_activity_id, p_contact_id, p_project_id, p_metadata
  )
  ON CONFLICT (user_id, activity_id)
  DO UPDATE SET
    points_earned = EXCLUDED.points_earned,
    metadata = EXCLUDED.metadata,
    updated_at = NOW()
  RETURNING id INTO v_point_id;

  -- Check for new achievements
  PERFORM public.check_achievements(p_user_id, p_tenant_id);

  -- Update streaks
  PERFORM public.update_streaks(p_user_id, p_tenant_id, p_action_type);

  RETURN v_point_id;
END;
$$;


ALTER FUNCTION "public"."award_points"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_action_type" "text", "p_activity_id" "uuid", "p_contact_id" "uuid", "p_project_id" "uuid", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_damage_score"("p_knock_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_score INTEGER := 0;
  v_property_data JSONB;
  v_roof_age INTEGER;
BEGIN
  SELECT property_data INTO v_property_data FROM knocks WHERE id = p_knock_id;

  IF v_property_data ? 'year_built' THEN
    v_roof_age := EXTRACT(YEAR FROM CURRENT_DATE) - (v_property_data->>'year_built')::INTEGER;
    IF v_roof_age >= 20 THEN v_score := v_score + 30;
    ELSIF v_roof_age >= 15 THEN v_score := v_score + 20;
    ELSIF v_roof_age >= 10 THEN v_score := v_score + 10;
    END IF;
  END IF;

  IF v_property_data ? 'estimated_value' THEN
    IF (v_property_data->>'estimated_value')::DECIMAL >= 300000 THEN
      v_score := v_score + 15;
    END IF;
  END IF;

  RETURN LEAST(v_score, 100);
END;
$$;


ALTER FUNCTION "public"."calculate_damage_score"("p_knock_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_job_duration"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.actual_end_at IS NOT NULL AND NEW.actual_start_at IS NOT NULL THEN
    NEW.actual_duration_hours := EXTRACT(EPOCH FROM (NEW.actual_end_at - NEW.actual_start_at)) / 3600.0;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_job_duration"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_polygon_area_sq_miles"("poly" "public"."geography") RETURNS numeric
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  RETURN ST_Area(poly) / 2589988.11;
END;
$$;


ALTER FUNCTION "public"."calculate_polygon_area_sq_miles"("poly" "public"."geography") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_project_costs"("p_project_id" "uuid") RETURNS TABLE("total_labor" numeric, "total_materials" numeric, "total_equipment" numeric, "total_other" numeric, "total_costs" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN expense_type = 'labor' THEN amount ELSE 0 END), 0) as total_labor,
    COALESCE(SUM(CASE WHEN expense_type = 'material' THEN amount ELSE 0 END), 0) as total_materials,
    COALESCE(SUM(CASE WHEN expense_type = 'equipment' THEN amount ELSE 0 END), 0) as total_equipment,
    COALESCE(SUM(CASE WHEN expense_type IN ('subcontractor', 'permit', 'disposal', 'other') THEN amount ELSE 0 END), 0) as total_other,
    COALESCE(SUM(amount), 0) as total_costs
  FROM job_expenses
  WHERE project_id = p_project_id;
END;
$$;


ALTER FUNCTION "public"."calculate_project_costs"("p_project_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_project_profit"("p_project_id" "uuid") RETURNS TABLE("revenue" numeric, "total_cost" numeric, "profit" numeric, "margin_percent" numeric, "cost_variance" numeric)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_revenue DECIMAL;
  v_estimated_cost DECIMAL;
  v_actual_cost DECIMAL;
BEGIN
  SELECT
    COALESCE(p.total_revenue, p.final_value, p.approved_value, p.estimated_value, 0),
    COALESCE(p.estimated_labor_cost, 0) + COALESCE(p.estimated_material_cost, 0) +
      COALESCE(p.estimated_equipment_cost, 0) + COALESCE(p.estimated_other_cost, 0),
    COALESCE(p.actual_labor_cost, 0) + COALESCE(p.actual_material_cost, 0) +
      COALESCE(p.actual_equipment_cost, 0) + COALESCE(p.actual_other_cost, 0)
  INTO v_revenue, v_estimated_cost, v_actual_cost
  FROM projects p
  WHERE p.id = p_project_id;

  RETURN QUERY
  SELECT
    v_revenue,
    v_actual_cost,
    v_revenue - v_actual_cost as profit,
    CASE WHEN v_revenue > 0 THEN ((v_revenue - v_actual_cost) / v_revenue * 100) ELSE 0 END as margin_percent,
    v_actual_cost - v_estimated_cost as cost_variance;
END;
$$;


ALTER FUNCTION "public"."calculate_project_profit"("p_project_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_send_email_to_contact"("contact_email" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
  DECLARE
    is_opted_out BOOLEAN;
    is_invalid BOOLEAN;
  BEGIN
    SELECT email_opt_out, email_invalid
    INTO is_opted_out, is_invalid
    FROM contacts
    WHERE email = contact_email AND is_deleted = false
    LIMIT 1;

    IF is_opted_out = true OR is_invalid = true THEN
      RETURN false;
    END IF;

    RETURN true;
  END;
  $$;


ALTER FUNCTION "public"."can_send_email_to_contact"("contact_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_send_sms_to_contact"("contact_phone" "text", "contact_timezone" "text" DEFAULT 'America/New_York'::"text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
  DECLARE
    current_hour INTEGER;
    is_opted_out BOOLEAN;
  BEGIN
    SELECT sms_opt_out INTO is_opted_out
    FROM contacts
    WHERE (phone = contact_phone OR mobile_phone = contact_phone)
    AND is_deleted = false
    LIMIT 1;

    IF is_opted_out = true THEN RETURN false; END IF;

    current_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE contact_timezone);
    IF current_hour < 8 OR current_hour >= 21 THEN RETURN false; END IF;

    RETURN true;
  END;
  $$;


ALTER FUNCTION "public"."can_send_sms_to_contact"("contact_phone" "text", "contact_timezone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_achievements"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."check_achievements"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_achievements"("p_user_id" "uuid") IS 'Checks if user has earned any new achievements based on current stats. Returns array of newly earned achievements.';



CREATE OR REPLACE FUNCTION "public"."check_achievements"("p_user_id" "uuid", "p_tenant_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_achievement RECORD;
  v_user_stats RECORD;
BEGIN
  -- Get user stats
  SELECT
    COALESCE(SUM(points_earned), 0) as total_points,
    COUNT(DISTINCT CASE WHEN action_type = 'door_knock' THEN id END) as door_knocks,
    COUNT(DISTINCT CASE WHEN action_type = 'conversation' THEN id END) as conversations,
    COUNT(DISTINCT CASE WHEN action_type = 'appointment_scheduled' THEN id END) as appointments,
    COUNT(DISTINCT CASE WHEN action_type = 'sale_closed' THEN id END) as sales,
    COUNT(DISTINCT CASE WHEN action_type = 'photo_uploaded' THEN id END) as photos
  INTO v_user_stats
  FROM public.user_points
  WHERE user_id = p_user_id AND tenant_id = p_tenant_id;

  -- Check each achievement
  FOR v_achievement IN
    SELECT * FROM public.achievements
    WHERE is_active = true
    AND id NOT IN (
      SELECT achievement_id FROM public.user_achievements
      WHERE user_id = p_user_id
    )
  LOOP
    -- Check if achievement earned
    IF (v_achievement.requirement_type = 'points' AND v_user_stats.total_points >= v_achievement.requirement_value) OR
       (v_achievement.requirement_type = 'count' AND
        CASE v_achievement.name
          WHEN 'First Steps' THEN v_user_stats.door_knocks >= v_achievement.requirement_value
          WHEN 'Conversation Starter' THEN v_user_stats.conversations >= v_achievement.requirement_value
          WHEN 'Appointment Setter' THEN v_user_stats.appointments >= v_achievement.requirement_value
          WHEN 'Closer' THEN v_user_stats.sales >= v_achievement.requirement_value
          WHEN 'Door Warrior' THEN v_user_stats.door_knocks >= v_achievement.requirement_value
          WHEN 'Sales Master' THEN v_user_stats.sales >= v_achievement.requirement_value
          WHEN 'Photo Pro' THEN v_user_stats.photos >= v_achievement.requirement_value
          ELSE FALSE
        END
       )
    THEN
      -- Award achievement
      INSERT INTO public.user_achievements (tenant_id, user_id, achievement_id)
      VALUES (p_tenant_id, p_user_id, v_achievement.id);

      -- Award bonus points
      IF v_achievement.points_reward > 0 THEN
        INSERT INTO public.user_points (
          tenant_id, user_id, action_type, points_earned, metadata
        ) VALUES (
          p_tenant_id, p_user_id, 'achievement_bonus', v_achievement.points_reward,
          jsonb_build_object('achievement_name', v_achievement.name)
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."check_achievements"("p_user_id" "uuid", "p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_duplicate_pin"("p_latitude" numeric, "p_longitude" numeric, "p_radius_meters" integer DEFAULT 25, "p_tenant_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("pin_exists" boolean, "existing_knock_id" "uuid", "existing_disposition" "text", "existing_user_name" "text", "distance_meters" numeric, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE as pin_exists,
    k.id AS existing_knock_id,
    k.disposition AS existing_disposition,
    k.user_id::TEXT AS existing_user_name,
    earth_distance(
      ll_to_earth(p_latitude, p_longitude),
      ll_to_earth(k.latitude, k.longitude)
    )::NUMERIC AS distance_meters,
    k.created_at
  FROM knocks k
  WHERE k.is_deleted = FALSE
    AND (p_tenant_id IS NULL OR k.tenant_id = p_tenant_id)
    AND earth_box(ll_to_earth(p_latitude, p_longitude), p_radius_meters) @> ll_to_earth(k.latitude, k.longitude)
    AND earth_distance(
      ll_to_earth(p_latitude, p_longitude),
      ll_to_earth(k.latitude, k.longitude)
    ) <= p_radius_meters
  ORDER BY distance_meters
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::NUMERIC, NULL::TIMESTAMPTZ;
  END IF;
END;
$$;


ALTER FUNCTION "public"."check_duplicate_pin"("p_latitude" numeric, "p_longitude" numeric, "p_radius_meters" integer, "p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_rep_locations"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  DELETE FROM rep_locations
  WHERE recorded_at < NOW() - INTERVAL '7 days';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_rep_locations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_contact_from_pin"("p_knock_id" "uuid", "p_first_name" "text" DEFAULT NULL::"text", "p_last_name" "text" DEFAULT NULL::"text", "p_phone" "text" DEFAULT NULL::"text", "p_email" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_knock RECORD;
  v_contact_id UUID;
  v_first_name TEXT;
  v_last_name TEXT;
BEGIN
  -- Get knock data
  SELECT * INTO v_knock
  FROM knocks
  WHERE id = p_knock_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Knock not found: %', p_knock_id;
  END IF;

  -- Parse owner name if provided via property enrichment
  IF p_first_name IS NULL AND v_knock.owner_name IS NOT NULL THEN
    -- Simple name parsing (first word = first name, rest = last name)
    v_first_name := split_part(v_knock.owner_name, ' ', 1);
    v_last_name := trim(substring(v_knock.owner_name from position(' ' in v_knock.owner_name)));
  ELSE
    v_first_name := p_first_name;
    v_last_name := p_last_name;
  END IF;

  -- Create contact
  INSERT INTO contacts (
    tenant_id,
    first_name,
    last_name,
    phone,
    email,
    address_street,
    address_city,
    address_state,
    address_zip,
    latitude,
    longitude,
    source,
    stage,
    notes,
    created_by
  )
  VALUES (
    v_knock.tenant_id,
    v_first_name,
    v_last_name,
    COALESCE(p_phone, (v_knock.property_data->>'phone')::TEXT),
    COALESCE(p_email, (v_knock.property_data->>'email')::TEXT),
    v_knock.address_street,
    v_knock.address_city,
    v_knock.address_state,
    v_knock.address_zip,
    v_knock.latitude,
    v_knock.longitude,
    'door-knock',
    CASE v_knock.disposition
      WHEN 'interested' THEN 'qualified'
      WHEN 'appointment' THEN 'proposal'
      ELSE 'new'
    END,
    'Created from door knock on ' || v_knock.created_at::DATE ||
      CASE WHEN v_knock.notes IS NOT NULL
        THEN E'\n\nOriginal notes: ' || v_knock.notes
        ELSE ''
      END,
    v_knock.user_id
  )
  RETURNING id INTO v_contact_id;

  -- Update knock to link to contact
  UPDATE knocks
  SET
    contact_id = v_contact_id,
    contact_created = TRUE
  WHERE id = p_knock_id;

  RETURN v_contact_id;
END;
$$;


ALTER FUNCTION "public"."create_contact_from_pin"("p_knock_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrypt_qb_token"("encrypted_data" "bytea") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  IF encrypted_data IS NULL THEN
    RETURN NULL;
  END IF;

  encryption_key := get_qb_encryption_key();
  RETURN pgp_sym_decrypt(encrypted_data, encryption_key);
END;
$$;


ALTER FUNCTION "public"."decrypt_qb_token"("encrypted_data" "bytea") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."decrypt_qb_token"("encrypted_data" "bytea") IS 'Decrypts QuickBooks OAuth tokens using secure key from _encryption_keys';



CREATE OR REPLACE FUNCTION "public"."encrypt_qb_token"("plaintext" "text") RETURNS "bytea"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  encryption_key := get_qb_encryption_key();
  RETURN pgp_sym_encrypt(plaintext, encryption_key);
END;
$$;


ALTER FUNCTION "public"."encrypt_qb_token"("plaintext" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."encrypt_qb_token"("plaintext" "text") IS 'Encrypts QuickBooks OAuth tokens using secure key from _encryption_keys';



CREATE OR REPLACE FUNCTION "public"."estimate_addresses_in_area"("area_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  area_sq_miles DECIMAL;
  estimated_count INTEGER;
BEGIN
  SELECT calculate_polygon_area_sq_miles(boundary_polygon) INTO area_sq_miles FROM storm_targeting_areas WHERE id = area_id;
  estimated_count := ROUND(area_sq_miles * 75);
  RETURN estimated_count;
END;
$$;


ALTER FUNCTION "public"."estimate_addresses_in_area"("area_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_storm_events_near_point"("p_lat" numeric, "p_lng" numeric, "p_radius_meters" numeric, "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("id" "uuid", "event_date" "date", "event_type" "text", "magnitude" numeric, "state" "text", "county" "text", "city" "text", "latitude" numeric, "longitude" numeric, "path_length" numeric, "path_width" numeric, "property_damage" bigint, "event_narrative" "text", "distance_meters" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    se.id,
    se.event_date,
    se.event_type,
    se.magnitude,
    se.state,
    se.county,
    se.city,
    se.latitude,
    se.longitude,
    se.path_length,
    se.path_width,
    se.property_damage,
    se.event_narrative,
    CASE
      WHEN se.latitude IS NOT NULL AND se.longitude IS NOT NULL THEN
        ST_Distance(
          ST_SetSRID(ST_MakePoint(se.longitude, se.latitude), 4326)::geography,
          ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
        )
      WHEN se.path_polygon IS NOT NULL THEN
        ST_Distance(
          se.path_polygon,
          ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
        )
      ELSE NULL
    END AS distance_meters
  FROM storm_events se
  WHERE
    se.event_date BETWEEN p_start_date AND p_end_date
    AND (
      -- Match by point coordinates within radius
      (se.latitude IS NOT NULL AND se.longitude IS NOT NULL AND
       ST_DWithin(
         ST_SetSRID(ST_MakePoint(se.longitude, se.latitude), 4326)::geography,
         ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
         p_radius_meters
       ))
      OR
      -- Match by path polygon intersection with search area
      (se.path_polygon IS NOT NULL AND
       ST_DWithin(
         se.path_polygon,
         ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
         p_radius_meters
       ))
    )
  ORDER BY distance_meters ASC NULLS LAST
  LIMIT 50;
END;
$$;


ALTER FUNCTION "public"."find_storm_events_near_point"("p_lat" numeric, "p_lng" numeric, "p_radius_meters" numeric, "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."find_storm_events_near_point"("p_lat" numeric, "p_lng" numeric, "p_radius_meters" numeric, "p_start_date" "date", "p_end_date" "date") IS 'Find storm events within a radius of a geographic point for weather causation documentation';



CREATE OR REPLACE FUNCTION "public"."generate_card_slug"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- If slug is already provided, validate and return
  IF NEW.slug IS NOT NULL AND NEW.slug != '' THEN
    RETURN NEW;
  END IF;

  -- Generate base slug from full name
  base_slug := LOWER(REGEXP_REPLACE(NEW.full_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := TRIM(BOTH '-' FROM base_slug);

  -- Ensure slug is not empty
  IF base_slug = '' THEN
    base_slug := 'card-' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8);
  END IF;

  final_slug := base_slug;

  -- Check for uniqueness and append counter if needed
  WHILE EXISTS (SELECT 1 FROM digital_business_cards WHERE slug = final_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  NEW.slug := final_slug;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_card_slug"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_job_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
  year_prefix TEXT;
  sequence_num INTEGER;
  new_job_number TEXT;
BEGIN
  IF NEW.job_number IS NULL THEN
    year_prefix := TO_CHAR(CURRENT_DATE, 'YY');

    -- Get next sequence number for this year
    SELECT COALESCE(MAX(
      CASE
        WHEN job_number ~ ('^' || year_prefix || '-[0-9]+$')
        THEN CAST(SUBSTRING(job_number FROM '[0-9]+$') AS INTEGER)
        ELSE 0
      END
    ), 0) + 1
    INTO sequence_num
    FROM jobs
    WHERE tenant_id = NEW.tenant_id;

    NEW.job_number := year_prefix || '-' || LPAD(sequence_num::TEXT, 4, '0');
  END IF;

  RETURN NEW;
END;
$_$;


ALTER FUNCTION "public"."generate_job_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_survey_token"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.survey_token IS NULL THEN
    NEW.survey_token := encode(gen_random_bytes(16), 'base64');
    NEW.survey_link := '/survey/' || NEW.survey_token;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_survey_token"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_reps"("p_tenant_id" "uuid") RETURNS TABLE("user_id" "uuid", "full_name" "text", "latitude" numeric, "longitude" numeric, "last_ping" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (rl.user_id)
    rl.user_id,
    u.full_name,
    rl.latitude,
    rl.longitude,
    rl.recorded_at AS last_ping
  FROM rep_locations rl
  JOIN profiles u ON rl.user_id = u.id
  WHERE rl.tenant_id = p_tenant_id
    AND rl.recorded_at > NOW() - INTERVAL '30 minutes'
  ORDER BY rl.user_id, rl.recorded_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_active_reps"("p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_user_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  admin_id UUID;
BEGIN
  IF is_being_impersonated() THEN
    BEGIN
      admin_id := current_setting('app.admin_user_id', true)::uuid;
      RETURN admin_id;
    EXCEPTION
      WHEN OTHERS THEN
        RETURN NULL;
    END;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."get_admin_user_id"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_admin_user_id"() IS 'Returns admin user ID during impersonation, null otherwise';



CREATE OR REPLACE FUNCTION "public"."get_card_analytics"("p_card_id" "uuid", "p_start_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_end_date" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE("interaction_type" character varying, "count" bigint, "unique_ips" bigint, "latest_interaction" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.interaction_type,
    COUNT(*)::BIGINT as count,
    COUNT(DISTINCT i.ip_address)::BIGINT as unique_ips,
    MAX(i.created_at) as latest_interaction
  FROM business_card_interactions i
  WHERE i.card_id = p_card_id
    AND (p_start_date IS NULL OR i.created_at >= p_start_date)
    AND (p_end_date IS NULL OR i.created_at <= p_end_date)
  GROUP BY i.interaction_type
  ORDER BY count DESC;
END;
$$;


ALTER FUNCTION "public"."get_card_analytics"("p_card_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_card_performance_metrics"("p_card_id" "uuid", "p_days" integer DEFAULT 30) RETURNS TABLE("total_views" bigint, "unique_visitors" bigint, "conversion_rate" numeric, "avg_daily_views" numeric, "top_referrer" "text", "top_country" "text", "top_device" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
BEGIN
  v_start_date := NOW() - (p_days || ' days')::INTERVAL;

  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) FILTER (WHERE interaction_type = 'view') as views,
      COUNT(DISTINCT ip_address) as uniques,
      COUNT(*) FILTER (WHERE interaction_type IN ('contact_form_submit', 'appointment_booked')) as conversions,
      MODE() WITHIN GROUP (ORDER BY referrer) as top_ref,
      MODE() WITHIN GROUP (ORDER BY country) as top_cntry,
      MODE() WITHIN GROUP (ORDER BY device_type) as top_dev
    FROM business_card_interactions
    WHERE card_id = p_card_id
      AND created_at >= v_start_date
  )
  SELECT
    s.views::BIGINT,
    s.uniques::BIGINT,
    CASE
      WHEN s.views > 0 THEN ROUND((s.conversions::NUMERIC / s.views::NUMERIC) * 100, 2)
      ELSE 0
    END,
    ROUND(s.views::NUMERIC / p_days::NUMERIC, 2),
    s.top_ref,
    s.top_cntry,
    s.top_dev
  FROM stats s;
END;
$$;


ALTER FUNCTION "public"."get_card_performance_metrics"("p_card_id" "uuid", "p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_contact_call_count"("p_contact_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  call_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO call_count FROM call_logs
  WHERE contact_id = p_contact_id AND is_deleted = FALSE;
  RETURN call_count;
END;
$$;


ALTER FUNCTION "public"."get_contact_call_count"("p_contact_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_crew_lead_stats"("p_user_id" "uuid", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  result JSON;
  start_filter DATE;
  end_filter DATE;
BEGIN
  start_filter := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
  end_filter := COALESCE(p_end_date, CURRENT_DATE);

  SELECT json_build_object(
    'total_jobs', COUNT(*),
    'completed_jobs', COUNT(*) FILTER (WHERE status = 'completed'),
    'in_progress_jobs', COUNT(*) FILTER (WHERE status = 'in_progress'),
    'scheduled_jobs', COUNT(*) FILTER (WHERE status = 'scheduled'),
    'cancelled_jobs', COUNT(*) FILTER (WHERE status = 'cancelled'),
    'avg_quality_score', ROUND(AVG(quality_score), 2),
    'total_weather_delays', SUM(weather_delay_days),
    'avg_completion_percentage', ROUND(AVG(completion_percentage), 2)
  )
  INTO result
  FROM jobs
  WHERE crew_lead = p_user_id
    AND scheduled_date BETWEEN start_filter AND end_filter
    AND is_deleted = FALSE;

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_crew_lead_stats"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_crew_member_jobs"("p_user_id" "uuid", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("job_id" "uuid", "job_number" "text", "project_name" "text", "scheduled_date" "date", "status" "text", "crew_lead_name" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  start_filter DATE;
  end_filter DATE;
BEGIN
  start_filter := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
  end_filter := COALESCE(p_end_date, CURRENT_DATE + INTERVAL '30 days');

  RETURN QUERY
  SELECT
    j.id AS job_id,
    j.job_number,
    p.name AS project_name,
    j.scheduled_date,
    j.status,
    u.full_name AS crew_lead_name
  FROM jobs j
  LEFT JOIN projects p ON j.project_id = p.id
  LEFT JOIN profiles u ON j.crew_lead = u.id
  WHERE (
    j.crew_lead = p_user_id
    OR p_user_id = ANY(j.crew_members)
  )
  AND j.scheduled_date BETWEEN start_filter AND end_filter
  AND j.is_deleted = FALSE
  ORDER BY j.scheduled_date ASC;
END;
$$;


ALTER FUNCTION "public"."get_crew_member_jobs"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_effective_user_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  impersonated_user_id UUID;
  is_admin BOOLEAN;
BEGIN
  -- Try to get impersonated user ID from session variable
  -- This is set by middleware when impersonation is active
  BEGIN
    impersonated_user_id := current_setting('app.impersonated_user_id', true)::uuid;
  EXCEPTION
    WHEN OTHERS THEN
      impersonated_user_id := NULL;
  END;

  -- If impersonation is active, validate that current user is admin
  IF impersonated_user_id IS NOT NULL THEN
    -- Check if current authenticated user is an admin
    SELECT EXISTS (
      SELECT 1 FROM tenant_users
      WHERE user_id = auth.uid()
        AND role = 'admin'
    ) INTO is_admin;

    -- If admin, return impersonated user ID
    IF is_admin THEN
      RETURN impersonated_user_id;
    END IF;
  END IF;

  -- Default: return actual authenticated user
  RETURN auth.uid();
END;
$$;


ALTER FUNCTION "public"."get_effective_user_id"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_effective_user_id"() IS 'Returns impersonated user ID if admin is impersonating, otherwise returns authenticated user ID';



CREATE OR REPLACE FUNCTION "public"."get_financial_summary"("period_start" timestamp without time zone DEFAULT NULL::timestamp without time zone, "period_end" timestamp without time zone DEFAULT NULL::timestamp without time zone) RETURNS TABLE("total_quoted" numeric, "total_approved" numeric, "total_revenue" numeric, "total_profit" numeric, "avg_margin" numeric, "project_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        SUM((financial_data->>'quoted_value')::NUMERIC) as total_quoted,
        SUM((financial_data->>'approved_value')::NUMERIC) as total_approved,
        SUM((financial_data->>'gross_revenue')::NUMERIC) as total_revenue,
        SUM((financial_data->>'gross_profit')::NUMERIC) as total_profit,
        AVG((financial_data->>'gross_margin')::NUMERIC) as avg_margin,
        COUNT(*) as project_count
    FROM proline_projects
    WHERE 
        (period_start IS NULL OR (dates->>'created')::TIMESTAMP >= period_start)
        AND (period_end IS NULL OR (dates->>'created')::TIMESTAMP <= period_end);
END;
$$;


ALTER FUNCTION "public"."get_financial_summary"("period_start" timestamp without time zone, "period_end" timestamp without time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_knocks_within_radius"("p_latitude" numeric, "p_longitude" numeric, "p_radius_meters" integer DEFAULT 1000) RETURNS TABLE("knock_id" "uuid", "user_id" "uuid", "latitude" numeric, "longitude" numeric, "disposition" "text", "distance_meters" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id AS knock_id,
    k.user_id,
    k.latitude,
    k.longitude,
    k.disposition,
    (
      6371000 * acos(
        cos(radians(p_latitude)) *
        cos(radians(k.latitude)) *
        cos(radians(k.longitude) - radians(p_longitude)) +
        sin(radians(p_latitude)) *
        sin(radians(k.latitude))
      )
    )::NUMERIC AS distance_meters
  FROM knocks k
  WHERE k.is_deleted = FALSE
    AND (
      6371000 * acos(
        cos(radians(p_latitude)) *
        cos(radians(k.latitude)) *
        cos(radians(k.longitude) - radians(p_longitude)) +
        sin(radians(p_latitude)) *
        sin(radians(k.latitude))
      )
    ) <= p_radius_meters
  ORDER BY distance_meters;
END;
$$;


ALTER FUNCTION "public"."get_knocks_within_radius"("p_latitude" numeric, "p_longitude" numeric, "p_radius_meters" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_latest_rep_location"("p_user_id" "uuid") RETURNS TABLE("latitude" numeric, "longitude" numeric, "recorded_at" timestamp with time zone, "minutes_ago" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    rl.latitude,
    rl.longitude,
    rl.recorded_at,
    EXTRACT(EPOCH FROM (NOW() - rl.recorded_at)) / 60 AS minutes_ago
  FROM rep_locations rl
  WHERE rl.user_id = p_user_id
  ORDER BY rl.recorded_at DESC
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_latest_rep_location"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_project_file_count"("p_project_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  file_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO file_count FROM project_files
  WHERE project_id = p_project_id AND is_deleted = FALSE;
  RETURN file_count;
END;
$$;


ALTER FUNCTION "public"."get_project_file_count"("p_project_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_project_photo_count"("p_project_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  photo_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO photo_count FROM project_files
  WHERE project_id = p_project_id AND file_type = 'photo' AND is_deleted = FALSE;
  RETURN photo_count;
END;
$$;


ALTER FUNCTION "public"."get_project_photo_count"("p_project_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_qb_encryption_key"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  SELECT key_value INTO encryption_key
  FROM _encryption_keys
  WHERE key_name = 'quickbooks_encryption_key';

  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Encryption key not found';
  END IF;

  RETURN encryption_key;
END;
$$;


ALTER FUNCTION "public"."get_qb_encryption_key"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_qb_encryption_key"() IS 'Retrieves encryption key from _encryption_keys table';



CREATE OR REPLACE FUNCTION "public"."get_sms_conversations"("p_tenant_id" "uuid") RETURNS TABLE("contact_id" "uuid", "contact_name" "text", "contact_phone" "text", "last_message" "text", "last_message_at" timestamp with time zone, "last_message_direction" character varying, "unread_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  BEGIN
    RETURN QUERY
    WITH latest_messages AS (
      SELECT DISTINCT ON (a.contact_id)
        a.contact_id,
        a.content,
        a.created_at,
        a.direction
      FROM activities a
      WHERE a.tenant_id = p_tenant_id
        AND a.type = 'sms'
      ORDER BY a.contact_id, a.created_at DESC
    ),
    unread_counts AS (
      SELECT
        a.contact_id,
        COUNT(*) as unread
      FROM activities a
      WHERE a.tenant_id = p_tenant_id
        AND a.type = 'sms'
        AND a.direction = 'inbound'
        AND a.read_at IS NULL
      GROUP BY a.contact_id
    )
    SELECT
      c.id as contact_id,
      COALESCE(c.first_name || ' ' || c.last_name, c.company, 'Unknown') as contact_name,
      COALESCE(c.mobile_phone, c.phone)::TEXT as contact_phone,
      lm.content as last_message,
      lm.created_at as last_message_at,
      lm.direction as last_message_direction,
      COALESCE(uc.unread, 0) as unread_count
    FROM contacts c
    INNER JOIN latest_messages lm ON c.id = lm.contact_id
    LEFT JOIN unread_counts uc ON c.id = uc.contact_id
    WHERE c.tenant_id = p_tenant_id
      AND c.is_deleted = false
    ORDER BY lm.created_at DESC;
  END;
  $$;


ALTER FUNCTION "public"."get_sms_conversations"("p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_knock_stats"("p_user_id" "uuid", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  result JSON;
  start_filter TIMESTAMPTZ;
  end_filter TIMESTAMPTZ;
BEGIN
  start_filter := COALESCE(p_start_date::TIMESTAMPTZ, NOW() - INTERVAL '30 days');
  end_filter := COALESCE(p_end_date::TIMESTAMPTZ, NOW());

  SELECT json_build_object(
    'total_knocks', COUNT(*),
    'not_home', COUNT(*) FILTER (WHERE disposition = 'not_home'),
    'interested', COUNT(*) FILTER (WHERE disposition = 'interested'),
    'not_interested', COUNT(*) FILTER (WHERE disposition = 'not_interested'),
    'appointments_set', COUNT(*) FILTER (WHERE disposition = 'appointment'),
    'contacts_created', COUNT(*) FILTER (WHERE contact_created = TRUE),
    'conversion_rate', ROUND(
      (COUNT(*) FILTER (WHERE disposition IN ('interested', 'appointment'))::DECIMAL /
       NULLIF(COUNT(*), 0) * 100), 2
    )
  )
  INTO result
  FROM knocks
  WHERE user_id = p_user_id
    AND created_at BETWEEN start_filter AND end_filter
    AND is_deleted = FALSE;

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_user_knock_stats"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_tenant_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1
$$;


ALTER FUNCTION "public"."get_user_tenant_id"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_tenant_id"() IS 'Returns the tenant_id for the current user. Marked as STABLE for RLS performance - result is cached within a single query.';



CREATE OR REPLACE FUNCTION "public"."handle_survey_rating"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Check if rating meets threshold for review request
  IF NEW.rating IS NOT NULL AND OLD.rating IS NULL THEN
    IF NEW.rating >= NEW.review_threshold THEN
      -- Positive rating: request public review
      NEW.review_requested := TRUE;
      NEW.is_negative_feedback := FALSE;
    ELSE
      -- Negative rating: flag for manager follow-up
      NEW.is_negative_feedback := TRUE;
      NEW.review_requested := FALSE;
    END IF;

    -- Calculate response time
    IF NEW.started_at IS NOT NULL THEN
      NEW.response_time_seconds := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at));
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_survey_rating"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_campaign_enrollment"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE campaigns
  SET total_enrolled = total_enrolled + 1
  WHERE id = NEW.campaign_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."increment_campaign_enrollment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_saved_filter_usage"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.saved_filter_id IS NOT NULL THEN
    UPDATE saved_filters
    SET usage_count = usage_count + 1,
        last_used_at = NOW()
    WHERE id = NEW.saved_filter_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."increment_saved_filter_usage"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_being_impersonated"() RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN current_setting('app.impersonated_user_id', true) IS NOT NULL;
END;
$$;


ALTER FUNCTION "public"."is_being_impersonated"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_being_impersonated"() IS 'Returns true if current session is an impersonation session';



CREATE OR REPLACE FUNCTION "public"."match_documents"("query_embedding" "public"."vector", "match_count" integer DEFAULT 10, "filter" "jsonb" DEFAULT '{}'::"jsonb") RETURNS TABLE("id" "uuid", "title" "text", "content" "text", "source_type" "text", "metadata" "jsonb", "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        knowledge_base.id,
        knowledge_base.title::text,
        knowledge_base.content,
        knowledge_base.source_type::text,
        knowledge_base.metadata,
        1 - (knowledge_base.embedding <=> query_embedding) as similarity
    FROM knowledge_base
    WHERE 
        CASE 
            WHEN filter = '{}'::jsonb THEN true
            ELSE knowledge_base.metadata @> filter
        END
    ORDER BY knowledge_base.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."match_documents"("query_embedding" "public"."vector", "match_count" integer, "filter" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."point_in_targeting_area"("lat" numeric, "lng" numeric, "area_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  area_polygon GEOGRAPHY;
  point_geo GEOGRAPHY;
BEGIN
  SELECT boundary_polygon INTO area_polygon FROM storm_targeting_areas WHERE id = area_id;
  IF area_polygon IS NULL THEN RETURN FALSE; END IF;
  point_geo := ST_SetSRID(ST_MakePoint(lng, lat), 4326)::GEOGRAPHY;
  RETURN ST_Covers(area_polygon, point_geo);
END;
$$;


ALTER FUNCTION "public"."point_in_targeting_area"("lat" numeric, "lng" numeric, "area_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_proline_projects"("search_term" "text" DEFAULT NULL::"text", "status_filter" "text" DEFAULT NULL::"text", "date_from" timestamp without time zone DEFAULT NULL::timestamp without time zone, "date_to" timestamp without time zone DEFAULT NULL::timestamp without time zone) RETURNS TABLE("project_number" "text", "project_name" "text", "status" "text", "stage" "text", "assigned_to" "text", "gross_revenue" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.project_number,
        p.project_name,
        p.status,
        p.stage,
        p.assigned_to,
        (p.financial_data->>'gross_revenue')::NUMERIC
    FROM proline_projects p
    WHERE 
        (search_term IS NULL OR 
         p.project_name ILIKE '%' || search_term || '%' OR
         p.project_number ILIKE '%' || search_term || '%' OR
         p.project_notes ILIKE '%' || search_term || '%')
        AND (status_filter IS NULL OR p.status = status_filter)
        AND (date_from IS NULL OR (p.dates->>'created')::TIMESTAMP >= date_from)
        AND (date_to IS NULL OR (p.dates->>'created')::TIMESTAMP <= date_to)
    ORDER BY p.updated_at DESC;
END;
$$;


ALTER FUNCTION "public"."search_proline_projects"("search_term" "text", "status_filter" "text", "date_from" timestamp without time zone, "date_to" timestamp without time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_roofing_knowledge"("query_embedding" "public"."vector", "match_threshold" double precision DEFAULT 0.7, "match_count" integer DEFAULT 5, "filter_category" "text" DEFAULT NULL::"text", "filter_tenant_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "title" "text", "content" "text", "category" "text", "subcategory" "text", "manufacturer" "text", "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    rk.id,
    rk.title,
    rk.content,
    rk.category,
    rk.subcategory,
    rk.manufacturer,
    1 - (rk.embedding <=> query_embedding) AS similarity
  FROM roofing_knowledge rk
  WHERE
    rk.is_active = TRUE
    AND (filter_category IS NULL OR rk.category = filter_category)
    AND (
      rk.is_global = TRUE OR
      (filter_tenant_id IS NOT NULL AND rk.tenant_id = filter_tenant_id)
    )
    AND 1 - (rk.embedding <=> query_embedding) > match_threshold
  ORDER BY rk.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."search_roofing_knowledge"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "filter_category" "text", "filter_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_deactivation_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status = 'deactivated' AND OLD.status != 'deactivated' THEN
    NEW.deactivated_at = NOW();
  ELSIF NEW.status = 'active' AND OLD.status = 'deactivated' THEN
    NEW.deactivated_at = NULL;
    NEW.deactivated_by = NULL;
    NEW.deactivation_reason = NULL;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_deactivation_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_default_substatus"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
  DECLARE
    default_substatus TEXT;
    entity_type_name TEXT;
    status_field TEXT;
    current_status_value TEXT;
    should_update_substatus BOOLEAN := FALSE;
  BEGIN
    -- Handle contacts table
    IF TG_TABLE_NAME = 'contacts' THEN
      entity_type_name := 'contacts';
      status_field := 'stage';
      current_status_value := NEW.stage;

      IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.stage IS DISTINCT FROM NEW.stage) THEN
        should_update_substatus := TRUE;
      END IF;

    -- Handle projects table
    ELSIF TG_TABLE_NAME = 'projects' THEN
      entity_type_name := 'projects';
      status_field := 'status';
      current_status_value := NEW.status;

      IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        should_update_substatus := TRUE;
      END IF;

    ELSE
      RETURN NEW;
    END IF;

    IF should_update_substatus THEN
      SELECT substatus_value INTO default_substatus
      FROM status_substatus_configs
      WHERE tenant_id = NEW.tenant_id
        AND entity_type = entity_type_name
        AND status_field_name = status_field
        AND status_value = current_status_value
        AND is_default = true
        AND is_active = true
      LIMIT 1;

      NEW.substatus := default_substatus;
    END IF;

    RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."set_default_substatus"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_impersonation_session"("p_admin_user_id" "uuid", "p_impersonated_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Set session variables that get_effective_user_id() reads
  PERFORM set_config('app.impersonated_user_id', p_impersonated_user_id::text, false);
  PERFORM set_config('app.admin_user_id', p_admin_user_id::text, false);
END;
$$;


ALTER FUNCTION "public"."set_impersonation_session"("p_admin_user_id" "uuid", "p_impersonated_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_task_completed_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status != 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_task_completed_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_pipeline_stage_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- If pipeline_stage changed, update stage_changed_at
  IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
    NEW.stage_changed_at = timezone('utc'::text, now());
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."track_pipeline_stage_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_ai_conversation_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_ai_conversation_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_campaign_performance"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE campaigns
    SET total_completed = total_completed + 1
    WHERE id = NEW.campaign_id;
  END IF;

  IF NEW.goal_achieved = true AND OLD.goal_achieved != true THEN
    UPDATE campaigns
    SET total_revenue = total_revenue + COALESCE(NEW.revenue_attributed, 0)
    WHERE id = NEW.campaign_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_campaign_performance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_campaigns_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_campaigns_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_card_analytics"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Update last_viewed_at for any interaction
  UPDATE digital_business_cards
  SET last_viewed_at = NOW()
  WHERE id = NEW.card_id;

  -- Increment specific counters based on interaction type
  CASE NEW.interaction_type
    WHEN 'view' THEN
      UPDATE digital_business_cards
      SET total_views = total_views + 1
      WHERE id = NEW.card_id;

    WHEN 'vcard_download' THEN
      UPDATE digital_business_cards
      SET total_vcard_downloads = total_vcard_downloads + 1
      WHERE id = NEW.card_id;

    WHEN 'phone_click' THEN
      UPDATE digital_business_cards
      SET total_phone_clicks = total_phone_clicks + 1
      WHERE id = NEW.card_id;

    WHEN 'email_click' THEN
      UPDATE digital_business_cards
      SET total_email_clicks = total_email_clicks + 1
      WHERE id = NEW.card_id;

    WHEN 'contact_form_submit' THEN
      UPDATE digital_business_cards
      SET total_contact_form_submissions = total_contact_form_submissions + 1
      WHERE id = NEW.card_id;

    ELSE
      -- Other interaction types don't have dedicated counters
      NULL;
  END CASE;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_card_analytics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_contact_search_vector"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.first_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.last_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.email, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.phone, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.address_street, '')), 'C');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_contact_search_vector"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_on_message"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE ai_conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_on_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_digital_business_cards_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_digital_business_cards_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_event_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_event_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_filter_configs_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_filter_configs_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_impersonation_log_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_impersonation_log_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_import_job_progress"("job_id" "uuid", "processed" integer DEFAULT NULL::integer, "successful" integer DEFAULT NULL::integer, "failed" integer DEFAULT NULL::integer, "skipped" integer DEFAULT NULL::integer) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE bulk_import_jobs SET processed_items = COALESCE(processed, processed_items), successful_items = COALESCE(successful, successful_items), failed_items = COALESCE(failed, failed_items), skipped_items = COALESCE(skipped, skipped_items), updated_at = NOW() WHERE id = job_id;
END;
$$;


ALTER FUNCTION "public"."update_import_job_progress"("job_id" "uuid", "processed" integer, "successful" integer, "failed" integer, "skipped" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_job_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_job_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_notification_prefs_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_notification_prefs_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_project_actual_costs"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE projects p
  SET
    actual_labor_cost = (
      SELECT COALESCE(SUM(amount), 0)
      FROM job_expenses
      WHERE project_id = p.id AND expense_type = 'labor'
    ),
    actual_material_cost = (
      SELECT COALESCE(SUM(amount), 0)
      FROM job_expenses
      WHERE project_id = p.id AND expense_type = 'material'
    ),
    actual_equipment_cost = (
      SELECT COALESCE(SUM(amount), 0)
      FROM job_expenses
      WHERE project_id = p.id AND expense_type = 'equipment'
    ),
    actual_other_cost = (
      SELECT COALESCE(SUM(amount), 0)
      FROM job_expenses
      WHERE project_id = p.id AND expense_type IN ('subcontractor', 'permit', 'disposal', 'other')
    ),
    updated_at = NOW()
  WHERE p.id = COALESCE(NEW.project_id, OLD.project_id);

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_project_actual_costs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_quickbooks_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_quickbooks_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_roofing_knowledge_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_roofing_knowledge_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_saved_filters_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_saved_filters_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_signature_documents_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_signature_documents_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_status_substatus_configs_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_status_substatus_configs_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_streaks"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_action_type" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_streak_type TEXT;
  v_current_streak INTEGER;
  v_last_activity DATE;
BEGIN
  -- Determine streak type
  v_streak_type := CASE
    WHEN p_action_type IN ('door_knock', 'conversation') THEN 'daily_activity'
    WHEN p_action_type = 'sale_closed' THEN 'sales_streak'
    ELSE NULL
  END;

  IF v_streak_type IS NULL THEN
    RETURN;
  END IF;

  -- Get current streak
  SELECT current_streak, last_activity_date
  INTO v_current_streak, v_last_activity
  FROM public.user_streaks
  WHERE user_id = p_user_id
  AND tenant_id = p_tenant_id
  AND streak_type = v_streak_type;

  IF NOT FOUND THEN
    -- Create new streak
    INSERT INTO public.user_streaks (
      tenant_id, user_id, streak_type, current_streak, longest_streak, last_activity_date
    ) VALUES (
      p_tenant_id, p_user_id, v_streak_type, 1, 1, CURRENT_DATE
    );
  ELSIF v_last_activity = CURRENT_DATE THEN
    -- Same day, no update needed
    RETURN;
  ELSIF v_last_activity = CURRENT_DATE - INTERVAL '1 day' THEN
    -- Consecutive day, increment streak
    UPDATE public.user_streaks
    SET
      current_streak = current_streak + 1,
      longest_streak = GREATEST(longest_streak, current_streak + 1),
      last_activity_date = CURRENT_DATE,
      updated_at = NOW()
    WHERE user_id = p_user_id
    AND tenant_id = p_tenant_id
    AND streak_type = v_streak_type;
  ELSE
    -- Streak broken, reset to 1
    UPDATE public.user_streaks
    SET
      current_streak = 1,
      last_activity_date = CURRENT_DATE,
      updated_at = NOW()
    WHERE user_id = p_user_id
    AND tenant_id = p_tenant_id
    AND streak_type = v_streak_type;
  END IF;
END;
$$;


ALTER FUNCTION "public"."update_streaks"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_action_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_survey_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_survey_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_targeting_area_stats"("area_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE storm_targeting_areas SET address_count = (SELECT COUNT(*) FROM extracted_addresses WHERE targeting_area_id = area_id), estimated_properties = estimate_addresses_in_area(area_id), updated_at = NOW() WHERE id = area_id;
END;
$$;


ALTER FUNCTION "public"."update_targeting_area_stats"("area_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_task_comments_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_task_comments_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_task_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_task_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_territories_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_territories_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_ui_prefs_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_ui_prefs_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_voice_session_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_voice_session_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_workflows_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_workflows_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_event_times"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.end_at <= NEW.start_at THEN
    RAISE EXCEPTION 'Event end time must be after start time';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_event_times"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."_encryption_keys" (
    "id" integer NOT NULL,
    "key_name" "text" NOT NULL,
    "key_value" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."_encryption_keys" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."_encryption_keys_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."_encryption_keys_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."_encryption_keys_id_seq" OWNED BY "public"."_encryption_keys"."id";



CREATE TABLE IF NOT EXISTS "public"."achievements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "requirement_type" "text" NOT NULL,
    "requirement_value" integer,
    "requirement_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "points_reward" integer DEFAULT 0,
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "tenant_id" "uuid"
);


ALTER TABLE "public"."achievements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."activities" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "created_by" "uuid",
    "contact_id" "uuid",
    "project_id" "uuid",
    "type" character varying(50) NOT NULL,
    "subtype" character varying(50),
    "subject" character varying(255),
    "content" "text",
    "direction" character varying(10),
    "from_address" character varying(255),
    "to_address" character varying(255),
    "outcome" character varying(100),
    "outcome_details" "jsonb",
    "duration_seconds" integer,
    "recording_url" character varying(500),
    "transcript" "text",
    "scheduled_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "reminder_at" timestamp with time zone,
    "external_id" character varying(100),
    "performed_by" "uuid",
    "on_behalf_of" "uuid",
    "is_impersonated_action" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "read_by" "uuid"
);


ALTER TABLE "public"."activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_conversations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."ai_conversations" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_conversations" IS 'AI assistant conversation threads for persistent chat history';



COMMENT ON COLUMN "public"."ai_conversations"."title" IS 'Auto-generated from first message or user-defined';



COMMENT ON COLUMN "public"."ai_conversations"."is_active" IS 'Whether conversation is active (false = archived)';



COMMENT ON COLUMN "public"."ai_conversations"."metadata" IS 'Additional data: { last_context: {...}, message_count: 0 }';



CREATE TABLE IF NOT EXISTS "public"."ai_messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "function_call" "jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ai_messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text", 'system'::"text", 'function'::"text"])))
);


ALTER TABLE "public"."ai_messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_messages" IS 'Individual messages within AI conversations';



COMMENT ON COLUMN "public"."ai_messages"."role" IS 'Message sender: user, assistant, system, or function';



COMMENT ON COLUMN "public"."ai_messages"."content" IS 'Message text content';



COMMENT ON COLUMN "public"."ai_messages"."function_call" IS 'Function call details: { name, parameters, result }';



COMMENT ON COLUMN "public"."ai_messages"."metadata" IS 'Additional data: { voice: boolean, provider: string, context: {...} }';



CREATE TABLE IF NOT EXISTS "public"."ar_damage_markers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid",
    "damage_type" "text" NOT NULL,
    "severity" "text" DEFAULT 'moderate'::"text",
    "coordinates" "jsonb",
    "photo_url" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ar_damage_markers" OWNER TO "postgres";


COMMENT ON TABLE "public"."ar_damage_markers" IS 'Damage markers placed during AR assessment';



COMMENT ON COLUMN "public"."ar_damage_markers"."damage_type" IS 'Type of damage: missing_shingle, crack, dent, etc.';



COMMENT ON COLUMN "public"."ar_damage_markers"."severity" IS 'Severity level: minor, moderate, severe';



COMMENT ON COLUMN "public"."ar_damage_markers"."coordinates" IS '3D coordinates of damage location';



COMMENT ON COLUMN "public"."ar_damage_markers"."photo_url" IS 'Photo evidence of damage';



CREATE TABLE IF NOT EXISTS "public"."ar_measurements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid",
    "measurement_type" "text" NOT NULL,
    "value" numeric NOT NULL,
    "unit" "text" NOT NULL,
    "coordinates" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ar_measurements" OWNER TO "postgres";


COMMENT ON TABLE "public"."ar_measurements" IS 'Measurements captured during AR sessions (area, length, angle)';



COMMENT ON COLUMN "public"."ar_measurements"."measurement_type" IS 'Type: area, length, or angle';



COMMENT ON COLUMN "public"."ar_measurements"."value" IS 'Numeric measurement value';



COMMENT ON COLUMN "public"."ar_measurements"."unit" IS 'Unit of measurement: sq_ft, ft, degrees';



COMMENT ON COLUMN "public"."ar_measurements"."coordinates" IS '3D coordinates where measurement was taken';



CREATE TABLE IF NOT EXISTS "public"."ar_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "device_info" "jsonb",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "ended_at" timestamp with time zone,
    "status" "text" DEFAULT 'in_progress'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ar_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."ar_sessions" IS 'AR assessment sessions for field damage documentation';



COMMENT ON COLUMN "public"."ar_sessions"."tenant_id" IS 'Organization tenant identifier for multi-tenant isolation';



COMMENT ON COLUMN "public"."ar_sessions"."project_id" IS 'Associated project (roof job)';



COMMENT ON COLUMN "public"."ar_sessions"."user_id" IS 'Technician conducting AR assessment';



COMMENT ON COLUMN "public"."ar_sessions"."device_info" IS 'Device capabilities and AR metadata';



COMMENT ON COLUMN "public"."ar_sessions"."status" IS 'Session status: in_progress, completed, cancelled';



CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "old_values" "jsonb",
    "new_values" "jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."automations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "created_by" "uuid",
    "name" character varying(255) NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "trigger_type" character varying(50),
    "trigger_config" "jsonb",
    "actions" "jsonb",
    "conditions" "jsonb",
    "last_run_at" timestamp with time zone,
    "run_count" integer DEFAULT 0,
    "error_count" integer DEFAULT 0
);


ALTER TABLE "public"."automations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."building_codes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "jurisdiction_level" character varying(50),
    "jurisdiction_name" character varying(200),
    "state_code" character varying(2),
    "county" character varying(100),
    "city" character varying(100),
    "code_type" character varying(50),
    "code_section" character varying(50),
    "code_title" "text",
    "code_text" "text",
    "applies_to" "text"[],
    "effective_date" "date",
    "superseded_date" "date",
    "superseded_by" "uuid",
    "source_document" "text",
    "source_url" "text",
    "version" character varying(100),
    "last_verified" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."building_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bulk_import_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "targeting_area_id" "uuid",
    "job_type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "total_items" integer DEFAULT 0,
    "processed_items" integer DEFAULT 0,
    "successful_items" integer DEFAULT 0,
    "failed_items" integer DEFAULT 0,
    "skipped_items" integer DEFAULT 0,
    "created_contacts" integer DEFAULT 0,
    "updated_contacts" integer DEFAULT 0,
    "duplicate_contacts" integer DEFAULT 0,
    "error_message" "text",
    "error_log" "jsonb",
    "retry_count" integer DEFAULT 0,
    "max_retries" integer DEFAULT 3,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "estimated_completion_at" timestamp with time zone,
    "import_settings" "jsonb",
    "results" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "valid_job_type" CHECK (("job_type" = ANY (ARRAY['extract_addresses'::"text", 'enrich_properties'::"text", 'import_contacts'::"text"]))),
    CONSTRAINT "valid_status" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."bulk_import_jobs" OWNER TO "postgres";


COMMENT ON TABLE "public"."bulk_import_jobs" IS 'Background job tracking for address extraction and import';



CREATE TABLE IF NOT EXISTS "public"."business_card_interactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "card_id" "uuid" NOT NULL,
    "interaction_type" character varying(50) NOT NULL,
    "prospect_name" character varying(255),
    "prospect_email" character varying(255),
    "prospect_phone" character varying(50),
    "prospect_company" character varying(255),
    "prospect_message" "text",
    "ip_address" "inet",
    "user_agent" "text",
    "referrer" "text",
    "device_type" character varying(50),
    "browser" character varying(100),
    "os" character varying(100),
    "country" character varying(100),
    "city" character varying(100),
    "interaction_metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "business_card_interactions_interaction_type_check" CHECK ((("interaction_type")::"text" = ANY ((ARRAY['view'::character varying, 'vcard_download'::character varying, 'phone_click'::character varying, 'email_click'::character varying, 'website_click'::character varying, 'linkedin_click'::character varying, 'facebook_click'::character varying, 'instagram_click'::character varying, 'twitter_click'::character varying, 'contact_form_submit'::character varying, 'appointment_booked'::character varying])::"text"[])))
);


ALTER TABLE "public"."business_card_interactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."call_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "contact_id" "uuid",
    "project_id" "uuid",
    "user_id" "uuid",
    "direction" "text" NOT NULL,
    "phone_number" "text" NOT NULL,
    "from_number" "text",
    "to_number" "text",
    "twilio_call_sid" "text",
    "twilio_status" "text",
    "duration" integer,
    "started_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "recording_url" "text",
    "recording_duration" integer,
    "recording_sid" "text",
    "transcription" "text",
    "transcription_confidence" numeric(3,2),
    "transcription_provider" "text",
    "summary" "text",
    "sentiment" "text",
    "key_points" "text"[],
    "outcome" "text",
    "disposition" "text",
    "notes" "text",
    "follow_up_required" boolean DEFAULT false,
    "follow_up_date" "date",
    "follow_up_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_deleted" boolean DEFAULT false,
    CONSTRAINT "call_logs_direction_check" CHECK (("direction" = ANY (ARRAY['inbound'::"text", 'outbound'::"text"])))
);


ALTER TABLE "public"."call_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."call_logs" IS 'Phone call tracking with recording, transcription, and AI analysis via Twilio';



COMMENT ON COLUMN "public"."call_logs"."direction" IS 'Call direction: inbound (received) or outbound (made)';



COMMENT ON COLUMN "public"."call_logs"."twilio_call_sid" IS 'Twilio Call SID (unique identifier for the call)';



COMMENT ON COLUMN "public"."call_logs"."recording_url" IS 'URL to call recording file (Twilio or Supabase Storage)';



CREATE TABLE IF NOT EXISTS "public"."carrier_standards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "carrier_id" "uuid",
    "carrier_name" character varying(255),
    "category" character varying(100) NOT NULL,
    "standard_name" character varying(255) NOT NULL,
    "description" "text",
    "timeframe" character varying(100),
    "timeframe_hours" integer,
    "official_source" boolean DEFAULT false,
    "source_document" "text",
    "source_url" "text",
    "confidence_level" character varying(50) DEFAULT 'reported'::character varying,
    "effective_date" "date",
    "notes" "text",
    "tips" "text"[],
    "verified_by" "uuid",
    "verified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."carrier_standards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."challenges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "challenge_type" "text" NOT NULL,
    "requirement_type" "text" NOT NULL,
    "requirement_value" integer NOT NULL,
    "points_reward" integer NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."challenges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."claim_communications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "claim_id" "uuid" NOT NULL,
    "type" character varying(50),
    "direction" character varying(20),
    "subject" "text",
    "content" "text",
    "sent_at" timestamp with time zone,
    "response_due_at" timestamp with time zone,
    "responded_at" timestamp with time zone,
    "response_overdue" boolean DEFAULT false,
    "from_address" character varying(255),
    "to_address" character varying(255),
    "cc_addresses" "text"[],
    "external_id" character varying(255),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "ingestion_source" character varying(50),
    "raw_email" "jsonb",
    "message_id" character varying(255),
    "in_reply_to" character varying(255),
    "thread_id" character varying(255)
);


ALTER TABLE "public"."claim_communications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."claim_documents" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "claim_id" "uuid" NOT NULL,
    "document_type" character varying(50),
    "name" character varying(255),
    "file_url" "text",
    "file_path" "text",
    "file_size" integer,
    "mime_type" character varying(100),
    "extracted_text" "text",
    "ai_analysis" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "uploaded_by" "uuid"
);


ALTER TABLE "public"."claim_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."claim_supplements" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "claim_id" "uuid" NOT NULL,
    "supplement_number" integer,
    "reason" "text",
    "items" "jsonb",
    "requested_amount" numeric(12,2),
    "approved_amount" numeric(12,2),
    "status" character varying(50),
    "submitted_at" timestamp with time zone,
    "resolved_at" timestamp with time zone,
    "supporting_documents" "uuid"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."claim_supplements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."claim_weather_data" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "claim_id" "uuid",
    "storm_event_id" "uuid",
    "date_of_loss" "date" NOT NULL,
    "noaa_event_id" character varying(100),
    "noaa_report_url" "text",
    "hail_reported" boolean,
    "hail_size_inches" numeric(3,2),
    "wind_speed_mph" integer,
    "wind_direction" character varying(10),
    "precipitation_inches" numeric(4,2),
    "weather_station_id" character varying(50),
    "weather_station_distance_miles" numeric(5,2),
    "local_damage_reports" "jsonb",
    "weather_report_pdf_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."claim_weather_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."claims" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "contact_id" "uuid",
    "project_id" "uuid",
    "claim_number" character varying(100),
    "policy_number" character varying(100),
    "date_of_loss" "date",
    "date_filed" "date",
    "insurance_carrier" character varying(200),
    "adjuster_name" character varying(200),
    "adjuster_email" character varying(255),
    "adjuster_phone" character varying(50),
    "estimated_damage" numeric(12,2),
    "insurance_estimate" numeric(12,2),
    "approved_amount" numeric(12,2),
    "deductible" numeric(12,2),
    "paid_amount" numeric(12,2),
    "recovered_amount" numeric(12,2),
    "status" character varying(50) DEFAULT 'new'::character varying,
    "coverage_analysis" "jsonb",
    "missed_coverages" "jsonb",
    "violations" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "notes" "text",
    "custom_fields" "jsonb",
    "claim_email_address" character varying(255),
    "carrier_id" "uuid"
);


ALTER TABLE "public"."claims" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."commission_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_default" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "rules" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."commission_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."commission_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan_id" "uuid",
    "project_id" "uuid",
    "amount" numeric NOT NULL,
    "percentage" numeric,
    "status" "text" DEFAULT 'pending'::"text",
    "paid_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."commission_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."commission_rules" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "name" character varying(255) NOT NULL,
    "description" "text",
    "applies_to" character varying(50),
    "applies_to_id" "uuid",
    "calculation_type" character varying(50),
    "calculation_config" "jsonb",
    "conditions" "jsonb",
    "is_active" boolean DEFAULT true,
    "priority" integer DEFAULT 0
);


ALTER TABLE "public"."commission_rules" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."commission_summary_by_user" AS
 SELECT "tenant_id",
    "user_id",
    "count"(*) AS "total_records",
    "sum"(
        CASE
            WHEN ("status" = 'pending'::"text") THEN "amount"
            ELSE (0)::numeric
        END) AS "pending_amount",
    "sum"(
        CASE
            WHEN ("status" = 'approved'::"text") THEN "amount"
            ELSE (0)::numeric
        END) AS "approved_amount",
    "sum"(
        CASE
            WHEN ("status" = 'paid'::"text") THEN "amount"
            ELSE (0)::numeric
        END) AS "paid_amount",
    "sum"("amount") AS "total_amount"
   FROM "public"."commission_records"
  GROUP BY "tenant_id", "user_id";


ALTER VIEW "public"."commission_summary_by_user" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."commissions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "rule_id" "uuid",
    "project_value" numeric(12,2),
    "commission_rate" numeric(5,2),
    "commission_amount" numeric(12,2),
    "status" character varying(50) DEFAULT 'pending'::character varying,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "notes" "text",
    "dispute_reason" "text"
);


ALTER TABLE "public"."commissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contacts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "created_by" "uuid",
    "is_deleted" boolean DEFAULT false,
    "first_name" character varying(100) NOT NULL,
    "last_name" character varying(100) NOT NULL,
    "email" character varying(255),
    "phone" character varying(20),
    "mobile_phone" character varying(20),
    "address_street" character varying(255),
    "address_city" character varying(100),
    "address_state" character varying(2),
    "address_zip" character varying(10),
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "type" character varying(50) DEFAULT 'lead'::character varying,
    "stage" character varying(50) DEFAULT 'new'::character varying,
    "source" character varying(100),
    "source_details" "jsonb",
    "assigned_to" "uuid",
    "property_type" character varying(50),
    "roof_type" character varying(100),
    "roof_age" integer,
    "last_inspection_date" "date",
    "property_value" numeric(12,2),
    "square_footage" integer,
    "stories" integer,
    "insurance_carrier" character varying(100),
    "policy_number" character varying(100),
    "claim_number" character varying(100),
    "deductible" numeric(10,2),
    "lead_score" integer DEFAULT 0,
    "priority" character varying(20) DEFAULT 'normal'::character varying,
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb",
    "tags" "text"[],
    "search_vector" "tsvector",
    "quickbooks_customer_id" "text",
    "sms_opt_in" boolean DEFAULT false,
    "sms_opt_in_date" timestamp with time zone,
    "sms_opt_out" boolean DEFAULT false,
    "sms_opt_out_date" timestamp with time zone,
    "sms_opt_out_reason" "text",
    "timezone" "text" DEFAULT 'America/New_York'::"text",
    "email_opt_out" boolean DEFAULT false,
    "email_opt_out_date" timestamp with time zone,
    "email_opt_out_reason" "text",
    "email_invalid" boolean DEFAULT false,
    "email_invalid_date" timestamp with time zone,
    "email_invalid_reason" "text",
    "proline_id" "text",
    "substatus" "text",
    "is_organization" boolean DEFAULT false,
    "company" "text",
    "website" "text",
    "contact_category" "text" DEFAULT 'homeowner'::"text" NOT NULL,
    "policy_holder_id" "uuid",
    "job_type" "text",
    "customer_type" "text",
    "text_consent" boolean DEFAULT false,
    "auto_text_consent" boolean DEFAULT false,
    "auto_call_consent" boolean DEFAULT false,
    CONSTRAINT "contact_category_check" CHECK ((("contact_category" IS NULL) OR ("contact_category" = ANY (ARRAY['homeowner'::"text", 'adjuster'::"text", 'sub_contractor'::"text", 'real_estate_agent'::"text", 'developer'::"text", 'property_manager'::"text", 'local_business'::"text", 'other'::"text"])))),
    CONSTRAINT "contacts_customer_type_check" CHECK (("customer_type" = ANY (ARRAY['insurance'::"text", 'retail'::"text"])))
);


ALTER TABLE "public"."contacts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."contacts"."proline_id" IS 'Unique identifier from Proline CRM for deduplication';



COMMENT ON COLUMN "public"."contacts"."substatus" IS 'Granular status detail (dependent on stage value)';



COMMENT ON COLUMN "public"."contacts"."is_organization" IS 'True if this contact represents a company/organization, false if individual person';



COMMENT ON COLUMN "public"."contacts"."company" IS 'Company name - can be set for both organizations and individuals (employer)';



COMMENT ON COLUMN "public"."contacts"."website" IS 'Company or personal website URL';



COMMENT ON COLUMN "public"."contacts"."contact_category" IS 'Contact category: homeowner, adjuster, sub_contractor, real_estate_agent, developer, property_manager, local_business, or other';



COMMENT ON COLUMN "public"."contacts"."policy_holder_id" IS 'FK to another contact who is the insurance policy holder (when different from property occupant)';



COMMENT ON COLUMN "public"."contacts"."job_type" IS 'Type of job: Roof, Siding, Gutters, etc. (tenant customizable)';



COMMENT ON COLUMN "public"."contacts"."customer_type" IS 'Customer type: insurance or retail';



COMMENT ON COLUMN "public"."contacts"."text_consent" IS 'Has customer consented to receive text messages';



COMMENT ON COLUMN "public"."contacts"."auto_text_consent" IS 'Has customer consented to automated text messages';



COMMENT ON COLUMN "public"."contacts"."auto_call_consent" IS 'Has customer consented to automated calls';



CREATE TABLE IF NOT EXISTS "public"."court_cases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "case_name" character varying(500),
    "citation" character varying(255),
    "docket_number" character varying(100),
    "court" character varying(200),
    "court_level" character varying(50),
    "jurisdiction" character varying(100),
    "plaintiff_type" character varying(50),
    "carrier_id" "uuid",
    "carrier_name" character varying(255),
    "date_filed" "date",
    "date_decided" "date",
    "weather_event_type" character varying(50),
    "weather_event_date" "date",
    "property_type" character varying(50),
    "claim_issues" "text"[],
    "coverage_types_at_issue" "text"[],
    "outcome" character varying(50),
    "outcome_details" "text",
    "damages_awarded" numeric(12,2),
    "bad_faith_found" boolean,
    "attorney_fees_awarded" numeric(12,2),
    "punitive_damages" numeric(12,2),
    "key_holdings" "text"[],
    "legal_issues" "text"[],
    "statutes_cited" "text"[],
    "summary" "text",
    "relevance_notes" "text",
    "quotable_passages" "jsonb",
    "full_opinion_url" "text",
    "source" character varying(100),
    "relevance_tags" "text"[],
    "verified" boolean DEFAULT false,
    "verified_by" "uuid",
    "verified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."court_cases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crew_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "employee_number" "text",
    "email" "text",
    "phone" "text",
    "role" "text" NOT NULL,
    "hourly_rate" numeric(10,2) NOT NULL,
    "overtime_rate" numeric(10,2),
    "is_active" boolean DEFAULT true,
    "hire_date" "date",
    "termination_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "notes" "text",
    CONSTRAINT "crew_members_role_check" CHECK (("role" = ANY (ARRAY['apprentice'::"text", 'journeyman'::"text", 'master'::"text", 'foreman'::"text", 'project_manager'::"text", 'subcontractor'::"text"])))
);


ALTER TABLE "public"."crew_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."digital_business_cards" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "full_name" character varying(255) NOT NULL,
    "job_title" character varying(255),
    "phone" character varying(50),
    "email" character varying(255),
    "company_name" character varying(255),
    "company_address" "text",
    "company_phone" character varying(50),
    "company_email" character varying(255),
    "company_website" character varying(255),
    "linkedin_url" character varying(500),
    "facebook_url" character varying(500),
    "instagram_url" character varying(500),
    "twitter_url" character varying(500),
    "tagline" character varying(255),
    "bio" "text",
    "services" "text",
    "brand_color" character varying(7) DEFAULT '#3b82f6'::character varying,
    "logo_url" character varying(500),
    "profile_photo_url" character varying(500),
    "background_image_url" character varying(500),
    "slug" character varying(100) NOT NULL,
    "qr_code_url" character varying(500),
    "card_url" character varying(500),
    "is_active" boolean DEFAULT true,
    "enable_contact_form" boolean DEFAULT true,
    "enable_appointment_booking" boolean DEFAULT false,
    "total_views" integer DEFAULT 0,
    "total_vcard_downloads" integer DEFAULT 0,
    "total_phone_clicks" integer DEFAULT 0,
    "total_email_clicks" integer DEFAULT 0,
    "total_contact_form_submissions" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_viewed_at" timestamp with time zone,
    CONSTRAINT "digital_business_cards_brand_color_check" CHECK ((("brand_color")::"text" ~ '^#[0-9a-fA-F]{6}$'::"text")),
    CONSTRAINT "digital_business_cards_slug_check" CHECK ((("slug")::"text" ~ '^[a-z0-9-]+$'::"text"))
);


ALTER TABLE "public"."digital_business_cards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dnc_imports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "records_total" integer DEFAULT 0,
    "records_imported" integer DEFAULT 0,
    "records_failed" integer DEFAULT 0,
    "status" "text" DEFAULT 'pending'::"text",
    "error_log" "jsonb",
    "imported_by" "uuid",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."dnc_imports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dnc_registry" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "phone_number" "text" NOT NULL,
    "reason" "text",
    "source" "text",
    "added_by" "uuid",
    "added_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."dnc_registry" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "category" character varying(50),
    "html_content" "text",
    "pdf_template_url" "text",
    "signature_fields" "jsonb" DEFAULT '[]'::"jsonb",
    "is_active" boolean DEFAULT true,
    "requires_customer_signature" boolean DEFAULT true,
    "requires_company_signature" boolean DEFAULT true,
    "expiration_days" integer DEFAULT 30,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."document_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."document_templates" IS 'Reusable document templates with signature field configurations';



COMMENT ON COLUMN "public"."document_templates"."html_content" IS 'HTML template content with {{placeholder}} syntax for dynamic data injection';



COMMENT ON COLUMN "public"."document_templates"."signature_fields" IS 'JSON array of signature field definitions with positions and types';



CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "created_by" "uuid",
    "entity_type" character varying(50) NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "file_url" character varying(500) NOT NULL,
    "file_size" integer,
    "mime_type" character varying(100),
    "type" character varying(50),
    "tags" "text"[],
    "ai_description" "text",
    "ai_tags" "jsonb",
    "damage_detected" boolean,
    "version" integer DEFAULT 1,
    "previous_version_id" "uuid"
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_drafts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "claim_id" "uuid" NOT NULL,
    "communication_id" "uuid",
    "tier" character varying(20) NOT NULL,
    "template_id" character varying(50),
    "to_email" character varying(255),
    "cc_emails" "text"[],
    "subject" "text" NOT NULL,
    "body_html" "text" NOT NULL,
    "body_text" "text" NOT NULL,
    "attachment_url" "text",
    "attachment_name" character varying(255),
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "message_id" character varying(255),
    "send_error" "text",
    "generated_at" timestamp with time zone DEFAULT "now"(),
    "generated_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "reviewed_by" "uuid",
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "sent_at" timestamp with time zone,
    "context" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."email_drafts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "subject" character varying(500) NOT NULL,
    "body" "text" NOT NULL,
    "category" character varying(100),
    "available_variables" "jsonb" DEFAULT '[{"name": "contact_name", "description": "Contact full name"}, {"name": "contact_first_name", "description": "Contact first name"}, {"name": "company_name", "description": "Your company name"}, {"name": "user_name", "description": "Logged in user name"}, {"name": "project_name", "description": "Project name"}, {"name": "appointment_date", "description": "Appointment date/time"}]'::"jsonb",
    "is_active" boolean DEFAULT true,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."email_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "event_type" "text",
    "start_at" timestamp with time zone NOT NULL,
    "end_at" timestamp with time zone NOT NULL,
    "all_day" boolean DEFAULT false,
    "timezone" "text" DEFAULT 'America/New_York'::"text",
    "contact_id" "uuid",
    "project_id" "uuid",
    "job_id" "uuid",
    "location" "text",
    "address_street" "text",
    "address_city" "text",
    "address_state" "text",
    "address_zip" "text",
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "organizer" "uuid",
    "attendees" "uuid"[],
    "external_attendees" "jsonb",
    "status" "text" DEFAULT 'scheduled'::"text",
    "outcome" "text",
    "outcome_notes" "text",
    "reminder_minutes_before" integer DEFAULT 60,
    "reminder_sent" boolean DEFAULT false,
    "reminder_sent_at" timestamp with time zone,
    "is_recurring" boolean DEFAULT false,
    "recurrence_rule" "text",
    "parent_event_id" "uuid",
    "google_calendar_id" "text",
    "outlook_calendar_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "is_deleted" boolean DEFAULT false,
    CONSTRAINT "events_event_type_check" CHECK (("event_type" = ANY (ARRAY['appointment'::"text", 'inspection'::"text", 'adjuster_meeting'::"text", 'crew_meeting'::"text", 'follow_up'::"text", 'callback'::"text", 'estimate'::"text", 'other'::"text"]))),
    CONSTRAINT "events_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'confirmed'::"text", 'cancelled'::"text", 'completed'::"text", 'no_show'::"text"])))
);


ALTER TABLE "public"."events" OWNER TO "postgres";


COMMENT ON TABLE "public"."events" IS 'Calendar events for appointments, inspections, meetings, and follow-ups';



CREATE TABLE IF NOT EXISTS "public"."extracted_addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "targeting_area_id" "uuid" NOT NULL,
    "bulk_import_job_id" "uuid",
    "latitude" numeric(10,7) NOT NULL,
    "longitude" numeric(10,7) NOT NULL,
    "full_address" "text",
    "street_address" "text",
    "city" "text",
    "state" "text",
    "zip_code" "text",
    "osm_property_type" "text",
    "osm_building_type" "text",
    "is_enriched" boolean DEFAULT false,
    "enrichment_cache_id" "uuid",
    "is_selected" boolean DEFAULT true,
    "skip_reason" "text",
    "is_duplicate" boolean DEFAULT false,
    "duplicate_contact_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "owner_name" "text",
    "owner_email" "text",
    "owner_phone" "text",
    "owner_mailing_address" "text",
    "property_value" numeric,
    "year_built" integer,
    "roof_age" integer,
    "roof_type" "text",
    "enrichment_source" "text",
    "enriched_at" timestamp with time zone
);


ALTER TABLE "public"."extracted_addresses" OWNER TO "postgres";


COMMENT ON TABLE "public"."extracted_addresses" IS 'Staging table for addresses before import to contacts';



COMMENT ON COLUMN "public"."extracted_addresses"."owner_name" IS 'Property owner full name from enrichment';



COMMENT ON COLUMN "public"."extracted_addresses"."owner_email" IS 'Property owner email from enrichment';



COMMENT ON COLUMN "public"."extracted_addresses"."owner_phone" IS 'Property owner phone from enrichment';



COMMENT ON COLUMN "public"."extracted_addresses"."enrichment_source" IS 'Source of enrichment: propertyradar, manual, csv_upload';



CREATE TABLE IF NOT EXISTS "public"."filter_configs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "entity_type" "text" NOT NULL,
    "field_name" "text" NOT NULL,
    "field_label" "text" NOT NULL,
    "field_type" "text" NOT NULL,
    "filter_operator" "text" DEFAULT 'equals'::"text" NOT NULL,
    "filter_options" "jsonb" DEFAULT '[]'::"jsonb",
    "display_order" integer DEFAULT 0,
    "is_quick_filter" boolean DEFAULT false,
    "is_advanced_filter" boolean DEFAULT true,
    "is_active" boolean DEFAULT true,
    "custom_field_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "filter_configs_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['contacts'::"text", 'projects'::"text", 'pipeline'::"text", 'activities'::"text", 'tasks'::"text", 'call_logs'::"text"]))),
    CONSTRAINT "filter_configs_field_type_check" CHECK (("field_type" = ANY (ARRAY['text'::"text", 'select'::"text", 'multi_select'::"text", 'date'::"text", 'date_range'::"text", 'number'::"text", 'number_range'::"text", 'boolean'::"text", 'user_select'::"text", 'tag_select'::"text"]))),
    CONSTRAINT "filter_configs_filter_operator_check" CHECK (("filter_operator" = ANY (ARRAY['equals'::"text", 'not_equals'::"text", 'contains'::"text", 'not_contains'::"text", 'starts_with'::"text", 'ends_with'::"text", 'greater_than'::"text", 'less_than'::"text", 'greater_than_or_equal'::"text", 'less_than_or_equal'::"text", 'in'::"text", 'not_in'::"text", 'between'::"text", 'is_null'::"text", 'is_not_null'::"text"])))
);


ALTER TABLE "public"."filter_configs" OWNER TO "postgres";


COMMENT ON TABLE "public"."filter_configs" IS 'Admin-configurable filter definitions for entities';



COMMENT ON COLUMN "public"."filter_configs"."field_type" IS 'UI component type: text, select, multi_select, date, date_range, number, number_range, boolean, user_select, tag_select';



COMMENT ON COLUMN "public"."filter_configs"."filter_operator" IS 'Comparison operator: equals, contains, greater_than, between, etc.';



COMMENT ON COLUMN "public"."filter_configs"."is_quick_filter" IS 'Show in quick filters bar (visible without expanding)';



COMMENT ON COLUMN "public"."filter_configs"."is_advanced_filter" IS 'Show in advanced filters panel';



CREATE TABLE IF NOT EXISTS "public"."filter_usage_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "entity_type" "text" NOT NULL,
    "filter_field" "text" NOT NULL,
    "filter_config_id" "uuid",
    "saved_filter_id" "uuid",
    "filter_value" "jsonb",
    "results_count" integer,
    "used_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."filter_usage_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."filter_usage_logs" IS 'Analytics tracking for filter usage';



CREATE TABLE IF NOT EXISTS "public"."gamification_activities" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "activity_type" character varying(50) NOT NULL,
    "points_earned" integer NOT NULL,
    "entity_type" character varying(50),
    "entity_id" "uuid",
    "details" "jsonb"
);


ALTER TABLE "public"."gamification_activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gamification_scores" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "total_points" integer DEFAULT 0,
    "current_level" integer DEFAULT 1,
    "points_this_week" integer DEFAULT 0,
    "points_this_month" integer DEFAULT 0,
    "doors_knocked" integer DEFAULT 0,
    "contacts_made" integer DEFAULT 0,
    "appointments_set" integer DEFAULT 0,
    "deals_closed" integer DEFAULT 0,
    "referrals_generated" integer DEFAULT 0,
    "achievements" "jsonb" DEFAULT '[]'::"jsonb",
    "badges" "jsonb" DEFAULT '[]'::"jsonb",
    "current_streak_days" integer DEFAULT 0,
    "longest_streak_days" integer DEFAULT 0,
    "last_activity_date" "date",
    "weekly_rank" integer,
    "monthly_rank" integer,
    "all_time_rank" integer,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "enzy_user_id" "text"
);


ALTER TABLE "public"."gamification_scores" OWNER TO "postgres";


COMMENT ON COLUMN "public"."gamification_scores"."enzy_user_id" IS 'Unique identifier from Enzy platform for linking historical knock data';



CREATE TABLE IF NOT EXISTS "public"."knocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "latitude" numeric(10,8) NOT NULL,
    "longitude" numeric(11,8) NOT NULL,
    "address" "text",
    "address_street" "text",
    "address_city" "text",
    "address_state" "text",
    "address_zip" "text",
    "disposition" "text",
    "notes" "text",
    "photos" "text"[],
    "voice_memo_url" "text",
    "appointment_date" timestamp with time zone,
    "callback_date" "date",
    "follow_up_notes" "text",
    "contact_id" "uuid",
    "contact_created" boolean DEFAULT false,
    "territory_id" "uuid",
    "device_location_accuracy" numeric(6,2),
    "knocked_from" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_deleted" boolean DEFAULT false,
    "pin_type" character varying(50) DEFAULT 'knock'::character varying,
    "sync_status" character varying(20) DEFAULT 'synced'::character varying,
    "damage_score" integer DEFAULT 0,
    "enrichment_source" character varying(50),
    "last_sync_attempt" timestamp with time zone,
    "sync_error" "text",
    "owner_name" "text",
    "property_data" "jsonb" DEFAULT '{}'::"jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "knocks_damage_score_check" CHECK ((("damage_score" >= 0) AND ("damage_score" <= 100))),
    CONSTRAINT "knocks_disposition_check" CHECK (("disposition" = ANY (ARRAY['not_home'::"text", 'interested'::"text", 'not_interested'::"text", 'appointment'::"text", 'callback'::"text", 'do_not_contact'::"text", 'already_customer'::"text"]))),
    CONSTRAINT "knocks_pin_type_check" CHECK ((("pin_type")::"text" = ANY ((ARRAY['knock'::character varying, 'quick_pin'::character varying, 'lead_pin'::character varying, 'interested_pin'::character varying])::"text"[]))),
    CONSTRAINT "knocks_sync_status_check" CHECK ((("sync_status")::"text" = ANY ((ARRAY['pending'::character varying, 'syncing'::character varying, 'synced'::character varying, 'error'::character varying])::"text"[])))
);


ALTER TABLE "public"."knocks" OWNER TO "postgres";


COMMENT ON TABLE "public"."knocks" IS 'Door-knocking activity tracking with GPS location and outcomes (Enzy replacement)';



COMMENT ON COLUMN "public"."knocks"."disposition" IS 'Outcome: not_home, interested, not_interested, appointment, callback, do_not_contact, already_customer';



COMMENT ON COLUMN "public"."knocks"."photos" IS 'Array of photo URLs from door/property (Supabase Storage)';



COMMENT ON COLUMN "public"."knocks"."contact_created" IS 'Whether a contact record was created from this knock';



COMMENT ON COLUMN "public"."knocks"."device_location_accuracy" IS 'GPS accuracy in meters from mobile device';



COMMENT ON COLUMN "public"."knocks"."updated_at" IS 'Timestamp of last update, automatically maintained by trigger';



CREATE OR REPLACE VIEW "public"."high_priority_pins" WITH ("security_invoker"='true') AS
 SELECT "k"."id",
    "k"."tenant_id",
    "k"."user_id",
    "k"."latitude",
    "k"."longitude",
    "k"."address",
    "k"."address_street",
    "k"."address_city",
    "k"."address_state",
    "k"."address_zip",
    "k"."disposition",
    "k"."notes",
    "k"."photos",
    "k"."voice_memo_url",
    "k"."appointment_date",
    "k"."callback_date",
    "k"."follow_up_notes",
    "k"."contact_id",
    "k"."contact_created",
    "k"."territory_id",
    "k"."device_location_accuracy",
    "k"."knocked_from",
    "k"."created_at",
    "k"."is_deleted",
    "k"."pin_type",
    "k"."sync_status",
    "k"."damage_score",
    "k"."enrichment_source",
    "k"."last_sync_attempt",
    "k"."sync_error",
    "k"."owner_name",
    "k"."property_data",
    ((("c"."first_name")::"text" || ' '::"text") || (COALESCE("c"."last_name", ''::character varying))::"text") AS "contact_name",
    "c"."phone" AS "contact_phone",
    "c"."email" AS "contact_email"
   FROM ("public"."knocks" "k"
     LEFT JOIN "public"."contacts" "c" ON (("k"."contact_id" = "c"."id")))
  WHERE (("k"."damage_score" >= 60) AND ("k"."is_deleted" = false))
  ORDER BY "k"."damage_score" DESC, "k"."created_at" DESC;


ALTER VIEW "public"."high_priority_pins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."impersonation_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "admin_user_id" "uuid" NOT NULL,
    "impersonated_user_id" "uuid" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp with time zone,
    "duration_seconds" integer GENERATED ALWAYS AS (
CASE
    WHEN ("ended_at" IS NOT NULL) THEN (EXTRACT(epoch FROM ("ended_at" - "started_at")))::integer
    ELSE NULL::integer
END) STORED,
    "reason" "text",
    "ip_address" "inet",
    "user_agent" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "different_users" CHECK (("admin_user_id" <> "impersonated_user_id")),
    CONSTRAINT "impersonation_logs_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'ended'::"text", 'expired'::"text", 'terminated'::"text"])))
);


ALTER TABLE "public"."impersonation_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."impersonation_logs" IS 'Audit trail for admin user impersonation sessions';



COMMENT ON COLUMN "public"."impersonation_logs"."admin_user_id" IS 'Admin who is performing the impersonation';



COMMENT ON COLUMN "public"."impersonation_logs"."impersonated_user_id" IS 'User being impersonated';



COMMENT ON COLUMN "public"."impersonation_logs"."reason" IS 'Optional reason for impersonation (e.g., "Performance review", "Support ticket #123")';



COMMENT ON COLUMN "public"."impersonation_logs"."status" IS 'active: ongoing, ended: manually stopped, expired: timed out, terminated: force-stopped';



CREATE TABLE IF NOT EXISTS "public"."industry_organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "short_code" character varying(50) NOT NULL,
    "full_name" character varying(500),
    "description" "text",
    "website" "text",
    "authority_type" character varying(50),
    "credibility_level" character varying(50) DEFAULT 'industry_standard'::character varying,
    "areas_of_expertise" "text"[],
    "founded_year" integer,
    "headquarters_location" character varying(200),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."industry_organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."industry_standards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "standard_code" character varying(100),
    "title" character varying(500) NOT NULL,
    "category" character varying(100),
    "subcategory" character varying(100),
    "definition" "text",
    "criteria" "text",
    "methodology" "text",
    "examples" "text",
    "applies_to" "text"[],
    "damage_types" "text"[],
    "source_document" character varying(500),
    "source_edition" character varying(100),
    "source_page" character varying(50),
    "source_url" "text",
    "commonly_cited_in" "text"[],
    "legal_weight" character varying(50),
    "effective_date" "date",
    "superseded_date" "date",
    "superseded_by" "uuid",
    "keywords" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."industry_standards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."insurance_carriers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "claims_phone" character varying(50),
    "claims_email" character varying(255),
    "claims_portal_url" "text",
    "claims_mailing_address" "text",
    "statutory_response_days" integer DEFAULT 60,
    "published_response_days" integer,
    "avg_actual_response_days" numeric(5,2),
    "total_claims_tracked" integer DEFAULT 0,
    "avg_initial_response_days" numeric(5,2),
    "supplement_approval_rate" numeric(5,2),
    "dispute_success_rate" numeric(5,2),
    "known_issues" "text"[],
    "tips" "text"[],
    "last_updated" timestamp with time zone,
    "state_licenses" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "short_code" character varying(20),
    "website" "text",
    "naic_code" character varying(20),
    "am_best_rating" character varying(10),
    "headquarters_state" character varying(2),
    "is_national" boolean DEFAULT true
);


ALTER TABLE "public"."insurance_carriers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."insurance_personnel" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid",
    "first_name" character varying(100),
    "last_name" character varying(100),
    "role" character varying(50),
    "carrier_id" "uuid",
    "email" character varying(255),
    "phone" character varying(50),
    "total_claims_handled" integer DEFAULT 0,
    "avg_response_days" numeric(5,2),
    "avg_claim_approval_rate" numeric(5,2),
    "avg_supplement_approval_rate" numeric(5,2),
    "common_omissions" "text"[],
    "communication_style" character varying(50),
    "notes" "text",
    "tips" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_interaction_at" timestamp with time zone
);


ALTER TABLE "public"."insurance_personnel" OWNER TO "postgres";


COMMENT ON TABLE "public"."insurance_personnel" IS 'Insurance adjuster and personnel tracking - tenant-isolated with RLS. NULL tenant_id records are shared reference data visible to all.';



CREATE TABLE IF NOT EXISTS "public"."job_expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "expense_type" "text" NOT NULL,
    "category" "text",
    "description" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "quantity" numeric(10,2),
    "unit_price" numeric(10,2),
    "vendor_name" "text",
    "vendor_id" "uuid",
    "invoice_number" "text",
    "receipt_url" "text",
    "notes" "text",
    "expense_date" "date" NOT NULL,
    "paid_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "is_approved" boolean DEFAULT false,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    CONSTRAINT "job_expenses_expense_type_check" CHECK (("expense_type" = ANY (ARRAY['labor'::"text", 'material'::"text", 'equipment'::"text", 'subcontractor'::"text", 'permit'::"text", 'disposal'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."job_expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "job_number" "text",
    "job_type" "text",
    "scheduled_date" "date",
    "scheduled_start_time" time without time zone,
    "scheduled_end_time" time without time zone,
    "estimated_duration_hours" numeric(5,2),
    "actual_start_at" timestamp with time zone,
    "actual_end_at" timestamp with time zone,
    "actual_duration_hours" numeric(5,2),
    "completion_date" "date",
    "completion_percentage" integer DEFAULT 0,
    "crew_lead" "uuid",
    "crew_members" "uuid"[],
    "crew_size" integer,
    "status" "text" DEFAULT 'scheduled'::"text",
    "weather_delay_days" integer DEFAULT 0,
    "weather_notes" "text",
    "scope_of_work" "text",
    "materials_needed" "jsonb",
    "equipment_needed" "text"[],
    "safety_inspection_completed" boolean DEFAULT false,
    "safety_inspector" "uuid",
    "safety_inspection_date" "date",
    "safety_notes" "text",
    "quality_score" integer,
    "quality_inspector" "uuid",
    "quality_inspection_date" "date",
    "quality_notes" "text",
    "before_photos" "text"[],
    "during_photos" "text"[],
    "after_photos" "text"[],
    "final_inspection_photos" "text"[],
    "customer_present" boolean DEFAULT false,
    "customer_signature_url" "text",
    "customer_feedback" "text",
    "labor_cost" numeric(10,2),
    "material_cost" numeric(10,2),
    "equipment_cost" numeric(10,2),
    "other_costs" numeric(10,2),
    "total_cost" numeric(10,2) GENERATED ALWAYS AS ((((COALESCE("labor_cost", (0)::numeric) + COALESCE("material_cost", (0)::numeric)) + COALESCE("equipment_cost", (0)::numeric)) + COALESCE("other_costs", (0)::numeric))) STORED,
    "notes" "text",
    "internal_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "is_deleted" boolean DEFAULT false,
    CONSTRAINT "jobs_job_type_check" CHECK (("job_type" = ANY (ARRAY['roof_replacement'::"text", 'roof_repair'::"text", 'inspection'::"text", 'maintenance'::"text", 'emergency'::"text", 'other'::"text"]))),
    CONSTRAINT "jobs_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'in_progress'::"text", 'on_hold'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."jobs" OWNER TO "postgres";


COMMENT ON TABLE "public"."jobs" IS 'Production jobs/installations separate from sales projects (crew scheduling, job tracking)';



COMMENT ON COLUMN "public"."jobs"."job_number" IS 'Auto-generated job number in format YY-####';



COMMENT ON COLUMN "public"."jobs"."completion_percentage" IS 'Job completion progress: 0-100%';



COMMENT ON COLUMN "public"."jobs"."crew_members" IS 'Array of user IDs assigned to this job';



COMMENT ON COLUMN "public"."jobs"."customer_signature_url" IS 'URL to customer e-signature for job completion';



COMMENT ON COLUMN "public"."jobs"."total_cost" IS 'Auto-calculated total cost (labor + materials + equipment + other)';



COMMENT ON COLUMN "public"."jobs"."internal_notes" IS 'Internal notes only visible to crew/managers (not customers)';



CREATE TABLE IF NOT EXISTS "public"."knowledge_base" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "source_type" character varying(50),
    "source_id" "uuid",
    "title" character varying(255),
    "content" "text" NOT NULL,
    "embedding" "public"."vector"(1536),
    "metadata" "jsonb",
    "usage_count" integer DEFAULT 0,
    "last_accessed_at" timestamp with time zone
);


ALTER TABLE "public"."knowledge_base" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."knowledge_search_queries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "query_text" "text" NOT NULL,
    "query_embedding" "public"."vector"(1536),
    "results_count" integer,
    "top_result_id" "uuid",
    "relevance_score" double precision,
    "user_id" "uuid",
    "session_id" "text",
    "voice_call_id" "uuid",
    "was_helpful" boolean,
    "feedback_text" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."knowledge_search_queries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kpi_snapshots" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "metric_date" "date" NOT NULL,
    "metric_name" character varying(100) NOT NULL,
    "metric_value" numeric(20,4),
    "dimensions" "jsonb",
    "previous_value" numeric(20,4),
    "target_value" numeric(20,4)
);


ALTER TABLE "public"."kpi_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_points" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action_type" "text" NOT NULL,
    "points_earned" integer NOT NULL,
    "activity_id" "uuid",
    "contact_id" "uuid",
    "project_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "earned_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."user_points" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."leaderboard" WITH ("security_invoker"='true') AS
 SELECT "user_id",
    "tenant_id",
    COALESCE("sum"("points_earned"), (0)::bigint) AS "total_points",
    "count"(DISTINCT "date"("earned_at")) AS "active_days",
    "count"(DISTINCT
        CASE
            WHEN ("action_type" = 'sale_closed'::"text") THEN "id"
            ELSE NULL::"uuid"
        END) AS "total_sales",
    "max"("earned_at") AS "last_activity"
   FROM "public"."user_points" "up"
  GROUP BY "user_id", "tenant_id";


ALTER VIEW "public"."leaderboard" OWNER TO "postgres";


COMMENT ON VIEW "public"."leaderboard" IS 'Leaderboard metrics per user. User display names should be fetched separately from auth context to avoid exposing auth.users.';



CREATE TABLE IF NOT EXISTS "public"."login_activity" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "user_id" "uuid",
    "email" character varying(255) NOT NULL,
    "event_type" character varying(50) NOT NULL,
    "ip_address" "inet",
    "user_agent" "text",
    "device_type" character varying(50),
    "browser" character varying(100),
    "browser_version" character varying(50),
    "os" character varying(100),
    "os_version" character varying(50),
    "location_city" character varying(100),
    "location_region" character varying(100),
    "location_country" character varying(100),
    "location_country_code" character varying(10),
    "location_lat" numeric(9,6),
    "location_lng" numeric(9,6),
    "failure_reason" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."login_activity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."manufacturer_directory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(200) NOT NULL,
    "short_code" character varying(20),
    "website" "text",
    "phone" character varying(50),
    "email" character varying(255),
    "product_support_phone" character varying(50),
    "product_support_email" character varying(255),
    "technical_services_email" character varying(255),
    "warranty_phone" character varying(50),
    "warranty_email" character varying(255),
    "claims_portal_url" "text",
    "regional_contacts" "jsonb",
    "avg_response_days" numeric(5,2),
    "total_inquiries" integer DEFAULT 0,
    "notes" "text",
    "preferred_contact_method" character varying(50),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."manufacturer_directory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."manufacturer_specs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "manufacturer" character varying(100) NOT NULL,
    "product_category" character varying(50),
    "product_name" character varying(200),
    "installation_requirements" "jsonb",
    "warranty_requirements" "jsonb",
    "warranty_document_url" "text",
    "matching_policy" "text",
    "spec_sheet_url" "text",
    "installation_guide_url" "text",
    "last_verified" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."manufacturer_specs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."material_purchases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "material_name" "text" NOT NULL,
    "material_type" "text",
    "supplier" "text" NOT NULL,
    "supplier_id" "uuid",
    "quantity" numeric(10,2) NOT NULL,
    "unit" "text",
    "unit_cost" numeric(10,2) NOT NULL,
    "total_cost" numeric(10,2) GENERATED ALWAYS AS (("quantity" * "unit_cost")) STORED,
    "purchase_order_number" "text",
    "invoice_number" "text",
    "delivery_date" "date",
    "purchase_date" "date" NOT NULL,
    "quantity_used" numeric(10,2) DEFAULT 0,
    "quantity_wasted" numeric(10,2) DEFAULT 0,
    "quantity_returned" numeric(10,2) DEFAULT 0,
    "waste_percent" numeric(5,2) GENERATED ALWAYS AS (
CASE
    WHEN ("quantity" > (0)::numeric) THEN (("quantity_wasted" / "quantity") * (100)::numeric)
    ELSE (0)::numeric
END) STORED,
    "receipt_url" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."material_purchases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."n8n_chat_histories" (
    "id" integer NOT NULL,
    "session_id" character varying(255) NOT NULL,
    "message" "jsonb" NOT NULL
);


ALTER TABLE "public"."n8n_chat_histories" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."n8n_chat_histories_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."n8n_chat_histories_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."n8n_chat_histories_id_seq" OWNED BY "public"."n8n_chat_histories"."id";



CREATE TABLE IF NOT EXISTS "public"."photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "contact_id" "uuid",
    "project_id" "uuid",
    "file_path" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "thumbnail_url" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "uploaded_by" "uuid" NOT NULL,
    "is_deleted" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "claim_id" "uuid",
    "damage_type" "text",
    "severity" "text",
    "photo_order" integer,
    CONSTRAINT "valid_damage_type" CHECK ((("damage_type" IS NULL) OR ("damage_type" = ANY (ARRAY['shingles'::"text", 'ridge_cap'::"text", 'flashing'::"text", 'gutters'::"text", 'soffit'::"text", 'fascia'::"text", 'vents'::"text", 'skylights'::"text", 'chimney'::"text", 'siding'::"text", 'windows'::"text", 'overview'::"text", 'other'::"text"])))),
    CONSTRAINT "valid_severity" CHECK ((("severity" IS NULL) OR ("severity" = ANY (ARRAY['minor'::"text", 'moderate'::"text", 'severe'::"text"]))))
);


ALTER TABLE "public"."photos" OWNER TO "postgres";


COMMENT ON TABLE "public"."photos" IS 'Stores property/project photos with compression metadata';



COMMENT ON COLUMN "public"."photos"."claim_id" IS 'Reference to claim in Claims Management Module';



COMMENT ON COLUMN "public"."photos"."damage_type" IS 'Type of damage shown in photo (shingles, flashing, etc.)';



COMMENT ON COLUMN "public"."photos"."severity" IS 'Severity of damage shown (minor, moderate, severe)';



COMMENT ON COLUMN "public"."photos"."photo_order" IS 'Order for organizing photos in inspection report';



CREATE OR REPLACE VIEW "public"."pins_pending_sync" WITH ("security_invoker"='true') AS
 SELECT "id",
    "pin_type",
    "latitude",
    "longitude",
    "address",
    "disposition",
    "owner_name",
    "notes",
    "photos",
    "sync_status",
    "sync_error",
    "last_sync_attempt",
    "created_at",
    "user_id",
    "tenant_id"
   FROM "public"."knocks"
  WHERE ((("sync_status")::"text" = ANY ((ARRAY['pending'::character varying, 'error'::character varying])::"text"[])) AND ("is_deleted" = false))
  ORDER BY "created_at";


ALTER VIEW "public"."pins_pending_sync" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "created_by" "uuid",
    "is_deleted" boolean DEFAULT false,
    "contact_id" "uuid",
    "parent_project_id" "uuid",
    "name" character varying(255) NOT NULL,
    "project_number" character varying(50),
    "status" character varying(50) DEFAULT 'estimate'::character varying,
    "type" character varying(50),
    "estimated_value" numeric(12,2),
    "approved_value" numeric(12,2),
    "final_value" numeric(12,2),
    "materials_cost" numeric(12,2),
    "labor_cost" numeric(12,2),
    "overhead_cost" numeric(12,2),
    "profit_margin" numeric(5,2),
    "estimated_start" "date",
    "scheduled_start" "date",
    "actual_start" "date",
    "estimated_completion" "date",
    "actual_completion" "date",
    "description" "text",
    "scope_of_work" "text",
    "materials_list" "jsonb",
    "insurance_approved" boolean DEFAULT false,
    "insurance_approval_amount" numeric(12,2),
    "deductible_collected" boolean DEFAULT false,
    "supplements" "jsonb" DEFAULT '[]'::"jsonb",
    "crew_assigned" "jsonb",
    "weather_delays" integer DEFAULT 0,
    "quality_score" integer,
    "quickbooks_id" character varying(100),
    "quickbooks_sync_status" character varying(50),
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb",
    "quickbooks_invoice_id" "text",
    "proline_id" "text",
    "estimated_labor_cost" numeric(10,2),
    "actual_labor_cost" numeric(10,2) DEFAULT 0,
    "estimated_material_cost" numeric(10,2),
    "actual_material_cost" numeric(10,2) DEFAULT 0,
    "estimated_equipment_cost" numeric(10,2),
    "actual_equipment_cost" numeric(10,2) DEFAULT 0,
    "estimated_other_cost" numeric(10,2),
    "actual_other_cost" numeric(10,2) DEFAULT 0,
    "cost_variance" numeric(10,2),
    "profit_amount" numeric(10,2),
    "profit_margin_percent" numeric(5,2),
    "total_revenue" numeric(10,2),
    "payments_received" numeric(10,2) DEFAULT 0,
    "balance_due" numeric(10,2),
    "substatus" "text",
    "pipeline_stage" "public"."pipeline_stage" DEFAULT 'prospect'::"public"."pipeline_stage" NOT NULL,
    "lead_source" "text",
    "priority" "public"."lead_priority" DEFAULT 'normal'::"public"."lead_priority",
    "lead_score" integer DEFAULT 0,
    "estimated_close_date" timestamp with time zone,
    "adjuster_contact_id" "uuid",
    "stage_changed_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "claim_id" "uuid",
    "storm_event_id" "uuid",
    CONSTRAINT "projects_lead_score_check" CHECK ((("lead_score" >= 0) AND ("lead_score" <= 100)))
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


COMMENT ON COLUMN "public"."projects"."proline_id" IS 'Unique identifier from Proline CRM for deduplication. Format: numeric timestamp + random identifier (e.g., 1759354835784x738374090799908400)';



COMMENT ON COLUMN "public"."projects"."substatus" IS 'Granular status detail (dependent on status value)';



COMMENT ON COLUMN "public"."projects"."pipeline_stage" IS 'Unified pipeline stage: prospect → qualified → quote_sent → negotiation → won → production → complete → lost';



COMMENT ON COLUMN "public"."projects"."lead_source" IS 'Where the opportunity came from (referral, door knock, storm targeting, website, etc.)';



COMMENT ON COLUMN "public"."projects"."priority" IS 'Lead priority for sales team: urgent, high, normal, low';



COMMENT ON COLUMN "public"."projects"."lead_score" IS 'Lead scoring for prioritization (0-100)';



COMMENT ON COLUMN "public"."projects"."estimated_close_date" IS 'Estimated date when deal will close (for sales forecasting)';



COMMENT ON COLUMN "public"."projects"."adjuster_contact_id" IS 'Reference to insurance adjuster contact for this project';



COMMENT ON COLUMN "public"."projects"."stage_changed_at" IS 'Timestamp when pipeline_stage was last changed - used for days-in-stage tracking';



COMMENT ON COLUMN "public"."projects"."claim_id" IS 'Reference to claim in external Claims Management Module (UUID, not enforced FK)';



COMMENT ON COLUMN "public"."projects"."storm_event_id" IS 'Which storm event led to this project (for causation documentation)';



CREATE OR REPLACE VIEW "public"."pipeline_metrics" WITH ("security_invoker"='true') AS
 SELECT "contacts"."tenant_id",
    "date_trunc"('day'::"text", "contacts"."created_at") AS "date",
    "contacts"."stage",
    "count"(*) AS "count",
    "sum"(
        CASE
            WHEN ("projects"."id" IS NOT NULL) THEN 1
            ELSE 0
        END) AS "with_projects"
   FROM ("public"."contacts"
     LEFT JOIN "public"."projects" ON (("contacts"."id" = "projects"."contact_id")))
  GROUP BY "contacts"."tenant_id", ("date_trunc"('day'::"text", "contacts"."created_at")), "contacts"."stage";


ALTER VIEW "public"."pipeline_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pipeline_stages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "color" character varying(7) DEFAULT '#3B82F6'::character varying,
    "icon" character varying(50),
    "stage_order" integer NOT NULL,
    "stage_type" character varying(50) DEFAULT 'active'::character varying,
    "win_probability" integer DEFAULT 50,
    "auto_actions" "jsonb" DEFAULT '{"send_sms": false, "send_email": false, "create_task": false, "notify_manager": false}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "pipeline_stages_win_probability_check" CHECK ((("win_probability" >= 0) AND ("win_probability" <= 100)))
);


ALTER TABLE "public"."pipeline_stages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."point_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "action_type" "text" NOT NULL,
    "points_value" integer NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "tenant_id" "uuid"
);


ALTER TABLE "public"."point_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "file_category" "text",
    "file_url" "text" NOT NULL,
    "thumbnail_url" "text",
    "file_size" integer,
    "mime_type" "text",
    "description" "text",
    "tags" "text"[],
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "captured_at" timestamp with time zone,
    "uploaded_by" "uuid",
    "uploaded_from" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_deleted" boolean DEFAULT false
);


ALTER TABLE "public"."project_files" OWNER TO "postgres";


COMMENT ON TABLE "public"."project_files" IS 'Stores metadata for files and photos uploaded to projects';



COMMENT ON COLUMN "public"."project_files"."file_type" IS 'Type of file: photo, document, contract, estimate, invoice, other';



COMMENT ON COLUMN "public"."project_files"."file_category" IS 'Category for photos: before, after, damage, inspection, completion';



CREATE OR REPLACE VIEW "public"."project_profit_loss" WITH ("security_invoker"='true') AS
 SELECT "id" AS "project_id",
    "tenant_id",
    "name" AS "project_name",
    "project_number",
    "status",
    COALESCE("total_revenue", "final_value", "approved_value", "estimated_value", (0)::numeric) AS "revenue",
    COALESCE("estimated_labor_cost", (0)::numeric) AS "estimated_labor",
    COALESCE("estimated_material_cost", (0)::numeric) AS "estimated_materials",
    COALESCE("estimated_equipment_cost", (0)::numeric) AS "estimated_equipment",
    COALESCE("estimated_other_cost", (0)::numeric) AS "estimated_other",
    (((COALESCE("estimated_labor_cost", (0)::numeric) + COALESCE("estimated_material_cost", (0)::numeric)) + COALESCE("estimated_equipment_cost", (0)::numeric)) + COALESCE("estimated_other_cost", (0)::numeric)) AS "total_estimated_cost",
    COALESCE("actual_labor_cost", (0)::numeric) AS "actual_labor",
    COALESCE("actual_material_cost", (0)::numeric) AS "actual_materials",
    COALESCE("actual_equipment_cost", (0)::numeric) AS "actual_equipment",
    COALESCE("actual_other_cost", (0)::numeric) AS "actual_other",
    (((COALESCE("actual_labor_cost", (0)::numeric) + COALESCE("actual_material_cost", (0)::numeric)) + COALESCE("actual_equipment_cost", (0)::numeric)) + COALESCE("actual_other_cost", (0)::numeric)) AS "total_actual_cost",
    (COALESCE("total_revenue", "final_value", "approved_value", "estimated_value", (0)::numeric) - (((COALESCE("actual_labor_cost", (0)::numeric) + COALESCE("actual_material_cost", (0)::numeric)) + COALESCE("actual_equipment_cost", (0)::numeric)) + COALESCE("actual_other_cost", (0)::numeric))) AS "gross_profit",
        CASE
            WHEN (COALESCE("total_revenue", "final_value", "approved_value", "estimated_value", (0)::numeric) > (0)::numeric) THEN (((COALESCE("total_revenue", "final_value", "approved_value", "estimated_value", (0)::numeric) - (((COALESCE("actual_labor_cost", (0)::numeric) + COALESCE("actual_material_cost", (0)::numeric)) + COALESCE("actual_equipment_cost", (0)::numeric)) + COALESCE("actual_other_cost", (0)::numeric))) / COALESCE("total_revenue", "final_value", "approved_value", "estimated_value", (1)::numeric)) * (100)::numeric)
            ELSE (0)::numeric
        END AS "profit_margin_percent",
    ((((COALESCE("actual_labor_cost", (0)::numeric) + COALESCE("actual_material_cost", (0)::numeric)) + COALESCE("actual_equipment_cost", (0)::numeric)) + COALESCE("actual_other_cost", (0)::numeric)) - (((COALESCE("estimated_labor_cost", (0)::numeric) + COALESCE("estimated_material_cost", (0)::numeric)) + COALESCE("estimated_equipment_cost", (0)::numeric)) + COALESCE("estimated_other_cost", (0)::numeric))) AS "cost_variance",
    "actual_start",
    "actual_completion"
   FROM "public"."projects" "p";


ALTER VIEW "public"."project_profit_loss" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_enrichment_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "address_hash" "text" NOT NULL,
    "full_address" "text" NOT NULL,
    "street_address" "text",
    "city" "text",
    "state" "text",
    "zip_code" "text",
    "latitude" numeric(10,7),
    "longitude" numeric(10,7),
    "provider" "text" NOT NULL,
    "provider_id" "text",
    "owner_name" "text",
    "owner_phone" "text",
    "owner_email" "text",
    "owner_mailing_address" "text",
    "property_type" "text",
    "year_built" integer,
    "square_footage" integer,
    "bedrooms" integer,
    "bathrooms" numeric(3,1),
    "lot_size" numeric,
    "stories" integer,
    "assessed_value" bigint,
    "market_value" bigint,
    "last_sale_date" "date",
    "last_sale_price" bigint,
    "equity_estimate" bigint,
    "mortgage_balance" bigint,
    "roof_material" "text",
    "roof_age" integer,
    "roof_condition" "text",
    "property_data" "jsonb",
    "enriched_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '6 mons'::interval),
    "hit_count" integer DEFAULT 0,
    "last_accessed_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."property_enrichment_cache" OWNER TO "postgres";


COMMENT ON TABLE "public"."property_enrichment_cache" IS 'Cached property data to reduce API costs';



CREATE TABLE IF NOT EXISTS "public"."query_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "query_text" "text" NOT NULL,
    "query_type" "text",
    "is_favorite" boolean DEFAULT false,
    "result_count" integer,
    "execution_time_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."query_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quickbooks_connections" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "realm_id" "text" NOT NULL,
    "company_name" "text",
    "access_token" "text" NOT NULL,
    "refresh_token" "text" NOT NULL,
    "token_expires_at" timestamp with time zone NOT NULL,
    "refresh_token_expires_at" timestamp with time zone NOT NULL,
    "is_active" boolean DEFAULT true,
    "last_sync_at" timestamp with time zone,
    "sync_error" "text",
    "environment" character varying(20) DEFAULT 'sandbox'::character varying
);


ALTER TABLE "public"."quickbooks_connections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quickbooks_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "crm_entity_type" "text" NOT NULL,
    "crm_entity_id" "uuid" NOT NULL,
    "qb_entity_type" "text" NOT NULL,
    "qb_entity_id" "text" NOT NULL,
    "last_synced_at" timestamp with time zone,
    "sync_status" "text" DEFAULT 'synced'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."quickbooks_mappings" OWNER TO "postgres";


COMMENT ON TABLE "public"."quickbooks_mappings" IS 'Maps CRM entities to QuickBooks entities';



CREATE TABLE IF NOT EXISTS "public"."quickbooks_sync_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "qb_id" "text",
    "action" "text" NOT NULL,
    "direction" "text" NOT NULL,
    "status" "text" NOT NULL,
    "error_message" "text",
    "error_code" "text",
    "request_payload" "jsonb",
    "response_payload" "jsonb",
    "synced_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."quickbooks_sync_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."quickbooks_sync_logs" IS 'Audit trail for all QuickBooks sync operations';



CREATE TABLE IF NOT EXISTS "public"."quickbooks_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "realm_id" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "token_type" "text" DEFAULT 'Bearer'::"text",
    "company_name" "text",
    "country" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "access_token" "bytea" NOT NULL,
    "refresh_token" "bytea" NOT NULL
);


ALTER TABLE "public"."quickbooks_tokens" OWNER TO "postgres";


COMMENT ON TABLE "public"."quickbooks_tokens" IS 'Stores OAuth tokens for QuickBooks Online integration';



COMMENT ON COLUMN "public"."quickbooks_tokens"."access_token" IS 'QuickBooks OAuth access token - encrypted with pgcrypto pgp_sym_encrypt()';



COMMENT ON COLUMN "public"."quickbooks_tokens"."refresh_token" IS 'QuickBooks OAuth refresh token - encrypted with pgcrypto pgp_sym_encrypt()';



CREATE TABLE IF NOT EXISTS "public"."quote_line_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quote_option_id" "uuid",
    "description" "text" NOT NULL,
    "quantity" numeric DEFAULT 1,
    "unit" "text" DEFAULT 'each'::"text",
    "unit_price" numeric NOT NULL,
    "total" numeric GENERATED ALWAYS AS (("quantity" * "unit_price")) STORED,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid"
);


ALTER TABLE "public"."quote_line_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quote_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "is_selected" boolean DEFAULT false,
    "subtotal" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."quote_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rep_locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "latitude" numeric(10,8) NOT NULL,
    "longitude" numeric(11,8) NOT NULL,
    "accuracy" numeric(6,2),
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "device_info" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."rep_locations" OWNER TO "postgres";


COMMENT ON TABLE "public"."rep_locations" IS 'GPS location tracking for field reps (live map view, coverage analysis)';



COMMENT ON COLUMN "public"."rep_locations"."accuracy" IS 'GPS accuracy in meters (from device)';



COMMENT ON COLUMN "public"."rep_locations"."recorded_at" IS 'Timestamp when GPS location was captured';



COMMENT ON COLUMN "public"."rep_locations"."device_info" IS 'JSONB with device metadata (type, OS, battery, etc.)';



CREATE TABLE IF NOT EXISTS "public"."report_schedules" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "created_by" "uuid",
    "name" character varying(255) NOT NULL,
    "report_type" character varying(50),
    "parameters" "jsonb",
    "frequency" character varying(20),
    "schedule_config" "jsonb",
    "next_run_at" timestamp with time zone,
    "recipients" "jsonb",
    "format" character varying(20),
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."report_schedules" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."revenue_forecast" WITH ("security_invoker"='true') AS
 SELECT "tenant_id",
    "date_trunc"('month'::"text", ("estimated_completion")::timestamp with time zone) AS "month",
    "status",
    "sum"("estimated_value") AS "pipeline_value",
    "sum"("approved_value") AS "approved_value",
    "count"(*) AS "project_count"
   FROM "public"."projects"
  WHERE (("status")::"text" <> ALL ((ARRAY['completed'::character varying, 'cancelled'::character varying])::"text"[]))
  GROUP BY "tenant_id", ("date_trunc"('month'::"text", ("estimated_completion")::timestamp with time zone)), "status";


ALTER VIEW "public"."revenue_forecast" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roofing_knowledge" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "category" "text" NOT NULL,
    "subcategory" "text",
    "embedding" "public"."vector"(1536),
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "source_url" "text",
    "manufacturer" "text",
    "last_verified_at" timestamp with time zone,
    "tenant_id" "uuid",
    "is_global" boolean DEFAULT true,
    "search_vector" "tsvector" GENERATED ALWAYS AS ("to_tsvector"('"english"'::"regconfig", ((((COALESCE("title", ''::"text") || ' '::"text") || COALESCE("content", ''::"text")) || ' '::"text") || COALESCE("category", ''::"text")))) STORED,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."roofing_knowledge" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saved_filters" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "entity_type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "filter_criteria" "jsonb" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "is_shared" boolean DEFAULT false,
    "is_default" boolean DEFAULT false,
    "is_system" boolean DEFAULT false,
    "usage_count" integer DEFAULT 0,
    "last_used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "saved_filters_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['contacts'::"text", 'projects'::"text", 'pipeline'::"text", 'activities'::"text"])))
);


ALTER TABLE "public"."saved_filters" OWNER TO "postgres";


COMMENT ON TABLE "public"."saved_filters" IS 'User-saved filter presets for quick access';



COMMENT ON COLUMN "public"."saved_filters"."filter_criteria" IS 'JSONB object with field names as keys and {operator, value} as values';



COMMENT ON COLUMN "public"."saved_filters"."is_shared" IS 'Share with other users in tenant';



COMMENT ON COLUMN "public"."saved_filters"."is_default" IS 'Auto-apply when user opens entity page';



COMMENT ON COLUMN "public"."saved_filters"."is_system" IS 'System-created filter (cannot be deleted by users)';



CREATE TABLE IF NOT EXISTS "public"."shingle_products" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "manufacturer" character varying(100) NOT NULL,
    "product_line" character varying(100) NOT NULL,
    "color_name" character varying(100),
    "color_code" character varying(50),
    "primary_color_hex" character varying(7),
    "secondary_colors" "jsonb",
    "granule_pattern" "text",
    "dimensions" "jsonb",
    "weight_per_square" numeric(5,2),
    "status" character varying(50) DEFAULT 'available'::character varying,
    "discontinuation_date" "date",
    "replacement_product_id" "uuid",
    "regional_availability" "jsonb",
    "spec_sheet_url" "text",
    "installation_guide_url" "text",
    "warranty_info" "jsonb",
    "matching_notes" "text",
    "last_verified" "date",
    "verification_source" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "image_url" "text",
    "product_page_url" "text"
);


ALTER TABLE "public"."shingle_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."signature_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "contact_id" "uuid",
    "title" character varying(255) NOT NULL,
    "description" "text",
    "document_type" character varying(50) NOT NULL,
    "file_url" "text",
    "template_id" "uuid",
    "status" character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    "requires_customer_signature" boolean DEFAULT true,
    "requires_company_signature" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "sent_at" timestamp with time zone,
    "viewed_at" timestamp with time zone,
    "signed_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "created_by" "uuid",
    "search_vector" "tsvector" GENERATED ALWAYS AS ("to_tsvector"('"english"'::"regconfig", (((COALESCE("title", ''::character varying))::"text" || ' '::"text") || COALESCE("description", ''::"text")))) STORED,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "signature_fields" "jsonb" DEFAULT '[]'::"jsonb",
    "notify_signers_on_complete" boolean DEFAULT true,
    CONSTRAINT "signature_documents_document_type_check" CHECK ((("document_type")::"text" = ANY ((ARRAY['contract'::character varying, 'estimate'::character varying, 'change_order'::character varying, 'waiver'::character varying, 'other'::character varying])::"text"[]))),
    CONSTRAINT "signature_documents_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['draft'::character varying, 'sent'::character varying, 'viewed'::character varying, 'signed'::character varying, 'expired'::character varying, 'declined'::character varying])::"text"[])))
);


ALTER TABLE "public"."signature_documents" OWNER TO "postgres";


COMMENT ON COLUMN "public"."signature_documents"."signature_fields" IS 'Array of field placements for document signing. Each field contains: id, type, label, page, x, y, width, height, required, assignedTo';



COMMENT ON COLUMN "public"."signature_documents"."notify_signers_on_complete" IS 'When true, all signers receive notification email when document is fully signed';



CREATE TABLE IF NOT EXISTS "public"."signatures" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "signer_type" character varying(50) NOT NULL,
    "signer_name" character varying(255) NOT NULL,
    "signer_email" character varying(255),
    "signer_ip_address" "inet",
    "signature_data" "text" NOT NULL,
    "signature_method" character varying(50) DEFAULT 'draw'::character varying,
    "signed_at" timestamp with time zone DEFAULT "now"(),
    "user_agent" "text",
    "is_verified" boolean DEFAULT false,
    "verification_code" character varying(6),
    "completed_fields" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."signatures" OWNER TO "postgres";


COMMENT ON COLUMN "public"."signatures"."completed_fields" IS 'Array of completed field records during signing. Each record contains: field_id, completed_at timestamp, and optional value_hash for audit trail';



CREATE TABLE IF NOT EXISTS "public"."sms_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "message" "text" NOT NULL,
    "category" character varying(100),
    "available_variables" "jsonb" DEFAULT '[{"name": "contact_name", "description": "Contact full name"}, {"name": "contact_first_name", "description": "Contact first name"}, {"name": "company_name", "description": "Your company name"}, {"name": "user_name", "description": "Logged in user name"}, {"name": "appointment_date", "description": "Appointment date/time"}]'::"jsonb",
    "is_active" boolean DEFAULT true,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "sms_templates_message_check" CHECK (("length"("message") <= 1600))
);


ALTER TABLE "public"."sms_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."status_substatus_configs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "entity_type" "text" NOT NULL,
    "status_field_name" "text" NOT NULL,
    "status_value" "text" NOT NULL,
    "substatus_value" "text" NOT NULL,
    "substatus_label" "text" NOT NULL,
    "substatus_description" "text",
    "display_order" integer DEFAULT 0,
    "color" "text",
    "icon" "text",
    "is_active" boolean DEFAULT true,
    "is_default" boolean DEFAULT false,
    "is_terminal" boolean DEFAULT false,
    "auto_transition_to" "text",
    "auto_transition_delay_hours" integer,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "status_substatus_configs_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['contacts'::"text", 'projects'::"text", 'activities'::"text"])))
);


ALTER TABLE "public"."status_substatus_configs" OWNER TO "postgres";


COMMENT ON TABLE "public"."status_substatus_configs" IS 'Configurable substatus options for status fields';



COMMENT ON COLUMN "public"."status_substatus_configs"."substatus_value" IS 'Code/slug for the substatus (stored in entity table)';



COMMENT ON COLUMN "public"."status_substatus_configs"."substatus_label" IS 'Human-readable display label';



COMMENT ON COLUMN "public"."status_substatus_configs"."is_default" IS 'Auto-select when status changes to parent status value';



COMMENT ON COLUMN "public"."status_substatus_configs"."is_terminal" IS 'Cannot change substatus after setting this one';



COMMENT ON COLUMN "public"."status_substatus_configs"."auto_transition_to" IS 'Automatically transition to this substatus after delay';



CREATE TABLE IF NOT EXISTS "public"."storm_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "priority" "text" NOT NULL,
    "message" "text" NOT NULL,
    "action_items" "text"[],
    "storm_event_id" "uuid",
    "affected_area" "jsonb" NOT NULL,
    "dismissed" boolean DEFAULT false,
    "acknowledged_by" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_alert_type" CHECK (("type" = ANY (ARRAY['storm_approaching'::"text", 'storm_active'::"text", 'hail_detected'::"text", 'high_winds'::"text", 'tornado_warning'::"text"]))),
    CONSTRAINT "valid_priority" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."storm_alerts" OWNER TO "postgres";


COMMENT ON TABLE "public"."storm_alerts" IS 'Stores storm alerts with acknowledgment/dismissal tracking';



CREATE TABLE IF NOT EXISTS "public"."storm_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "noaa_event_id" "text",
    "event_date" "date" NOT NULL,
    "event_type" "text" NOT NULL,
    "magnitude" numeric,
    "state" "text" NOT NULL,
    "county" "text",
    "city" "text",
    "latitude" numeric(10,7),
    "longitude" numeric(10,7),
    "path_length" numeric,
    "path_width" numeric,
    "path_polygon" "public"."geography"(Polygon,4326),
    "property_damage" bigint,
    "crop_damage" bigint,
    "injuries" integer DEFAULT 0,
    "deaths" integer DEFAULT 0,
    "event_narrative" "text",
    "episode_narrative" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_event_type" CHECK (("event_type" = ANY (ARRAY['hail'::"text", 'tornado'::"text", 'thunderstorm_wind'::"text", 'flood'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."storm_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."storm_events" IS 'Stores NOAA storm event data for overlay and targeting';



CREATE TABLE IF NOT EXISTS "public"."storm_response_mode" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "mode" "text" DEFAULT 'normal'::"text" NOT NULL,
    "activated_at" timestamp with time zone,
    "activated_by" "uuid",
    "storm_event_id" "uuid",
    "settings" "jsonb" DEFAULT '{"extendedHours": false, "priorityRouting": false, "autoNotifications": false, "autoLeadGeneration": false, "crewPrePositioning": false}'::"jsonb" NOT NULL,
    "metrics" "jsonb" DEFAULT '{"leadsGenerated": 0, "estimatedRevenue": 0, "customersNotified": 0, "appointmentsScheduled": 0}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_response_mode" CHECK (("mode" = ANY (ARRAY['normal'::"text", 'storm_watch'::"text", 'storm_response'::"text", 'emergency'::"text"])))
);


ALTER TABLE "public"."storm_response_mode" OWNER TO "postgres";


COMMENT ON TABLE "public"."storm_response_mode" IS 'Stores current storm response mode configuration per tenant';



CREATE TABLE IF NOT EXISTS "public"."storm_targeting_areas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "boundary_polygon" "public"."geography"(Polygon,4326) NOT NULL,
    "storm_event_id" "uuid",
    "area_sq_miles" numeric,
    "address_count" integer DEFAULT 0,
    "estimated_properties" integer,
    "status" "text" DEFAULT 'draft'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "valid_status" CHECK (("status" = ANY (ARRAY['draft'::"text", 'extracting'::"text", 'extracted'::"text", 'enriching'::"text", 'enriched'::"text", 'importing'::"text", 'imported'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."storm_targeting_areas" OWNER TO "postgres";


COMMENT ON TABLE "public"."storm_targeting_areas" IS 'User-drawn polygons for bulk address extraction';



CREATE TABLE IF NOT EXISTS "public"."surveys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "contact_id" "uuid",
    "job_id" "uuid",
    "user_id" "uuid",
    "survey_type" "text" DEFAULT 'post_job'::"text",
    "delivery_method" "text" DEFAULT 'sms'::"text",
    "qr_code_url" "text",
    "survey_link" "text",
    "survey_token" "text",
    "sent_at" timestamp with time zone,
    "sent_to_phone" "text",
    "sent_to_email" "text",
    "delivery_status" "text" DEFAULT 'pending'::"text",
    "delivery_error" "text",
    "opened_at" timestamp with time zone,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "rating" integer,
    "feedback" "text",
    "question_1_response" "text",
    "question_2_response" "text",
    "question_3_response" "text",
    "additional_responses" "jsonb",
    "review_threshold" integer DEFAULT 4,
    "review_requested" boolean DEFAULT false,
    "review_posted" boolean DEFAULT false,
    "review_platform" "text",
    "review_url" "text",
    "review_posted_at" timestamp with time zone,
    "is_negative_feedback" boolean DEFAULT false,
    "manager_notified" boolean DEFAULT false,
    "manager_notified_at" timestamp with time zone,
    "manager_response" "text",
    "issue_resolved" boolean DEFAULT false,
    "resolution_notes" "text",
    "response_time_seconds" integer,
    "device_info" "jsonb",
    "ip_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "is_deleted" boolean DEFAULT false,
    CONSTRAINT "surveys_delivery_method_check" CHECK (("delivery_method" = ANY (ARRAY['sms'::"text", 'email'::"text", 'qr_code'::"text", 'link'::"text"]))),
    CONSTRAINT "surveys_delivery_status_check" CHECK (("delivery_status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'delivered'::"text", 'failed'::"text"]))),
    CONSTRAINT "surveys_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5))),
    CONSTRAINT "surveys_survey_type_check" CHECK (("survey_type" = ANY (ARRAY['post_job'::"text", 'mid_project'::"text", 'follow_up'::"text", 'general'::"text"])))
);


ALTER TABLE "public"."surveys" OWNER TO "postgres";


COMMENT ON TABLE "public"."surveys" IS 'Customer satisfaction surveys with review gating (4-5 stars → public review, 1-3 → internal)';



CREATE TABLE IF NOT EXISTS "public"."task_activity" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action" character varying(100) NOT NULL,
    "changes" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_activity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "file_name" character varying(255) NOT NULL,
    "file_url" "text" NOT NULL,
    "file_type" character varying(100),
    "file_size" bigint,
    "uploaded_by" "uuid",
    "uploaded_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "comment" "text" NOT NULL,
    "is_edited" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "project_id" "uuid",
    "contact_id" "uuid",
    "assigned_to" "uuid",
    "due_date" "date",
    "completed_at" timestamp with time zone,
    "priority" "text" DEFAULT 'medium'::"text",
    "status" "text" DEFAULT 'todo'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "is_deleted" boolean DEFAULT false,
    "start_date" timestamp with time zone,
    "parent_task_id" "uuid",
    "assigned_by" "uuid",
    "progress" integer DEFAULT 0,
    "estimated_hours" numeric(10,2),
    "actual_hours" numeric(10,2),
    "tags" "text"[],
    "labels" "jsonb" DEFAULT '[]'::"jsonb",
    "reminder_enabled" boolean DEFAULT false,
    "reminder_date" timestamp with time zone,
    "reminder_sent" boolean DEFAULT false,
    "is_archived" boolean DEFAULT false,
    "search_vector" "tsvector" GENERATED ALWAYS AS ("to_tsvector"('"english"'::"regconfig", ((COALESCE("title", ''::"text") || ' '::"text") || COALESCE("description", ''::"text")))) STORED,
    CONSTRAINT "tasks_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text"]))),
    CONSTRAINT "tasks_progress_check" CHECK ((("progress" >= 0) AND ("progress" <= 100))),
    CONSTRAINT "tasks_status_check" CHECK (("status" = ANY (ARRAY['todo'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


COMMENT ON TABLE "public"."tasks" IS 'Task management for projects, contacts, and general work items';



COMMENT ON COLUMN "public"."tasks"."priority" IS 'Task priority: low, medium, high';



COMMENT ON COLUMN "public"."tasks"."status" IS 'Task status: todo, in_progress, completed, cancelled';



CREATE TABLE IF NOT EXISTS "public"."templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "created_by" "uuid",
    "type" character varying(50) NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "subject" character varying(255),
    "content" "text" NOT NULL,
    "variables" "jsonb",
    "is_active" boolean DEFAULT true,
    "is_default" boolean DEFAULT false,
    "usage_count" integer DEFAULT 0,
    "last_used_at" timestamp with time zone
);


ALTER TABLE "public"."templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "company_name" character varying(255),
    "company_tagline" character varying(255),
    "logo_url" "text",
    "primary_color" character varying(7) DEFAULT '#3B82F6'::character varying,
    "secondary_color" character varying(7) DEFAULT '#10B981'::character varying,
    "accent_color" character varying(7) DEFAULT '#8B5CF6'::character varying,
    "email_header_logo_url" "text",
    "email_footer_text" "text",
    "email_signature" "text",
    "timezone" character varying(100) DEFAULT 'America/New_York'::character varying,
    "locale" character varying(10) DEFAULT 'en-US'::character varying,
    "date_format" character varying(50) DEFAULT 'MM/DD/YYYY'::character varying,
    "time_format" character varying(50) DEFAULT '12h'::character varying,
    "currency" character varying(3) DEFAULT 'USD'::character varying,
    "business_hours" "jsonb" DEFAULT '{"friday": {"open": "09:00", "close": "17:00", "enabled": true}, "monday": {"open": "09:00", "close": "17:00", "enabled": true}, "sunday": {"open": "09:00", "close": "13:00", "enabled": false}, "tuesday": {"open": "09:00", "close": "17:00", "enabled": true}, "saturday": {"open": "09:00", "close": "13:00", "enabled": false}, "thursday": {"open": "09:00", "close": "17:00", "enabled": true}, "wednesday": {"open": "09:00", "close": "17:00", "enabled": true}}'::"jsonb",
    "email_notifications_enabled" boolean DEFAULT true,
    "sms_notifications_enabled" boolean DEFAULT true,
    "push_notifications_enabled" boolean DEFAULT true,
    "integrations" "jsonb" DEFAULT '{"stripe": {"enabled": false, "secret_key": null, "publishable_key": null}, "twilio": {"enabled": false, "auth_token": null, "account_sid": null, "phone_number": null}, "quickbooks": {"enabled": false, "realm_id": null, "company_id": null}, "google_maps": {"api_key": null, "enabled": false}}'::"jsonb",
    "default_lead_assignee" "uuid",
    "auto_assign_leads" boolean DEFAULT false,
    "round_robin_assignment" boolean DEFAULT false,
    "custom_settings" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tenant_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" character varying(50) DEFAULT 'member'::character varying,
    "joined_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "status" character varying(20) DEFAULT 'active'::character varying,
    "deactivated_at" timestamp with time zone,
    "deactivated_by" "uuid",
    "deactivation_reason" "text",
    CONSTRAINT "tenant_users_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'deactivated'::character varying, 'suspended'::character varying, 'pending'::character varying])::"text"[])))
);


ALTER TABLE "public"."tenant_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "name" character varying(255) NOT NULL,
    "subdomain" character varying(100) NOT NULL,
    "custom_domain" character varying(255),
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "features" "jsonb" DEFAULT '{"max_users": 10, "max_contacts": 10000}'::"jsonb",
    "subscription_status" character varying(50) DEFAULT 'trial'::character varying,
    "subscription_expires_at" timestamp with time zone,
    "logo_url" character varying(500),
    "primary_color" character varying(7),
    "secondary_color" character varying(7),
    "is_active" boolean DEFAULT true,
    "auto_create_project_for_homeowners" "text" DEFAULT 'prompt'::"text",
    CONSTRAINT "tenants_auto_create_project_for_homeowners_check" CHECK (("auto_create_project_for_homeowners" = ANY (ARRAY['always'::"text", 'prompt'::"text", 'never'::"text"])))
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tenants"."auto_create_project_for_homeowners" IS 'Controls behavior when homeowner contacts are created: always (auto-create project), prompt (ask user), never (manual only)';



CREATE TABLE IF NOT EXISTS "public"."territories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "created_by" "uuid",
    "is_deleted" boolean DEFAULT false,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "boundary_data" "jsonb",
    "assigned_to" "uuid",
    "stats_cache" "jsonb" DEFAULT '{}'::"jsonb",
    "stats_updated_at" timestamp with time zone
);


ALTER TABLE "public"."territories" OWNER TO "postgres";


COMMENT ON TABLE "public"."territories" IS 'Sales territories with geographic boundaries for organizing contacts and activities';



COMMENT ON COLUMN "public"."territories"."boundary_data" IS 'GeoJSON Polygon or MultiPolygon defining territory boundary';



COMMENT ON COLUMN "public"."territories"."stats_cache" IS 'Cached statistics (contact count, project count, etc.) - updated periodically';



CREATE TABLE IF NOT EXISTS "public"."timesheets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "crew_member_id" "uuid" NOT NULL,
    "work_date" "date" NOT NULL,
    "start_time" time without time zone,
    "end_time" time without time zone,
    "regular_hours" numeric(5,2) DEFAULT 0 NOT NULL,
    "overtime_hours" numeric(5,2) DEFAULT 0,
    "hourly_rate" numeric(10,2) NOT NULL,
    "overtime_rate" numeric(10,2),
    "total_labor_cost" numeric(10,2) GENERATED ALWAYS AS ((("regular_hours" * "hourly_rate") + ("overtime_hours" * COALESCE("overtime_rate", ("hourly_rate" * 1.5))))) STORED,
    "work_description" "text",
    "task_completed" "text",
    "status" "text" DEFAULT 'draft'::"text",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "timesheets_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'submitted'::"text", 'approved'::"text", 'paid'::"text"])))
);


ALTER TABLE "public"."timesheets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_achievements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "achievement_id" "uuid" NOT NULL,
    "earned_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."user_achievements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_challenges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "challenge_id" "uuid" NOT NULL,
    "current_progress" integer DEFAULT 0,
    "is_completed" boolean DEFAULT false,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."user_challenges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email_new_lead" boolean DEFAULT true,
    "email_project_update" boolean DEFAULT true,
    "email_task_assigned" boolean DEFAULT true,
    "email_message_received" boolean DEFAULT true,
    "email_document_signed" boolean DEFAULT true,
    "email_daily_digest" boolean DEFAULT false,
    "email_weekly_report" boolean DEFAULT true,
    "sms_new_lead" boolean DEFAULT false,
    "sms_project_update" boolean DEFAULT false,
    "sms_task_assigned" boolean DEFAULT true,
    "sms_message_received" boolean DEFAULT true,
    "sms_urgent_only" boolean DEFAULT true,
    "push_enabled" boolean DEFAULT true,
    "push_new_lead" boolean DEFAULT true,
    "push_project_update" boolean DEFAULT true,
    "push_task_assigned" boolean DEFAULT true,
    "quiet_hours_enabled" boolean DEFAULT false,
    "quiet_hours_start" time without time zone DEFAULT '22:00:00'::time without time zone,
    "quiet_hours_end" time without time zone DEFAULT '07:00:00'::time without time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_notification_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_role_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"(),
    "assigned_by" "uuid"
);


ALTER TABLE "public"."user_role_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "is_system" boolean DEFAULT false,
    "permissions" "jsonb" DEFAULT '{"calls": {"edit": true, "view": true, "create": true, "delete": false}, "files": {"edit": true, "view": true, "create": true, "delete": false}, "tasks": {"edit": true, "view": true, "create": true, "delete": false}, "users": {"edit": false, "view": false, "create": false, "delete": false}, "billing": {"edit": false, "view": false, "create": false, "delete": false}, "reports": {"edit": false, "view": true, "create": false, "delete": false}, "contacts": {"edit": true, "view": true, "create": true, "delete": false}, "projects": {"edit": true, "view": true, "create": true, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_token_hash" "text" NOT NULL,
    "ip_address" "inet",
    "user_agent" "text",
    "device_type" character varying(50),
    "browser" character varying(100),
    "browser_version" character varying(50),
    "os" character varying(100),
    "os_version" character varying(50),
    "location_city" character varying(100),
    "location_region" character varying(100),
    "location_country" character varying(100),
    "location_country_code" character varying(10),
    "is_current" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "last_active_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone NOT NULL,
    "revoked_at" timestamp with time zone,
    "revoked_reason" character varying(100)
);


ALTER TABLE "public"."user_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_streaks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "streak_type" "text" NOT NULL,
    "current_streak" integer DEFAULT 0,
    "longest_streak" integer DEFAULT 0,
    "last_activity_date" "date",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."user_streaks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_ui_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "nav_style" character varying(20) DEFAULT 'traditional'::character varying,
    "ui_mode" character varying(20),
    "ui_mode_auto_detect" boolean DEFAULT true,
    "theme" character varying(20) DEFAULT 'system'::character varying,
    "sidebar_collapsed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_ui_preferences_nav_style_check" CHECK ((("nav_style")::"text" = ANY ((ARRAY['traditional'::character varying, 'instagram'::character varying])::"text"[]))),
    CONSTRAINT "user_ui_preferences_theme_check" CHECK ((("theme")::"text" = ANY ((ARRAY['light'::character varying, 'dark'::character varying, 'system'::character varying])::"text"[]))),
    CONSTRAINT "user_ui_preferences_ui_mode_check" CHECK ((("ui_mode")::"text" = ANY ((ARRAY['field'::character varying, 'manager'::character varying, 'full'::character varying])::"text"[])))
);


ALTER TABLE "public"."user_ui_preferences" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_ui_preferences" IS 'User interface preferences including navigation style, UI mode, and layout settings';



COMMENT ON COLUMN "public"."user_ui_preferences"."nav_style" IS 'Navigation style preference: traditional (sidebar) or instagram (bottom nav)';



COMMENT ON COLUMN "public"."user_ui_preferences"."ui_mode" IS 'Preferred UI mode, may be overridden by auto-detection';



COMMENT ON COLUMN "public"."user_ui_preferences"."ui_mode_auto_detect" IS 'Whether to auto-detect UI mode based on device/context';



CREATE TABLE IF NOT EXISTS "public"."voice_function_calls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "function_name" "text" NOT NULL,
    "parameters" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "result" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "entity_type" "text",
    "entity_id" "uuid",
    "called_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "duration_ms" integer,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."voice_function_calls" OWNER TO "postgres";


COMMENT ON TABLE "public"."voice_function_calls" IS 'Logs all CRM actions performed via voice commands during sessions';



COMMENT ON COLUMN "public"."voice_function_calls"."function_name" IS 'Name of CRM function called: create_contact, add_note, search_contact, etc.';



COMMENT ON COLUMN "public"."voice_function_calls"."entity_type" IS 'Type of entity created/modified: contact, project, activity';



COMMENT ON COLUMN "public"."voice_function_calls"."entity_id" IS 'ID of the created/modified entity';



CREATE TABLE IF NOT EXISTS "public"."voice_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_id" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp with time zone,
    "duration_seconds" integer,
    "contact_id" "uuid",
    "project_id" "uuid",
    "context" "jsonb" DEFAULT '{}'::"jsonb",
    "total_audio_duration_seconds" integer DEFAULT 0,
    "total_tokens_used" integer DEFAULT 0,
    "function_calls_count" integer DEFAULT 0,
    "connection_info" "jsonb" DEFAULT '{}'::"jsonb",
    "error_log" "jsonb"[] DEFAULT ARRAY[]::"jsonb"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "provider" "text" DEFAULT 'openai'::"text" NOT NULL
);


ALTER TABLE "public"."voice_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."voice_sessions" IS 'Tracks voice assistant sessions using OpenAI Realtime API or ElevenLabs Conversational AI with WebRTC';



COMMENT ON COLUMN "public"."voice_sessions"."session_id" IS 'Provider-specific session ID (OpenAI session ID or ElevenLabs conversation ID)';



COMMENT ON COLUMN "public"."voice_sessions"."status" IS 'Session status: active, completed, failed';



COMMENT ON COLUMN "public"."voice_sessions"."context" IS 'Session context: location, recent activities, current work';



COMMENT ON COLUMN "public"."voice_sessions"."connection_info" IS 'WebRTC connection details and metadata';



CREATE TABLE IF NOT EXISTS "public"."win_loss_reasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "reason" character varying(255) NOT NULL,
    "reason_type" character varying(10) NOT NULL,
    "category" character varying(100),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "win_loss_reasons_reason_type_check" CHECK ((("reason_type")::"text" = ANY ((ARRAY['won'::character varying, 'lost'::character varying])::"text"[])))
);


ALTER TABLE "public"."win_loss_reasons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_executions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workflow_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "trigger_data" "jsonb" NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "current_step_id" "uuid",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."workflow_executions" OWNER TO "postgres";


COMMENT ON TABLE "public"."workflow_executions" IS 'Track workflow execution history. RLS disabled - tenant isolation handled at API level.';



CREATE TABLE IF NOT EXISTS "public"."workflow_step_executions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "execution_id" "uuid" NOT NULL,
    "step_id" "uuid" NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "result_data" "jsonb",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."workflow_step_executions" OWNER TO "postgres";


COMMENT ON TABLE "public"."workflow_step_executions" IS 'Track individual step execution history. RLS disabled - access controlled via parent tables.';



CREATE TABLE IF NOT EXISTS "public"."workflow_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workflow_id" "uuid" NOT NULL,
    "step_order" integer NOT NULL,
    "step_type" character varying(50) NOT NULL,
    "step_config" "jsonb" NOT NULL,
    "delay_minutes" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."workflow_steps" OWNER TO "postgres";


COMMENT ON TABLE "public"."workflow_steps" IS 'Individual steps/actions in a workflow. RLS disabled - access controlled via workflows table.';



CREATE TABLE IF NOT EXISTS "public"."workflows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" character varying(200) NOT NULL,
    "description" "text",
    "trigger_type" character varying(50) NOT NULL,
    "trigger_config" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_deleted" boolean DEFAULT false
);


ALTER TABLE "public"."workflows" OWNER TO "postgres";


COMMENT ON TABLE "public"."workflows" IS 'Automation workflows with triggers and actions. RLS disabled - tenant isolation handled at API level.';



ALTER TABLE ONLY "public"."_encryption_keys" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."_encryption_keys_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."n8n_chat_histories" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."n8n_chat_histories_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."_encryption_keys"
    ADD CONSTRAINT "_encryption_keys_key_name_key" UNIQUE ("key_name");



ALTER TABLE ONLY "public"."_encryption_keys"
    ADD CONSTRAINT "_encryption_keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."achievements"
    ADD CONSTRAINT "achievements_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."achievements"
    ADD CONSTRAINT "achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_conversations"
    ADD CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_messages"
    ADD CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ar_damage_markers"
    ADD CONSTRAINT "ar_damage_markers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ar_measurements"
    ADD CONSTRAINT "ar_measurements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ar_sessions"
    ADD CONSTRAINT "ar_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."automations"
    ADD CONSTRAINT "automations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."building_codes"
    ADD CONSTRAINT "building_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bulk_import_jobs"
    ADD CONSTRAINT "bulk_import_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."business_card_interactions"
    ADD CONSTRAINT "business_card_interactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."call_logs"
    ADD CONSTRAINT "call_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."call_logs"
    ADD CONSTRAINT "call_logs_twilio_call_sid_key" UNIQUE ("twilio_call_sid");



ALTER TABLE ONLY "public"."carrier_standards"
    ADD CONSTRAINT "carrier_standards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."claim_communications"
    ADD CONSTRAINT "claim_communications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."claim_documents"
    ADD CONSTRAINT "claim_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."claim_supplements"
    ADD CONSTRAINT "claim_supplements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."claim_weather_data"
    ADD CONSTRAINT "claim_weather_data_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."commission_plans"
    ADD CONSTRAINT "commission_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."commission_records"
    ADD CONSTRAINT "commission_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."commission_rules"
    ADD CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."commissions"
    ADD CONSTRAINT "commissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_tenant_id_email_key" UNIQUE ("tenant_id", "email");



ALTER TABLE ONLY "public"."court_cases"
    ADD CONSTRAINT "court_cases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crew_members"
    ADD CONSTRAINT "crew_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."digital_business_cards"
    ADD CONSTRAINT "digital_business_cards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."digital_business_cards"
    ADD CONSTRAINT "digital_business_cards_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."digital_business_cards"
    ADD CONSTRAINT "digital_business_cards_tenant_id_user_id_key" UNIQUE ("tenant_id", "user_id");



ALTER TABLE ONLY "public"."dnc_imports"
    ADD CONSTRAINT "dnc_imports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dnc_registry"
    ADD CONSTRAINT "dnc_registry_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dnc_registry"
    ADD CONSTRAINT "dnc_registry_tenant_id_phone_number_key" UNIQUE ("tenant_id", "phone_number");



ALTER TABLE ONLY "public"."document_templates"
    ADD CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_templates"
    ADD CONSTRAINT "document_templates_tenant_name_unique" UNIQUE ("tenant_id", "name");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_drafts"
    ADD CONSTRAINT "email_drafts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."extracted_addresses"
    ADD CONSTRAINT "extracted_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."filter_configs"
    ADD CONSTRAINT "filter_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."filter_configs"
    ADD CONSTRAINT "filter_configs_tenant_id_entity_type_field_name_key" UNIQUE ("tenant_id", "entity_type", "field_name");



ALTER TABLE ONLY "public"."filter_usage_logs"
    ADD CONSTRAINT "filter_usage_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gamification_activities"
    ADD CONSTRAINT "gamification_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gamification_scores"
    ADD CONSTRAINT "gamification_scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gamification_scores"
    ADD CONSTRAINT "gamification_scores_tenant_id_user_id_key" UNIQUE ("tenant_id", "user_id");



ALTER TABLE ONLY "public"."impersonation_logs"
    ADD CONSTRAINT "impersonation_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."industry_organizations"
    ADD CONSTRAINT "industry_organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."industry_organizations"
    ADD CONSTRAINT "industry_organizations_short_code_key" UNIQUE ("short_code");



ALTER TABLE ONLY "public"."industry_standards"
    ADD CONSTRAINT "industry_standards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."insurance_carriers"
    ADD CONSTRAINT "insurance_carriers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."insurance_personnel"
    ADD CONSTRAINT "insurance_personnel_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_expenses"
    ADD CONSTRAINT "job_expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_job_number_key" UNIQUE ("job_number");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."knocks"
    ADD CONSTRAINT "knocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."knowledge_base"
    ADD CONSTRAINT "knowledge_base_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."knowledge_search_queries"
    ADD CONSTRAINT "knowledge_search_queries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kpi_snapshots"
    ADD CONSTRAINT "kpi_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kpi_snapshots"
    ADD CONSTRAINT "kpi_snapshots_tenant_id_metric_date_metric_name_dimensions_key" UNIQUE ("tenant_id", "metric_date", "metric_name", "dimensions");



ALTER TABLE ONLY "public"."login_activity"
    ADD CONSTRAINT "login_activity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."manufacturer_directory"
    ADD CONSTRAINT "manufacturer_directory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."manufacturer_specs"
    ADD CONSTRAINT "manufacturer_specs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."material_purchases"
    ADD CONSTRAINT "material_purchases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."n8n_chat_histories"
    ADD CONSTRAINT "n8n_chat_histories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."storm_response_mode"
    ADD CONSTRAINT "one_config_per_tenant" UNIQUE ("tenant_id");



ALTER TABLE ONLY "public"."photos"
    ADD CONSTRAINT "photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pipeline_stages"
    ADD CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."point_rules"
    ADD CONSTRAINT "point_rules_action_type_key" UNIQUE ("action_type");



ALTER TABLE ONLY "public"."point_rules"
    ADD CONSTRAINT "point_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_files"
    ADD CONSTRAINT "project_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_enrichment_cache"
    ADD CONSTRAINT "property_enrichment_cache_address_hash_key" UNIQUE ("address_hash");



ALTER TABLE ONLY "public"."property_enrichment_cache"
    ADD CONSTRAINT "property_enrichment_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."query_history"
    ADD CONSTRAINT "query_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quickbooks_connections"
    ADD CONSTRAINT "quickbooks_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quickbooks_connections"
    ADD CONSTRAINT "quickbooks_connections_realm_id_key" UNIQUE ("realm_id");



ALTER TABLE ONLY "public"."quickbooks_connections"
    ADD CONSTRAINT "quickbooks_connections_tenant_id_key" UNIQUE ("tenant_id");



ALTER TABLE ONLY "public"."quickbooks_mappings"
    ADD CONSTRAINT "quickbooks_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quickbooks_mappings"
    ADD CONSTRAINT "quickbooks_mappings_tenant_id_crm_entity_type_crm_entity_id_key" UNIQUE ("tenant_id", "crm_entity_type", "crm_entity_id");



ALTER TABLE ONLY "public"."quickbooks_sync_logs"
    ADD CONSTRAINT "quickbooks_sync_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quickbooks_tokens"
    ADD CONSTRAINT "quickbooks_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quickbooks_tokens"
    ADD CONSTRAINT "quickbooks_tokens_tenant_id_key" UNIQUE ("tenant_id");



ALTER TABLE ONLY "public"."quote_line_items"
    ADD CONSTRAINT "quote_line_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_options"
    ADD CONSTRAINT "quote_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rep_locations"
    ADD CONSTRAINT "rep_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."report_schedules"
    ADD CONSTRAINT "report_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roofing_knowledge"
    ADD CONSTRAINT "roofing_knowledge_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_filters"
    ADD CONSTRAINT "saved_filters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_filters"
    ADD CONSTRAINT "saved_filters_tenant_id_entity_type_name_key" UNIQUE ("tenant_id", "entity_type", "name");



ALTER TABLE ONLY "public"."shingle_products"
    ADD CONSTRAINT "shingle_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."signature_documents"
    ADD CONSTRAINT "signature_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."signatures"
    ADD CONSTRAINT "signatures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sms_templates"
    ADD CONSTRAINT "sms_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."status_substatus_configs"
    ADD CONSTRAINT "status_substatus_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."status_substatus_configs"
    ADD CONSTRAINT "status_substatus_configs_tenant_id_entity_type_status_field_key" UNIQUE ("tenant_id", "entity_type", "status_field_name", "status_value", "substatus_value");



ALTER TABLE ONLY "public"."storm_alerts"
    ADD CONSTRAINT "storm_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."storm_events"
    ADD CONSTRAINT "storm_events_noaa_event_id_key" UNIQUE ("noaa_event_id");



ALTER TABLE ONLY "public"."storm_events"
    ADD CONSTRAINT "storm_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."storm_response_mode"
    ADD CONSTRAINT "storm_response_mode_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."storm_targeting_areas"
    ADD CONSTRAINT "storm_targeting_areas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."surveys"
    ADD CONSTRAINT "surveys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."surveys"
    ADD CONSTRAINT "surveys_survey_link_key" UNIQUE ("survey_link");



ALTER TABLE ONLY "public"."surveys"
    ADD CONSTRAINT "surveys_survey_token_key" UNIQUE ("survey_token");



ALTER TABLE ONLY "public"."task_activity"
    ADD CONSTRAINT "task_activity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_attachments"
    ADD CONSTRAINT "task_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_settings"
    ADD CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_users"
    ADD CONSTRAINT "tenant_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_users"
    ADD CONSTRAINT "tenant_users_tenant_id_user_id_key" UNIQUE ("tenant_id", "user_id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_subdomain_key" UNIQUE ("subdomain");



ALTER TABLE ONLY "public"."territories"
    ADD CONSTRAINT "territories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."timesheets"
    ADD CONSTRAINT "timesheets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "unique_role_name" UNIQUE ("tenant_id", "name");



ALTER TABLE ONLY "public"."pipeline_stages"
    ADD CONSTRAINT "unique_stage_order" UNIQUE ("tenant_id", "stage_order");



ALTER TABLE ONLY "public"."tenant_settings"
    ADD CONSTRAINT "unique_tenant_settings" UNIQUE ("tenant_id");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "unique_user_achievement" UNIQUE ("user_id", "achievement_id");



ALTER TABLE ONLY "public"."user_points"
    ADD CONSTRAINT "unique_user_activity_points" UNIQUE ("user_id", "activity_id");



ALTER TABLE ONLY "public"."user_challenges"
    ADD CONSTRAINT "unique_user_challenge" UNIQUE ("user_id", "challenge_id");



ALTER TABLE ONLY "public"."user_notification_preferences"
    ADD CONSTRAINT "unique_user_notification_preferences" UNIQUE ("tenant_id", "user_id");



ALTER TABLE ONLY "public"."user_role_assignments"
    ADD CONSTRAINT "unique_user_role" UNIQUE ("tenant_id", "user_id");



ALTER TABLE ONLY "public"."user_streaks"
    ADD CONSTRAINT "unique_user_streak" UNIQUE ("user_id", "streak_type");



ALTER TABLE ONLY "public"."gamification_scores"
    ADD CONSTRAINT "unique_user_tenant_score" UNIQUE ("tenant_id", "user_id");



ALTER TABLE ONLY "public"."user_ui_preferences"
    ADD CONSTRAINT "unique_user_ui_preferences" UNIQUE ("tenant_id", "user_id");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_challenges"
    ADD CONSTRAINT "user_challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_notification_preferences"
    ADD CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_points"
    ADD CONSTRAINT "user_points_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_role_assignments"
    ADD CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_streaks"
    ADD CONSTRAINT "user_streaks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_ui_preferences"
    ADD CONSTRAINT "user_ui_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."voice_function_calls"
    ADD CONSTRAINT "voice_function_calls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."voice_sessions"
    ADD CONSTRAINT "voice_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."voice_sessions"
    ADD CONSTRAINT "voice_sessions_provider_session_id_key" UNIQUE ("provider", "session_id");



ALTER TABLE ONLY "public"."win_loss_reasons"
    ADD CONSTRAINT "win_loss_reasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_executions"
    ADD CONSTRAINT "workflow_executions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_step_executions"
    ADD CONSTRAINT "workflow_step_executions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_steps"
    ADD CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflows"
    ADD CONSTRAINT "workflows_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_achievements_tenant_id" ON "public"."achievements" USING "btree" ("tenant_id");



CREATE INDEX "idx_activities_contact" ON "public"."activities" USING "btree" ("tenant_id", "contact_id");



CREATE INDEX "idx_activities_contact_id" ON "public"."activities" USING "btree" ("contact_id");



CREATE INDEX "idx_activities_created_at" ON "public"."activities" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_activities_created_by" ON "public"."activities" USING "btree" ("created_by");



CREATE INDEX "idx_activities_date_range" ON "public"."activities" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "idx_activities_on_behalf_of" ON "public"."activities" USING "btree" ("on_behalf_of");



CREATE INDEX "idx_activities_performed_by" ON "public"."activities" USING "btree" ("performed_by");



CREATE INDEX "idx_activities_project" ON "public"."activities" USING "btree" ("tenant_id", "project_id");



CREATE INDEX "idx_activities_project_id" ON "public"."activities" USING "btree" ("project_id");



CREATE INDEX "idx_activities_scheduled" ON "public"."activities" USING "btree" ("tenant_id", "scheduled_at");



CREATE INDEX "idx_activities_sms_by_contact" ON "public"."activities" USING "btree" ("tenant_id", "contact_id", "created_at" DESC) WHERE (("type")::"text" = 'sms'::"text");



CREATE INDEX "idx_activities_sms_unread" ON "public"."activities" USING "btree" ("tenant_id", "contact_id", "read_at") WHERE ((("type")::"text" = 'sms'::"text") AND ("read_at" IS NULL));



CREATE INDEX "idx_activities_tenant" ON "public"."activities" USING "btree" ("tenant_id");



CREATE INDEX "idx_activities_tenant_id" ON "public"."activities" USING "btree" ("tenant_id");



CREATE INDEX "idx_activities_type" ON "public"."activities" USING "btree" ("tenant_id", "type");



CREATE INDEX "idx_ai_conversations_tenant_user" ON "public"."ai_conversations" USING "btree" ("tenant_id", "user_id", "is_active");



CREATE INDEX "idx_ai_conversations_updated_at" ON "public"."ai_conversations" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_ai_messages_conversation" ON "public"."ai_messages" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "idx_ai_messages_created_at" ON "public"."ai_messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_ar_damage_markers_session" ON "public"."ar_damage_markers" USING "btree" ("session_id");



CREATE INDEX "idx_ar_measurements_session" ON "public"."ar_measurements" USING "btree" ("session_id");



CREATE INDEX "idx_ar_sessions_project" ON "public"."ar_sessions" USING "btree" ("project_id");



CREATE INDEX "idx_ar_sessions_started_at" ON "public"."ar_sessions" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_ar_sessions_status" ON "public"."ar_sessions" USING "btree" ("status");



CREATE INDEX "idx_ar_sessions_tenant" ON "public"."ar_sessions" USING "btree" ("tenant_id");



CREATE INDEX "idx_audit_log_created" ON "public"."audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_log_entity" ON "public"."audit_log" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_audit_log_tenant" ON "public"."audit_log" USING "btree" ("tenant_id");



CREATE INDEX "idx_audit_log_user" ON "public"."audit_log" USING "btree" ("user_id");



CREATE INDEX "idx_automations_active" ON "public"."automations" USING "btree" ("tenant_id", "is_active");



CREATE INDEX "idx_automations_created_by" ON "public"."automations" USING "btree" ("created_by");



CREATE INDEX "idx_automations_tenant" ON "public"."automations" USING "btree" ("tenant_id");



CREATE INDEX "idx_automations_tenant_id" ON "public"."automations" USING "btree" ("tenant_id");



CREATE INDEX "idx_building_codes_superseded_by" ON "public"."building_codes" USING "btree" ("superseded_by");



CREATE INDEX "idx_bulk_import_jobs_created_by" ON "public"."bulk_import_jobs" USING "btree" ("created_by");



CREATE INDEX "idx_business_card_interactions_card_id" ON "public"."business_card_interactions" USING "btree" ("card_id");



CREATE INDEX "idx_business_card_interactions_created_at" ON "public"."business_card_interactions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_business_card_interactions_type" ON "public"."business_card_interactions" USING "btree" ("interaction_type");



CREATE INDEX "idx_call_logs_contact_id" ON "public"."call_logs" USING "btree" ("contact_id");



CREATE INDEX "idx_call_logs_created_at" ON "public"."call_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_call_logs_direction" ON "public"."call_logs" USING "btree" ("direction");



CREATE INDEX "idx_call_logs_follow_up" ON "public"."call_logs" USING "btree" ("follow_up_required", "follow_up_date") WHERE ("follow_up_required" = true);



CREATE INDEX "idx_call_logs_project_id" ON "public"."call_logs" USING "btree" ("project_id");



CREATE INDEX "idx_call_logs_started_at" ON "public"."call_logs" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_call_logs_tenant_id" ON "public"."call_logs" USING "btree" ("tenant_id");



CREATE INDEX "idx_call_logs_twilio_call_sid" ON "public"."call_logs" USING "btree" ("twilio_call_sid");



CREATE INDEX "idx_call_logs_user_id" ON "public"."call_logs" USING "btree" ("user_id");



CREATE INDEX "idx_call_logs_user_recent" ON "public"."call_logs" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_carrier_standards_carrier_id" ON "public"."carrier_standards" USING "btree" ("carrier_id");



CREATE INDEX "idx_carriers_name" ON "public"."insurance_carriers" USING "btree" ("name");



CREATE INDEX "idx_challenges_tenant_id" ON "public"."challenges" USING "btree" ("tenant_id");



CREATE INDEX "idx_claim_weather_data_claim_id" ON "public"."claim_weather_data" USING "btree" ("claim_id");



CREATE INDEX "idx_claims_carrier" ON "public"."claims" USING "btree" ("insurance_carrier");



CREATE INDEX "idx_claims_carrier_id" ON "public"."claims" USING "btree" ("carrier_id");



CREATE INDEX "idx_claims_contact" ON "public"."claims" USING "btree" ("contact_id");



CREATE INDEX "idx_claims_date_of_loss" ON "public"."claims" USING "btree" ("date_of_loss");



CREATE INDEX "idx_claims_status" ON "public"."claims" USING "btree" ("tenant_id", "status");



CREATE INDEX "idx_claims_tenant" ON "public"."claims" USING "btree" ("tenant_id");



CREATE INDEX "idx_codes_jurisdiction" ON "public"."building_codes" USING "btree" ("state_code", "county", "city");



CREATE INDEX "idx_codes_type" ON "public"."building_codes" USING "btree" ("code_type");



CREATE INDEX "idx_commission_plans_active" ON "public"."commission_plans" USING "btree" ("tenant_id", "is_active");



CREATE INDEX "idx_commission_plans_tenant" ON "public"."commission_plans" USING "btree" ("tenant_id");



CREATE INDEX "idx_commission_records_status" ON "public"."commission_records" USING "btree" ("status");



CREATE INDEX "idx_commission_records_tenant" ON "public"."commission_records" USING "btree" ("tenant_id");



CREATE INDEX "idx_commission_records_tenant_user" ON "public"."commission_records" USING "btree" ("tenant_id", "user_id");



CREATE INDEX "idx_commission_records_user" ON "public"."commission_records" USING "btree" ("user_id");



CREATE INDEX "idx_commission_rules_active" ON "public"."commission_rules" USING "btree" ("tenant_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_commission_rules_tenant" ON "public"."commission_rules" USING "btree" ("tenant_id");



CREATE INDEX "idx_commission_rules_tenant_id" ON "public"."commission_rules" USING "btree" ("tenant_id");



CREATE INDEX "idx_commissions_approved_by" ON "public"."commissions" USING "btree" ("approved_by");



CREATE INDEX "idx_commissions_created_at" ON "public"."commissions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_commissions_project_id" ON "public"."commissions" USING "btree" ("project_id");



CREATE INDEX "idx_commissions_rule_id" ON "public"."commissions" USING "btree" ("rule_id");



CREATE INDEX "idx_commissions_status" ON "public"."commissions" USING "btree" ("tenant_id", "status");



CREATE INDEX "idx_commissions_tenant" ON "public"."commissions" USING "btree" ("tenant_id");



CREATE INDEX "idx_commissions_tenant_id" ON "public"."commissions" USING "btree" ("tenant_id");



CREATE INDEX "idx_commissions_user" ON "public"."commissions" USING "btree" ("tenant_id", "user_id");



CREATE INDEX "idx_commissions_user_id" ON "public"."commissions" USING "btree" ("user_id");



CREATE INDEX "idx_communications_claim" ON "public"."claim_communications" USING "btree" ("claim_id");



CREATE INDEX "idx_communications_overdue" ON "public"."claim_communications" USING "btree" ("response_overdue") WHERE ("response_overdue" = true);



CREATE INDEX "idx_contacts_assigned" ON "public"."contacts" USING "btree" ("tenant_id", "assigned_to");



CREATE INDEX "idx_contacts_company" ON "public"."contacts" USING "btree" ("company") WHERE ("company" IS NOT NULL);



CREATE INDEX "idx_contacts_company_gin" ON "public"."contacts" USING "gin" ("to_tsvector"('"english"'::"regconfig", "company")) WHERE ("company" IS NOT NULL);



CREATE INDEX "idx_contacts_contact_category" ON "public"."contacts" USING "btree" ("contact_category");



CREATE INDEX "idx_contacts_created_at" ON "public"."contacts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_contacts_created_by" ON "public"."contacts" USING "btree" ("created_by");



CREATE INDEX "idx_contacts_email" ON "public"."contacts" USING "btree" ("email") WHERE ("email" IS NOT NULL);



CREATE INDEX "idx_contacts_email_invalid" ON "public"."contacts" USING "btree" ("email_invalid") WHERE ("email_invalid" = true);



CREATE INDEX "idx_contacts_email_opt_out" ON "public"."contacts" USING "btree" ("email_opt_out") WHERE ("email_opt_out" = true);



CREATE INDEX "idx_contacts_is_organization" ON "public"."contacts" USING "btree" ("is_organization") WHERE ("is_organization" = true);



CREATE INDEX "idx_contacts_not_deleted" ON "public"."contacts" USING "btree" ("tenant_id", "is_deleted") WHERE ("is_deleted" = false);



CREATE INDEX "idx_contacts_policy_holder_id" ON "public"."contacts" USING "btree" ("policy_holder_id") WHERE ("policy_holder_id" IS NOT NULL);



CREATE INDEX "idx_contacts_proline_id" ON "public"."contacts" USING "btree" ("proline_id") WHERE ("proline_id" IS NOT NULL);



CREATE INDEX "idx_contacts_qb_id" ON "public"."contacts" USING "btree" ("quickbooks_customer_id") WHERE ("quickbooks_customer_id" IS NOT NULL);



CREATE INDEX "idx_contacts_search" ON "public"."contacts" USING "gin" ("search_vector");



CREATE INDEX "idx_contacts_sms_opt_in" ON "public"."contacts" USING "btree" ("sms_opt_in") WHERE ("sms_opt_in" = true);



CREATE INDEX "idx_contacts_sms_opt_out" ON "public"."contacts" USING "btree" ("sms_opt_out") WHERE ("sms_opt_out" = true);



CREATE INDEX "idx_contacts_stage" ON "public"."contacts" USING "btree" ("tenant_id", "stage");



CREATE INDEX "idx_contacts_stage_substatus" ON "public"."contacts" USING "btree" ("tenant_id", "stage", "substatus") WHERE (NOT "is_deleted");



CREATE INDEX "idx_contacts_tenant" ON "public"."contacts" USING "btree" ("tenant_id");



CREATE INDEX "idx_contacts_tenant_id" ON "public"."contacts" USING "btree" ("tenant_id");



CREATE INDEX "idx_contacts_tenant_stage" ON "public"."contacts" USING "btree" ("tenant_id", "stage");



CREATE INDEX "idx_contacts_tenant_type" ON "public"."contacts" USING "btree" ("tenant_id", "type");



CREATE INDEX "idx_contacts_type" ON "public"."contacts" USING "btree" ("type");



CREATE INDEX "idx_contacts_type_category" ON "public"."contacts" USING "btree" ("type", "contact_category");



CREATE INDEX "idx_contacts_website" ON "public"."contacts" USING "btree" ("website") WHERE ("website" IS NOT NULL);



CREATE INDEX "idx_court_cases_carrier_id" ON "public"."court_cases" USING "btree" ("carrier_id");



CREATE INDEX "idx_crew_members_active" ON "public"."crew_members" USING "btree" ("is_active");



CREATE INDEX "idx_crew_members_tenant" ON "public"."crew_members" USING "btree" ("tenant_id");



CREATE INDEX "idx_crew_members_user" ON "public"."crew_members" USING "btree" ("user_id");



CREATE INDEX "idx_digital_business_cards_slug" ON "public"."digital_business_cards" USING "btree" ("slug") WHERE ("is_active" = true);



CREATE INDEX "idx_digital_business_cards_tenant_id" ON "public"."digital_business_cards" USING "btree" ("tenant_id");



CREATE INDEX "idx_digital_business_cards_user_id" ON "public"."digital_business_cards" USING "btree" ("user_id");



CREATE INDEX "idx_dnc_imports_tenant" ON "public"."dnc_imports" USING "btree" ("tenant_id");



CREATE INDEX "idx_dnc_registry_phone" ON "public"."dnc_registry" USING "btree" ("phone_number");



CREATE INDEX "idx_dnc_registry_tenant" ON "public"."dnc_registry" USING "btree" ("tenant_id");



CREATE INDEX "idx_document_templates_category" ON "public"."document_templates" USING "btree" ("category");



CREATE INDEX "idx_document_templates_created_by" ON "public"."document_templates" USING "btree" ("created_by");



CREATE INDEX "idx_document_templates_is_active" ON "public"."document_templates" USING "btree" ("is_active");



CREATE INDEX "idx_document_templates_tenant" ON "public"."document_templates" USING "btree" ("tenant_id");



CREATE INDEX "idx_document_templates_tenant_id" ON "public"."document_templates" USING "btree" ("tenant_id");



CREATE INDEX "idx_documents_claim" ON "public"."claim_documents" USING "btree" ("claim_id");



CREATE INDEX "idx_documents_created_by" ON "public"."documents" USING "btree" ("created_by");



CREATE INDEX "idx_documents_entity" ON "public"."documents" USING "btree" ("tenant_id", "entity_type", "entity_id");



CREATE INDEX "idx_documents_previous_version_id" ON "public"."documents" USING "btree" ("previous_version_id");



CREATE INDEX "idx_documents_recent" ON "public"."documents" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "idx_documents_tenant" ON "public"."documents" USING "btree" ("tenant_id");



CREATE INDEX "idx_documents_tenant_id" ON "public"."documents" USING "btree" ("tenant_id");



CREATE INDEX "idx_documents_type" ON "public"."claim_documents" USING "btree" ("document_type");



CREATE INDEX "idx_email_drafts_claim_id" ON "public"."email_drafts" USING "btree" ("claim_id");



CREATE INDEX "idx_email_drafts_status" ON "public"."email_drafts" USING "btree" ("status");



CREATE INDEX "idx_email_drafts_tenant_id" ON "public"."email_drafts" USING "btree" ("tenant_id");



CREATE INDEX "idx_email_drafts_tier" ON "public"."email_drafts" USING "btree" ("tier");



CREATE INDEX "idx_email_templates_category" ON "public"."email_templates" USING "btree" ("tenant_id", "category");



CREATE INDEX "idx_email_templates_created_by" ON "public"."email_templates" USING "btree" ("created_by");



CREATE INDEX "idx_email_templates_tenant" ON "public"."email_templates" USING "btree" ("tenant_id");



CREATE INDEX "idx_events_attendees" ON "public"."events" USING "gin" ("attendees");



CREATE INDEX "idx_events_calendar" ON "public"."events" USING "btree" ("start_at", "end_at") WHERE ("status" <> 'cancelled'::"text");



CREATE INDEX "idx_events_contact_id" ON "public"."events" USING "btree" ("contact_id");



CREATE INDEX "idx_events_created_at" ON "public"."events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_events_created_by" ON "public"."events" USING "btree" ("created_by");



CREATE INDEX "idx_events_event_type" ON "public"."events" USING "btree" ("event_type");



CREATE INDEX "idx_events_job_id" ON "public"."events" USING "btree" ("job_id");



CREATE INDEX "idx_events_organizer" ON "public"."events" USING "btree" ("organizer");



CREATE INDEX "idx_events_parent_event_id" ON "public"."events" USING "btree" ("parent_event_id");



CREATE INDEX "idx_events_project_id" ON "public"."events" USING "btree" ("project_id");



CREATE INDEX "idx_events_reminders" ON "public"."events" USING "btree" ("start_at", "reminder_sent") WHERE (("reminder_sent" = false) AND ("status" = 'scheduled'::"text"));



CREATE INDEX "idx_events_start_at" ON "public"."events" USING "btree" ("start_at");



CREATE INDEX "idx_events_status" ON "public"."events" USING "btree" ("status");



CREATE INDEX "idx_events_tenant_id" ON "public"."events" USING "btree" ("tenant_id");



CREATE INDEX "idx_extracted_addresses_area" ON "public"."extracted_addresses" USING "btree" ("targeting_area_id");



CREATE INDEX "idx_extracted_addresses_enriched" ON "public"."extracted_addresses" USING "btree" ("is_enriched");



CREATE INDEX "idx_extracted_addresses_enrichment_cache_id" ON "public"."extracted_addresses" USING "btree" ("enrichment_cache_id");



CREATE INDEX "idx_extracted_addresses_is_enriched" ON "public"."extracted_addresses" USING "btree" ("tenant_id", "is_enriched", "is_selected");



CREATE INDEX "idx_extracted_addresses_job" ON "public"."extracted_addresses" USING "btree" ("bulk_import_job_id");



CREATE INDEX "idx_extracted_addresses_location" ON "public"."extracted_addresses" USING "btree" ("latitude", "longitude");



CREATE INDEX "idx_extracted_addresses_selected" ON "public"."extracted_addresses" USING "btree" ("is_selected");



CREATE INDEX "idx_extracted_addresses_targeting_area" ON "public"."extracted_addresses" USING "btree" ("targeting_area_id", "is_selected");



CREATE INDEX "idx_extracted_addresses_tenant" ON "public"."extracted_addresses" USING "btree" ("tenant_id");



CREATE INDEX "idx_filter_configs_created_by" ON "public"."filter_configs" USING "btree" ("created_by");



CREATE INDEX "idx_filter_configs_entity" ON "public"."filter_configs" USING "btree" ("entity_type", "display_order") WHERE ("is_active" = true);



CREATE INDEX "idx_filter_configs_tenant" ON "public"."filter_configs" USING "btree" ("tenant_id", "entity_type") WHERE ("is_active" = true);



CREATE INDEX "idx_filter_usage_logs_filter_config_id" ON "public"."filter_usage_logs" USING "btree" ("filter_config_id");



CREATE INDEX "idx_filter_usage_logs_saved_filter_id" ON "public"."filter_usage_logs" USING "btree" ("saved_filter_id");



CREATE INDEX "idx_filter_usage_logs_tenant" ON "public"."filter_usage_logs" USING "btree" ("tenant_id", "used_at" DESC);



CREATE INDEX "idx_filter_usage_logs_user" ON "public"."filter_usage_logs" USING "btree" ("user_id", "used_at" DESC);



CREATE INDEX "idx_gamification_activities_created_at" ON "public"."gamification_activities" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_gamification_activities_tenant" ON "public"."gamification_activities" USING "btree" ("tenant_id");



CREATE INDEX "idx_gamification_activities_tenant_id" ON "public"."gamification_activities" USING "btree" ("tenant_id");



CREATE INDEX "idx_gamification_activities_user" ON "public"."gamification_activities" USING "btree" ("tenant_id", "user_id");



CREATE INDEX "idx_gamification_activities_user_id" ON "public"."gamification_activities" USING "btree" ("user_id");



CREATE INDEX "idx_gamification_leaderboard" ON "public"."gamification_scores" USING "btree" ("tenant_id", "points_this_month" DESC);



CREATE INDEX "idx_gamification_points" ON "public"."gamification_scores" USING "btree" ("tenant_id", "total_points" DESC);



CREATE INDEX "idx_gamification_scores_enzy_user_id" ON "public"."gamification_scores" USING "btree" ("enzy_user_id") WHERE ("enzy_user_id" IS NOT NULL);



CREATE INDEX "idx_gamification_scores_monthly_rank" ON "public"."gamification_scores" USING "btree" ("tenant_id", "monthly_rank") WHERE ("monthly_rank" IS NOT NULL);



CREATE INDEX "idx_gamification_scores_tenant_id" ON "public"."gamification_scores" USING "btree" ("tenant_id");



CREATE INDEX "idx_gamification_scores_total_points" ON "public"."gamification_scores" USING "btree" ("tenant_id", "total_points" DESC);



CREATE INDEX "idx_gamification_scores_user_id" ON "public"."gamification_scores" USING "btree" ("user_id");



CREATE INDEX "idx_gamification_scores_weekly_rank" ON "public"."gamification_scores" USING "btree" ("tenant_id", "weekly_rank") WHERE ("weekly_rank" IS NOT NULL);



CREATE INDEX "idx_gamification_tenant" ON "public"."gamification_scores" USING "btree" ("tenant_id");



CREATE INDEX "idx_impersonation_logs_admin" ON "public"."impersonation_logs" USING "btree" ("admin_user_id", "started_at" DESC);



CREATE INDEX "idx_impersonation_logs_impersonated" ON "public"."impersonation_logs" USING "btree" ("impersonated_user_id", "started_at" DESC);



CREATE INDEX "idx_impersonation_logs_status" ON "public"."impersonation_logs" USING "btree" ("status") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_impersonation_logs_tenant" ON "public"."impersonation_logs" USING "btree" ("tenant_id", "started_at" DESC);



CREATE INDEX "idx_import_jobs_area" ON "public"."bulk_import_jobs" USING "btree" ("targeting_area_id");



CREATE INDEX "idx_import_jobs_created" ON "public"."bulk_import_jobs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_import_jobs_status" ON "public"."bulk_import_jobs" USING "btree" ("status");



CREATE INDEX "idx_import_jobs_tenant" ON "public"."bulk_import_jobs" USING "btree" ("tenant_id");



CREATE INDEX "idx_import_jobs_type" ON "public"."bulk_import_jobs" USING "btree" ("job_type");



CREATE INDEX "idx_industry_standards_category" ON "public"."industry_standards" USING "btree" ("category");



CREATE INDEX "idx_industry_standards_damage_types" ON "public"."industry_standards" USING "gin" ("damage_types");



CREATE INDEX "idx_industry_standards_keywords" ON "public"."industry_standards" USING "gin" ("keywords");



CREATE INDEX "idx_industry_standards_org" ON "public"."industry_standards" USING "btree" ("organization_id");



CREATE INDEX "idx_industry_standards_superseded_by" ON "public"."industry_standards" USING "btree" ("superseded_by");



CREATE INDEX "idx_job_expenses_approved_by" ON "public"."job_expenses" USING "btree" ("approved_by");



CREATE INDEX "idx_job_expenses_created_by" ON "public"."job_expenses" USING "btree" ("created_by");



CREATE INDEX "idx_job_expenses_date" ON "public"."job_expenses" USING "btree" ("expense_date");



CREATE INDEX "idx_job_expenses_project" ON "public"."job_expenses" USING "btree" ("project_id");



CREATE INDEX "idx_job_expenses_tenant" ON "public"."job_expenses" USING "btree" ("tenant_id");



CREATE INDEX "idx_job_expenses_type" ON "public"."job_expenses" USING "btree" ("expense_type");



CREATE INDEX "idx_job_expenses_vendor_id" ON "public"."job_expenses" USING "btree" ("vendor_id");



CREATE INDEX "idx_jobs_completion_date" ON "public"."jobs" USING "btree" ("completion_date");



CREATE INDEX "idx_jobs_created_at" ON "public"."jobs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_jobs_created_by" ON "public"."jobs" USING "btree" ("created_by");



CREATE INDEX "idx_jobs_crew_lead" ON "public"."jobs" USING "btree" ("crew_lead");



CREATE INDEX "idx_jobs_crew_members" ON "public"."jobs" USING "gin" ("crew_members");



CREATE INDEX "idx_jobs_crew_scheduled" ON "public"."jobs" USING "btree" ("crew_lead", "scheduled_date") WHERE ("status" = ANY (ARRAY['scheduled'::"text", 'in_progress'::"text"]));



CREATE INDEX "idx_jobs_project_id" ON "public"."jobs" USING "btree" ("project_id");



CREATE INDEX "idx_jobs_quality_inspector" ON "public"."jobs" USING "btree" ("quality_inspector");



CREATE INDEX "idx_jobs_safety_inspector" ON "public"."jobs" USING "btree" ("safety_inspector");



CREATE INDEX "idx_jobs_scheduled_date" ON "public"."jobs" USING "btree" ("scheduled_date");



CREATE INDEX "idx_jobs_status" ON "public"."jobs" USING "btree" ("status");



CREATE INDEX "idx_jobs_tenant_id" ON "public"."jobs" USING "btree" ("tenant_id");



CREATE INDEX "idx_knocks_appointments" ON "public"."knocks" USING "btree" ("appointment_date") WHERE ("appointment_date" IS NOT NULL);



CREATE INDEX "idx_knocks_callbacks" ON "public"."knocks" USING "btree" ("callback_date") WHERE ("callback_date" IS NOT NULL);



CREATE INDEX "idx_knocks_contact_id" ON "public"."knocks" USING "btree" ("contact_id");



CREATE INDEX "idx_knocks_coords" ON "public"."knocks" USING "btree" ("latitude", "longitude");



CREATE INDEX "idx_knocks_created_at" ON "public"."knocks" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_knocks_damage_score" ON "public"."knocks" USING "btree" ("damage_score" DESC) WHERE ("damage_score" > 0);



CREATE INDEX "idx_knocks_disposition" ON "public"."knocks" USING "btree" ("disposition");



CREATE INDEX "idx_knocks_location_earth" ON "public"."knocks" USING "gist" ("public"."ll_to_earth"(("latitude")::double precision, ("longitude")::double precision));



CREATE INDEX "idx_knocks_sync_status" ON "public"."knocks" USING "btree" ("sync_status") WHERE (("sync_status")::"text" <> 'synced'::"text");



CREATE INDEX "idx_knocks_tenant_id" ON "public"."knocks" USING "btree" ("tenant_id");



CREATE INDEX "idx_knocks_territory_id" ON "public"."knocks" USING "btree" ("territory_id");



CREATE INDEX "idx_knocks_user_id" ON "public"."knocks" USING "btree" ("user_id");



CREATE INDEX "idx_knocks_user_recent" ON "public"."knocks" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_knowledge_base_source" ON "public"."knowledge_base" USING "btree" ("source_type", "source_id");



CREATE INDEX "idx_knowledge_base_tenant_id" ON "public"."knowledge_base" USING "btree" ("tenant_id");



CREATE INDEX "idx_knowledge_base_usage" ON "public"."knowledge_base" USING "btree" ("usage_count" DESC);



CREATE INDEX "idx_knowledge_embedding" ON "public"."knowledge_base" USING "ivfflat" ("embedding" "public"."vector_cosine_ops");



CREATE INDEX "idx_knowledge_queries_created" ON "public"."knowledge_search_queries" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_knowledge_queries_tenant" ON "public"."knowledge_search_queries" USING "btree" ("tenant_id");



CREATE INDEX "idx_knowledge_search_queries_top_result_id" ON "public"."knowledge_search_queries" USING "btree" ("top_result_id");



CREATE INDEX "idx_knowledge_search_queries_user_id" ON "public"."knowledge_search_queries" USING "btree" ("user_id");



CREATE INDEX "idx_knowledge_tenant" ON "public"."knowledge_base" USING "btree" ("tenant_id");



CREATE INDEX "idx_kpi_date" ON "public"."kpi_snapshots" USING "btree" ("tenant_id", "metric_date");



CREATE INDEX "idx_kpi_snapshots_metric_date" ON "public"."kpi_snapshots" USING "btree" ("metric_date" DESC);



CREATE INDEX "idx_kpi_snapshots_tenant_id" ON "public"."kpi_snapshots" USING "btree" ("tenant_id");



CREATE INDEX "idx_kpi_snapshots_tenant_metric" ON "public"."kpi_snapshots" USING "btree" ("tenant_id", "metric_name", "metric_date" DESC);



CREATE INDEX "idx_kpi_tenant" ON "public"."kpi_snapshots" USING "btree" ("tenant_id");



CREATE INDEX "idx_login_activity_email" ON "public"."login_activity" USING "btree" ("email", "created_at" DESC);



CREATE INDEX "idx_login_activity_failed_recent" ON "public"."login_activity" USING "btree" ("email", "created_at" DESC) WHERE (("event_type")::"text" = 'login_failed'::"text");



CREATE INDEX "idx_login_activity_ip" ON "public"."login_activity" USING "btree" ("ip_address", "created_at" DESC);



CREATE INDEX "idx_login_activity_tenant" ON "public"."login_activity" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "idx_login_activity_type" ON "public"."login_activity" USING "btree" ("event_type", "created_at" DESC);



CREATE INDEX "idx_login_activity_user" ON "public"."login_activity" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_material_purchases_created_by" ON "public"."material_purchases" USING "btree" ("created_by");



CREATE INDEX "idx_material_purchases_date" ON "public"."material_purchases" USING "btree" ("purchase_date");



CREATE INDEX "idx_material_purchases_project" ON "public"."material_purchases" USING "btree" ("project_id");



CREATE INDEX "idx_material_purchases_supplier_id" ON "public"."material_purchases" USING "btree" ("supplier_id");



CREATE INDEX "idx_material_purchases_tenant" ON "public"."material_purchases" USING "btree" ("tenant_id");



CREATE INDEX "idx_notification_prefs_tenant" ON "public"."user_notification_preferences" USING "btree" ("tenant_id");



CREATE INDEX "idx_notification_prefs_user" ON "public"."user_notification_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_personnel_carrier" ON "public"."insurance_personnel" USING "btree" ("carrier_id");



CREATE INDEX "idx_personnel_name" ON "public"."insurance_personnel" USING "btree" ("last_name", "first_name");



CREATE INDEX "idx_photos_claim" ON "public"."photos" USING "btree" ("claim_id") WHERE ("claim_id" IS NOT NULL);



CREATE INDEX "idx_photos_contact_id" ON "public"."photos" USING "btree" ("contact_id") WHERE ("contact_id" IS NOT NULL);



CREATE INDEX "idx_photos_created_at" ON "public"."photos" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_photos_damage_type" ON "public"."photos" USING "btree" ("damage_type") WHERE ("damage_type" IS NOT NULL);



CREATE INDEX "idx_photos_is_deleted" ON "public"."photos" USING "btree" ("is_deleted") WHERE ("is_deleted" = false);



CREATE INDEX "idx_photos_project_id" ON "public"."photos" USING "btree" ("project_id") WHERE ("project_id" IS NOT NULL);



CREATE INDEX "idx_photos_tenant_id" ON "public"."photos" USING "btree" ("tenant_id");



CREATE INDEX "idx_photos_uploaded_by" ON "public"."photos" USING "btree" ("uploaded_by");



CREATE INDEX "idx_pipeline_stages_created_by" ON "public"."pipeline_stages" USING "btree" ("created_by");



CREATE INDEX "idx_pipeline_stages_order" ON "public"."pipeline_stages" USING "btree" ("tenant_id", "stage_order");



CREATE INDEX "idx_pipeline_stages_tenant" ON "public"."pipeline_stages" USING "btree" ("tenant_id");



CREATE INDEX "idx_point_rules_tenant_id" ON "public"."point_rules" USING "btree" ("tenant_id");



CREATE INDEX "idx_project_files_created_at" ON "public"."project_files" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_project_files_file_category" ON "public"."project_files" USING "btree" ("file_category");



CREATE INDEX "idx_project_files_file_type" ON "public"."project_files" USING "btree" ("file_type");



CREATE INDEX "idx_project_files_photos" ON "public"."project_files" USING "btree" ("project_id", "file_type") WHERE ("file_type" = 'photo'::"text");



CREATE INDEX "idx_project_files_project_id" ON "public"."project_files" USING "btree" ("project_id");



CREATE INDEX "idx_project_files_tenant_id" ON "public"."project_files" USING "btree" ("tenant_id");



CREATE INDEX "idx_project_files_uploaded_by" ON "public"."project_files" USING "btree" ("uploaded_by");



CREATE INDEX "idx_projects_adjuster_contact_id" ON "public"."projects" USING "btree" ("adjuster_contact_id") WHERE ("adjuster_contact_id" IS NOT NULL);



CREATE INDEX "idx_projects_claim" ON "public"."projects" USING "btree" ("claim_id") WHERE ("claim_id" IS NOT NULL);



CREATE INDEX "idx_projects_contact" ON "public"."projects" USING "btree" ("tenant_id", "contact_id");



CREATE INDEX "idx_projects_contact_id" ON "public"."projects" USING "btree" ("contact_id");



CREATE INDEX "idx_projects_created_at" ON "public"."projects" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_projects_created_by" ON "public"."projects" USING "btree" ("created_by");



CREATE INDEX "idx_projects_not_deleted" ON "public"."projects" USING "btree" ("tenant_id", "is_deleted") WHERE ("is_deleted" = false);



CREATE INDEX "idx_projects_parent_project_id" ON "public"."projects" USING "btree" ("parent_project_id");



CREATE INDEX "idx_projects_pipeline" ON "public"."projects" USING "btree" ("tenant_id", "status", "estimated_value");



CREATE INDEX "idx_projects_pipeline_active" ON "public"."projects" USING "btree" ("pipeline_stage", "priority", "estimated_close_date") WHERE (("is_deleted" = false) AND ("pipeline_stage" <> ALL (ARRAY['complete'::"public"."pipeline_stage", 'lost'::"public"."pipeline_stage"])));



CREATE INDEX "idx_projects_pipeline_stage" ON "public"."projects" USING "btree" ("pipeline_stage") WHERE ("is_deleted" = false);



CREATE INDEX "idx_projects_priority" ON "public"."projects" USING "btree" ("priority") WHERE ("is_deleted" = false);



CREATE INDEX "idx_projects_proline_id" ON "public"."projects" USING "btree" ("proline_id") WHERE ("proline_id" IS NOT NULL);



CREATE INDEX "idx_projects_qb_id" ON "public"."projects" USING "btree" ("quickbooks_invoice_id") WHERE ("quickbooks_invoice_id" IS NOT NULL);



CREATE INDEX "idx_projects_status" ON "public"."projects" USING "btree" ("tenant_id", "status");



CREATE INDEX "idx_projects_status_substatus" ON "public"."projects" USING "btree" ("tenant_id", "status", "substatus") WHERE (NOT "is_deleted");



CREATE INDEX "idx_projects_storm_event" ON "public"."projects" USING "btree" ("storm_event_id") WHERE ("storm_event_id" IS NOT NULL);



CREATE INDEX "idx_projects_tenant" ON "public"."projects" USING "btree" ("tenant_id");



CREATE INDEX "idx_projects_tenant_id" ON "public"."projects" USING "btree" ("tenant_id");



CREATE INDEX "idx_projects_tenant_status" ON "public"."projects" USING "btree" ("tenant_id", "status");



CREATE INDEX "idx_property_cache_address" ON "public"."property_enrichment_cache" USING "btree" ("full_address");



CREATE INDEX "idx_property_cache_expires" ON "public"."property_enrichment_cache" USING "btree" ("expires_at");



CREATE INDEX "idx_property_cache_hash" ON "public"."property_enrichment_cache" USING "btree" ("address_hash");



CREATE INDEX "idx_property_cache_location" ON "public"."property_enrichment_cache" USING "btree" ("latitude", "longitude");



CREATE INDEX "idx_property_cache_provider" ON "public"."property_enrichment_cache" USING "btree" ("provider");



CREATE INDEX "idx_qb_mappings_crm" ON "public"."quickbooks_mappings" USING "btree" ("crm_entity_type", "crm_entity_id");



CREATE INDEX "idx_qb_mappings_qb" ON "public"."quickbooks_mappings" USING "btree" ("qb_entity_type", "qb_entity_id");



CREATE INDEX "idx_qb_mappings_tenant" ON "public"."quickbooks_mappings" USING "btree" ("tenant_id");



CREATE INDEX "idx_qb_sync_logs_created" ON "public"."quickbooks_sync_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_qb_sync_logs_entity" ON "public"."quickbooks_sync_logs" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_qb_sync_logs_status" ON "public"."quickbooks_sync_logs" USING "btree" ("status");



CREATE INDEX "idx_qb_sync_logs_tenant" ON "public"."quickbooks_sync_logs" USING "btree" ("tenant_id");



CREATE INDEX "idx_qb_tokens_tenant" ON "public"."quickbooks_tokens" USING "btree" ("tenant_id");



CREATE INDEX "idx_query_history_created" ON "public"."query_history" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_query_history_tenant" ON "public"."query_history" USING "btree" ("tenant_id");



CREATE INDEX "idx_query_history_user" ON "public"."query_history" USING "btree" ("user_id");



CREATE INDEX "idx_quickbooks_connections_active" ON "public"."quickbooks_connections" USING "btree" ("tenant_id", "is_active");



CREATE INDEX "idx_quickbooks_connections_created_by" ON "public"."quickbooks_connections" USING "btree" ("created_by");



CREATE INDEX "idx_quickbooks_connections_realm" ON "public"."quickbooks_connections" USING "btree" ("realm_id");



CREATE INDEX "idx_quickbooks_connections_realm_id" ON "public"."quickbooks_connections" USING "btree" ("realm_id");



CREATE INDEX "idx_quickbooks_connections_tenant" ON "public"."quickbooks_connections" USING "btree" ("tenant_id");



CREATE INDEX "idx_quickbooks_connections_tenant_id" ON "public"."quickbooks_connections" USING "btree" ("tenant_id");



CREATE INDEX "idx_quote_line_items_option" ON "public"."quote_line_items" USING "btree" ("quote_option_id");



CREATE INDEX "idx_quote_line_items_tenant" ON "public"."quote_line_items" USING "btree" ("tenant_id");



CREATE INDEX "idx_quote_options_project" ON "public"."quote_options" USING "btree" ("project_id");



CREATE INDEX "idx_quote_options_tenant" ON "public"."quote_options" USING "btree" ("tenant_id");



CREATE INDEX "idx_rep_locations_coords" ON "public"."rep_locations" USING "btree" ("latitude", "longitude");



CREATE INDEX "idx_rep_locations_recorded_at" ON "public"."rep_locations" USING "btree" ("recorded_at" DESC);



CREATE INDEX "idx_rep_locations_tenant_id" ON "public"."rep_locations" USING "btree" ("tenant_id");



CREATE INDEX "idx_rep_locations_user_id" ON "public"."rep_locations" USING "btree" ("user_id");



CREATE INDEX "idx_rep_locations_user_recent" ON "public"."rep_locations" USING "btree" ("user_id", "recorded_at" DESC);



CREATE INDEX "idx_report_schedules_created_by" ON "public"."report_schedules" USING "btree" ("created_by");



CREATE INDEX "idx_report_schedules_tenant" ON "public"."report_schedules" USING "btree" ("tenant_id");



CREATE INDEX "idx_response_mode_mode" ON "public"."storm_response_mode" USING "btree" ("mode");



CREATE INDEX "idx_response_mode_storm_event" ON "public"."storm_response_mode" USING "btree" ("storm_event_id");



CREATE INDEX "idx_response_mode_tenant" ON "public"."storm_response_mode" USING "btree" ("tenant_id");



CREATE INDEX "idx_roofing_knowledge_active" ON "public"."roofing_knowledge" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_roofing_knowledge_category" ON "public"."roofing_knowledge" USING "btree" ("category");



CREATE INDEX "idx_roofing_knowledge_created_by" ON "public"."roofing_knowledge" USING "btree" ("created_by");



CREATE INDEX "idx_roofing_knowledge_embedding" ON "public"."roofing_knowledge" USING "hnsw" ("embedding" "public"."vector_cosine_ops") WITH ("m"='16', "ef_construction"='64');



CREATE INDEX "idx_roofing_knowledge_global" ON "public"."roofing_knowledge" USING "btree" ("is_global") WHERE ("is_global" = true);



CREATE INDEX "idx_roofing_knowledge_manufacturer" ON "public"."roofing_knowledge" USING "btree" ("manufacturer");



CREATE INDEX "idx_roofing_knowledge_search" ON "public"."roofing_knowledge" USING "gin" ("search_vector");



CREATE INDEX "idx_roofing_knowledge_tenant" ON "public"."roofing_knowledge" USING "btree" ("tenant_id") WHERE ("tenant_id" IS NOT NULL);



CREATE INDEX "idx_saved_filters_default" ON "public"."saved_filters" USING "btree" ("tenant_id", "entity_type") WHERE ("is_default" = true);



CREATE INDEX "idx_saved_filters_tenant" ON "public"."saved_filters" USING "btree" ("tenant_id", "entity_type");



CREATE INDEX "idx_saved_filters_user" ON "public"."saved_filters" USING "btree" ("created_by") WHERE (NOT "is_shared");



CREATE INDEX "idx_shingle_products_replacement_product_id" ON "public"."shingle_products" USING "btree" ("replacement_product_id");



CREATE INDEX "idx_shingles_manufacturer" ON "public"."shingle_products" USING "btree" ("manufacturer");



CREATE INDEX "idx_shingles_status" ON "public"."shingle_products" USING "btree" ("status");



CREATE INDEX "idx_signature_docs_created" ON "public"."signature_documents" USING "btree" ("created_at" DESC) WHERE ("is_deleted" = false);



CREATE INDEX "idx_signature_docs_project" ON "public"."signature_documents" USING "btree" ("project_id") WHERE ("is_deleted" = false);



CREATE INDEX "idx_signature_docs_tenant_status" ON "public"."signature_documents" USING "btree" ("tenant_id", "status") WHERE ("is_deleted" = false);



CREATE INDEX "idx_signature_documents_contact" ON "public"."signature_documents" USING "btree" ("contact_id");



CREATE INDEX "idx_signature_documents_created_by" ON "public"."signature_documents" USING "btree" ("created_by");



CREATE INDEX "idx_signature_documents_fields_gin" ON "public"."signature_documents" USING "gin" ("signature_fields") WHERE ("signature_fields" <> '[]'::"jsonb");



CREATE INDEX "idx_signature_documents_project" ON "public"."signature_documents" USING "btree" ("project_id");



CREATE INDEX "idx_signature_documents_search" ON "public"."signature_documents" USING "gin" ("search_vector");



CREATE INDEX "idx_signature_documents_status" ON "public"."signature_documents" USING "btree" ("status");



CREATE INDEX "idx_signature_documents_tenant" ON "public"."signature_documents" USING "btree" ("tenant_id");



CREATE INDEX "idx_signatures_document" ON "public"."signatures" USING "btree" ("document_id");



CREATE INDEX "idx_signatures_document_completed" ON "public"."signatures" USING "btree" ("document_id") WHERE ("completed_fields" <> '[]'::"jsonb");



CREATE INDEX "idx_sms_templates_category" ON "public"."sms_templates" USING "btree" ("tenant_id", "category");



CREATE INDEX "idx_sms_templates_created_by" ON "public"."sms_templates" USING "btree" ("created_by");



CREATE INDEX "idx_sms_templates_tenant" ON "public"."sms_templates" USING "btree" ("tenant_id");



CREATE INDEX "idx_specs_manufacturer" ON "public"."manufacturer_specs" USING "btree" ("manufacturer");



CREATE INDEX "idx_status_substatus_configs_created_by" ON "public"."status_substatus_configs" USING "btree" ("created_by");



CREATE INDEX "idx_status_substatus_configs_default" ON "public"."status_substatus_configs" USING "btree" ("tenant_id", "entity_type", "status_value") WHERE ("is_default" = true);



CREATE INDEX "idx_status_substatus_configs_tenant" ON "public"."status_substatus_configs" USING "btree" ("tenant_id", "entity_type", "status_value") WHERE ("is_active" = true);



CREATE INDEX "idx_storm_alerts_created" ON "public"."storm_alerts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_storm_alerts_dismissed" ON "public"."storm_alerts" USING "btree" ("dismissed");



CREATE INDEX "idx_storm_alerts_expires" ON "public"."storm_alerts" USING "btree" ("expires_at");



CREATE INDEX "idx_storm_alerts_priority" ON "public"."storm_alerts" USING "btree" ("priority");



CREATE INDEX "idx_storm_alerts_storm_event" ON "public"."storm_alerts" USING "btree" ("storm_event_id");



CREATE INDEX "idx_storm_alerts_tenant" ON "public"."storm_alerts" USING "btree" ("tenant_id");



CREATE INDEX "idx_storm_events_date" ON "public"."storm_events" USING "btree" ("event_date" DESC);



CREATE INDEX "idx_storm_events_location" ON "public"."storm_events" USING "gist" ("path_polygon");



CREATE INDEX "idx_storm_events_magnitude" ON "public"."storm_events" USING "btree" ("magnitude" DESC) WHERE ("event_type" = 'hail'::"text");



CREATE INDEX "idx_storm_events_state" ON "public"."storm_events" USING "btree" ("state");



CREATE INDEX "idx_storm_events_tenant" ON "public"."storm_events" USING "btree" ("tenant_id");



CREATE INDEX "idx_storm_events_type" ON "public"."storm_events" USING "btree" ("event_type");



CREATE INDEX "idx_storm_targeting_areas_created_by" ON "public"."storm_targeting_areas" USING "btree" ("created_by");



CREATE INDEX "idx_supplements_claim" ON "public"."claim_supplements" USING "btree" ("claim_id");



CREATE INDEX "idx_supplements_status" ON "public"."claim_supplements" USING "btree" ("status");



CREATE INDEX "idx_surveys_contact_id" ON "public"."surveys" USING "btree" ("contact_id");



CREATE INDEX "idx_surveys_created_at" ON "public"."surveys" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_surveys_created_by" ON "public"."surveys" USING "btree" ("created_by");



CREATE INDEX "idx_surveys_job_id" ON "public"."surveys" USING "btree" ("job_id");



CREATE INDEX "idx_surveys_negative" ON "public"."surveys" USING "btree" ("is_negative_feedback", "manager_notified") WHERE ("is_negative_feedback" = true);



CREATE INDEX "idx_surveys_project_id" ON "public"."surveys" USING "btree" ("project_id");



CREATE INDEX "idx_surveys_rating" ON "public"."surveys" USING "btree" ("rating");



CREATE INDEX "idx_surveys_reviews" ON "public"."surveys" USING "btree" ("rating", "review_posted") WHERE ("completed_at" IS NOT NULL);



CREATE INDEX "idx_surveys_survey_token" ON "public"."surveys" USING "btree" ("survey_token");



CREATE INDEX "idx_surveys_tenant_id" ON "public"."surveys" USING "btree" ("tenant_id");



CREATE INDEX "idx_surveys_user_id" ON "public"."surveys" USING "btree" ("user_id");



CREATE INDEX "idx_targeting_areas_created" ON "public"."storm_targeting_areas" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_targeting_areas_location" ON "public"."storm_targeting_areas" USING "gist" ("boundary_polygon");



CREATE INDEX "idx_targeting_areas_status" ON "public"."storm_targeting_areas" USING "btree" ("status");



CREATE INDEX "idx_targeting_areas_storm" ON "public"."storm_targeting_areas" USING "btree" ("storm_event_id");



CREATE INDEX "idx_targeting_areas_tenant" ON "public"."storm_targeting_areas" USING "btree" ("tenant_id");



CREATE INDEX "idx_task_activity_task" ON "public"."task_activity" USING "btree" ("task_id");



CREATE INDEX "idx_task_activity_user_id" ON "public"."task_activity" USING "btree" ("user_id");



CREATE INDEX "idx_task_attachments_task" ON "public"."task_attachments" USING "btree" ("task_id");



CREATE INDEX "idx_task_attachments_uploaded_by" ON "public"."task_attachments" USING "btree" ("uploaded_by");



CREATE INDEX "idx_task_comments_task" ON "public"."task_comments" USING "btree" ("task_id");



CREATE INDEX "idx_task_comments_user_id" ON "public"."task_comments" USING "btree" ("user_id");



CREATE INDEX "idx_tasks_assigned_by" ON "public"."tasks" USING "btree" ("assigned_by");



CREATE INDEX "idx_tasks_assigned_status" ON "public"."tasks" USING "btree" ("assigned_to", "status") WHERE (("status" <> 'completed'::"text") AND ("status" <> 'cancelled'::"text"));



CREATE INDEX "idx_tasks_assigned_to" ON "public"."tasks" USING "btree" ("assigned_to");



CREATE INDEX "idx_tasks_contact_id" ON "public"."tasks" USING "btree" ("contact_id");



CREATE INDEX "idx_tasks_created_at" ON "public"."tasks" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_tasks_created_by" ON "public"."tasks" USING "btree" ("created_by");



CREATE INDEX "idx_tasks_due_date" ON "public"."tasks" USING "btree" ("due_date");



CREATE INDEX "idx_tasks_parent" ON "public"."tasks" USING "btree" ("parent_task_id");



CREATE INDEX "idx_tasks_priority" ON "public"."tasks" USING "btree" ("priority");



CREATE INDEX "idx_tasks_project_id" ON "public"."tasks" USING "btree" ("project_id");



CREATE INDEX "idx_tasks_search" ON "public"."tasks" USING "gin" ("search_vector");



CREATE INDEX "idx_tasks_status" ON "public"."tasks" USING "btree" ("status");



CREATE INDEX "idx_tasks_tags" ON "public"."tasks" USING "gin" ("tags");



CREATE INDEX "idx_tasks_tenant_id" ON "public"."tasks" USING "btree" ("tenant_id");



CREATE INDEX "idx_templates_created_by" ON "public"."templates" USING "btree" ("created_by");



CREATE INDEX "idx_templates_tenant" ON "public"."templates" USING "btree" ("tenant_id");



CREATE INDEX "idx_templates_tenant_id" ON "public"."templates" USING "btree" ("tenant_id");



CREATE INDEX "idx_templates_type" ON "public"."templates" USING "btree" ("tenant_id", "type");



CREATE INDEX "idx_tenant_settings_default_lead_assignee" ON "public"."tenant_settings" USING "btree" ("default_lead_assignee");



CREATE INDEX "idx_tenant_users_status" ON "public"."tenant_users" USING "btree" ("tenant_id", "status");



CREATE INDEX "idx_tenant_users_tenant_id" ON "public"."tenant_users" USING "btree" ("tenant_id");



CREATE INDEX "idx_tenant_users_user_id" ON "public"."tenant_users" USING "btree" ("user_id");



CREATE INDEX "idx_territories_assigned_to" ON "public"."territories" USING "btree" ("assigned_to");



CREATE INDEX "idx_territories_boundary_data" ON "public"."territories" USING "gin" ("boundary_data");



CREATE INDEX "idx_territories_created_by" ON "public"."territories" USING "btree" ("created_by");



CREATE INDEX "idx_territories_is_deleted" ON "public"."territories" USING "btree" ("is_deleted");



CREATE INDEX "idx_territories_name" ON "public"."territories" USING "btree" ("name");



CREATE INDEX "idx_territories_tenant_id" ON "public"."territories" USING "btree" ("tenant_id");



CREATE INDEX "idx_timesheets_approved_by" ON "public"."timesheets" USING "btree" ("approved_by");



CREATE INDEX "idx_timesheets_created_by" ON "public"."timesheets" USING "btree" ("created_by");



CREATE INDEX "idx_timesheets_crew" ON "public"."timesheets" USING "btree" ("crew_member_id");



CREATE INDEX "idx_timesheets_date" ON "public"."timesheets" USING "btree" ("work_date");



CREATE INDEX "idx_timesheets_project" ON "public"."timesheets" USING "btree" ("project_id");



CREATE INDEX "idx_timesheets_status" ON "public"."timesheets" USING "btree" ("status");



CREATE INDEX "idx_timesheets_tenant_id" ON "public"."timesheets" USING "btree" ("tenant_id");



CREATE INDEX "idx_ui_prefs_tenant" ON "public"."user_ui_preferences" USING "btree" ("tenant_id");



CREATE INDEX "idx_ui_prefs_user" ON "public"."user_ui_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_user_achievements_tenant_id" ON "public"."user_achievements" USING "btree" ("tenant_id");



CREATE INDEX "idx_user_achievements_user" ON "public"."user_achievements" USING "btree" ("user_id");



CREATE INDEX "idx_user_challenges_active" ON "public"."user_challenges" USING "btree" ("challenge_id", "is_completed");



CREATE INDEX "idx_user_challenges_tenant_id" ON "public"."user_challenges" USING "btree" ("tenant_id");



CREATE INDEX "idx_user_challenges_user" ON "public"."user_challenges" USING "btree" ("user_id");



CREATE INDEX "idx_user_points_contact_id" ON "public"."user_points" USING "btree" ("contact_id");



CREATE INDEX "idx_user_points_earned_at" ON "public"."user_points" USING "btree" ("earned_at" DESC);



CREATE INDEX "idx_user_points_project_id" ON "public"."user_points" USING "btree" ("project_id");



CREATE INDEX "idx_user_points_tenant_user" ON "public"."user_points" USING "btree" ("tenant_id", "user_id");



CREATE INDEX "idx_user_role_assignments_assigned_by" ON "public"."user_role_assignments" USING "btree" ("assigned_by");



CREATE INDEX "idx_user_role_assignments_role_id" ON "public"."user_role_assignments" USING "btree" ("role_id");



CREATE INDEX "idx_user_role_assignments_tenant" ON "public"."user_role_assignments" USING "btree" ("tenant_id");



CREATE INDEX "idx_user_role_assignments_user" ON "public"."user_role_assignments" USING "btree" ("user_id");



CREATE INDEX "idx_user_roles_created_by" ON "public"."user_roles" USING "btree" ("created_by");



CREATE INDEX "idx_user_roles_tenant" ON "public"."user_roles" USING "btree" ("tenant_id");



CREATE INDEX "idx_user_sessions_active" ON "public"."user_sessions" USING "btree" ("user_id", "last_active_at" DESC) WHERE ("revoked_at" IS NULL);



CREATE INDEX "idx_user_sessions_tenant" ON "public"."user_sessions" USING "btree" ("tenant_id");



CREATE INDEX "idx_user_sessions_token" ON "public"."user_sessions" USING "btree" ("session_token_hash");



CREATE INDEX "idx_user_sessions_user" ON "public"."user_sessions" USING "btree" ("user_id", "revoked_at" NULLS FIRST);



CREATE INDEX "idx_user_streaks_tenant_id" ON "public"."user_streaks" USING "btree" ("tenant_id");



CREATE INDEX "idx_user_streaks_user" ON "public"."user_streaks" USING "btree" ("user_id");



CREATE INDEX "idx_voice_function_calls_called_at" ON "public"."voice_function_calls" USING "btree" ("called_at" DESC);



CREATE INDEX "idx_voice_function_calls_function_name" ON "public"."voice_function_calls" USING "btree" ("function_name");



CREATE INDEX "idx_voice_function_calls_session_id" ON "public"."voice_function_calls" USING "btree" ("session_id");



CREATE INDEX "idx_voice_function_calls_status" ON "public"."voice_function_calls" USING "btree" ("status");



CREATE INDEX "idx_voice_function_calls_tenant_id" ON "public"."voice_function_calls" USING "btree" ("tenant_id");



CREATE INDEX "idx_voice_sessions_contact_id" ON "public"."voice_sessions" USING "btree" ("contact_id");



CREATE INDEX "idx_voice_sessions_project_id" ON "public"."voice_sessions" USING "btree" ("project_id");



CREATE INDEX "idx_voice_sessions_provider" ON "public"."voice_sessions" USING "btree" ("provider");



CREATE INDEX "idx_voice_sessions_session_id" ON "public"."voice_sessions" USING "btree" ("session_id");



CREATE INDEX "idx_voice_sessions_started_at" ON "public"."voice_sessions" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_voice_sessions_status" ON "public"."voice_sessions" USING "btree" ("status");



CREATE INDEX "idx_voice_sessions_tenant_id" ON "public"."voice_sessions" USING "btree" ("tenant_id");



CREATE INDEX "idx_voice_sessions_user_id" ON "public"."voice_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_win_loss_reasons_created_by" ON "public"."win_loss_reasons" USING "btree" ("created_by");



CREATE INDEX "idx_win_loss_reasons_tenant" ON "public"."win_loss_reasons" USING "btree" ("tenant_id");



CREATE INDEX "idx_workflow_executions_current_step_id" ON "public"."workflow_executions" USING "btree" ("current_step_id");



CREATE INDEX "idx_workflow_executions_status" ON "public"."workflow_executions" USING "btree" ("status") WHERE (("status")::"text" = ANY ((ARRAY['pending'::character varying, 'running'::character varying])::"text"[]));



CREATE INDEX "idx_workflow_executions_tenant_id" ON "public"."workflow_executions" USING "btree" ("tenant_id");



CREATE INDEX "idx_workflow_executions_workflow_id" ON "public"."workflow_executions" USING "btree" ("workflow_id");



CREATE INDEX "idx_workflow_step_executions_execution_id" ON "public"."workflow_step_executions" USING "btree" ("execution_id");



CREATE INDEX "idx_workflow_step_executions_step_id" ON "public"."workflow_step_executions" USING "btree" ("step_id");



CREATE INDEX "idx_workflow_steps_workflow_id" ON "public"."workflow_steps" USING "btree" ("workflow_id", "step_order");



CREATE INDEX "idx_workflows_created_by" ON "public"."workflows" USING "btree" ("created_by");



CREATE INDEX "idx_workflows_tenant_id" ON "public"."workflows" USING "btree" ("tenant_id");



CREATE INDEX "idx_workflows_trigger_type" ON "public"."workflows" USING "btree" ("trigger_type") WHERE ("is_active" = true);



CREATE OR REPLACE TRIGGER "events_updated_at" BEFORE UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."update_event_updated_at"();



CREATE OR REPLACE TRIGGER "events_validate_times" BEFORE INSERT OR UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."validate_event_times"();



CREATE OR REPLACE TRIGGER "jobs_calculate_duration" BEFORE INSERT OR UPDATE ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_job_duration"();



CREATE OR REPLACE TRIGGER "jobs_generate_number" BEFORE INSERT ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."generate_job_number"();



CREATE OR REPLACE TRIGGER "jobs_updated_at" BEFORE UPDATE ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."update_job_updated_at"();



CREATE OR REPLACE TRIGGER "notification_prefs_updated_at" BEFORE UPDATE ON "public"."user_notification_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_notification_prefs_updated_at"();



CREATE OR REPLACE TRIGGER "photos_updated_at" BEFORE UPDATE ON "public"."photos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "surveys_generate_token" BEFORE INSERT ON "public"."surveys" FOR EACH ROW EXECUTE FUNCTION "public"."generate_survey_token"();



CREATE OR REPLACE TRIGGER "surveys_handle_rating" BEFORE UPDATE ON "public"."surveys" FOR EACH ROW WHEN (("new"."rating" IS NOT NULL)) EXECUTE FUNCTION "public"."handle_survey_rating"();



CREATE OR REPLACE TRIGGER "surveys_updated_at" BEFORE UPDATE ON "public"."surveys" FOR EACH ROW EXECUTE FUNCTION "public"."update_survey_updated_at"();



CREATE OR REPLACE TRIGGER "task_comments_updated_at" BEFORE UPDATE ON "public"."task_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_task_comments_updated_at"();



CREATE OR REPLACE TRIGGER "tasks_set_completed_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."set_task_completed_at"();



CREATE OR REPLACE TRIGGER "tasks_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_task_updated_at"();



CREATE OR REPLACE TRIGGER "territories_updated_at" BEFORE UPDATE ON "public"."territories" FOR EACH ROW EXECUTE FUNCTION "public"."update_territories_updated_at"();



CREATE OR REPLACE TRIGGER "track_stage_change_trigger" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."track_pipeline_stage_change"();



CREATE OR REPLACE TRIGGER "trigger_award_activity_points" AFTER INSERT ON "public"."activities" FOR EACH ROW EXECUTE FUNCTION "public"."award_activity_points"();



CREATE OR REPLACE TRIGGER "trigger_generate_card_slug" BEFORE INSERT OR UPDATE ON "public"."digital_business_cards" FOR EACH ROW EXECUTE FUNCTION "public"."generate_card_slug"();



CREATE OR REPLACE TRIGGER "trigger_increment_saved_filter_usage" AFTER INSERT ON "public"."filter_usage_logs" FOR EACH ROW EXECUTE FUNCTION "public"."increment_saved_filter_usage"();



CREATE OR REPLACE TRIGGER "trigger_set_deactivation_timestamp" BEFORE UPDATE ON "public"."tenant_users" FOR EACH ROW WHEN ((("old"."status")::"text" IS DISTINCT FROM ("new"."status")::"text")) EXECUTE FUNCTION "public"."set_deactivation_timestamp"();



CREATE OR REPLACE TRIGGER "trigger_set_default_substatus_contacts" BEFORE INSERT OR UPDATE ON "public"."contacts" FOR EACH ROW EXECUTE FUNCTION "public"."set_default_substatus"();



CREATE OR REPLACE TRIGGER "trigger_set_default_substatus_projects" BEFORE INSERT OR UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."set_default_substatus"();



CREATE OR REPLACE TRIGGER "trigger_update_ai_conversation_updated_at" BEFORE UPDATE ON "public"."ai_conversations" FOR EACH ROW EXECUTE FUNCTION "public"."update_ai_conversation_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_card_analytics" AFTER INSERT ON "public"."business_card_interactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_card_analytics"();



CREATE OR REPLACE TRIGGER "trigger_update_conversation_on_message" AFTER INSERT ON "public"."ai_messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_on_message"();



CREATE OR REPLACE TRIGGER "trigger_update_digital_business_cards_updated_at" BEFORE UPDATE ON "public"."digital_business_cards" FOR EACH ROW EXECUTE FUNCTION "public"."update_digital_business_cards_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_filter_configs_updated_at" BEFORE UPDATE ON "public"."filter_configs" FOR EACH ROW EXECUTE FUNCTION "public"."update_filter_configs_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_impersonation_log_updated_at" BEFORE UPDATE ON "public"."impersonation_logs" FOR EACH ROW EXECUTE FUNCTION "public"."update_impersonation_log_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_project_costs" AFTER INSERT OR DELETE OR UPDATE ON "public"."job_expenses" FOR EACH ROW EXECUTE FUNCTION "public"."update_project_actual_costs"();



CREATE OR REPLACE TRIGGER "trigger_update_roofing_knowledge_timestamp" BEFORE UPDATE ON "public"."roofing_knowledge" FOR EACH ROW EXECUTE FUNCTION "public"."update_roofing_knowledge_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_saved_filters_updated_at" BEFORE UPDATE ON "public"."saved_filters" FOR EACH ROW EXECUTE FUNCTION "public"."update_saved_filters_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_status_substatus_configs_updated_at" BEFORE UPDATE ON "public"."status_substatus_configs" FOR EACH ROW EXECUTE FUNCTION "public"."update_status_substatus_configs_updated_at"();



CREATE OR REPLACE TRIGGER "ui_prefs_updated_at" BEFORE UPDATE ON "public"."user_ui_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_ui_prefs_updated_at"();



CREATE OR REPLACE TRIGGER "update_contact_search_vector" BEFORE INSERT OR UPDATE ON "public"."contacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_contact_search_vector"();



CREATE OR REPLACE TRIGGER "update_contacts_updated_at" BEFORE UPDATE ON "public"."contacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_crew_members_updated_at" BEFORE UPDATE ON "public"."crew_members" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_document_templates_updated_at" BEFORE UPDATE ON "public"."document_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_email_templates_updated_at" BEFORE UPDATE ON "public"."email_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_extracted_addresses_updated_at" BEFORE UPDATE ON "public"."extracted_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_import_jobs_updated_at" BEFORE UPDATE ON "public"."bulk_import_jobs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_job_expenses_updated_at" BEFORE UPDATE ON "public"."job_expenses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_knocks_updated_at" BEFORE UPDATE ON "public"."knocks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_material_purchases_updated_at" BEFORE UPDATE ON "public"."material_purchases" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_pipeline_stages_updated_at" BEFORE UPDATE ON "public"."pipeline_stages" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_projects_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_quickbooks_connections_updated_at" BEFORE UPDATE ON "public"."quickbooks_connections" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_quickbooks_mappings_updated_at" BEFORE UPDATE ON "public"."quickbooks_mappings" FOR EACH ROW EXECUTE FUNCTION "public"."update_quickbooks_updated_at"();



CREATE OR REPLACE TRIGGER "update_quickbooks_tokens_updated_at" BEFORE UPDATE ON "public"."quickbooks_tokens" FOR EACH ROW EXECUTE FUNCTION "public"."update_quickbooks_updated_at"();



CREATE OR REPLACE TRIGGER "update_response_mode_updated_at" BEFORE UPDATE ON "public"."storm_response_mode" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_signature_documents_updated_at" BEFORE UPDATE ON "public"."signature_documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_signature_documents_updated_at"();



CREATE OR REPLACE TRIGGER "update_sms_templates_updated_at" BEFORE UPDATE ON "public"."sms_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_storm_alerts_updated_at" BEFORE UPDATE ON "public"."storm_alerts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_storm_events_updated_at" BEFORE UPDATE ON "public"."storm_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_targeting_areas_updated_at" BEFORE UPDATE ON "public"."storm_targeting_areas" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tenant_settings_updated_at" BEFORE UPDATE ON "public"."tenant_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_timesheets_updated_at" BEFORE UPDATE ON "public"."timesheets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_user_roles_updated_at" BEFORE UPDATE ON "public"."user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "voice_sessions_updated_at" BEFORE UPDATE ON "public"."voice_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_voice_session_updated_at"();



CREATE OR REPLACE TRIGGER "workflow_executions_updated_at" BEFORE UPDATE ON "public"."workflow_executions" FOR EACH ROW EXECUTE FUNCTION "public"."update_workflows_updated_at"();



CREATE OR REPLACE TRIGGER "workflow_steps_updated_at" BEFORE UPDATE ON "public"."workflow_steps" FOR EACH ROW EXECUTE FUNCTION "public"."update_workflows_updated_at"();



CREATE OR REPLACE TRIGGER "workflows_updated_at" BEFORE UPDATE ON "public"."workflows" FOR EACH ROW EXECUTE FUNCTION "public"."update_workflows_updated_at"();



ALTER TABLE ONLY "public"."achievements"
    ADD CONSTRAINT "achievements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id");



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_on_behalf_of_fkey" FOREIGN KEY ("on_behalf_of") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_read_by_fkey" FOREIGN KEY ("read_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_conversations"
    ADD CONSTRAINT "ai_conversations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_conversations"
    ADD CONSTRAINT "ai_conversations_tenant_user_fk" FOREIGN KEY ("tenant_id", "user_id") REFERENCES "public"."tenant_users"("tenant_id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_conversations"
    ADD CONSTRAINT "ai_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_messages"
    ADD CONSTRAINT "ai_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ar_damage_markers"
    ADD CONSTRAINT "ar_damage_markers_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."ar_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ar_measurements"
    ADD CONSTRAINT "ar_measurements_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."ar_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ar_sessions"
    ADD CONSTRAINT "ar_sessions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."automations"
    ADD CONSTRAINT "automations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."automations"
    ADD CONSTRAINT "automations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."building_codes"
    ADD CONSTRAINT "building_codes_superseded_by_fkey" FOREIGN KEY ("superseded_by") REFERENCES "public"."building_codes"("id");



ALTER TABLE ONLY "public"."bulk_import_jobs"
    ADD CONSTRAINT "bulk_import_jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."bulk_import_jobs"
    ADD CONSTRAINT "bulk_import_jobs_targeting_area_id_fkey" FOREIGN KEY ("targeting_area_id") REFERENCES "public"."storm_targeting_areas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bulk_import_jobs"
    ADD CONSTRAINT "bulk_import_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."business_card_interactions"
    ADD CONSTRAINT "business_card_interactions_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "public"."digital_business_cards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."call_logs"
    ADD CONSTRAINT "call_logs_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."call_logs"
    ADD CONSTRAINT "call_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."call_logs"
    ADD CONSTRAINT "call_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."call_logs"
    ADD CONSTRAINT "call_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."carrier_standards"
    ADD CONSTRAINT "carrier_standards_carrier_id_fkey" FOREIGN KEY ("carrier_id") REFERENCES "public"."insurance_carriers"("id");



ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claim_communications"
    ADD CONSTRAINT "claim_communications_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claim_documents"
    ADD CONSTRAINT "claim_documents_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claim_supplements"
    ADD CONSTRAINT "claim_supplements_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claim_weather_data"
    ADD CONSTRAINT "claim_weather_data_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_carrier_id_fkey" FOREIGN KEY ("carrier_id") REFERENCES "public"."insurance_carriers"("id");



ALTER TABLE ONLY "public"."commission_records"
    ADD CONSTRAINT "commission_records_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."commission_plans"("id");



ALTER TABLE ONLY "public"."commission_records"
    ADD CONSTRAINT "commission_records_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."commission_rules"
    ADD CONSTRAINT "commission_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."commissions"
    ADD CONSTRAINT "commissions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."commissions"
    ADD CONSTRAINT "commissions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."commissions"
    ADD CONSTRAINT "commissions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "public"."commission_rules"("id");



ALTER TABLE ONLY "public"."commissions"
    ADD CONSTRAINT "commissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."commissions"
    ADD CONSTRAINT "commissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_policy_holder_id_fkey" FOREIGN KEY ("policy_holder_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."court_cases"
    ADD CONSTRAINT "court_cases_carrier_id_fkey" FOREIGN KEY ("carrier_id") REFERENCES "public"."insurance_carriers"("id");



ALTER TABLE ONLY "public"."crew_members"
    ADD CONSTRAINT "crew_members_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crew_members"
    ADD CONSTRAINT "crew_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."digital_business_cards"
    ADD CONSTRAINT "digital_business_cards_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."digital_business_cards"
    ADD CONSTRAINT "digital_business_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_templates"
    ADD CONSTRAINT "document_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."document_templates"
    ADD CONSTRAINT "document_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_previous_version_id_fkey" FOREIGN KEY ("previous_version_id") REFERENCES "public"."documents"("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_drafts"
    ADD CONSTRAINT "email_drafts_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_organizer_fkey" FOREIGN KEY ("organizer") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_parent_event_id_fkey" FOREIGN KEY ("parent_event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."extracted_addresses"
    ADD CONSTRAINT "extracted_addresses_bulk_import_job_id_fkey" FOREIGN KEY ("bulk_import_job_id") REFERENCES "public"."bulk_import_jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."extracted_addresses"
    ADD CONSTRAINT "extracted_addresses_enrichment_cache_id_fkey" FOREIGN KEY ("enrichment_cache_id") REFERENCES "public"."property_enrichment_cache"("id");



ALTER TABLE ONLY "public"."extracted_addresses"
    ADD CONSTRAINT "extracted_addresses_targeting_area_id_fkey" FOREIGN KEY ("targeting_area_id") REFERENCES "public"."storm_targeting_areas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."extracted_addresses"
    ADD CONSTRAINT "extracted_addresses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."filter_configs"
    ADD CONSTRAINT "filter_configs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."filter_configs"
    ADD CONSTRAINT "filter_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."filter_usage_logs"
    ADD CONSTRAINT "filter_usage_logs_filter_config_id_fkey" FOREIGN KEY ("filter_config_id") REFERENCES "public"."filter_configs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."filter_usage_logs"
    ADD CONSTRAINT "filter_usage_logs_saved_filter_id_fkey" FOREIGN KEY ("saved_filter_id") REFERENCES "public"."saved_filters"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."filter_usage_logs"
    ADD CONSTRAINT "filter_usage_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."filter_usage_logs"
    ADD CONSTRAINT "filter_usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."knocks"
    ADD CONSTRAINT "fk_knocks_territory" FOREIGN KEY ("territory_id") REFERENCES "public"."territories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gamification_activities"
    ADD CONSTRAINT "gamification_activities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gamification_activities"
    ADD CONSTRAINT "gamification_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."gamification_scores"
    ADD CONSTRAINT "gamification_scores_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gamification_scores"
    ADD CONSTRAINT "gamification_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."impersonation_logs"
    ADD CONSTRAINT "impersonation_logs_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."impersonation_logs"
    ADD CONSTRAINT "impersonation_logs_impersonated_user_id_fkey" FOREIGN KEY ("impersonated_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."impersonation_logs"
    ADD CONSTRAINT "impersonation_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."industry_standards"
    ADD CONSTRAINT "industry_standards_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."industry_organizations"("id");



ALTER TABLE ONLY "public"."industry_standards"
    ADD CONSTRAINT "industry_standards_superseded_by_fkey" FOREIGN KEY ("superseded_by") REFERENCES "public"."industry_standards"("id");



ALTER TABLE ONLY "public"."insurance_personnel"
    ADD CONSTRAINT "insurance_personnel_carrier_id_fkey" FOREIGN KEY ("carrier_id") REFERENCES "public"."insurance_carriers"("id");



ALTER TABLE ONLY "public"."job_expenses"
    ADD CONSTRAINT "job_expenses_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."job_expenses"
    ADD CONSTRAINT "job_expenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."job_expenses"
    ADD CONSTRAINT "job_expenses_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_expenses"
    ADD CONSTRAINT "job_expenses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_expenses"
    ADD CONSTRAINT "job_expenses_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."contacts"("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_crew_lead_fkey" FOREIGN KEY ("crew_lead") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_quality_inspector_fkey" FOREIGN KEY ("quality_inspector") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_safety_inspector_fkey" FOREIGN KEY ("safety_inspector") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."knocks"
    ADD CONSTRAINT "knocks_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."knocks"
    ADD CONSTRAINT "knocks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."knocks"
    ADD CONSTRAINT "knocks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."knowledge_base"
    ADD CONSTRAINT "knowledge_base_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."knowledge_search_queries"
    ADD CONSTRAINT "knowledge_search_queries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."knowledge_search_queries"
    ADD CONSTRAINT "knowledge_search_queries_top_result_id_fkey" FOREIGN KEY ("top_result_id") REFERENCES "public"."roofing_knowledge"("id");



ALTER TABLE ONLY "public"."knowledge_search_queries"
    ADD CONSTRAINT "knowledge_search_queries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."kpi_snapshots"
    ADD CONSTRAINT "kpi_snapshots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."login_activity"
    ADD CONSTRAINT "login_activity_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."login_activity"
    ADD CONSTRAINT "login_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."material_purchases"
    ADD CONSTRAINT "material_purchases_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."material_purchases"
    ADD CONSTRAINT "material_purchases_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."material_purchases"
    ADD CONSTRAINT "material_purchases_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."contacts"("id");



ALTER TABLE ONLY "public"."material_purchases"
    ADD CONSTRAINT "material_purchases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."photos"
    ADD CONSTRAINT "photos_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."photos"
    ADD CONSTRAINT "photos_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."photos"
    ADD CONSTRAINT "photos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."photos"
    ADD CONSTRAINT "photos_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pipeline_stages"
    ADD CONSTRAINT "pipeline_stages_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pipeline_stages"
    ADD CONSTRAINT "pipeline_stages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."point_rules"
    ADD CONSTRAINT "point_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_files"
    ADD CONSTRAINT "project_files_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_files"
    ADD CONSTRAINT "project_files_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_files"
    ADD CONSTRAINT "project_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_adjuster_contact_id_fkey" FOREIGN KEY ("adjuster_contact_id") REFERENCES "public"."contacts"("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_parent_project_id_fkey" FOREIGN KEY ("parent_project_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_storm_event_id_fkey" FOREIGN KEY ("storm_event_id") REFERENCES "public"."storm_events"("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quickbooks_connections"
    ADD CONSTRAINT "quickbooks_connections_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."quickbooks_connections"
    ADD CONSTRAINT "quickbooks_connections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quickbooks_mappings"
    ADD CONSTRAINT "quickbooks_mappings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quickbooks_sync_logs"
    ADD CONSTRAINT "quickbooks_sync_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quickbooks_tokens"
    ADD CONSTRAINT "quickbooks_tokens_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_line_items"
    ADD CONSTRAINT "quote_line_items_quote_option_id_fkey" FOREIGN KEY ("quote_option_id") REFERENCES "public"."quote_options"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_line_items"
    ADD CONSTRAINT "quote_line_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_options"
    ADD CONSTRAINT "quote_options_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."rep_locations"
    ADD CONSTRAINT "rep_locations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rep_locations"
    ADD CONSTRAINT "rep_locations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_schedules"
    ADD CONSTRAINT "report_schedules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."report_schedules"
    ADD CONSTRAINT "report_schedules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."roofing_knowledge"
    ADD CONSTRAINT "roofing_knowledge_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."roofing_knowledge"
    ADD CONSTRAINT "roofing_knowledge_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saved_filters"
    ADD CONSTRAINT "saved_filters_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."saved_filters"
    ADD CONSTRAINT "saved_filters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shingle_products"
    ADD CONSTRAINT "shingle_products_replacement_product_id_fkey" FOREIGN KEY ("replacement_product_id") REFERENCES "public"."shingle_products"("id");



ALTER TABLE ONLY "public"."signature_documents"
    ADD CONSTRAINT "signature_documents_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."signature_documents"
    ADD CONSTRAINT "signature_documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."signature_documents"
    ADD CONSTRAINT "signature_documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."signature_documents"
    ADD CONSTRAINT "signature_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."signatures"
    ADD CONSTRAINT "signatures_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."signature_documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sms_templates"
    ADD CONSTRAINT "sms_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."sms_templates"
    ADD CONSTRAINT "sms_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."status_substatus_configs"
    ADD CONSTRAINT "status_substatus_configs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."status_substatus_configs"
    ADD CONSTRAINT "status_substatus_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."storm_alerts"
    ADD CONSTRAINT "storm_alerts_storm_event_id_fkey" FOREIGN KEY ("storm_event_id") REFERENCES "public"."storm_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."storm_alerts"
    ADD CONSTRAINT "storm_alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."storm_events"
    ADD CONSTRAINT "storm_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."storm_response_mode"
    ADD CONSTRAINT "storm_response_mode_activated_by_fkey" FOREIGN KEY ("activated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."storm_response_mode"
    ADD CONSTRAINT "storm_response_mode_storm_event_id_fkey" FOREIGN KEY ("storm_event_id") REFERENCES "public"."storm_events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."storm_response_mode"
    ADD CONSTRAINT "storm_response_mode_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."storm_targeting_areas"
    ADD CONSTRAINT "storm_targeting_areas_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."storm_targeting_areas"
    ADD CONSTRAINT "storm_targeting_areas_storm_event_id_fkey" FOREIGN KEY ("storm_event_id") REFERENCES "public"."storm_events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."storm_targeting_areas"
    ADD CONSTRAINT "storm_targeting_areas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."surveys"
    ADD CONSTRAINT "surveys_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."surveys"
    ADD CONSTRAINT "surveys_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."surveys"
    ADD CONSTRAINT "surveys_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."surveys"
    ADD CONSTRAINT "surveys_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."surveys"
    ADD CONSTRAINT "surveys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."surveys"
    ADD CONSTRAINT "surveys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."task_activity"
    ADD CONSTRAINT "task_activity_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_activity"
    ADD CONSTRAINT "task_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."task_attachments"
    ADD CONSTRAINT "task_attachments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_attachments"
    ADD CONSTRAINT "task_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_settings"
    ADD CONSTRAINT "tenant_settings_default_lead_assignee_fkey" FOREIGN KEY ("default_lead_assignee") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."tenant_settings"
    ADD CONSTRAINT "tenant_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_users"
    ADD CONSTRAINT "tenant_users_deactivated_by_fkey" FOREIGN KEY ("deactivated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."tenant_users"
    ADD CONSTRAINT "tenant_users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_users"
    ADD CONSTRAINT "tenant_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."territories"
    ADD CONSTRAINT "territories_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."territories"
    ADD CONSTRAINT "territories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."territories"
    ADD CONSTRAINT "territories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timesheets"
    ADD CONSTRAINT "timesheets_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."timesheets"
    ADD CONSTRAINT "timesheets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."timesheets"
    ADD CONSTRAINT "timesheets_crew_member_id_fkey" FOREIGN KEY ("crew_member_id") REFERENCES "public"."crew_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timesheets"
    ADD CONSTRAINT "timesheets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timesheets"
    ADD CONSTRAINT "timesheets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_challenges"
    ADD CONSTRAINT "user_challenges_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_challenges"
    ADD CONSTRAINT "user_challenges_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_challenges"
    ADD CONSTRAINT "user_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_notification_preferences"
    ADD CONSTRAINT "user_notification_preferences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_notification_preferences"
    ADD CONSTRAINT "user_notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_points"
    ADD CONSTRAINT "user_points_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_points"
    ADD CONSTRAINT "user_points_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_points"
    ADD CONSTRAINT "user_points_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_points"
    ADD CONSTRAINT "user_points_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_role_assignments"
    ADD CONSTRAINT "user_role_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_role_assignments"
    ADD CONSTRAINT "user_role_assignments_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."user_roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_role_assignments"
    ADD CONSTRAINT "user_role_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_role_assignments"
    ADD CONSTRAINT "user_role_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_streaks"
    ADD CONSTRAINT "user_streaks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_streaks"
    ADD CONSTRAINT "user_streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_ui_preferences"
    ADD CONSTRAINT "user_ui_preferences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_ui_preferences"
    ADD CONSTRAINT "user_ui_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."voice_function_calls"
    ADD CONSTRAINT "voice_function_calls_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."voice_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."voice_function_calls"
    ADD CONSTRAINT "voice_function_calls_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."voice_sessions"
    ADD CONSTRAINT "voice_sessions_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."voice_sessions"
    ADD CONSTRAINT "voice_sessions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."voice_sessions"
    ADD CONSTRAINT "voice_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."voice_sessions"
    ADD CONSTRAINT "voice_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."win_loss_reasons"
    ADD CONSTRAINT "win_loss_reasons_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."win_loss_reasons"
    ADD CONSTRAINT "win_loss_reasons_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_executions"
    ADD CONSTRAINT "workflow_executions_current_step_id_fkey" FOREIGN KEY ("current_step_id") REFERENCES "public"."workflow_steps"("id");



ALTER TABLE ONLY "public"."workflow_executions"
    ADD CONSTRAINT "workflow_executions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_executions"
    ADD CONSTRAINT "workflow_executions_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_step_executions"
    ADD CONSTRAINT "workflow_step_executions_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "public"."workflow_executions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_step_executions"
    ADD CONSTRAINT "workflow_step_executions_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "public"."workflow_steps"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_steps"
    ADD CONSTRAINT "workflow_steps_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflows"
    ADD CONSTRAINT "workflows_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."workflows"
    ADD CONSTRAINT "workflows_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



CREATE POLICY "Achievements are viewable by all authenticated users" ON "public"."achievements" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "Admins can create cards" ON "public"."digital_business_cards" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND (("tenant_users"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Admins can create impersonation logs" ON "public"."impersonation_logs" FOR INSERT WITH CHECK ((("admin_user_id" = "auth"."uid"()) AND ("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND (("tenant_users"."role")::"text" = 'admin'::"text"))))));



CREATE POLICY "Admins can delete cards" ON "public"."digital_business_cards" FOR DELETE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND (("tenant_users"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Admins can delete interactions" ON "public"."business_card_interactions" FOR DELETE USING (("card_id" IN ( SELECT "digital_business_cards"."id"
   FROM "public"."digital_business_cards"
  WHERE ("digital_business_cards"."tenant_id" IN ( SELECT "tenant_users"."tenant_id"
           FROM "public"."tenant_users"
          WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND (("tenant_users"."role")::"text" = 'admin'::"text")))))));



CREATE POLICY "Admins can insert their tenant settings" ON "public"."tenant_settings" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Admins can manage all filters" ON "public"."saved_filters" USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND (("tenant_users"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Admins can manage commission plans" ON "public"."commission_plans" USING ((("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid") AND (("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text")));



CREATE POLICY "Admins can manage commissions" ON "public"."commission_records" USING ((("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid") AND (("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text")));



CREATE POLICY "Admins can manage filter configs" ON "public"."filter_configs" USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND (("tenant_users"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Admins can manage knowledge" ON "public"."roofing_knowledge" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."user_role_assignments" "ura"
     JOIN "public"."user_roles" "ur" ON (("ura"."role_id" = "ur"."id")))
  WHERE (("ura"."user_id" = "auth"."uid"()) AND (("ur"."name")::"text" = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::"text"[])) AND ("ura"."tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid")))));



CREATE POLICY "Admins can manage substatus configs" ON "public"."status_substatus_configs" USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND (("tenant_users"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Admins can manage their tenant role assignments" ON "public"."user_role_assignments" USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"())))) WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Admins can manage their tenant roles" ON "public"."user_roles" USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"())))) WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Admins can update own impersonation logs" ON "public"."impersonation_logs" FOR UPDATE USING ((("admin_user_id" = "auth"."uid"()) AND ("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND (("tenant_users"."role")::"text" = 'admin'::"text"))))));



CREATE POLICY "Admins can update their tenant settings" ON "public"."tenant_settings" FOR UPDATE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"())))) WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Admins can view impersonation logs" ON "public"."impersonation_logs" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND (("tenant_users"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Admins can view org audit log" ON "public"."audit_log" FOR SELECT USING ((("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid") AND (("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text")));



CREATE POLICY "Admins can view tenant login activity" ON "public"."login_activity" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND (("tenant_users"."role")::"text" = ANY ((ARRAY['admin'::character varying, 'owner'::character varying])::"text"[]))))));



CREATE POLICY "Anyone can create interactions" ON "public"."business_card_interactions" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can read building codes" ON "public"."building_codes" FOR SELECT USING (true);



CREATE POLICY "Anyone can read carrier standards" ON "public"."carrier_standards" FOR SELECT USING (true);



CREATE POLICY "Anyone can read court cases" ON "public"."court_cases" FOR SELECT USING (true);



CREATE POLICY "Anyone can read industry organizations" ON "public"."industry_organizations" FOR SELECT USING (true);



CREATE POLICY "Anyone can read industry standards" ON "public"."industry_standards" FOR SELECT USING (true);



CREATE POLICY "Anyone can read insurance carriers" ON "public"."insurance_carriers" FOR SELECT USING (true);



CREATE POLICY "Anyone can read manufacturer directory" ON "public"."manufacturer_directory" FOR SELECT USING (true);



CREATE POLICY "Anyone can read manufacturer specs" ON "public"."manufacturer_specs" FOR SELECT USING (true);



CREATE POLICY "Anyone can read shingle products" ON "public"."shingle_products" FOR SELECT USING (true);



CREATE POLICY "Anyone can read weather data" ON "public"."claim_weather_data" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can access chat histories" ON "public"."n8n_chat_histories" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated users can read property cache" ON "public"."property_enrichment_cache" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Global knowledge readable by all authenticated users" ON "public"."roofing_knowledge" FOR SELECT TO "authenticated" USING ((("is_global" = true) OR ("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid")));



CREATE POLICY "Point rules are viewable by all authenticated users" ON "public"."point_rules" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Public can submit survey via token" ON "public"."surveys" FOR UPDATE USING (("survey_token" IS NOT NULL));



CREATE POLICY "Public cards are viewable by anyone" ON "public"."digital_business_cards" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Service role can insert login activity" ON "public"."login_activity" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service role can insert sessions" ON "public"."user_sessions" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service role can manage building codes" ON "public"."building_codes" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage carrier standards" ON "public"."carrier_standards" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage court cases" ON "public"."court_cases" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage industry organizations" ON "public"."industry_organizations" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage industry standards" ON "public"."industry_standards" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage insurance carriers" ON "public"."insurance_carriers" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage manufacturer directory" ON "public"."manufacturer_directory" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage manufacturer specs" ON "public"."manufacturer_specs" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage property cache" ON "public"."property_enrichment_cache" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage shingle products" ON "public"."shingle_products" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage weather data" ON "public"."claim_weather_data" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access to chat histories" ON "public"."n8n_chat_histories" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "System can create activity logs" ON "public"."task_activity" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "System can insert audit logs" ON "public"."audit_log" FOR INSERT WITH CHECK (("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid"));



CREATE POLICY "System can insert sync logs" ON "public"."quickbooks_sync_logs" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "System can insert user achievements" ON "public"."user_achievements" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."tenant_users" "tu"
  WHERE (("tu"."tenant_id" = "user_achievements"."tenant_id") AND ("tu"."user_id" = "auth"."uid"())))));



CREATE POLICY "System can insert user points" ON "public"."user_points" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."tenant_users" "tu"
  WHERE (("tu"."tenant_id" = "user_points"."tenant_id") AND ("tu"."user_id" = "auth"."uid"())))));



CREATE POLICY "Tenant knowledge readable by tenant members" ON "public"."roofing_knowledge" FOR SELECT TO "authenticated" USING ((("tenant_id" IS NULL) OR ("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid")));



CREATE POLICY "Users can create alerts for their tenant" ON "public"."storm_alerts" FOR INSERT WITH CHECK (("tenant_id" = "auth"."uid"()));



CREATE POLICY "Users can create attachments in their tenant tasks" ON "public"."task_attachments" FOR INSERT TO "authenticated" WITH CHECK (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."tenant_id" IN ( SELECT "tenant_users"."tenant_id"
           FROM "public"."tenant_users"
          WHERE ("tenant_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can create call logs" ON "public"."call_logs" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can create comments in their tenant tasks" ON "public"."task_comments" FOR INSERT TO "authenticated" WITH CHECK (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."tenant_id" IN ( SELECT "tenant_users"."tenant_id"
           FROM "public"."tenant_users"
          WHERE ("tenant_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can create events" ON "public"."events" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can create extracted addresses for their tenant" ON "public"."extracted_addresses" FOR INSERT WITH CHECK (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can create function call records" ON "public"."voice_function_calls" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can create jobs" ON "public"."jobs" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can create jobs for their tenant" ON "public"."bulk_import_jobs" FOR INSERT WITH CHECK (("tenant_id" = "auth"."uid"()));



CREATE POLICY "Users can create knocks" ON "public"."knocks" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can create messages in own conversations" ON "public"."ai_messages" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."ai_conversations"
  WHERE (("ai_conversations"."id" = "ai_messages"."conversation_id") AND ("ai_conversations"."user_id" = "auth"."uid"()) AND ("ai_conversations"."tenant_id" IN ( SELECT "tenant_users"."tenant_id"
           FROM "public"."tenant_users"
          WHERE ("tenant_users"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Users can create own conversations" ON "public"."ai_conversations" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND ("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create own filters" ON "public"."saved_filters" FOR INSERT WITH CHECK ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))) AND ("created_by" = "auth"."uid"())));



CREATE POLICY "Users can create response mode for their tenant" ON "public"."storm_response_mode" FOR INSERT WITH CHECK (("tenant_id" = "auth"."uid"()));



CREATE POLICY "Users can create search queries" ON "public"."knowledge_search_queries" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND ("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid")));



CREATE POLICY "Users can create surveys" ON "public"."surveys" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can create targeting areas for their tenant" ON "public"."storm_targeting_areas" FOR INSERT WITH CHECK (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can create tasks" ON "public"."tasks" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can create templates for their tenant" ON "public"."document_templates" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can create their own voice sessions" ON "public"."voice_sessions" FOR INSERT WITH CHECK ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can delete (soft delete) territories in their tenant" ON "public"."territories" FOR UPDATE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete activities in their tenant" ON "public"."activities" FOR DELETE USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can delete alerts for their tenant" ON "public"."storm_alerts" FOR DELETE USING (("tenant_id" = "auth"."uid"()));



CREATE POLICY "Users can delete automations in their tenant" ON "public"."automations" FOR DELETE USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can delete call logs" ON "public"."call_logs" FOR DELETE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete commission rules in their tenant" ON "public"."commission_rules" FOR DELETE USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can delete contacts in their tenant" ON "public"."contacts" FOR DELETE USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can delete documents in their tenant" ON "public"."documents" FOR DELETE USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can delete events" ON "public"."events" FOR DELETE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete jobs" ON "public"."jobs" FOR DELETE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete messages in own conversations" ON "public"."ai_messages" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."ai_conversations"
  WHERE (("ai_conversations"."id" = "ai_messages"."conversation_id") AND ("ai_conversations"."user_id" = "auth"."uid"()) AND ("ai_conversations"."tenant_id" IN ( SELECT "tenant_users"."tenant_id"
           FROM "public"."tenant_users"
          WHERE ("tenant_users"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Users can delete own conversations" ON "public"."ai_conversations" FOR DELETE USING ((("user_id" = "auth"."uid"()) AND ("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete own filters (except system)" ON "public"."saved_filters" FOR DELETE USING ((("created_by" = "auth"."uid"()) AND ("is_system" = false) AND ("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete project files" ON "public"."project_files" FOR DELETE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete projects in their tenant" ON "public"."projects" FOR DELETE USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can delete report schedules in their tenant" ON "public"."report_schedules" FOR DELETE USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can delete response mode for their tenant" ON "public"."storm_response_mode" FOR DELETE USING (("tenant_id" = "auth"."uid"()));



CREATE POLICY "Users can delete signature documents in their tenant" ON "public"."signature_documents" FOR DELETE USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can delete tasks" ON "public"."tasks" FOR DELETE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete templates in their tenant" ON "public"."templates" FOR DELETE USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can delete their extracted addresses" ON "public"."extracted_addresses" FOR DELETE USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can delete their own attachments" ON "public"."task_attachments" FOR DELETE TO "authenticated" USING (("uploaded_by" = "auth"."uid"()));



CREATE POLICY "Users can delete their own comments" ON "public"."task_comments" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their own knocks" ON "public"."knocks" FOR DELETE USING ((("user_id" = "auth"."uid"()) AND ("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete their targeting areas" ON "public"."storm_targeting_areas" FOR DELETE USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can delete their tenant templates" ON "public"."document_templates" FOR DELETE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete their tenant's QuickBooks connection" ON "public"."quickbooks_connections" FOR DELETE USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can delete their tenant's achievements" ON "public"."achievements" FOR DELETE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete their tenant's insurance personnel" ON "public"."insurance_personnel" FOR DELETE USING (("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid"));



CREATE POLICY "Users can delete their tenant's point rules" ON "public"."point_rules" FOR DELETE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert KPI snapshots in their tenant" ON "public"."kpi_snapshots" FOR INSERT WITH CHECK (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can insert achievements for their tenant" ON "public"."achievements" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert activities in their tenant" ON "public"."activities" FOR INSERT WITH CHECK (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can insert automations in their tenant" ON "public"."automations" FOR INSERT WITH CHECK (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can insert commission rules in their tenant" ON "public"."commission_rules" FOR INSERT WITH CHECK (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can insert commissions in their tenant" ON "public"."commissions" FOR INSERT WITH CHECK (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can insert contacts in their tenant" ON "public"."contacts" FOR INSERT WITH CHECK (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can insert crew_members for their tenant" ON "public"."crew_members" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert documents in their tenant" ON "public"."documents" FOR INSERT WITH CHECK (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can insert extracted addresses for their tenant" ON "public"."extracted_addresses" FOR INSERT WITH CHECK (("tenant_id" = "auth"."uid"()));



CREATE POLICY "Users can insert insurance personnel for their tenant" ON "public"."insurance_personnel" FOR INSERT WITH CHECK (("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid"));



CREATE POLICY "Users can insert job_expenses for their tenant" ON "public"."job_expenses" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert knowledge base in their tenant" ON "public"."knowledge_base" FOR INSERT WITH CHECK (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can insert material_purchases for their tenant" ON "public"."material_purchases" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert own UI preferences" ON "public"."user_ui_preferences" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own filter usage" ON "public"."filter_usage_logs" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own notification preferences" ON "public"."user_notification_preferences" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert point rules for their tenant" ON "public"."point_rules" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert projects in their tenant" ON "public"."projects" FOR INSERT WITH CHECK (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can insert report schedules in their tenant" ON "public"."report_schedules" FOR INSERT WITH CHECK (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can insert signature documents in their tenant" ON "public"."signature_documents" FOR INSERT WITH CHECK (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can insert signatures" ON "public"."signatures" FOR INSERT WITH CHECK (("document_id" IN ( SELECT "signature_documents"."id"
   FROM "public"."signature_documents"
  WHERE ("signature_documents"."tenant_id" = "public"."get_user_tenant_id"()))));



CREATE POLICY "Users can insert storm events for their tenant" ON "public"."storm_events" FOR INSERT WITH CHECK (("tenant_id" = "auth"."uid"()));



CREATE POLICY "Users can insert templates in their tenant" ON "public"."templates" FOR INSERT WITH CHECK (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can insert territories in their tenant" ON "public"."territories" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert their own gamification activities" ON "public"."gamification_activities" FOR INSERT WITH CHECK ((("tenant_id" = "public"."get_user_tenant_id"()) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can insert their own gamification scores" ON "public"."gamification_scores" FOR INSERT WITH CHECK ((("tenant_id" = "public"."get_user_tenant_id"()) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can insert their own locations" ON "public"."rep_locations" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND ("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert their tenant's QuickBooks connection" ON "public"."quickbooks_connections" FOR INSERT WITH CHECK (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can insert timesheets for their tenant" ON "public"."timesheets" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage AR damage markers via session" ON "public"."ar_damage_markers" USING (("session_id" IN ( SELECT "ar_sessions"."id"
   FROM "public"."ar_sessions"
  WHERE ("ar_sessions"."tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid"))));



CREATE POLICY "Users can manage AR measurements via session" ON "public"."ar_measurements" USING (("session_id" IN ( SELECT "ar_sessions"."id"
   FROM "public"."ar_sessions"
  WHERE ("ar_sessions"."tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid"))));



CREATE POLICY "Users can manage challenges in their tenant" ON "public"."challenges" USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage org AR sessions" ON "public"."ar_sessions" USING (("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid"));



CREATE POLICY "Users can manage org DNC" ON "public"."dnc_registry" USING (("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid"));



CREATE POLICY "Users can manage org DNC imports" ON "public"."dnc_imports" USING (("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid"));



CREATE POLICY "Users can manage own query history" ON "public"."query_history" USING ((("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid") AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can manage quote line items in their tenant" ON "public"."quote_line_items" USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage quotes in their tenant" ON "public"."quote_options" USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage their tenant email templates" ON "public"."email_templates" USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"())))) WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage their tenant pipeline stages" ON "public"."pipeline_stages" USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"())))) WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage their tenant sms templates" ON "public"."sms_templates" USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"())))) WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage their tenant win/loss reasons" ON "public"."win_loss_reasons" USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"())))) WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage their tenant's QB mappings" ON "public"."quickbooks_mappings" USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage their tenant's QB tokens" ON "public"."quickbooks_tokens" USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage their tenant's workflow executions" ON "public"."workflow_executions" USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage their tenant's workflow step executions" ON "public"."workflow_step_executions" USING (("step_id" IN ( SELECT "ws"."id"
   FROM ("public"."workflow_steps" "ws"
     JOIN "public"."workflows" "w" ON (("ws"."workflow_id" = "w"."id")))
  WHERE ("w"."tenant_id" IN ( SELECT "tenant_users"."tenant_id"
           FROM "public"."tenant_users"
          WHERE ("tenant_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can manage their tenant's workflow steps" ON "public"."workflow_steps" USING (("workflow_id" IN ( SELECT "workflows"."id"
   FROM "public"."workflows"
  WHERE ("workflows"."tenant_id" IN ( SELECT "tenant_users"."tenant_id"
           FROM "public"."tenant_users"
          WHERE ("tenant_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can manage their tenant's workflows" ON "public"."workflows" USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage their uploaded photos" ON "public"."photos" TO "authenticated" USING (("uploaded_by" = "auth"."uid"())) WITH CHECK (("uploaded_by" = "auth"."uid"()));



CREATE POLICY "Users can select their tenant membership" ON "public"."tenant_users" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can soft delete their tenant's photos" ON "public"."photos" FOR UPDATE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"())))) WITH CHECK (("is_deleted" = true));



CREATE POLICY "Users can update activities in their tenant" ON "public"."activities" FOR UPDATE USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can update alerts for their tenant" ON "public"."storm_alerts" FOR UPDATE USING (("tenant_id" = "auth"."uid"()));



CREATE POLICY "Users can update automations in their tenant" ON "public"."automations" FOR UPDATE USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can update call logs" ON "public"."call_logs" FOR UPDATE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update commission rules in their tenant" ON "public"."commission_rules" FOR UPDATE USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can update commissions in their tenant" ON "public"."commissions" FOR UPDATE USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can update contacts in their tenant" ON "public"."contacts" FOR UPDATE USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can update crew_members for their tenant" ON "public"."crew_members" FOR UPDATE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update documents in their tenant" ON "public"."documents" FOR UPDATE USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can update events" ON "public"."events" FOR UPDATE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update job_expenses for their tenant" ON "public"."job_expenses" FOR UPDATE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update jobs" ON "public"."jobs" FOR UPDATE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update knowledge base in their tenant" ON "public"."knowledge_base" FOR UPDATE USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can update material_purchases for their tenant" ON "public"."material_purchases" FOR UPDATE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update messages in own conversations" ON "public"."ai_messages" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."ai_conversations"
  WHERE (("ai_conversations"."id" = "ai_messages"."conversation_id") AND ("ai_conversations"."user_id" = "auth"."uid"()) AND ("ai_conversations"."tenant_id" IN ( SELECT "tenant_users"."tenant_id"
           FROM "public"."tenant_users"
          WHERE ("tenant_users"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Users can update own UI preferences" ON "public"."user_ui_preferences" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own conversations" ON "public"."ai_conversations" FOR UPDATE USING ((("user_id" = "auth"."uid"()) AND ("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update own filters" ON "public"."saved_filters" FOR UPDATE USING ((("created_by" = "auth"."uid"()) AND ("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update own notification preferences" ON "public"."user_notification_preferences" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own sessions" ON "public"."user_sessions" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update project files" ON "public"."project_files" FOR UPDATE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update projects in their tenant" ON "public"."projects" FOR UPDATE USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can update report schedules in their tenant" ON "public"."report_schedules" FOR UPDATE USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can update response mode for their tenant" ON "public"."storm_response_mode" FOR UPDATE USING (("tenant_id" = "auth"."uid"()));



CREATE POLICY "Users can update signature documents in their tenant" ON "public"."signature_documents" FOR UPDATE USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can update signatures" ON "public"."signatures" FOR UPDATE USING (("document_id" IN ( SELECT "signature_documents"."id"
   FROM "public"."signature_documents"
  WHERE ("signature_documents"."tenant_id" = "public"."get_user_tenant_id"()))));



CREATE POLICY "Users can update storm events for their tenant" ON "public"."storm_events" FOR UPDATE USING (("tenant_id" = "auth"."uid"()));



CREATE POLICY "Users can update surveys" ON "public"."surveys" FOR UPDATE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update tasks" ON "public"."tasks" FOR UPDATE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update templates in their tenant" ON "public"."templates" FOR UPDATE USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can update territories in their tenant" ON "public"."territories" FOR UPDATE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update their challenge progress" ON "public"."user_challenges" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their extracted addresses" ON "public"."extracted_addresses" FOR UPDATE USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can update their jobs" ON "public"."bulk_import_jobs" FOR UPDATE USING (("tenant_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own card, admins can update any" ON "public"."digital_business_cards" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR ("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND (("tenant_users"."role")::"text" = 'admin'::"text"))))));



CREATE POLICY "Users can update their own comments" ON "public"."task_comments" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own function calls" ON "public"."voice_function_calls" FOR UPDATE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update their own gamification scores" ON "public"."gamification_scores" FOR UPDATE USING ((("tenant_id" = "public"."get_user_tenant_id"()) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can update their own knocks" ON "public"."knocks" FOR UPDATE USING ((("user_id" = "auth"."uid"()) AND ("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update their own photos" ON "public"."photos" FOR UPDATE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"())))) WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update their own streaks" ON "public"."user_streaks" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own voice sessions" ON "public"."voice_sessions" FOR UPDATE USING ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can update their targeting areas" ON "public"."storm_targeting_areas" FOR UPDATE USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can update their tenant" ON "public"."tenants" FOR UPDATE USING (("id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update their tenant templates" ON "public"."document_templates" FOR UPDATE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update their tenant's QuickBooks connection" ON "public"."quickbooks_connections" FOR UPDATE USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can update their tenant's achievements" ON "public"."achievements" FOR UPDATE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update their tenant's insurance personnel" ON "public"."insurance_personnel" FOR UPDATE USING (("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid")) WITH CHECK (("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid"));



CREATE POLICY "Users can update their tenant's point rules" ON "public"."point_rules" FOR UPDATE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update timesheets for their tenant" ON "public"."timesheets" FOR UPDATE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can upload photos to their tenant" ON "public"."photos" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can upload project files" ON "public"."project_files" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view KPI snapshots in their tenant" ON "public"."kpi_snapshots" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view achievements in their tenant" ON "public"."user_achievements" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tenant_users" "tu"
  WHERE (("tu"."tenant_id" = "user_achievements"."tenant_id") AND ("tu"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view activities in their tenant" ON "public"."activities" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view activity in their tenant tasks" ON "public"."task_activity" FOR SELECT TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."tenant_id" IN ( SELECT "tenant_users"."tenant_id"
           FROM "public"."tenant_users"
          WHERE ("tenant_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view alerts for their tenant" ON "public"."storm_alerts" FOR SELECT USING (("tenant_id" = "auth"."uid"()));



CREATE POLICY "Users can view attachments in their tenant tasks" ON "public"."task_attachments" FOR SELECT TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."tenant_id" IN ( SELECT "tenant_users"."tenant_id"
           FROM "public"."tenant_users"
          WHERE ("tenant_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view automations in their tenant" ON "public"."automations" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view call logs in their tenant" ON "public"."call_logs" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view cards in their tenant" ON "public"."digital_business_cards" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view challenges in their tenant" ON "public"."challenges" FOR SELECT USING ((("tenant_id" IS NULL) OR ("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view comments in their tenant tasks" ON "public"."task_comments" FOR SELECT TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."tenant_id" IN ( SELECT "tenant_users"."tenant_id"
           FROM "public"."tenant_users"
          WHERE ("tenant_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view commission rules in their tenant" ON "public"."commission_rules" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view commissions in their tenant" ON "public"."commissions" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view contacts in their tenant" ON "public"."contacts" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view crew_members for their tenant" ON "public"."crew_members" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view documents in their tenant" ON "public"."documents" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view events in their tenant" ON "public"."events" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view extracted addresses for their tenant" ON "public"."extracted_addresses" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view filter configs in their tenant" ON "public"."filter_configs" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view gamification activities in their tenant" ON "public"."gamification_activities" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view gamification scores in their tenant" ON "public"."gamification_scores" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view interactions for their tenant's cards" ON "public"."business_card_interactions" FOR SELECT USING (("card_id" IN ( SELECT "digital_business_cards"."id"
   FROM "public"."digital_business_cards"
  WHERE ("digital_business_cards"."tenant_id" IN ( SELECT "tenant_users"."tenant_id"
           FROM "public"."tenant_users"
          WHERE ("tenant_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view job_expenses for their tenant" ON "public"."job_expenses" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view jobs for their tenant" ON "public"."bulk_import_jobs" FOR SELECT USING (("tenant_id" = "auth"."uid"()));



CREATE POLICY "Users can view jobs in their tenant" ON "public"."jobs" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view knocks in their tenant" ON "public"."knocks" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view knowledge base in their tenant" ON "public"."knowledge_base" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view material_purchases for their tenant" ON "public"."material_purchases" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view messages in own conversations" ON "public"."ai_messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."ai_conversations"
  WHERE (("ai_conversations"."id" = "ai_messages"."conversation_id") AND ("ai_conversations"."user_id" = "auth"."uid"()) AND ("ai_conversations"."tenant_id" IN ( SELECT "tenant_users"."tenant_id"
           FROM "public"."tenant_users"
          WHERE ("tenant_users"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Users can view org commission plans" ON "public"."commission_plans" FOR SELECT USING (("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid"));



CREATE POLICY "Users can view own UI preferences" ON "public"."user_ui_preferences" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own and shared filters" ON "public"."saved_filters" FOR SELECT USING ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))) AND (("created_by" = "auth"."uid"()) OR ("is_shared" = true))));



CREATE POLICY "Users can view own commissions" ON "public"."commission_records" FOR SELECT USING ((("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid") AND (("user_id" = "auth"."uid"()) OR (("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"))));



CREATE POLICY "Users can view own conversations" ON "public"."ai_conversations" FOR SELECT USING ((("user_id" = "auth"."uid"()) AND ("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own filter usage" ON "public"."filter_usage_logs" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND (("tenant_users"."role")::"text" = ANY ((ARRAY['admin'::character varying, 'manager'::character varying])::"text"[])))))));



CREATE POLICY "Users can view own impersonation history" ON "public"."impersonation_logs" FOR SELECT USING (("impersonated_user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own login activity" ON "public"."login_activity" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own notification preferences" ON "public"."user_notification_preferences" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own sessions" ON "public"."user_sessions" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view points in their tenant" ON "public"."user_points" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tenant_users" "tu"
  WHERE (("tu"."tenant_id" = "user_points"."tenant_id") AND ("tu"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view project files in their tenant" ON "public"."project_files" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view projects in their tenant" ON "public"."projects" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view rep locations in their tenant" ON "public"."rep_locations" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view report schedules in their tenant" ON "public"."report_schedules" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view response mode for their tenant" ON "public"."storm_response_mode" FOR SELECT USING (("tenant_id" = "auth"."uid"()));



CREATE POLICY "Users can view signature documents in their tenant" ON "public"."signature_documents" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view signatures in their tenant" ON "public"."signatures" FOR SELECT USING (("document_id" IN ( SELECT "signature_documents"."id"
   FROM "public"."signature_documents"
  WHERE ("signature_documents"."tenant_id" = "public"."get_user_tenant_id"()))));



CREATE POLICY "Users can view storm events for their tenant" ON "public"."storm_events" FOR SELECT USING (("tenant_id" = "auth"."uid"()));



CREATE POLICY "Users can view streaks in their tenant" ON "public"."user_streaks" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tenant_users" "tu"
  WHERE (("tu"."tenant_id" = "user_streaks"."tenant_id") AND ("tu"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view substatus configs in their tenant" ON "public"."status_substatus_configs" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view surveys in their tenant" ON "public"."surveys" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view targeting areas for their tenant" ON "public"."storm_targeting_areas" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view tasks in their tenant" ON "public"."tasks" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view templates in their tenant" ON "public"."templates" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view territories in their tenant" ON "public"."territories" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their challenge progress" ON "public"."user_challenges" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tenant_users" "tu"
  WHERE (("tu"."tenant_id" = "user_challenges"."tenant_id") AND ("tu"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own function calls" ON "public"."voice_function_calls" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own search queries" ON "public"."knowledge_search_queries" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own voice sessions" ON "public"."voice_sessions" FOR SELECT USING ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can view their tenant" ON "public"."tenants" FOR SELECT USING (("id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their tenant email templates" ON "public"."email_templates" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their tenant pipeline stages" ON "public"."pipeline_stages" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their tenant role assignments" ON "public"."user_role_assignments" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their tenant roles" ON "public"."user_roles" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their tenant settings" ON "public"."tenant_settings" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their tenant sms templates" ON "public"."sms_templates" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their tenant templates" ON "public"."document_templates" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their tenant win/loss reasons" ON "public"."win_loss_reasons" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their tenant's QB tokens" ON "public"."quickbooks_tokens" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their tenant's QuickBooks connection" ON "public"."quickbooks_connections" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view their tenant's achievements" ON "public"."achievements" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their tenant's insurance personnel" ON "public"."insurance_personnel" FOR SELECT USING ((("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid") OR ("tenant_id" IS NULL)));



CREATE POLICY "Users can view their tenant's photos" ON "public"."photos" FOR SELECT USING ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))) AND ("is_deleted" = false)));



CREATE POLICY "Users can view their tenant's point rules" ON "public"."point_rules" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their tenant's sync logs" ON "public"."quickbooks_sync_logs" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their tenant's workflow executions" ON "public"."workflow_executions" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their tenant's workflow step executions" ON "public"."workflow_step_executions" FOR SELECT USING (("step_id" IN ( SELECT "ws"."id"
   FROM ("public"."workflow_steps" "ws"
     JOIN "public"."workflows" "w" ON (("ws"."workflow_id" = "w"."id")))
  WHERE ("w"."tenant_id" IN ( SELECT "tenant_users"."tenant_id"
           FROM "public"."tenant_users"
          WHERE ("tenant_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view their tenant's workflow steps" ON "public"."workflow_steps" FOR SELECT USING (("workflow_id" IN ( SELECT "workflows"."id"
   FROM "public"."workflows"
  WHERE ("workflows"."tenant_id" IN ( SELECT "tenant_users"."tenant_id"
           FROM "public"."tenant_users"
          WHERE ("tenant_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view their tenant's workflows" ON "public"."workflows" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view timesheets for their tenant" ON "public"."timesheets" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."achievements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ar_damage_markers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ar_measurements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ar_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."automations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."building_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bulk_import_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."business_card_interactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."call_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."carrier_standards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."challenges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."claim_communications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."claim_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."claim_supplements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."claim_weather_data" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."claims" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "claims_tenant_isolation" ON "public"."claims" USING (true);



ALTER TABLE "public"."commission_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."commission_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."commission_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."commissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "communications_tenant_isolation" ON "public"."claim_communications" USING (true);



ALTER TABLE "public"."contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."court_cases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."crew_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."digital_business_cards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dnc_imports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dnc_registry" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "document_templates_tenant_isolation" ON "public"."document_templates" USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "documents_tenant_isolation" ON "public"."claim_documents" USING (true);



ALTER TABLE "public"."email_drafts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "email_drafts_tenant_isolation" ON "public"."email_drafts" USING (true);



ALTER TABLE "public"."email_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."extracted_addresses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."filter_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."filter_usage_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gamification_activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gamification_scores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."impersonation_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."industry_organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."industry_standards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."insurance_carriers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."insurance_personnel" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."knocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."knowledge_base" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."knowledge_search_queries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kpi_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."login_activity" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."manufacturer_directory" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."manufacturer_specs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."material_purchases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."n8n_chat_histories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."photos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pipeline_stages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."point_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."property_enrichment_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."query_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quickbooks_connections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quickbooks_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quickbooks_sync_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quickbooks_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quote_line_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quote_options" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rep_locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."report_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roofing_knowledge" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saved_filters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shingle_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."signature_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "signature_documents_tenant_isolation" ON "public"."signature_documents" USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."signatures" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "signatures_via_document" ON "public"."signatures" USING (("document_id" IN ( SELECT "signature_documents"."id"
   FROM "public"."signature_documents"
  WHERE ("signature_documents"."tenant_id" IN ( SELECT "tenant_users"."tenant_id"
           FROM "public"."tenant_users"
          WHERE ("tenant_users"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."sms_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."status_substatus_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."storm_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."storm_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."storm_response_mode" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."storm_targeting_areas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "supplements_tenant_isolation" ON "public"."claim_supplements" USING (true);



ALTER TABLE "public"."surveys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_activity" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenant_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenant_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."territories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."timesheets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_achievements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_challenges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_points" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_role_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_streaks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_ui_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."voice_function_calls" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."voice_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."win_loss_reasons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_executions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_step_executions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_steps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflows" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."award_activity_points"() TO "anon";
GRANT ALL ON FUNCTION "public"."award_activity_points"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."award_activity_points"() TO "service_role";



GRANT ALL ON FUNCTION "public"."award_manual_points"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_points" integer, "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."award_manual_points"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_points" integer, "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."award_manual_points"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_points" integer, "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."award_points"("p_user_id" "uuid", "p_points" integer, "p_reason" "text", "p_activity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."award_points"("p_user_id" "uuid", "p_points" integer, "p_reason" "text", "p_activity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."award_points"("p_user_id" "uuid", "p_points" integer, "p_reason" "text", "p_activity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."award_points"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_action_type" "text", "p_activity_id" "uuid", "p_contact_id" "uuid", "p_project_id" "uuid", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."award_points"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_action_type" "text", "p_activity_id" "uuid", "p_contact_id" "uuid", "p_project_id" "uuid", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."award_points"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_action_type" "text", "p_activity_id" "uuid", "p_contact_id" "uuid", "p_project_id" "uuid", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_damage_score"("p_knock_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_damage_score"("p_knock_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_damage_score"("p_knock_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_job_duration"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_job_duration"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_job_duration"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_polygon_area_sq_miles"("poly" "public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_polygon_area_sq_miles"("poly" "public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_polygon_area_sq_miles"("poly" "public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_project_costs"("p_project_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_project_costs"("p_project_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_project_costs"("p_project_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_project_profit"("p_project_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_project_profit"("p_project_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_project_profit"("p_project_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_send_email_to_contact"("contact_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."can_send_email_to_contact"("contact_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_send_email_to_contact"("contact_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_send_sms_to_contact"("contact_phone" "text", "contact_timezone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."can_send_sms_to_contact"("contact_phone" "text", "contact_timezone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_send_sms_to_contact"("contact_phone" "text", "contact_timezone" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_achievements"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_achievements"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_achievements"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_achievements"("p_user_id" "uuid", "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_achievements"("p_user_id" "uuid", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_achievements"("p_user_id" "uuid", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_duplicate_pin"("p_latitude" numeric, "p_longitude" numeric, "p_radius_meters" integer, "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_duplicate_pin"("p_latitude" numeric, "p_longitude" numeric, "p_radius_meters" integer, "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_duplicate_pin"("p_latitude" numeric, "p_longitude" numeric, "p_radius_meters" integer, "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_rep_locations"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_rep_locations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_rep_locations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_contact_from_pin"("p_knock_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_contact_from_pin"("p_knock_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_contact_from_pin"("p_knock_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."decrypt_qb_token"("encrypted_data" "bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."decrypt_qb_token"("encrypted_data" "bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrypt_qb_token"("encrypted_data" "bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."encrypt_qb_token"("plaintext" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."encrypt_qb_token"("plaintext" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."encrypt_qb_token"("plaintext" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."estimate_addresses_in_area"("area_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."estimate_addresses_in_area"("area_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."estimate_addresses_in_area"("area_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."find_storm_events_near_point"("p_lat" numeric, "p_lng" numeric, "p_radius_meters" numeric, "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."find_storm_events_near_point"("p_lat" numeric, "p_lng" numeric, "p_radius_meters" numeric, "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_storm_events_near_point"("p_lat" numeric, "p_lng" numeric, "p_radius_meters" numeric, "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_card_slug"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_card_slug"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_card_slug"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_job_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_job_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_job_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_survey_token"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_survey_token"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_survey_token"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_reps"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_reps"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_reps"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_card_analytics"("p_card_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_card_analytics"("p_card_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_card_analytics"("p_card_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_card_performance_metrics"("p_card_id" "uuid", "p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_card_performance_metrics"("p_card_id" "uuid", "p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_card_performance_metrics"("p_card_id" "uuid", "p_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_contact_call_count"("p_contact_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_contact_call_count"("p_contact_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_contact_call_count"("p_contact_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_crew_lead_stats"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_crew_lead_stats"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_crew_lead_stats"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_crew_member_jobs"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_crew_member_jobs"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_crew_member_jobs"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_effective_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_effective_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_effective_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_financial_summary"("period_start" timestamp without time zone, "period_end" timestamp without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_financial_summary"("period_start" timestamp without time zone, "period_end" timestamp without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_financial_summary"("period_start" timestamp without time zone, "period_end" timestamp without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_knocks_within_radius"("p_latitude" numeric, "p_longitude" numeric, "p_radius_meters" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_knocks_within_radius"("p_latitude" numeric, "p_longitude" numeric, "p_radius_meters" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_knocks_within_radius"("p_latitude" numeric, "p_longitude" numeric, "p_radius_meters" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_latest_rep_location"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_latest_rep_location"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_latest_rep_location"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_project_file_count"("p_project_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_project_file_count"("p_project_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_project_file_count"("p_project_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_project_photo_count"("p_project_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_project_photo_count"("p_project_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_project_photo_count"("p_project_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_qb_encryption_key"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_qb_encryption_key"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_qb_encryption_key"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_sms_conversations"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_sms_conversations"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_sms_conversations"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_knock_stats"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_knock_stats"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_knock_stats"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_tenant_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_tenant_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_tenant_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_survey_rating"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_survey_rating"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_survey_rating"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_campaign_enrollment"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_campaign_enrollment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_campaign_enrollment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_saved_filter_usage"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_saved_filter_usage"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_saved_filter_usage"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_being_impersonated"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_being_impersonated"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_being_impersonated"() TO "service_role";



GRANT ALL ON FUNCTION "public"."match_documents"("query_embedding" "public"."vector", "match_count" integer, "filter" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."match_documents"("query_embedding" "public"."vector", "match_count" integer, "filter" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_documents"("query_embedding" "public"."vector", "match_count" integer, "filter" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."point_in_targeting_area"("lat" numeric, "lng" numeric, "area_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."point_in_targeting_area"("lat" numeric, "lng" numeric, "area_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."point_in_targeting_area"("lat" numeric, "lng" numeric, "area_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_proline_projects"("search_term" "text", "status_filter" "text", "date_from" timestamp without time zone, "date_to" timestamp without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."search_proline_projects"("search_term" "text", "status_filter" "text", "date_from" timestamp without time zone, "date_to" timestamp without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_proline_projects"("search_term" "text", "status_filter" "text", "date_from" timestamp without time zone, "date_to" timestamp without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_roofing_knowledge"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "filter_category" "text", "filter_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."search_roofing_knowledge"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "filter_category" "text", "filter_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_roofing_knowledge"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "filter_category" "text", "filter_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_deactivation_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_deactivation_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_deactivation_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_default_substatus"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_default_substatus"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_default_substatus"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_impersonation_session"("p_admin_user_id" "uuid", "p_impersonated_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_impersonation_session"("p_admin_user_id" "uuid", "p_impersonated_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_impersonation_session"("p_admin_user_id" "uuid", "p_impersonated_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_task_completed_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_task_completed_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_task_completed_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."track_pipeline_stage_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."track_pipeline_stage_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_pipeline_stage_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_ai_conversation_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_ai_conversation_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ai_conversation_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_campaign_performance"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_campaign_performance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_campaign_performance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_campaigns_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_campaigns_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_campaigns_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_card_analytics"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_card_analytics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_card_analytics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_contact_search_vector"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_contact_search_vector"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_contact_search_vector"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_on_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_on_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_on_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_digital_business_cards_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_digital_business_cards_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_digital_business_cards_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_event_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_event_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_event_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_filter_configs_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_filter_configs_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_filter_configs_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_impersonation_log_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_impersonation_log_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_impersonation_log_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_import_job_progress"("job_id" "uuid", "processed" integer, "successful" integer, "failed" integer, "skipped" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."update_import_job_progress"("job_id" "uuid", "processed" integer, "successful" integer, "failed" integer, "skipped" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_import_job_progress"("job_id" "uuid", "processed" integer, "successful" integer, "failed" integer, "skipped" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_job_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_job_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_job_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_notification_prefs_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_notification_prefs_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_notification_prefs_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_project_actual_costs"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_project_actual_costs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_project_actual_costs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_quickbooks_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_quickbooks_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_quickbooks_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_roofing_knowledge_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_roofing_knowledge_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_roofing_knowledge_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_saved_filters_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_saved_filters_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_saved_filters_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_signature_documents_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_signature_documents_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_signature_documents_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_status_substatus_configs_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_status_substatus_configs_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_status_substatus_configs_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_streaks"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_action_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_streaks"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_action_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_streaks"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_action_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_survey_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_survey_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_survey_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_targeting_area_stats"("area_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_targeting_area_stats"("area_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_targeting_area_stats"("area_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_task_comments_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_task_comments_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_task_comments_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_task_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_task_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_task_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_territories_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_territories_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_territories_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_ui_prefs_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_ui_prefs_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ui_prefs_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_voice_session_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_voice_session_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_voice_session_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_workflows_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_workflows_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_workflows_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_event_times"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_event_times"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_event_times"() TO "service_role";



GRANT ALL ON TABLE "public"."_encryption_keys" TO "service_role";



GRANT ALL ON SEQUENCE "public"."_encryption_keys_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."_encryption_keys_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."_encryption_keys_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."achievements" TO "anon";
GRANT ALL ON TABLE "public"."achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."achievements" TO "service_role";



GRANT ALL ON TABLE "public"."activities" TO "anon";
GRANT ALL ON TABLE "public"."activities" TO "authenticated";
GRANT ALL ON TABLE "public"."activities" TO "service_role";



GRANT ALL ON TABLE "public"."ai_conversations" TO "anon";
GRANT ALL ON TABLE "public"."ai_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."ai_messages" TO "anon";
GRANT ALL ON TABLE "public"."ai_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_messages" TO "service_role";



GRANT ALL ON TABLE "public"."ar_damage_markers" TO "anon";
GRANT ALL ON TABLE "public"."ar_damage_markers" TO "authenticated";
GRANT ALL ON TABLE "public"."ar_damage_markers" TO "service_role";



GRANT ALL ON TABLE "public"."ar_measurements" TO "anon";
GRANT ALL ON TABLE "public"."ar_measurements" TO "authenticated";
GRANT ALL ON TABLE "public"."ar_measurements" TO "service_role";



GRANT ALL ON TABLE "public"."ar_sessions" TO "anon";
GRANT ALL ON TABLE "public"."ar_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."ar_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."automations" TO "anon";
GRANT ALL ON TABLE "public"."automations" TO "authenticated";
GRANT ALL ON TABLE "public"."automations" TO "service_role";



GRANT ALL ON TABLE "public"."building_codes" TO "anon";
GRANT ALL ON TABLE "public"."building_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."building_codes" TO "service_role";



GRANT ALL ON TABLE "public"."bulk_import_jobs" TO "anon";
GRANT ALL ON TABLE "public"."bulk_import_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."bulk_import_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."business_card_interactions" TO "anon";
GRANT ALL ON TABLE "public"."business_card_interactions" TO "authenticated";
GRANT ALL ON TABLE "public"."business_card_interactions" TO "service_role";



GRANT ALL ON TABLE "public"."call_logs" TO "anon";
GRANT ALL ON TABLE "public"."call_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."call_logs" TO "service_role";



GRANT ALL ON TABLE "public"."carrier_standards" TO "anon";
GRANT ALL ON TABLE "public"."carrier_standards" TO "authenticated";
GRANT ALL ON TABLE "public"."carrier_standards" TO "service_role";



GRANT ALL ON TABLE "public"."challenges" TO "anon";
GRANT ALL ON TABLE "public"."challenges" TO "authenticated";
GRANT ALL ON TABLE "public"."challenges" TO "service_role";



GRANT ALL ON TABLE "public"."claim_communications" TO "anon";
GRANT ALL ON TABLE "public"."claim_communications" TO "authenticated";
GRANT ALL ON TABLE "public"."claim_communications" TO "service_role";



GRANT ALL ON TABLE "public"."claim_documents" TO "anon";
GRANT ALL ON TABLE "public"."claim_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."claim_documents" TO "service_role";



GRANT ALL ON TABLE "public"."claim_supplements" TO "anon";
GRANT ALL ON TABLE "public"."claim_supplements" TO "authenticated";
GRANT ALL ON TABLE "public"."claim_supplements" TO "service_role";



GRANT ALL ON TABLE "public"."claim_weather_data" TO "anon";
GRANT ALL ON TABLE "public"."claim_weather_data" TO "authenticated";
GRANT ALL ON TABLE "public"."claim_weather_data" TO "service_role";



GRANT ALL ON TABLE "public"."claims" TO "anon";
GRANT ALL ON TABLE "public"."claims" TO "authenticated";
GRANT ALL ON TABLE "public"."claims" TO "service_role";



GRANT ALL ON TABLE "public"."commission_plans" TO "anon";
GRANT ALL ON TABLE "public"."commission_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."commission_plans" TO "service_role";



GRANT ALL ON TABLE "public"."commission_records" TO "anon";
GRANT ALL ON TABLE "public"."commission_records" TO "authenticated";
GRANT ALL ON TABLE "public"."commission_records" TO "service_role";



GRANT ALL ON TABLE "public"."commission_rules" TO "anon";
GRANT ALL ON TABLE "public"."commission_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."commission_rules" TO "service_role";



GRANT ALL ON TABLE "public"."commission_summary_by_user" TO "anon";
GRANT ALL ON TABLE "public"."commission_summary_by_user" TO "authenticated";
GRANT ALL ON TABLE "public"."commission_summary_by_user" TO "service_role";



GRANT ALL ON TABLE "public"."commissions" TO "anon";
GRANT ALL ON TABLE "public"."commissions" TO "authenticated";
GRANT ALL ON TABLE "public"."commissions" TO "service_role";



GRANT ALL ON TABLE "public"."contacts" TO "anon";
GRANT ALL ON TABLE "public"."contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."contacts" TO "service_role";



GRANT ALL ON TABLE "public"."court_cases" TO "anon";
GRANT ALL ON TABLE "public"."court_cases" TO "authenticated";
GRANT ALL ON TABLE "public"."court_cases" TO "service_role";



GRANT ALL ON TABLE "public"."crew_members" TO "anon";
GRANT ALL ON TABLE "public"."crew_members" TO "authenticated";
GRANT ALL ON TABLE "public"."crew_members" TO "service_role";



GRANT ALL ON TABLE "public"."digital_business_cards" TO "anon";
GRANT ALL ON TABLE "public"."digital_business_cards" TO "authenticated";
GRANT ALL ON TABLE "public"."digital_business_cards" TO "service_role";



GRANT ALL ON TABLE "public"."dnc_imports" TO "anon";
GRANT ALL ON TABLE "public"."dnc_imports" TO "authenticated";
GRANT ALL ON TABLE "public"."dnc_imports" TO "service_role";



GRANT ALL ON TABLE "public"."dnc_registry" TO "anon";
GRANT ALL ON TABLE "public"."dnc_registry" TO "authenticated";
GRANT ALL ON TABLE "public"."dnc_registry" TO "service_role";



GRANT ALL ON TABLE "public"."document_templates" TO "anon";
GRANT ALL ON TABLE "public"."document_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."document_templates" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."email_drafts" TO "anon";
GRANT ALL ON TABLE "public"."email_drafts" TO "authenticated";
GRANT ALL ON TABLE "public"."email_drafts" TO "service_role";



GRANT ALL ON TABLE "public"."email_templates" TO "anon";
GRANT ALL ON TABLE "public"."email_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."email_templates" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."extracted_addresses" TO "anon";
GRANT ALL ON TABLE "public"."extracted_addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."extracted_addresses" TO "service_role";



GRANT ALL ON TABLE "public"."filter_configs" TO "anon";
GRANT ALL ON TABLE "public"."filter_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."filter_configs" TO "service_role";



GRANT ALL ON TABLE "public"."filter_usage_logs" TO "anon";
GRANT ALL ON TABLE "public"."filter_usage_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."filter_usage_logs" TO "service_role";



GRANT ALL ON TABLE "public"."gamification_activities" TO "anon";
GRANT ALL ON TABLE "public"."gamification_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."gamification_activities" TO "service_role";



GRANT ALL ON TABLE "public"."gamification_scores" TO "anon";
GRANT ALL ON TABLE "public"."gamification_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."gamification_scores" TO "service_role";



GRANT ALL ON TABLE "public"."knocks" TO "anon";
GRANT ALL ON TABLE "public"."knocks" TO "authenticated";
GRANT ALL ON TABLE "public"."knocks" TO "service_role";



GRANT ALL ON TABLE "public"."high_priority_pins" TO "anon";
GRANT ALL ON TABLE "public"."high_priority_pins" TO "authenticated";
GRANT ALL ON TABLE "public"."high_priority_pins" TO "service_role";



GRANT ALL ON TABLE "public"."impersonation_logs" TO "anon";
GRANT ALL ON TABLE "public"."impersonation_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."impersonation_logs" TO "service_role";



GRANT ALL ON TABLE "public"."industry_organizations" TO "anon";
GRANT ALL ON TABLE "public"."industry_organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."industry_organizations" TO "service_role";



GRANT ALL ON TABLE "public"."industry_standards" TO "anon";
GRANT ALL ON TABLE "public"."industry_standards" TO "authenticated";
GRANT ALL ON TABLE "public"."industry_standards" TO "service_role";



GRANT ALL ON TABLE "public"."insurance_carriers" TO "anon";
GRANT ALL ON TABLE "public"."insurance_carriers" TO "authenticated";
GRANT ALL ON TABLE "public"."insurance_carriers" TO "service_role";



GRANT ALL ON TABLE "public"."insurance_personnel" TO "anon";
GRANT ALL ON TABLE "public"."insurance_personnel" TO "authenticated";
GRANT ALL ON TABLE "public"."insurance_personnel" TO "service_role";



GRANT ALL ON TABLE "public"."job_expenses" TO "anon";
GRANT ALL ON TABLE "public"."job_expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."job_expenses" TO "service_role";



GRANT ALL ON TABLE "public"."jobs" TO "anon";
GRANT ALL ON TABLE "public"."jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."jobs" TO "service_role";



GRANT ALL ON TABLE "public"."knowledge_base" TO "anon";
GRANT ALL ON TABLE "public"."knowledge_base" TO "authenticated";
GRANT ALL ON TABLE "public"."knowledge_base" TO "service_role";



GRANT ALL ON TABLE "public"."knowledge_search_queries" TO "anon";
GRANT ALL ON TABLE "public"."knowledge_search_queries" TO "authenticated";
GRANT ALL ON TABLE "public"."knowledge_search_queries" TO "service_role";



GRANT ALL ON TABLE "public"."kpi_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."kpi_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."kpi_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."user_points" TO "anon";
GRANT ALL ON TABLE "public"."user_points" TO "authenticated";
GRANT ALL ON TABLE "public"."user_points" TO "service_role";



GRANT ALL ON TABLE "public"."leaderboard" TO "anon";
GRANT ALL ON TABLE "public"."leaderboard" TO "authenticated";
GRANT ALL ON TABLE "public"."leaderboard" TO "service_role";



GRANT ALL ON TABLE "public"."login_activity" TO "anon";
GRANT ALL ON TABLE "public"."login_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."login_activity" TO "service_role";



GRANT ALL ON TABLE "public"."manufacturer_directory" TO "anon";
GRANT ALL ON TABLE "public"."manufacturer_directory" TO "authenticated";
GRANT ALL ON TABLE "public"."manufacturer_directory" TO "service_role";



GRANT ALL ON TABLE "public"."manufacturer_specs" TO "anon";
GRANT ALL ON TABLE "public"."manufacturer_specs" TO "authenticated";
GRANT ALL ON TABLE "public"."manufacturer_specs" TO "service_role";



GRANT ALL ON TABLE "public"."material_purchases" TO "anon";
GRANT ALL ON TABLE "public"."material_purchases" TO "authenticated";
GRANT ALL ON TABLE "public"."material_purchases" TO "service_role";



GRANT ALL ON TABLE "public"."n8n_chat_histories" TO "anon";
GRANT ALL ON TABLE "public"."n8n_chat_histories" TO "authenticated";
GRANT ALL ON TABLE "public"."n8n_chat_histories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."n8n_chat_histories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."n8n_chat_histories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."n8n_chat_histories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."photos" TO "anon";
GRANT ALL ON TABLE "public"."photos" TO "authenticated";
GRANT ALL ON TABLE "public"."photos" TO "service_role";



GRANT ALL ON TABLE "public"."pins_pending_sync" TO "anon";
GRANT ALL ON TABLE "public"."pins_pending_sync" TO "authenticated";
GRANT ALL ON TABLE "public"."pins_pending_sync" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."pipeline_metrics" TO "anon";
GRANT ALL ON TABLE "public"."pipeline_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."pipeline_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."pipeline_stages" TO "anon";
GRANT ALL ON TABLE "public"."pipeline_stages" TO "authenticated";
GRANT ALL ON TABLE "public"."pipeline_stages" TO "service_role";



GRANT ALL ON TABLE "public"."point_rules" TO "anon";
GRANT ALL ON TABLE "public"."point_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."point_rules" TO "service_role";



GRANT ALL ON TABLE "public"."project_files" TO "anon";
GRANT ALL ON TABLE "public"."project_files" TO "authenticated";
GRANT ALL ON TABLE "public"."project_files" TO "service_role";



GRANT ALL ON TABLE "public"."project_profit_loss" TO "anon";
GRANT ALL ON TABLE "public"."project_profit_loss" TO "authenticated";
GRANT ALL ON TABLE "public"."project_profit_loss" TO "service_role";



GRANT ALL ON TABLE "public"."property_enrichment_cache" TO "anon";
GRANT ALL ON TABLE "public"."property_enrichment_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."property_enrichment_cache" TO "service_role";



GRANT ALL ON TABLE "public"."query_history" TO "anon";
GRANT ALL ON TABLE "public"."query_history" TO "authenticated";
GRANT ALL ON TABLE "public"."query_history" TO "service_role";



GRANT ALL ON TABLE "public"."quickbooks_connections" TO "anon";
GRANT ALL ON TABLE "public"."quickbooks_connections" TO "authenticated";
GRANT ALL ON TABLE "public"."quickbooks_connections" TO "service_role";



GRANT ALL ON TABLE "public"."quickbooks_mappings" TO "anon";
GRANT ALL ON TABLE "public"."quickbooks_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."quickbooks_mappings" TO "service_role";



GRANT ALL ON TABLE "public"."quickbooks_sync_logs" TO "anon";
GRANT ALL ON TABLE "public"."quickbooks_sync_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."quickbooks_sync_logs" TO "service_role";



GRANT ALL ON TABLE "public"."quickbooks_tokens" TO "anon";
GRANT ALL ON TABLE "public"."quickbooks_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."quickbooks_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."quote_line_items" TO "anon";
GRANT ALL ON TABLE "public"."quote_line_items" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_line_items" TO "service_role";



GRANT ALL ON TABLE "public"."quote_options" TO "anon";
GRANT ALL ON TABLE "public"."quote_options" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_options" TO "service_role";



GRANT ALL ON TABLE "public"."rep_locations" TO "anon";
GRANT ALL ON TABLE "public"."rep_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."rep_locations" TO "service_role";



GRANT ALL ON TABLE "public"."report_schedules" TO "anon";
GRANT ALL ON TABLE "public"."report_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."report_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."revenue_forecast" TO "anon";
GRANT ALL ON TABLE "public"."revenue_forecast" TO "authenticated";
GRANT ALL ON TABLE "public"."revenue_forecast" TO "service_role";



GRANT ALL ON TABLE "public"."roofing_knowledge" TO "anon";
GRANT ALL ON TABLE "public"."roofing_knowledge" TO "authenticated";
GRANT ALL ON TABLE "public"."roofing_knowledge" TO "service_role";



GRANT ALL ON TABLE "public"."saved_filters" TO "anon";
GRANT ALL ON TABLE "public"."saved_filters" TO "authenticated";
GRANT ALL ON TABLE "public"."saved_filters" TO "service_role";



GRANT ALL ON TABLE "public"."shingle_products" TO "anon";
GRANT ALL ON TABLE "public"."shingle_products" TO "authenticated";
GRANT ALL ON TABLE "public"."shingle_products" TO "service_role";



GRANT ALL ON TABLE "public"."signature_documents" TO "anon";
GRANT ALL ON TABLE "public"."signature_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."signature_documents" TO "service_role";



GRANT ALL ON TABLE "public"."signatures" TO "anon";
GRANT ALL ON TABLE "public"."signatures" TO "authenticated";
GRANT ALL ON TABLE "public"."signatures" TO "service_role";



GRANT ALL ON TABLE "public"."sms_templates" TO "anon";
GRANT ALL ON TABLE "public"."sms_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."sms_templates" TO "service_role";



GRANT ALL ON TABLE "public"."status_substatus_configs" TO "anon";
GRANT ALL ON TABLE "public"."status_substatus_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."status_substatus_configs" TO "service_role";



GRANT ALL ON TABLE "public"."storm_alerts" TO "anon";
GRANT ALL ON TABLE "public"."storm_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."storm_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."storm_events" TO "anon";
GRANT ALL ON TABLE "public"."storm_events" TO "authenticated";
GRANT ALL ON TABLE "public"."storm_events" TO "service_role";



GRANT ALL ON TABLE "public"."storm_response_mode" TO "anon";
GRANT ALL ON TABLE "public"."storm_response_mode" TO "authenticated";
GRANT ALL ON TABLE "public"."storm_response_mode" TO "service_role";



GRANT ALL ON TABLE "public"."storm_targeting_areas" TO "anon";
GRANT ALL ON TABLE "public"."storm_targeting_areas" TO "authenticated";
GRANT ALL ON TABLE "public"."storm_targeting_areas" TO "service_role";



GRANT ALL ON TABLE "public"."surveys" TO "anon";
GRANT ALL ON TABLE "public"."surveys" TO "authenticated";
GRANT ALL ON TABLE "public"."surveys" TO "service_role";



GRANT ALL ON TABLE "public"."task_activity" TO "anon";
GRANT ALL ON TABLE "public"."task_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."task_activity" TO "service_role";



GRANT ALL ON TABLE "public"."task_attachments" TO "anon";
GRANT ALL ON TABLE "public"."task_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."task_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."task_comments" TO "anon";
GRANT ALL ON TABLE "public"."task_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."task_comments" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."templates" TO "anon";
GRANT ALL ON TABLE "public"."templates" TO "authenticated";
GRANT ALL ON TABLE "public"."templates" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_settings" TO "anon";
GRANT ALL ON TABLE "public"."tenant_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_settings" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_users" TO "anon";
GRANT ALL ON TABLE "public"."tenant_users" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_users" TO "service_role";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";



GRANT ALL ON TABLE "public"."territories" TO "anon";
GRANT ALL ON TABLE "public"."territories" TO "authenticated";
GRANT ALL ON TABLE "public"."territories" TO "service_role";



GRANT ALL ON TABLE "public"."timesheets" TO "anon";
GRANT ALL ON TABLE "public"."timesheets" TO "authenticated";
GRANT ALL ON TABLE "public"."timesheets" TO "service_role";



GRANT ALL ON TABLE "public"."user_achievements" TO "anon";
GRANT ALL ON TABLE "public"."user_achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."user_achievements" TO "service_role";



GRANT ALL ON TABLE "public"."user_challenges" TO "anon";
GRANT ALL ON TABLE "public"."user_challenges" TO "authenticated";
GRANT ALL ON TABLE "public"."user_challenges" TO "service_role";



GRANT ALL ON TABLE "public"."user_notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_role_assignments" TO "anon";
GRANT ALL ON TABLE "public"."user_role_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."user_role_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."user_sessions" TO "anon";
GRANT ALL ON TABLE "public"."user_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."user_streaks" TO "anon";
GRANT ALL ON TABLE "public"."user_streaks" TO "authenticated";
GRANT ALL ON TABLE "public"."user_streaks" TO "service_role";



GRANT ALL ON TABLE "public"."user_ui_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_ui_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_ui_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."voice_function_calls" TO "anon";
GRANT ALL ON TABLE "public"."voice_function_calls" TO "authenticated";
GRANT ALL ON TABLE "public"."voice_function_calls" TO "service_role";



GRANT ALL ON TABLE "public"."voice_sessions" TO "anon";
GRANT ALL ON TABLE "public"."voice_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."voice_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."win_loss_reasons" TO "anon";
GRANT ALL ON TABLE "public"."win_loss_reasons" TO "authenticated";
GRANT ALL ON TABLE "public"."win_loss_reasons" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_executions" TO "anon";
GRANT ALL ON TABLE "public"."workflow_executions" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_executions" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_step_executions" TO "anon";
GRANT ALL ON TABLE "public"."workflow_step_executions" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_step_executions" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_steps" TO "anon";
GRANT ALL ON TABLE "public"."workflow_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_steps" TO "service_role";



GRANT ALL ON TABLE "public"."workflows" TO "anon";
GRANT ALL ON TABLE "public"."workflows" TO "authenticated";
GRANT ALL ON TABLE "public"."workflows" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







