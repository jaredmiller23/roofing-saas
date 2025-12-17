-- =====================================================
-- REP LOCATIONS TABLE
-- Date: 2025-10-03
-- Purpose: GPS tracking of field rep locations for live map view
-- Critical for: Manager oversight, territory coverage visualization
-- =====================================================

-- Rep Locations Table
-- Stores GPS location pings from field reps for live tracking
CREATE TABLE IF NOT EXISTS rep_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Location data
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(6, 2), -- GPS accuracy in meters

  -- Metadata
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device_info JSONB, -- Device type, OS, battery level, etc.

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_rep_locations_tenant_id ON rep_locations(tenant_id);
CREATE INDEX idx_rep_locations_user_id ON rep_locations(user_id);
CREATE INDEX idx_rep_locations_recorded_at ON rep_locations(recorded_at DESC);

-- Composite index for recent locations by user
CREATE INDEX idx_rep_locations_user_recent ON rep_locations(user_id, recorded_at DESC);

-- Spatial index for geographic queries (if we need to query by bounds)
CREATE INDEX idx_rep_locations_coords ON rep_locations(latitude, longitude);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE rep_locations ENABLE ROW LEVEL SECURITY;

-- Users can view rep locations in their tenant
CREATE POLICY "Users can view rep locations in their tenant"
  ON rep_locations FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can insert their own location pings
CREATE POLICY "Users can insert their own locations"
  ON rep_locations FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get latest location for a rep
CREATE OR REPLACE FUNCTION get_latest_rep_location(p_user_id UUID)
RETURNS TABLE (
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  recorded_at TIMESTAMPTZ,
  minutes_ago NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rl.latitude,
    rl.longitude,
    rl.recorded_at,
    EXTRACT(EPOCH FROM (NOW() - rl.recorded_at)) / 60 AS minutes_ago
  FROM rep_locations rl
  WHERE rl.user_id = p_user_id
  ORDER BY rl.recorded_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get all active reps (pinged within last 30 minutes)
CREATE OR REPLACE FUNCTION get_active_reps(p_tenant_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  last_ping TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (rl.user_id)
    rl.user_id,
    u.full_name,
    rl.latitude,
    rl.longitude,
    rl.recorded_at AS last_ping
  FROM rep_locations rl
  JOIN profiles u ON rl.user_id = u.id
  WHERE rl.tenant_id = p_tenant_id
    AND rl.recorded_at > NOW() - INTERVAL '30 minutes'
  ORDER BY rl.user_id, rl.recorded_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DATA RETENTION POLICY (Optional)
-- =====================================================

-- Function to clean up old location data (keep last 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_rep_locations()
RETURNS void AS $$
BEGIN
  DELETE FROM rep_locations
  WHERE recorded_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Note: Schedule this with pg_cron or run periodically via cron job:
-- SELECT cron.schedule('cleanup-rep-locations', '0 2 * * *', 'SELECT cleanup_old_rep_locations()');

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE rep_locations IS 'GPS location tracking for field reps (live map view, coverage analysis)';
COMMENT ON COLUMN rep_locations.accuracy IS 'GPS accuracy in meters (from device)';
COMMENT ON COLUMN rep_locations.device_info IS 'JSONB with device metadata (type, OS, battery, etc.)';
COMMENT ON COLUMN rep_locations.recorded_at IS 'Timestamp when GPS location was captured';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== Rep Locations Table Created ===';
  RAISE NOTICE 'Created rep_locations table with RLS policies';
  RAISE NOTICE 'Created indexes for performance';
  RAISE NOTICE 'Created helper functions for latest location and active reps';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Build location tracking service for mobile app';
  RAISE NOTICE '2. Implement live map view for managers';
  RAISE NOTICE '3. Set up data retention policy (7 days)';
  RAISE NOTICE '4. Add battery optimization for location pings';
END $$;
