-- Create dashboards table for custom dashboard builder
-- Migration: 001_create_dashboards_table
-- Created: 2025-12-15

-- Create dashboards table
CREATE TABLE IF NOT EXISTS dashboards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'archived')),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'organization')),
  owner_id UUID NOT NULL,
  role_based BOOLEAN DEFAULT FALSE,
  target_roles TEXT[],
  is_default BOOLEAN DEFAULT FALSE,
  is_template BOOLEAN DEFAULT FALSE,
  template_category TEXT,
  layout JSONB NOT NULL,
  widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  last_modified_by UUID,

  -- Constraints
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_owner FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT fk_last_modified_by FOREIGN KEY (last_modified_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for common queries
CREATE INDEX idx_dashboards_tenant_id ON dashboards(tenant_id);
CREATE INDEX idx_dashboards_owner_id ON dashboards(owner_id);
CREATE INDEX idx_dashboards_status ON dashboards(status);
CREATE INDEX idx_dashboards_is_template ON dashboards(is_template);
CREATE INDEX idx_dashboards_is_default ON dashboards(is_default);
CREATE INDEX idx_dashboards_role_based ON dashboards(role_based);
CREATE INDEX idx_dashboards_created_at ON dashboards(created_at DESC);
CREATE INDEX idx_dashboards_updated_at ON dashboards(updated_at DESC);

-- GIN index for target_roles array
CREATE INDEX idx_dashboards_target_roles ON dashboards USING GIN(target_roles);

-- Full text search index for name and description
CREATE INDEX idx_dashboards_search ON dashboards USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dashboards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_dashboards_updated_at
  BEFORE UPDATE ON dashboards
  FOR EACH ROW
  EXECUTE FUNCTION update_dashboards_updated_at();

-- Row Level Security (RLS) policies
ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own dashboards
CREATE POLICY "Users can view own dashboards"
  ON dashboards
  FOR SELECT
  USING (
    auth.uid() = owner_id
    OR visibility = 'organization'
    OR (visibility = 'team' AND tenant_id = (SELECT tenant_id FROM profiles WHERE user_id = auth.uid()))
  );

-- Policy: Users can insert their own dashboards
CREATE POLICY "Users can create dashboards"
  ON dashboards
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can update their own dashboards
CREATE POLICY "Users can update own dashboards"
  ON dashboards
  FOR UPDATE
  USING (auth.uid() = owner_id);

-- Policy: Users can delete their own dashboards
CREATE POLICY "Users can delete own dashboards"
  ON dashboards
  FOR DELETE
  USING (auth.uid() = owner_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON dashboards TO authenticated;
GRANT SELECT ON dashboards TO anon;

-- Comments
COMMENT ON TABLE dashboards IS 'Custom dashboards with widgets and layouts';
COMMENT ON COLUMN dashboards.tenant_id IS 'Organization/tenant that owns this dashboard';
COMMENT ON COLUMN dashboards.owner_id IS 'User who created and owns the dashboard';
COMMENT ON COLUMN dashboards.role_based IS 'Whether this dashboard is assigned to specific roles';
COMMENT ON COLUMN dashboards.target_roles IS 'Array of role IDs this dashboard applies to';
COMMENT ON COLUMN dashboards.is_default IS 'Whether this is the default dashboard for the target roles';
COMMENT ON COLUMN dashboards.is_template IS 'Whether this is a template that can be duplicated';
COMMENT ON COLUMN dashboards.layout IS 'JSON configuration for dashboard layout (grid settings)';
COMMENT ON COLUMN dashboards.widgets IS 'JSON array of widgets with positions and configurations';
COMMENT ON COLUMN dashboards.settings IS 'JSON object with dashboard-level settings (theme, auto-refresh, etc.)';
