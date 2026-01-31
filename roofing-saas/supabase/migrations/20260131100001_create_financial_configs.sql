-- Migration: Create Financial Configs Table
-- Purpose: Per-tenant configurable financial calculation parameters
-- Replaces hardcoded ratios in revenue-forecast, cash-flow-projection, margin-analysis
-- Executed on NAS: 2026-01-31

CREATE TABLE IF NOT EXISTS financial_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE,
  forecast_blend_historical DECIMAL NOT NULL DEFAULT 0.6,
  forecast_blend_pipeline DECIMAL NOT NULL DEFAULT 0.4,
  cost_rate DECIMAL NOT NULL DEFAULT 0.7,
  margin_excellent DECIMAL NOT NULL DEFAULT 30,
  margin_good DECIMAL NOT NULL DEFAULT 20,
  margin_fair DECIMAL NOT NULL DEFAULT 10,
  margin_target DECIMAL NOT NULL DEFAULT 25,
  seasonal_adjustments JSONB DEFAULT '{}',
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE financial_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view tenant financial config" ON financial_configs;
CREATE POLICY "Users can view tenant financial config" ON financial_configs
  FOR SELECT USING (tenant_id IN (SELECT tu.tenant_id FROM tenant_users tu WHERE tu.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage tenant financial config" ON financial_configs;
CREATE POLICY "Users can manage tenant financial config" ON financial_configs
  FOR ALL USING (tenant_id IN (SELECT tu.tenant_id FROM tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_financial_configs_tenant ON financial_configs(tenant_id);

DROP TRIGGER IF EXISTS update_financial_configs_updated_at ON financial_configs;
CREATE TRIGGER update_financial_configs_updated_at
  BEFORE UPDATE ON financial_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
