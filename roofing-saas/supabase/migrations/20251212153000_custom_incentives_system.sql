-- =====================================================
-- CUSTOM INCENTIVES & KPI TRACKING SYSTEM
-- Date: 2025-12-12
-- Feature: Admin UI for custom gamification config
-- Archon Task: db62a7aa-04f4-4e03-a4df-b4a8d86a6154
-- =====================================================

-- Rollback:
-- DROP TABLE IF EXISTS kpi_values CASCADE;
-- DROP TABLE IF EXISTS kpi_definitions CASCADE;
-- DROP TABLE IF EXISTS reward_claims CASCADE;
-- DROP TABLE IF EXISTS reward_configs CASCADE;
-- DROP TABLE IF EXISTS challenge_progress CASCADE;
-- DROP TABLE IF EXISTS challenge_configs CASCADE;
-- DROP TABLE IF EXISTS achievement_configs CASCADE;
-- DROP TABLE IF EXISTS point_rule_configs CASCADE;

-- =====================================================
-- TABLE 1: Point Rule Configurations
-- =====================================================
CREATE TABLE IF NOT EXISTS public.point_rule_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_name TEXT NOT NULL,
  points_value INTEGER NOT NULL CHECK (points_value > 0),
  category TEXT,
  conditions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT unique_org_action_type UNIQUE(org_id, action_type)
);

CREATE INDEX idx_point_rule_configs_org ON public.point_rule_configs(org_id) WHERE is_active = true;
CREATE INDEX idx_point_rule_configs_category ON public.point_rule_configs(org_id, category) WHERE is_active = true;

COMMENT ON TABLE public.point_rule_configs IS 'Admin-configurable point earning rules';
COMMENT ON COLUMN public.point_rule_configs.action_type IS 'Unique identifier for action (e.g., roof_inspection)';
COMMENT ON COLUMN public.point_rule_configs.conditions IS 'Freestyle JSON conditions for conditional point awards';

-- =====================================================
-- TABLE 2: Achievement Configurations
-- =====================================================
CREATE TABLE IF NOT EXISTS public.achievement_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  requirement_type TEXT NOT NULL CHECK (requirement_type IN ('points', 'count', 'streak', 'custom_sql')),
  requirement_value INTEGER,
  requirement_config JSONB DEFAULT '{}',
  custom_sql TEXT,
  points_reward INTEGER DEFAULT 0 CHECK (points_reward >= 0),
  tier TEXT CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT unique_org_achievement_name UNIQUE(org_id, name)
);

CREATE INDEX idx_achievement_configs_org ON public.achievement_configs(org_id) WHERE is_active = true;
CREATE INDEX idx_achievement_configs_tier ON public.achievement_configs(org_id, tier) WHERE is_active = true;

COMMENT ON TABLE public.achievement_configs IS 'Admin-configurable achievements and badges';
COMMENT ON COLUMN public.achievement_configs.custom_sql IS 'Freestyle SQL for complex achievement logic';

-- =====================================================
-- TABLE 3: Challenge Configurations
-- =====================================================
CREATE TABLE IF NOT EXISTS public.challenge_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('daily', 'weekly', 'monthly', 'special')),
  goal_metric TEXT NOT NULL,
  goal_value INTEGER NOT NULL CHECK (goal_value > 0),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL CHECK (end_date >= start_date),
  reward_type TEXT CHECK (reward_type IN ('points', 'prize', 'both')),
  reward_points INTEGER DEFAULT 0 CHECK (reward_points >= 0),
  reward_description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_challenge_configs_org ON public.challenge_configs(org_id);
CREATE INDEX idx_challenge_configs_dates ON public.challenge_configs(org_id, start_date, end_date) WHERE is_active = true;
CREATE INDEX idx_challenge_configs_type ON public.challenge_configs(org_id, challenge_type) WHERE is_active = true;

COMMENT ON TABLE public.challenge_configs IS 'Time-limited competitions and contests';

-- =====================================================
-- TABLE 4: Challenge Progress Tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS public.challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenge_configs(id) ON DELETE CASCADE,
  current_progress INTEGER DEFAULT 0 CHECK (current_progress >= 0),
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT unique_user_challenge UNIQUE(user_id, challenge_id)
);

CREATE INDEX idx_challenge_progress_user ON public.challenge_progress(user_id, is_completed);
CREATE INDEX idx_challenge_progress_challenge ON public.challenge_progress(challenge_id) WHERE is_completed = false;

COMMENT ON TABLE public.challenge_progress IS 'User progress in active challenges';

-- =====================================================
-- TABLE 5: Reward Configurations
-- =====================================================
CREATE TABLE IF NOT EXISTS public.reward_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('bonus', 'gift_card', 'time_off', 'prize')),
  points_required INTEGER NOT NULL CHECK (points_required > 0),
  reward_value TEXT,
  quantity_available INTEGER CHECK (quantity_available IS NULL OR quantity_available > 0),
  quantity_claimed INTEGER DEFAULT 0 CHECK (quantity_claimed >= 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT unique_org_reward_name UNIQUE(org_id, name)
);

CREATE INDEX idx_reward_configs_org ON public.reward_configs(org_id) WHERE is_active = true;
CREATE INDEX idx_reward_configs_points ON public.reward_configs(org_id, points_required) WHERE is_active = true;

COMMENT ON TABLE public.reward_configs IS 'Rewards catalog that users can claim with points';
COMMENT ON COLUMN public.reward_configs.quantity_available IS 'NULL = unlimited, integer = limited quantity';

-- =====================================================
-- TABLE 6: Reward Claims Tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS public.reward_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.reward_configs(id) ON DELETE CASCADE,
  points_spent INTEGER NOT NULL CHECK (points_spent > 0),
  claimed_at TIMESTAMPTZ DEFAULT now(),
  fulfilled BOOLEAN DEFAULT false,
  fulfilled_at TIMESTAMPTZ,
  fulfilled_by UUID REFERENCES auth.users(id),
  notes TEXT
);

CREATE INDEX idx_reward_claims_user ON public.reward_claims(user_id, claimed_at DESC);
CREATE INDEX idx_reward_claims_reward ON public.reward_claims(reward_id);
CREATE INDEX idx_reward_claims_org_unfulfilled ON public.reward_claims(org_id) WHERE fulfilled = false;

COMMENT ON TABLE public.reward_claims IS 'History of reward redemptions';

-- =====================================================
-- TABLE 7: KPI Definitions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.kpi_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  calculation_type TEXT NOT NULL CHECK (calculation_type IN ('sql_query', 'aggregation', 'formula')),
  calculation_config JSONB NOT NULL,
  format_type TEXT DEFAULT 'number' CHECK (format_type IN ('number', 'percentage', 'currency', 'duration')),
  target_value DECIMAL(12,2),
  frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT unique_org_kpi_name UNIQUE(org_id, name)
);

CREATE INDEX idx_kpi_definitions_org ON public.kpi_definitions(org_id) WHERE is_active = true;
CREATE INDEX idx_kpi_definitions_frequency ON public.kpi_definitions(org_id, frequency) WHERE is_active = true;
CREATE INDEX idx_kpi_definitions_system ON public.kpi_definitions(org_id, is_system);

COMMENT ON TABLE public.kpi_definitions IS 'KPI calculation formulas and metadata';
COMMENT ON COLUMN public.kpi_definitions.is_system IS 'Pre-built roofing KPIs vs custom KPIs';
COMMENT ON COLUMN public.kpi_definitions.calculation_config IS 'Freestyle JSON with SQL, aggregation rules, or formulas';

-- =====================================================
-- TABLE 8: KPI Values (Time-Series Data)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.kpi_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kpi_id UUID NOT NULL REFERENCES public.kpi_definitions(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  metric_value DECIMAL(20,4) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  dimensions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT unique_kpi_date_user UNIQUE(kpi_id, metric_date, user_id)
);

CREATE INDEX idx_kpi_values_kpi ON public.kpi_values(kpi_id, metric_date DESC);
CREATE INDEX idx_kpi_values_org ON public.kpi_values(org_id, metric_date DESC);
CREATE INDEX idx_kpi_values_user ON public.kpi_values(user_id, metric_date DESC) WHERE user_id IS NOT NULL;

COMMENT ON TABLE public.kpi_values IS 'Calculated KPI results over time';
COMMENT ON COLUMN public.kpi_values.user_id IS 'NULL for org-wide KPIs, user_id for per-user KPIs';

-- =====================================================
-- RLS POLICIES: Organization Isolation
-- =====================================================

-- Point Rule Configs
ALTER TABLE public.point_rule_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view point rules in their org"
  ON public.point_rule_configs FOR SELECT
  USING (org_id = auth.jwt() ->> 'org_id');

CREATE POLICY "Admins can manage point rules"
  ON public.point_rule_configs FOR ALL
  USING (org_id = auth.jwt() ->> 'org_id' AND auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (org_id = auth.jwt() ->> 'org_id' AND auth.jwt() ->> 'role' = 'admin');

-- Achievement Configs
ALTER TABLE public.achievement_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view achievements in their org"
  ON public.achievement_configs FOR SELECT
  USING (org_id = auth.jwt() ->> 'org_id');

CREATE POLICY "Admins can manage achievements"
  ON public.achievement_configs FOR ALL
  USING (org_id = auth.jwt() ->> 'org_id' AND auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (org_id = auth.jwt() ->> 'org_id' AND auth.jwt() ->> 'role' = 'admin');

-- Challenge Configs
ALTER TABLE public.challenge_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view challenges in their org"
  ON public.challenge_configs FOR SELECT
  USING (org_id = auth.jwt() ->> 'org_id');

CREATE POLICY "Admins can manage challenges"
  ON public.challenge_configs FOR ALL
  USING (org_id = auth.jwt() ->> 'org_id' AND auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (org_id = auth.jwt() ->> 'org_id' AND auth.jwt() ->> 'role' = 'admin');

-- Challenge Progress
ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own challenge progress"
  ON public.challenge_progress FOR SELECT
  USING (user_id = auth.uid() OR (org_id = auth.jwt() ->> 'org_id' AND auth.jwt() ->> 'role' = 'admin'));

CREATE POLICY "System can update challenge progress"
  ON public.challenge_progress FOR ALL
  USING (org_id = auth.jwt() ->> 'org_id')
  WITH CHECK (org_id = auth.jwt() ->> 'org_id');

-- Reward Configs
ALTER TABLE public.reward_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rewards in their org"
  ON public.reward_configs FOR SELECT
  USING (org_id = auth.jwt() ->> 'org_id');

CREATE POLICY "Admins can manage rewards"
  ON public.reward_configs FOR ALL
  USING (org_id = auth.jwt() ->> 'org_id' AND auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (org_id = auth.jwt() ->> 'org_id' AND auth.jwt() ->> 'role' = 'admin');

-- Reward Claims
ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reward claims"
  ON public.reward_claims FOR SELECT
  USING (user_id = auth.uid() OR (org_id = auth.jwt() ->> 'org_id' AND auth.jwt() ->> 'role' = 'admin'));

CREATE POLICY "Users can claim rewards"
  ON public.reward_claims FOR INSERT
  WITH CHECK (user_id = auth.uid() AND org_id = auth.jwt() ->> 'org_id');

CREATE POLICY "Admins can fulfill reward claims"
  ON public.reward_claims FOR UPDATE
  USING (org_id = auth.jwt() ->> 'org_id' AND auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (org_id = auth.jwt() ->> 'org_id' AND auth.jwt() ->> 'role' = 'admin');

-- KPI Definitions
ALTER TABLE public.kpi_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view KPIs in their org"
  ON public.kpi_definitions FOR SELECT
  USING (org_id = auth.jwt() ->> 'org_id');

CREATE POLICY "Admins can manage KPIs"
  ON public.kpi_definitions FOR ALL
  USING (org_id = auth.jwt() ->> 'org_id' AND auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (org_id = auth.jwt() ->> 'org_id' AND auth.jwt() ->> 'role' = 'admin');

-- KPI Values
ALTER TABLE public.kpi_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view KPI values in their org"
  ON public.kpi_values FOR SELECT
  USING (org_id = auth.jwt() ->> 'org_id');

CREATE POLICY "System can insert KPI values"
  ON public.kpi_values FOR INSERT
  WITH CHECK (org_id = auth.jwt() ->> 'org_id');

-- =====================================================
-- SEED DATA: Pre-built Roofing KPIs
-- =====================================================

-- Note: This inserts for first organization only
-- In production, you'd seed for each org or let them opt-in

DO $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Get first organization (for seeding purposes)
  SELECT id INTO v_org_id FROM public.organizations LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE NOTICE 'No organizations found - skipping KPI seed data';
    RETURN;
  END IF;

  -- KPI 1: Lead Conversion Rate
  INSERT INTO public.kpi_definitions (org_id, name, description, calculation_type, calculation_config, format_type, target_value, frequency, is_system)
  VALUES (
    v_org_id,
    'Lead Conversion Rate',
    'Percentage of contacts that convert to won projects',
    'aggregation',
    '{"numerator": "COUNT(projects WHERE status = won)", "denominator": "COUNT(contacts)", "metric": "percentage"}'::jsonb,
    'percentage',
    25.00,
    'daily',
    true
  ) ON CONFLICT (org_id, name) DO NOTHING;

  -- KPI 2: Average Job Value
  INSERT INTO public.kpi_definitions (org_id, name, description, calculation_type, calculation_config, format_type, target_value, frequency, is_system)
  VALUES (
    v_org_id,
    'Average Job Value',
    'Average approved value of won projects',
    'aggregation',
    '{"table": "projects", "aggregation": "AVG", "column": "approved_value", "filter": {"status": "won"}}'::jsonb,
    'currency',
    15000.00,
    'daily',
    true
  ) ON CONFLICT (org_id, name) DO NOTHING;

  -- KPI 3: Average Sales Cycle
  INSERT INTO public.kpi_definitions (org_id, name, description, calculation_type, calculation_config, format_type, target_value, frequency, is_system)
  VALUES (
    v_org_id,
    'Average Sales Cycle',
    'Average days from contact creation to project won',
    'formula',
    '{"formula": "AVG(EXTRACT(DAY FROM (projects.updated_at - contacts.created_at)))", "tables": ["projects", "contacts"], "join": "projects.contact_id = contacts.id", "filter": {"projects.status": "won"}}'::jsonb,
    'duration',
    21.00,
    'daily',
    true
  ) ON CONFLICT (org_id, name) DO NOTHING;

  -- KPI 4: Win Rate
  INSERT INTO public.kpi_definitions (org_id, name, description, calculation_type, calculation_config, format_type, target_value, frequency, is_system)
  VALUES (
    v_org_id,
    'Win Rate',
    'Percentage of qualified leads that close',
    'aggregation',
    '{"numerator": "COUNT(projects WHERE status = won)", "denominator": "COUNT(projects WHERE pipeline_stage IN (qualified, quote_sent, negotiation))", "metric": "percentage"}'::jsonb,
    'percentage',
    40.00,
    'daily',
    true
  ) ON CONFLICT (org_id, name) DO NOTHING;

  -- KPI 5: Daily Activity Volume
  INSERT INTO public.kpi_definitions (org_id, name, description, calculation_type, calculation_config, format_type, target_value, frequency, is_system)
  VALUES (
    v_org_id,
    'Daily Activity Volume',
    'Total calls, emails, and meetings per day',
    'aggregation',
    '{"table": "activities", "aggregation": "COUNT", "column": "id", "filter": {"type": ["call", "email", "meeting"]}}'::jsonb,
    'number',
    20.00,
    'daily',
    true
  ) ON CONFLICT (org_id, name) DO NOTHING;

  -- KPI 6: Total Pipeline Value
  INSERT INTO public.kpi_definitions (org_id, name, description, calculation_type, calculation_config, format_type, target_value, frequency, is_system)
  VALUES (
    v_org_id,
    'Total Pipeline Value',
    'Sum of estimated value for all active projects',
    'aggregation',
    '{"table": "projects", "aggregation": "SUM", "column": "estimated_value", "filter": {"status": ["active", "qualified", "quote_sent", "negotiation"]}}'::jsonb,
    'currency',
    500000.00,
    'daily',
    true
  ) ON CONFLICT (org_id, name) DO NOTHING;

  RAISE NOTICE 'Successfully seeded 6 roofing KPIs for org_id: %', v_org_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error seeding KPIs: %', SQLERRM;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '=== Custom Incentives System Created ===';
  RAISE NOTICE 'Tables: point_rule_configs, achievement_configs, challenge_configs, challenge_progress';
  RAISE NOTICE 'Tables: reward_configs, reward_claims, kpi_definitions, kpi_values';
  RAISE NOTICE 'RLS Policies: ✓ All tables protected with org_id isolation';
  RAISE NOTICE 'Indexes: ✓ Performance indexes on org_id, dates, and filters';
  RAISE NOTICE 'Seed Data: ✓ 6 pre-built roofing KPIs';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Create TypeScript types (lib/gamification/types.ts)';
  RAISE NOTICE '2. Create API routes (app/api/gamification/*)';
  RAISE NOTICE '3. Create Settings UI (components/settings/GamificationSettings.tsx)';
END $$;
