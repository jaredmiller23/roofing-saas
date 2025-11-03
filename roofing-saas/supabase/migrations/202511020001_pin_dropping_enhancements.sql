-- =====================================================
-- PIN DROPPING ENHANCEMENTS
-- Date: 2025-11-02
-- Purpose: Enhance knocks table for advanced pin dropping & lead generation
-- Features: Pin types, sync status, damage scoring, enrichment tracking
-- =====================================================

-- Add new columns to knocks table for pin dropping
ALTER TABLE knocks ADD COLUMN IF NOT EXISTS pin_type VARCHAR(50) DEFAULT 'knock'
  CHECK (pin_type IN ('knock', 'quick_pin', 'lead_pin', 'interested_pin'));

ALTER TABLE knocks ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) DEFAULT 'synced'
  CHECK (sync_status IN ('pending', 'syncing', 'synced', 'error'));

ALTER TABLE knocks ADD COLUMN IF NOT EXISTS damage_score INTEGER DEFAULT 0
  CHECK (damage_score >= 0 AND damage_score <= 100);

ALTER TABLE knocks ADD COLUMN IF NOT EXISTS enrichment_source VARCHAR(50);

ALTER TABLE knocks ADD COLUMN IF NOT EXISTS last_sync_attempt TIMESTAMPTZ;

ALTER TABLE knocks ADD COLUMN IF NOT EXISTS sync_error TEXT;

ALTER TABLE knocks ADD COLUMN IF NOT EXISTS owner_name TEXT;

ALTER TABLE knocks ADD COLUMN IF NOT EXISTS property_data JSONB DEFAULT '{}'::jsonb;

-- =====================================================
-- NEW INDEXES FOR PIN DROPPING
-- =====================================================

-- Index for sync status queries
CREATE INDEX IF NOT EXISTS idx_knocks_sync_status ON knocks(sync_status)
  WHERE sync_status != 'synced';

-- Index for damage score (high priority leads)
CREATE INDEX IF NOT EXISTS idx_knocks_damage_score ON knocks(damage_score DESC)
  WHERE damage_score > 0;

-- Spatial index for duplicate detection (uses earthdistance extension)
-- This enables fast "find pins within 25m" queries
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

CREATE INDEX IF NOT EXISTS idx_knocks_location_earth ON knocks
  USING GIST (ll_to_earth(latitude, longitude));

-- =====================================================
-- PIN-SPECIFIC VIEWS
-- =====================================================

-- View for pins pending sync (offline queue)
CREATE OR REPLACE VIEW pins_pending_sync AS
SELECT
  id,
  pin_type,
  latitude,
  longitude,
  address,
  disposition,
  owner_name,
  notes,
  photos,
  sync_status,
  sync_error,
  last_sync_attempt,
  created_at,
  user_id,
  tenant_id
FROM knocks
WHERE sync_status IN ('pending', 'error')
  AND is_deleted = FALSE
ORDER BY created_at ASC;

-- View for high-value pins (storm damage scoring)
CREATE OR REPLACE VIEW high_priority_pins AS
SELECT
  k.*,
  c.first_name || ' ' || COALESCE(c.last_name, '') as contact_name,
  c.phone as contact_phone,
  c.email as contact_email,
  u.full_name as rep_name
FROM knocks k
LEFT JOIN contacts c ON k.contact_id = c.id
LEFT JOIN profiles u ON k.user_id = u.id
WHERE k.damage_score >= 60
  AND k.is_deleted = FALSE
ORDER BY k.damage_score DESC, k.created_at DESC;

-- =====================================================
-- HELPER FUNCTIONS FOR PIN DROPPING
-- =====================================================

-- Function to check for duplicate pins within radius (prevents double-knocking)
CREATE OR REPLACE FUNCTION check_duplicate_pin(
  p_latitude DECIMAL(10, 8),
  p_longitude DECIMAL(11, 8),
  p_radius_meters INTEGER DEFAULT 25,
  p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE (
  exists BOOLEAN,
  existing_knock_id UUID,
  existing_disposition TEXT,
  existing_user_name TEXT,
  distance_meters NUMERIC,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE as exists,
    k.id AS existing_knock_id,
    k.disposition AS existing_disposition,
    u.full_name AS existing_user_name,
    earth_distance(
      ll_to_earth(p_latitude, p_longitude),
      ll_to_earth(k.latitude, k.longitude)
    )::NUMERIC AS distance_meters,
    k.created_at
  FROM knocks k
  LEFT JOIN profiles u ON k.user_id = u.id
  WHERE k.is_deleted = FALSE
    AND (p_tenant_id IS NULL OR k.tenant_id = p_tenant_id)
    AND earth_box(ll_to_earth(p_latitude, p_longitude), p_radius_meters) @> ll_to_earth(k.latitude, k.longitude)
    AND earth_distance(
      ll_to_earth(p_latitude, p_longitude),
      ll_to_earth(k.latitude, k.longitude)
    ) <= p_radius_meters
  ORDER BY distance_meters
  LIMIT 1;

  -- If no results, return FALSE
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::NUMERIC, NULL::TIMESTAMPTZ;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate storm damage probability score
CREATE OR REPLACE FUNCTION calculate_damage_score(
  p_knock_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_property_data JSONB;
  v_roof_age INTEGER;
  v_nearby_hail_count INTEGER;
BEGIN
  -- Get property data for this knock
  SELECT property_data INTO v_property_data
  FROM knocks
  WHERE id = p_knock_id;

  -- Score based on roof age (if available)
  IF v_property_data ? 'year_built' THEN
    v_roof_age := EXTRACT(YEAR FROM CURRENT_DATE) - (v_property_data->>'year_built')::INTEGER;

    IF v_roof_age >= 20 THEN
      v_score := v_score + 30;
    ELSIF v_roof_age >= 15 THEN
      v_score := v_score + 20;
    ELSIF v_roof_age >= 10 THEN
      v_score := v_score + 10;
    END IF;
  END IF;

  -- Score based on property value (if available)
  IF v_property_data ? 'estimated_value' THEN
    IF (v_property_data->>'estimated_value')::DECIMAL >= 300000 THEN
      v_score := v_score + 15;
    END IF;
  END IF;

  -- TODO: Add weather event proximity scoring when weather_events table is created
  -- This would add points based on nearby hail/storm reports

  -- Cap score at 100
  RETURN LEAST(v_score, 100);
END;
$$ LANGUAGE plpgsql;

-- Function to create contact from pin
CREATE OR REPLACE FUNCTION create_contact_from_pin(
  p_knock_id UUID,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_knock RECORD;
  v_contact_id UUID;
  v_first_name TEXT;
  v_last_name TEXT;
BEGIN
  -- Get knock data
  SELECT * INTO v_knock
  FROM knocks
  WHERE id = p_knock_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Knock not found: %', p_knock_id;
  END IF;

  -- Parse owner name if provided via property enrichment
  IF p_first_name IS NULL AND v_knock.owner_name IS NOT NULL THEN
    -- Simple name parsing (first word = first name, rest = last name)
    v_first_name := split_part(v_knock.owner_name, ' ', 1);
    v_last_name := trim(substring(v_knock.owner_name from position(' ' in v_knock.owner_name)));
  ELSE
    v_first_name := p_first_name;
    v_last_name := p_last_name;
  END IF;

  -- Create contact
  INSERT INTO contacts (
    tenant_id,
    first_name,
    last_name,
    phone,
    email,
    address_street,
    address_city,
    address_state,
    address_zip,
    latitude,
    longitude,
    source,
    stage,
    notes,
    created_by
  )
  VALUES (
    v_knock.tenant_id,
    v_first_name,
    v_last_name,
    COALESCE(p_phone, (v_knock.property_data->>'phone')::TEXT),
    COALESCE(p_email, (v_knock.property_data->>'email')::TEXT),
    v_knock.address_street,
    v_knock.address_city,
    v_knock.address_state,
    v_knock.address_zip,
    v_knock.latitude,
    v_knock.longitude,
    'door-knock',
    CASE v_knock.disposition
      WHEN 'interested' THEN 'qualified'
      WHEN 'appointment' THEN 'proposal'
      ELSE 'new'
    END,
    'Created from door knock on ' || v_knock.created_at::DATE ||
      CASE WHEN v_knock.notes IS NOT NULL
        THEN E'\n\nOriginal notes: ' || v_knock.notes
        ELSE ''
      END,
    v_knock.user_id
  )
  RETURNING id INTO v_contact_id;

  -- Update knock to link to contact
  UPDATE knocks
  SET
    contact_id = v_contact_id,
    contact_created = TRUE
  WHERE id = p_knock_id;

  RETURN v_contact_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN knocks.pin_type IS 'Type of pin: knock (traditional door knock), quick_pin (map click), lead_pin (enriched with property data), interested_pin (high-value prospect)';
COMMENT ON COLUMN knocks.sync_status IS 'Offline sync status: pending (not synced), syncing (in progress), synced (complete), error (failed)';
COMMENT ON COLUMN knocks.damage_score IS 'Storm damage probability score 0-100 (higher = more likely to need roof work)';
COMMENT ON COLUMN knocks.enrichment_source IS 'Property data source: county_assessor, propertyradar, batchdata, manual, etc.';
COMMENT ON COLUMN knocks.owner_name IS 'Property owner name from enrichment data';
COMMENT ON COLUMN knocks.property_data IS 'Full property enrichment data (year_built, sq_ft, value, etc.) as JSONB';

COMMENT ON VIEW pins_pending_sync IS 'Pins that need to be synced from offline queue';
COMMENT ON VIEW high_priority_pins IS 'Pins with high damage score (60+) - priority storm leads';

COMMENT ON FUNCTION check_duplicate_pin IS 'Check if a pin already exists within specified radius (default 25m) to prevent duplicate knocks';
COMMENT ON FUNCTION calculate_damage_score IS 'Calculate storm damage probability score based on roof age, property value, weather events';
COMMENT ON FUNCTION create_contact_from_pin IS 'Create a contact record from a knock/pin, auto-parsing owner name and copying location data';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== Pin Dropping Enhancements Complete ===';
  RAISE NOTICE 'Added columns: pin_type, sync_status, damage_score, enrichment_source, owner_name, property_data';
  RAISE NOTICE 'Created spatial index using earthdistance for duplicate detection';
  RAISE NOTICE 'Created views: pins_pending_sync, high_priority_pins';
  RAISE NOTICE 'Created functions: check_duplicate_pin, calculate_damage_score, create_contact_from_pin';
  RAISE NOTICE '';
  RAISE NOTICE 'Ready for Phase 1A implementation:';
  RAISE NOTICE '1. HousePinDropper component (click-to-drop pins)';
  RAISE NOTICE '2. Reverse geocoding API endpoint';
  RAISE NOTICE '3. Pin popup with quick dispositions';
  RAISE NOTICE '4. Offline sync management';
  RAISE NOTICE '5. Contact creation from pins';
END $$;
