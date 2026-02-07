-- Migration: Add warranties table for tracking roof warranties
-- Rollback: DROP TABLE IF EXISTS warranties;

CREATE TABLE IF NOT EXISTS warranties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  warranty_type TEXT NOT NULL, -- 'manufacturer', 'workmanship', 'material', 'extended'
  provider TEXT, -- manufacturer or company name
  duration_years INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  terms TEXT,
  document_url TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'expired', 'claimed', 'voided'
  claim_date TIMESTAMPTZ,
  claim_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT false
);

-- RLS
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant warranties"
  ON warranties FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = (SELECT auth.uid()) AND status = 'active'));

CREATE POLICY "Users can insert own tenant warranties"
  ON warranties FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = (SELECT auth.uid()) AND status = 'active'));

CREATE POLICY "Users can update own tenant warranties"
  ON warranties FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = (SELECT auth.uid()) AND status = 'active'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_warranties_tenant_id ON warranties(tenant_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_warranties_project_id ON warranties(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_warranties_end_date ON warranties(end_date) WHERE is_deleted = false AND status = 'active';
