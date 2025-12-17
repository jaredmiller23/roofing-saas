-- =====================================================
-- TERRITORIES TABLE
-- Date: 2025-10-03
-- Purpose: Territory management for field rep assignments
-- Critical for: Canvassing organization, coverage tracking, rep accountability
-- =====================================================

-- Territories Table
-- Manages geographic territories assigned to field reps
CREATE TABLE IF NOT EXISTS territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Territory details
  name TEXT NOT NULL,
  description TEXT,

  -- Assignment
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,

  -- Geographic boundary
  -- Stored as GeoJSON polygon for compatibility (can upgrade to PostGIS later)
  boundary JSONB, -- GeoJSON Polygon: {"type": "Polygon", "coordinates": [[[lng,lat],...]]}
  center_latitude DECIMAL(10, 8),
  center_longitude DECIMAL(11, 8),

  -- Visual customization
  color TEXT DEFAULT '#3B82F6', -- Hex color for map visualization
  stroke_color TEXT DEFAULT '#1E40AF',
  opacity DECIMAL(3, 2) DEFAULT 0.3, -- 0.00 to 1.00

  -- Territory status
  status TEXT CHECK (status IN ('active', 'inactive', 'archived')) DEFAULT 'active',

  -- Coverage metrics (auto-calculated)
  total_knocks INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Add territory_id to knocks table (already done in knocks migration, but safe to repeat)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'knocks' AND column_name = 'territory_id'
  ) THEN
    ALTER TABLE knocks ADD COLUMN territory_id UUID REFERENCES territories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_territories_tenant_id ON territories(tenant_id);
CREATE INDEX idx_territories_assigned_to ON territories(assigned_to);
CREATE INDEX idx_territories_status ON territories(status);
CREATE INDEX idx_territories_created_at ON territories(created_at DESC);

-- Spatial index for center point queries
CREATE INDEX idx_territories_center ON territories(center_latitude, center_longitude);

-- GIN index for JSONB boundary queries (if needed)
CREATE INDEX idx_territories_boundary ON territories USING GIN (boundary);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE territories ENABLE ROW LEVEL SECURITY;

-- Users can view territories in their tenant
CREATE POLICY "Users can view territories in their tenant"
  ON territories FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Only admins can create territories (add role check later)
CREATE POLICY "Users can create territories in their tenant"
  ON territories FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Only admins can update territories (add role check later)
CREATE POLICY "Users can update territories in their tenant"
  ON territories FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Only admins can delete territories (add role check later)
CREATE POLICY "Users can delete territories in their tenant"
  ON territories FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_territory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on territories
CREATE TRIGGER territories_updated_at
  BEFORE UPDATE ON territories
  FOR EACH ROW
  EXECUTE FUNCTION update_territory_updated_at();

-- Function to update territory knock count (call after knock insert)
CREATE OR REPLACE FUNCTION update_territory_knock_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.territory_id IS NOT NULL THEN
    UPDATE territories
    SET
      total_knocks = total_knocks + 1,
      last_activity_at = NEW.created_at
    WHERE id = NEW.territory_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update territory stats when knock is added
CREATE TRIGGER knocks_update_territory_stats
  AFTER INSERT ON knocks
  FOR EACH ROW
  EXECUTE FUNCTION update_territory_knock_count();

-- Function to check if a point is within a territory (simplified)
-- Note: This is a basic implementation. For production, consider PostGIS ST_Contains
CREATE OR REPLACE FUNCTION is_point_in_territory(
  p_territory_id UUID,
  p_latitude DECIMAL(10, 8),
  p_longitude DECIMAL(11, 8)
)
RETURNS BOOLEAN AS $$
DECLARE
  boundary_data JSONB;
  coordinates JSONB;
BEGIN
  SELECT boundary INTO boundary_data
  FROM territories
  WHERE id = p_territory_id;

  IF boundary_data IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Extract coordinates array from GeoJSON
  coordinates := boundary_data -> 'coordinates' -> 0;

  -- Simplified point-in-polygon check (ray casting algorithm)
  -- For production, use PostGIS ST_Contains instead
  -- This is a placeholder that always returns TRUE if boundary exists
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get territory stats
CREATE OR REPLACE FUNCTION get_territory_stats(p_territory_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'territory_id', t.id,
    'territory_name', t.name,
    'assigned_to', t.assigned_to,
    'total_knocks', COUNT(k.id),
    'not_home', COUNT(*) FILTER (WHERE k.disposition = 'not_home'),
    'interested', COUNT(*) FILTER (WHERE k.disposition = 'interested'),
    'appointments_set', COUNT(*) FILTER (WHERE k.disposition = 'appointment'),
    'last_knock_at', MAX(k.created_at)
  )
  INTO result
  FROM territories t
  LEFT JOIN knocks k ON k.territory_id = t.id AND k.is_deleted = FALSE
  WHERE t.id = p_territory_id
  GROUP BY t.id, t.name, t.assigned_to;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for active territories with assignment info
CREATE OR REPLACE VIEW active_territories AS
SELECT
  t.*,
  u.full_name as assigned_to_name,
  u.email as assigned_to_email
FROM territories t
LEFT JOIN profiles u ON t.assigned_to = u.id
WHERE t.status = 'active'
  AND t.is_deleted = FALSE
ORDER BY t.name;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE territories IS 'Geographic territories for field rep assignment and canvassing management';
COMMENT ON COLUMN territories.boundary IS 'GeoJSON Polygon defining territory boundary (can upgrade to PostGIS geometry later)';
COMMENT ON COLUMN territories.center_latitude IS 'Territory center point latitude (for map centering)';
COMMENT ON COLUMN territories.center_longitude IS 'Territory center point longitude (for map centering)';
COMMENT ON COLUMN territories.color IS 'Hex color code for map visualization (#3B82F6)';
COMMENT ON COLUMN territories.opacity IS 'Territory fill opacity on map (0.00 to 1.00)';
COMMENT ON COLUMN territories.total_knocks IS 'Auto-calculated total knocks in territory';
COMMENT ON COLUMN territories.last_activity_at IS 'Timestamp of most recent knock in territory';

COMMENT ON VIEW active_territories IS 'Active territories with assigned rep information';

-- =====================================================
-- MIGRATION NOTES
-- =====================================================

COMMENT ON COLUMN territories.boundary IS 'GeoJSON Polygon format. To upgrade to PostGIS:
1. Enable PostGIS extension: CREATE EXTENSION IF NOT EXISTS postgis;
2. Add geometry column: ALTER TABLE territories ADD COLUMN boundary_geom GEOMETRY(Polygon, 4326);
3. Migrate data: UPDATE territories SET boundary_geom = ST_GeomFromGeoJSON(boundary::text);
4. Drop JSON column: ALTER TABLE territories DROP COLUMN boundary;
5. Rename: ALTER TABLE territories RENAME COLUMN boundary_geom TO boundary;
6. Update functions to use ST_Contains instead of is_point_in_territory';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== Territories Table Created ===';
  RAISE NOTICE 'Created territories table with RLS policies';
  RAISE NOTICE 'Created indexes for performance';
  RAISE NOTICE 'Created helper functions and triggers';
  RAISE NOTICE 'Created view for active territories';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Build territory drawing UI (Google Maps Drawing Manager)';
  RAISE NOTICE '2. Implement territory assignment workflow';
  RAISE NOTICE '3. Build territory coverage heatmap';
  RAISE NOTICE '4. Consider upgrading to PostGIS for advanced spatial queries';
  RAISE NOTICE '5. Add role-based permissions for territory management';
END $$;
