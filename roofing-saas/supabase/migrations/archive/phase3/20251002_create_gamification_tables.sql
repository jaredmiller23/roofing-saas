-- Create gamification schema tables
-- Points tracking, achievements, leaderboards, and challenges

-- Points configuration table
CREATE TABLE IF NOT EXISTS public.point_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL UNIQUE,
  points_value INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- User points tracking
CREATE TABLE IF NOT EXISTS public.user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  points_earned INTEGER NOT NULL,
  activity_id UUID, -- Reference to the activity that earned points
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  CONSTRAINT unique_user_activity_points UNIQUE(user_id, activity_id)
);

-- Achievements/Badges
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT, -- Icon name or emoji
  requirement_type TEXT NOT NULL, -- 'points', 'count', 'streak', 'special'
  requirement_value INTEGER,
  requirement_metadata JSONB DEFAULT '{}',
  points_reward INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- User achievements
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  CONSTRAINT unique_user_achievement UNIQUE(user_id, achievement_id)
);

-- Daily/Weekly challenges
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE, -- NULL for system-wide challenges
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL, -- 'daily', 'weekly', 'special'
  requirement_type TEXT NOT NULL, -- 'doors_knocked', 'appointments', 'conversations', etc.
  requirement_value INTEGER NOT NULL,
  points_reward INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- User challenge progress
CREATE TABLE IF NOT EXISTS public.user_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  current_progress INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  CONSTRAINT unique_user_challenge UNIQUE(user_id, challenge_id)
);

-- Streaks tracking
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  streak_type TEXT NOT NULL, -- 'daily_doors', 'weekly_sales', etc.
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  CONSTRAINT unique_user_streak UNIQUE(user_id, streak_type)
);

-- Create indexes
CREATE INDEX idx_user_points_tenant_user ON public.user_points(tenant_id, user_id);
CREATE INDEX idx_user_points_earned_at ON public.user_points(earned_at DESC);
CREATE INDEX idx_user_achievements_user ON public.user_achievements(user_id);
CREATE INDEX idx_user_challenges_user ON public.user_challenges(user_id);
CREATE INDEX idx_user_challenges_active ON public.user_challenges(challenge_id, is_completed);
CREATE INDEX idx_user_streaks_user ON public.user_streaks(user_id);

-- Insert default point rules
INSERT INTO public.point_rules (action_type, points_value, description) VALUES
  ('door_knock', 1, 'Points for each door knocked'),
  ('conversation', 5, 'Points for having a conversation'),
  ('appointment_scheduled', 20, 'Points for scheduling an appointment'),
  ('appointment_completed', 10, 'Points for completing an appointment'),
  ('sale_closed', 100, 'Points for closing a sale'),
  ('referral_received', 15, 'Points for receiving a referral'),
  ('photo_uploaded', 2, 'Points for uploading property photos'),
  ('note_added', 1, 'Points for adding notes'),
  ('daily_goal_met', 25, 'Bonus points for meeting daily goals'),
  ('weekly_goal_met', 100, 'Bonus points for meeting weekly goals')
ON CONFLICT (action_type) DO NOTHING;

-- Insert default achievements
INSERT INTO public.achievements (name, description, icon, requirement_type, requirement_value, points_reward, display_order) VALUES
  ('First Steps', 'Knock on your first door', '🚪', 'count', 1, 10, 1),
  ('Conversation Starter', 'Have 5 conversations', '💬', 'count', 5, 25, 2),
  ('Appointment Setter', 'Schedule your first appointment', '📅', 'count', 1, 50, 3),
  ('Closer', 'Close your first sale', '🎯', 'count', 1, 200, 4),
  ('Door Warrior', 'Knock on 100 doors', '🏆', 'count', 100, 100, 5),
  ('Sales Master', 'Close 10 sales', '👑', 'count', 10, 500, 6),
  ('Streak Runner', 'Maintain a 7-day activity streak', '🔥', 'streak', 7, 150, 7),
  ('Photo Pro', 'Upload 50 photos', '📸', 'count', 50, 75, 8),
  ('Team Player', 'Earn 1000 total points', '⭐', 'points', 1000, 200, 9),
  ('Legend', 'Earn 5000 total points', '🌟', 'points', 5000, 1000, 10)
ON CONFLICT (name) DO NOTHING;

-- RLS Policies
ALTER TABLE public.point_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- Point rules are public read
CREATE POLICY "Point rules are viewable by all authenticated users"
  ON public.point_rules FOR SELECT
  TO authenticated
  USING (true);

-- User points policies
CREATE POLICY "Users can view points in their tenant"
  ON public.user_points FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_users tu
      WHERE tu.tenant_id = user_points.tenant_id
      AND tu.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert user points"
  ON public.user_points FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_users tu
      WHERE tu.tenant_id = user_points.tenant_id
      AND tu.user_id = auth.uid()
    )
  );

-- Achievements are public read
CREATE POLICY "Achievements are viewable by all authenticated users"
  ON public.achievements FOR SELECT
  TO authenticated
  USING (is_active = true);

-- User achievements policies
CREATE POLICY "Users can view achievements in their tenant"
  ON public.user_achievements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_users tu
      WHERE tu.tenant_id = user_achievements.tenant_id
      AND tu.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert user achievements"
  ON public.user_achievements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_users tu
      WHERE tu.tenant_id = user_achievements.tenant_id
      AND tu.user_id = auth.uid()
    )
  );

-- Challenges policies
CREATE POLICY "Users can view active challenges"
  ON public.challenges FOR SELECT
  TO authenticated
  USING (
    is_active = true AND (
      tenant_id IS NULL OR
      EXISTS (
        SELECT 1 FROM public.tenant_users tu
        WHERE tu.tenant_id = challenges.tenant_id
        AND tu.user_id = auth.uid()
      )
    )
  );

-- User challenges policies
CREATE POLICY "Users can view their challenge progress"
  ON public.user_challenges FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_users tu
      WHERE tu.tenant_id = user_challenges.tenant_id
      AND tu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their challenge progress"
  ON public.user_challenges FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Streaks policies
CREATE POLICY "Users can view streaks in their tenant"
  ON public.user_streaks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_users tu
      WHERE tu.tenant_id = user_streaks.tenant_id
      AND tu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own streaks"
  ON public.user_streaks FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create view for leaderboard
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  up.user_id,
  up.tenant_id,
  u.raw_user_meta_data->>'full_name' as user_name,
  u.raw_user_meta_data->>'avatar_url' as avatar_url,
  COALESCE(SUM(up.points_earned), 0) as total_points,
  COUNT(DISTINCT DATE(up.earned_at)) as active_days,
  COUNT(DISTINCT CASE WHEN up.action_type = 'sale_closed' THEN up.id END) as total_sales,
  MAX(up.earned_at) as last_activity
FROM public.user_points up
JOIN auth.users u ON u.id = up.user_id
GROUP BY up.user_id, up.tenant_id, u.raw_user_meta_data;

-- Grant access to view
GRANT SELECT ON public.leaderboard TO authenticated;

-- Function to award points
CREATE OR REPLACE FUNCTION public.award_points(
  p_user_id UUID,
  p_tenant_id UUID,
  p_action_type TEXT,
  p_activity_id UUID DEFAULT NULL,
  p_contact_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check achievements
CREATE OR REPLACE FUNCTION public.check_achievements(
  p_user_id UUID,
  p_tenant_id UUID
) RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update streaks
CREATE OR REPLACE FUNCTION public.update_streaks(
  p_user_id UUID,
  p_tenant_id UUID,
  p_action_type TEXT
) RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;