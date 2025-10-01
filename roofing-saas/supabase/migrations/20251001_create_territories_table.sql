-- =====================================================
-- TERRITORIES TABLE
-- Sales territory management with geographic boundaries
-- =====================================================

-- Enable PostGIS extension for geographic data (if not already enabled)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Territories table
CREATE TABLE IF NOT EXISTS territories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT FALSE,

  -- Territory details
  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Geographic boundary (GeoJSON format)
  -- Stores Polygon or MultiPolygon in GeoJSON format
  boundary_data JSONB,

  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),

  -- Stats cache (updated periodically)
  stats_cache JSONB DEFAULT '{}',
  stats_updated_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_territories_tenant_id ON territories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_territories_assigned_to ON territories(assigned_to);
CREATE INDEX IF NOT EXISTS idx_territories_name ON territories(name);
CREATE INDEX IF NOT EXISTS idx_territories_is_deleted ON territories(is_deleted);

-- GIN index for JSONB boundary_data queries
CREATE INDEX IF NOT EXISTS idx_territories_boundary_data ON territories USING GIN (boundary_data);

-- Update trigger
CREATE OR REPLACE FUNCTION update_territories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER territories_updated_at
  BEFORE UPDATE ON territories
  FOR EACH ROW
  EXECUTE FUNCTION update_territories_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view territories in their tenant
CREATE POLICY "Users can view territories in their tenant"
  ON territories
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert territories in their tenant
CREATE POLICY "Users can insert territories in their tenant"
  ON territories
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id
      FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update territories in their tenant
CREATE POLICY "Users can update territories in their tenant"
  ON territories
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete territories in their tenant
CREATE POLICY "Users can delete (soft delete) territories in their tenant"
  ON territories
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE territories IS 'Sales territories with geographic boundaries for organizing contacts and activities';
COMMENT ON COLUMN territories.boundary_data IS 'GeoJSON Polygon or MultiPolygon defining territory boundary';
COMMENT ON COLUMN territories.stats_cache IS 'Cached statistics (contact count, project count, etc.) - updated periodically';
