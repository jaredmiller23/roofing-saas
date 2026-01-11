-- Migration: Fix gamification tenant isolation
-- Adds tenant_id to point_rules and achievements tables
-- These tables were created without tenant isolation

-- Add tenant_id to point_rules
ALTER TABLE point_rules
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Add tenant_id to achievements
ALTER TABLE achievements
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Create indexes for tenant filtering
CREATE INDEX IF NOT EXISTS idx_point_rules_tenant_id ON point_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_achievements_tenant_id ON achievements(tenant_id);

-- Update RLS policies for point_rules
DROP POLICY IF EXISTS "Users can view their tenant's point rules" ON point_rules;
CREATE POLICY "Users can view their tenant's point rules" ON point_rules
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert point rules for their tenant" ON point_rules;
CREATE POLICY "Users can insert point rules for their tenant" ON point_rules
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their tenant's point rules" ON point_rules;
CREATE POLICY "Users can update their tenant's point rules" ON point_rules
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their tenant's point rules" ON point_rules;
CREATE POLICY "Users can delete their tenant's point rules" ON point_rules
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

-- Update RLS policies for achievements
DROP POLICY IF EXISTS "Users can view their tenant's achievements" ON achievements;
CREATE POLICY "Users can view their tenant's achievements" ON achievements
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert achievements for their tenant" ON achievements;
CREATE POLICY "Users can insert achievements for their tenant" ON achievements
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their tenant's achievements" ON achievements;
CREATE POLICY "Users can update their tenant's achievements" ON achievements
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their tenant's achievements" ON achievements;
CREATE POLICY "Users can delete their tenant's achievements" ON achievements
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

-- Enable RLS if not already enabled
ALTER TABLE point_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- Note: Existing data will have NULL tenant_id
-- Since gamification is not in production use, this is acceptable
-- New records will require tenant_id via API routes
