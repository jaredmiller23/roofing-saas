-- Migration: Create lead_scoring_configs table
-- Stores per-tenant lead scoring configuration (rules, thresholds, weights)
-- Rollback: DROP TABLE lead_scoring_configs;

CREATE TABLE IF NOT EXISTS lead_scoring_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  auto_update BOOLEAN NOT NULL DEFAULT true,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  UNIQUE(tenant_id)
);

-- Enable RLS
ALTER TABLE lead_scoring_configs ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY tenant_isolation_select ON lead_scoring_configs
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY tenant_isolation_insert ON lead_scoring_configs
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY tenant_isolation_update ON lead_scoring_configs
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
