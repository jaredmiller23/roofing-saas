-- =====================================================
-- KNOCKS TABLE
-- Date: 2025-10-03
-- Purpose: Door-knocking activity tracking with map visualization
-- Critical for: Enzy replacement, canvassing management, territory coverage
-- =====================================================

-- Knocks Table
-- Tracks all door-knocking attempts with location, disposition, and outcomes
CREATE TABLE IF NOT EXISTS knocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- User and location
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,

  -- Address information
  address TEXT,
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,

  -- Knock outcome
  disposition TEXT CHECK (disposition IN (
    'not_home',
    'interested',
    'not_interested',
    'appointment',
    'callback',
    'do_not_contact',
    'already_customer'
  )),

  -- Notes and media
  notes TEXT,
  photos TEXT[], -- Array of Supabase Storage URLs
  voice_memo_url TEXT, -- Optional voice note

  -- Follow-up
  appointment_date TIMESTAMPTZ,
  callback_date DATE,
  follow_up_notes TEXT,

  -- Contact creation
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL, -- Link if contact created
  contact_created BOOLEAN DEFAULT FALSE,

  -- Territory tracking
  territory_id UUID REFERENCES territories(id) ON DELETE SET NULL,

  -- Device info
  device_location_accuracy DECIMAL(6, 2), -- GPS accuracy in meters
  knocked_from TEXT, -- 'mobile', 'tablet'

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_knocks_tenant_id ON knocks(tenant_id);
CREATE INDEX idx_knocks_user_id ON knocks(user_id);
CREATE INDEX idx_knocks_disposition ON knocks(disposition);
CREATE INDEX idx_knocks_contact_id ON knocks(contact_id);
CREATE INDEX idx_knocks_territory_id ON knocks(territory_id);
CREATE INDEX idx_knocks_created_at ON knocks(created_at DESC);

-- Spatial index for map queries
CREATE INDEX idx_knocks_coords ON knocks(latitude, longitude);

-- Composite index for user's recent knocks
CREATE INDEX idx_knocks_user_recent ON knocks(user_id, created_at DESC);

-- Index for follow-up queries
CREATE INDEX idx_knocks_appointments ON knocks(appointment_date) WHERE appointment_date IS NOT NULL;
CREATE INDEX idx_knocks_callbacks ON knocks(callback_date) WHERE callback_date IS NOT NULL;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE knocks ENABLE ROW LEVEL SECURITY;

-- Users can view knocks in their tenant
CREATE POLICY "Users can view knocks in their tenant"
  ON knocks FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can create knocks in their tenant
CREATE POLICY "Users can create knocks"
  ON knocks FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can update their own knocks
CREATE POLICY "Users can update their own knocks"
  ON knocks FOR UPDATE
  USING (
    user_id = auth.uid()
    AND tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can delete their own knocks
CREATE POLICY "Users can delete their own knocks"
  ON knocks FOR DELETE
  USING (
    user_id = auth.uid()
    AND tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for appointments set from knocks
CREATE OR REPLACE VIEW knock_appointments AS
SELECT
  k.*,
  c.first_name || ' ' || c.last_name as contact_name,
  u.full_name as rep_name,
  t.name as territory_name
FROM knocks k
LEFT JOIN contacts c ON k.contact_id = c.id
LEFT JOIN profiles u ON k.user_id = u.id
LEFT JOIN territories t ON k.territory_id = t.id
WHERE k.disposition = 'appointment'
  AND k.appointment_date IS NOT NULL
  AND k.is_deleted = FALSE
ORDER BY k.appointment_date ASC;

-- View for interested prospects needing follow-up
CREATE OR REPLACE VIEW knock_follow_ups AS
SELECT
  k.*,
  c.first_name || ' ' || c.last_name as contact_name,
  u.full_name as rep_name
FROM knocks k
LEFT JOIN contacts c ON k.contact_id = c.id
LEFT JOIN profiles u ON k.user_id = u.id
WHERE k.disposition IN ('interested', 'callback')
  AND k.contact_created = FALSE
  AND k.is_deleted = FALSE
ORDER BY k.created_at DESC;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get knock stats by user
CREATE OR REPLACE FUNCTION get_user_knock_stats(p_user_id UUID, p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  result JSON;
  start_filter TIMESTAMPTZ;
  end_filter TIMESTAMPTZ;
BEGIN
  start_filter := COALESCE(p_start_date::TIMESTAMPTZ, NOW() - INTERVAL '30 days');
  end_filter := COALESCE(p_end_date::TIMESTAMPTZ, NOW());

  SELECT json_build_object(
    'total_knocks', COUNT(*),
    'not_home', COUNT(*) FILTER (WHERE disposition = 'not_home'),
    'interested', COUNT(*) FILTER (WHERE disposition = 'interested'),
    'not_interested', COUNT(*) FILTER (WHERE disposition = 'not_interested'),
    'appointments_set', COUNT(*) FILTER (WHERE disposition = 'appointment'),
    'contacts_created', COUNT(*) FILTER (WHERE contact_created = TRUE),
    'conversion_rate', ROUND(
      (COUNT(*) FILTER (WHERE disposition IN ('interested', 'appointment'))::DECIMAL /
       NULLIF(COUNT(*), 0) * 100), 2
    )
  )
  INTO result
  FROM knocks
  WHERE user_id = p_user_id
    AND created_at BETWEEN start_filter AND end_filter
    AND is_deleted = FALSE;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get knocks within a radius (for territory coverage)
CREATE OR REPLACE FUNCTION get_knocks_within_radius(
  p_latitude DECIMAL(10, 8),
  p_longitude DECIMAL(11, 8),
  p_radius_meters INTEGER DEFAULT 1000
)
RETURNS TABLE (
  knock_id UUID,
  user_id UUID,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  disposition TEXT,
  distance_meters NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id AS knock_id,
    k.user_id,
    k.latitude,
    k.longitude,
    k.disposition,
    (
      6371000 * acos(
        cos(radians(p_latitude)) *
        cos(radians(k.latitude)) *
        cos(radians(k.longitude) - radians(p_longitude)) +
        sin(radians(p_latitude)) *
        sin(radians(k.latitude))
      )
    )::NUMERIC AS distance_meters
  FROM knocks k
  WHERE k.is_deleted = FALSE
    AND (
      6371000 * acos(
        cos(radians(p_latitude)) *
        cos(radians(k.latitude)) *
        cos(radians(k.longitude) - radians(p_longitude)) +
        sin(radians(p_latitude)) *
        sin(radians(k.latitude))
      )
    ) <= p_radius_meters
  ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE knocks IS 'Door-knocking activity tracking with GPS location and outcomes (Enzy replacement)';
COMMENT ON COLUMN knocks.disposition IS 'Outcome: not_home, interested, not_interested, appointment, callback, do_not_contact, already_customer';
COMMENT ON COLUMN knocks.photos IS 'Array of photo URLs from door/property (Supabase Storage)';
COMMENT ON COLUMN knocks.contact_created IS 'Whether a contact record was created from this knock';
COMMENT ON COLUMN knocks.device_location_accuracy IS 'GPS accuracy in meters from mobile device';

COMMENT ON VIEW knock_appointments IS 'Knocks that resulted in scheduled appointments';
COMMENT ON VIEW knock_follow_ups IS 'Interested prospects that need contact creation or follow-up';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== Knocks Table Created ===';
  RAISE NOTICE 'Created knocks table with RLS policies';
  RAISE NOTICE 'Created indexes for performance and spatial queries';
  RAISE NOTICE 'Created views for appointments and follow-ups';
  RAISE NOTICE 'Created helper functions for stats and radius queries';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Build map-based knock logging UI';
  RAISE NOTICE '2. Implement photo upload from mobile';
  RAISE NOTICE '3. Add address geocoding (reverse lookup)';
  RAISE NOTICE '4. Build knock heatmap visualization';
  RAISE NOTICE '5. Create knock-to-contact conversion flow';
END $$;
