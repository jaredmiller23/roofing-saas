-- Migration: Create Gamification Config Tables
-- Purpose: Add missing tables that the gamification code expects
-- Note: Production has older gamification tables (challenges, point_rules, kpi_snapshots)
--       with different schemas. These new *_configs tables are what the code expects.
--
-- Tables created:
--   - challenge_configs
--   - point_rule_configs
--   - reward_configs
--   - kpi_definitions

-- =====================================================
-- CHALLENGE CONFIGS
-- =====================================================

CREATE TABLE IF NOT EXISTS challenge_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('daily', 'weekly', 'monthly', 'special')),
  goal_metric TEXT NOT NULL,
  goal_value INTEGER NOT NULL CHECK (goal_value > 0),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reward_type TEXT CHECK (reward_type IN ('points', 'prize', 'both')),
  reward_points INTEGER DEFAULT 0,
  reward_description TEXT,
  participants UUID[] DEFAULT NULL, -- null means all org members
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT end_date_after_start CHECK (end_date >= start_date)
);

ALTER TABLE challenge_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org challenges" ON challenge_configs
  FOR SELECT USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "Users can manage org challenges" ON challenge_configs
  FOR ALL USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE INDEX idx_challenge_configs_org ON challenge_configs(org_id);
CREATE INDEX idx_challenge_configs_active ON challenge_configs(is_active, start_date, end_date);

-- =====================================================
-- POINT RULE CONFIGS
-- =====================================================

CREATE TABLE IF NOT EXISTS point_rule_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  action_name TEXT NOT NULL,
  points_value INTEGER NOT NULL CHECK (points_value > 0),
  category TEXT,
  conditions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE point_rule_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org point rules" ON point_rule_configs
  FOR SELECT USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "Users can manage org point rules" ON point_rule_configs
  FOR ALL USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE INDEX idx_point_rule_configs_org ON point_rule_configs(org_id);
CREATE INDEX idx_point_rule_configs_action ON point_rule_configs(action_type);

-- =====================================================
-- REWARD CONFIGS
-- =====================================================

CREATE TABLE IF NOT EXISTS reward_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('bonus', 'gift_card', 'time_off', 'prize')),
  points_required INTEGER NOT NULL CHECK (points_required > 0),
  reward_value TEXT NOT NULL,
  quantity_available INTEGER,
  quantity_claimed INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reward_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org rewards" ON reward_configs
  FOR SELECT USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "Users can manage org rewards" ON reward_configs
  FOR ALL USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE INDEX idx_reward_configs_org ON reward_configs(org_id);
CREATE INDEX idx_reward_configs_active ON reward_configs(is_active);

-- =====================================================
-- KPI DEFINITIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS kpi_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  calculation_type TEXT NOT NULL CHECK (calculation_type IN ('sql_query', 'aggregation', 'formula')),
  calculation_config JSONB NOT NULL DEFAULT '{}',
  format_type TEXT DEFAULT 'number' CHECK (format_type IN ('number', 'percentage', 'currency', 'duration')),
  target_value DECIMAL,
  frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false, -- system KPIs cannot be deleted
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE kpi_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org KPIs" ON kpi_definitions
  FOR SELECT USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "Users can manage org KPIs" ON kpi_definitions
  FOR ALL USING (org_id = (auth.jwt() ->> 'org_id')::uuid AND is_system = false);

CREATE INDEX idx_kpi_definitions_org ON kpi_definitions(org_id);
CREATE INDEX idx_kpi_definitions_active ON kpi_definitions(is_active);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_challenge_configs_updated_at
  BEFORE UPDATE ON challenge_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_point_rule_configs_updated_at
  BEFORE UPDATE ON point_rule_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reward_configs_updated_at
  BEFORE UPDATE ON reward_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kpi_definitions_updated_at
  BEFORE UPDATE ON kpi_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE challenge_configs IS 'Time-limited competition configurations for gamification';
COMMENT ON TABLE point_rule_configs IS 'Rules for awarding points based on actions';
COMMENT ON TABLE reward_configs IS 'Rewards that can be redeemed with points';
COMMENT ON TABLE kpi_definitions IS 'Custom KPI definitions for tracking business metrics';
