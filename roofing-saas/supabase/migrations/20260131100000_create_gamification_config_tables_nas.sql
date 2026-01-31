-- Migration: Create Gamification Config Tables (NAS-adapted)
-- Purpose: Add reward_configs, kpi_definitions, challenge_configs, point_rule_configs
-- Note: Adapted from 20251217140000 — uses tenant_id (NAS pattern) instead of org_id
-- Executed on NAS: 2026-01-31

-- =====================================================
-- REWARD CONFIGS
-- =====================================================

CREATE TABLE IF NOT EXISTS reward_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
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

DROP POLICY IF EXISTS "Users can view tenant rewards" ON reward_configs;
CREATE POLICY "Users can view tenant rewards" ON reward_configs
  FOR SELECT USING (tenant_id IN (SELECT tu.tenant_id FROM tenant_users tu WHERE tu.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage tenant rewards" ON reward_configs;
CREATE POLICY "Users can manage tenant rewards" ON reward_configs
  FOR ALL USING (tenant_id IN (SELECT tu.tenant_id FROM tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_reward_configs_tenant ON reward_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reward_configs_active ON reward_configs(is_active);

-- =====================================================
-- KPI DEFINITIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS kpi_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  calculation_type TEXT NOT NULL CHECK (calculation_type IN ('sql_query', 'aggregation', 'formula')),
  calculation_config JSONB NOT NULL DEFAULT '{}',
  format_type TEXT DEFAULT 'number' CHECK (format_type IN ('number', 'percentage', 'currency', 'duration')),
  target_value DECIMAL,
  frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE kpi_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view tenant KPIs" ON kpi_definitions;
CREATE POLICY "Users can view tenant KPIs" ON kpi_definitions
  FOR SELECT USING (tenant_id IN (SELECT tu.tenant_id FROM tenant_users tu WHERE tu.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage tenant KPIs" ON kpi_definitions;
CREATE POLICY "Users can manage tenant KPIs" ON kpi_definitions
  FOR ALL USING (tenant_id IN (SELECT tu.tenant_id FROM tenant_users tu WHERE tu.user_id = auth.uid()) AND is_system = false);

CREATE INDEX IF NOT EXISTS idx_kpi_definitions_tenant ON kpi_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kpi_definitions_active ON kpi_definitions(is_active);

-- =====================================================
-- CHALLENGE CONFIGS
-- =====================================================

CREATE TABLE IF NOT EXISTS challenge_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
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
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT end_date_after_start CHECK (end_date >= start_date)
);

ALTER TABLE challenge_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view tenant challenges" ON challenge_configs;
CREATE POLICY "Users can view tenant challenges" ON challenge_configs
  FOR SELECT USING (tenant_id IN (SELECT tu.tenant_id FROM tenant_users tu WHERE tu.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage tenant challenges" ON challenge_configs;
CREATE POLICY "Users can manage tenant challenges" ON challenge_configs
  FOR ALL USING (tenant_id IN (SELECT tu.tenant_id FROM tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_challenge_configs_tenant ON challenge_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_challenge_configs_active ON challenge_configs(is_active, start_date, end_date);

-- =====================================================
-- POINT RULE CONFIGS
-- =====================================================

CREATE TABLE IF NOT EXISTS point_rule_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
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

DROP POLICY IF EXISTS "Users can view tenant point rules" ON point_rule_configs;
CREATE POLICY "Users can view tenant point rules" ON point_rule_configs
  FOR SELECT USING (tenant_id IN (SELECT tu.tenant_id FROM tenant_users tu WHERE tu.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage tenant point rules" ON point_rule_configs;
CREATE POLICY "Users can manage tenant point rules" ON point_rule_configs
  FOR ALL USING (tenant_id IN (SELECT tu.tenant_id FROM tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_point_rule_configs_tenant ON point_rule_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_point_rule_configs_action ON point_rule_configs(action_type);

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

DROP TRIGGER IF EXISTS update_reward_configs_updated_at ON reward_configs;
CREATE TRIGGER update_reward_configs_updated_at
  BEFORE UPDATE ON reward_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kpi_definitions_updated_at ON kpi_definitions;
CREATE TRIGGER update_kpi_definitions_updated_at
  BEFORE UPDATE ON kpi_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_challenge_configs_updated_at ON challenge_configs;
CREATE TRIGGER update_challenge_configs_updated_at
  BEFORE UPDATE ON challenge_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_point_rule_configs_updated_at ON point_rule_configs;
CREATE TRIGGER update_point_rule_configs_updated_at
  BEFORE UPDATE ON point_rule_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
