-- =====================================================
-- STORM TARGETING & BULK LEAD GENERATION SYSTEM
-- =====================================================
-- Created: November 3, 2025
-- Purpose: Enable storm-chasing lead generation with bulk address extraction
--          and property enrichment for competitive advantage over Proline/Enzy
-- =====================================================

-- Enable PostGIS for geography/geometry operations (if not already enabled)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS earthdistance CASCADE;

-- =====================================================
-- 1. STORM EVENTS TABLE (NOAA Data)
-- =====================================================
-- Stores historical storm events from NOAA Storm Events API
-- Used to overlay storm paths on maps for targeting

CREATE TABLE storm_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- NOAA Event Data
  noaa_event_id TEXT UNIQUE, -- NOAA's unique event ID
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL, -- hail, tornado, wind, flood
  magnitude DECIMAL, -- hail size in inches, wind speed in mph, etc

  -- Location Data
  state TEXT NOT NULL,
  county TEXT,
  city TEXT,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),

  -- Path Data (for linear storms like tornadoes/hail paths)
  path_length DECIMAL, -- miles
  path_width DECIMAL, -- miles
  path_polygon GEOGRAPHY(POLYGON, 4326), -- PostGIS geography for spatial queries

  -- Impact Data
  property_damage BIGINT, -- USD
  crop_damage BIGINT, -- USD
  injuries INTEGER DEFAULT 0,
  deaths INTEGER DEFAULT 0,

  -- Description
  event_narrative TEXT,
  episode_narrative TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes
  CONSTRAINT valid_event_type CHECK (event_type IN ('hail', 'tornado', 'thunderstorm_wind', 'flood', 'other'))
);

-- Indexes for performance
CREATE INDEX idx_storm_events_tenant ON storm_events(tenant_id);
CREATE INDEX idx_storm_events_date ON storm_events(event_date DESC);
CREATE INDEX idx_storm_events_state ON storm_events(state);
CREATE INDEX idx_storm_events_type ON storm_events(event_type);
CREATE INDEX idx_storm_events_magnitude ON storm_events(magnitude DESC) WHERE event_type = 'hail';
CREATE INDEX idx_storm_events_location ON storm_events USING GIST(path_polygon); -- Spatial index

-- RLS Policies
ALTER TABLE storm_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view storm events for their tenant"
  ON storm_events FOR SELECT
  USING (tenant_id = auth.uid());

CREATE POLICY "Users can insert storm events for their tenant"
  ON storm_events FOR INSERT
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Users can update storm events for their tenant"
  ON storm_events FOR UPDATE
  USING (tenant_id = auth.uid());

-- =====================================================
-- 2. STORM TARGETING AREAS TABLE (User-Drawn Polygons)
-- =====================================================
-- Stores saved polygons/areas for address extraction
-- Links to storm events for tracking campaigns

CREATE TABLE storm_targeting_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Area Info
  name TEXT NOT NULL, -- e.g., "Davidson Hail - Oct 15 2025"
  description TEXT,
  boundary_polygon GEOGRAPHY(POLYGON, 4326) NOT NULL, -- The drawn area

  -- Association
  storm_event_id UUID REFERENCES storm_events(id) ON DELETE SET NULL,

  -- Statistics
  area_sq_miles DECIMAL,
  address_count INTEGER DEFAULT 0, -- Total addresses extracted
  estimated_properties INTEGER, -- Estimate before extraction

  -- Status
  status TEXT DEFAULT 'draft', -- draft, extracted, enriched, imported

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT valid_status CHECK (status IN ('draft', 'extracting', 'extracted', 'enriching', 'enriched', 'importing', 'imported', 'error'))
);

-- Indexes
CREATE INDEX idx_targeting_areas_tenant ON storm_targeting_areas(tenant_id);
CREATE INDEX idx_targeting_areas_storm ON storm_targeting_areas(storm_event_id);
CREATE INDEX idx_targeting_areas_status ON storm_targeting_areas(status);
CREATE INDEX idx_targeting_areas_location ON storm_targeting_areas USING GIST(boundary_polygon);
CREATE INDEX idx_targeting_areas_created ON storm_targeting_areas(created_at DESC);

-- RLS Policies
ALTER TABLE storm_targeting_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view targeting areas for their tenant"
  ON storm_targeting_areas FOR SELECT
  USING (tenant_id = auth.uid());

CREATE POLICY "Users can create targeting areas for their tenant"
  ON storm_targeting_areas FOR INSERT
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Users can update their targeting areas"
  ON storm_targeting_areas FOR UPDATE
  USING (tenant_id = auth.uid());

CREATE POLICY "Users can delete their targeting areas"
  ON storm_targeting_areas FOR DELETE
  USING (tenant_id = auth.uid());

-- =====================================================
-- 3. BULK IMPORT JOBS TABLE (Background Processing)
-- =====================================================
-- Tracks bulk import operations for address extraction and enrichment
-- Enables background processing and progress tracking

CREATE TABLE bulk_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Association
  targeting_area_id UUID REFERENCES storm_targeting_areas(id) ON DELETE CASCADE,

  -- Job Info
  job_type TEXT NOT NULL, -- extract_addresses, enrich_properties, import_contacts
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed, cancelled

  -- Progress Tracking
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  successful_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  skipped_items INTEGER DEFAULT 0, -- duplicates, invalid data

  -- For import_contacts jobs
  created_contacts INTEGER DEFAULT 0,
  updated_contacts INTEGER DEFAULT 0,
  duplicate_contacts INTEGER DEFAULT 0,

  -- Error Handling
  error_message TEXT,
  error_log JSONB, -- Array of error objects
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_completion_at TIMESTAMPTZ,

  -- Import Settings (for import_contacts job)
  import_settings JSONB, -- { source, tags, assigned_to, pipeline_stage, etc }

  -- Results
  results JSONB, -- Detailed results data

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT valid_job_type CHECK (job_type IN ('extract_addresses', 'enrich_properties', 'import_contacts')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'))
);

-- Indexes
CREATE INDEX idx_import_jobs_tenant ON bulk_import_jobs(tenant_id);
CREATE INDEX idx_import_jobs_area ON bulk_import_jobs(targeting_area_id);
CREATE INDEX idx_import_jobs_status ON bulk_import_jobs(status);
CREATE INDEX idx_import_jobs_type ON bulk_import_jobs(job_type);
CREATE INDEX idx_import_jobs_created ON bulk_import_jobs(created_at DESC);

-- RLS Policies
ALTER TABLE bulk_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view jobs for their tenant"
  ON bulk_import_jobs FOR SELECT
  USING (tenant_id = auth.uid());

CREATE POLICY "Users can create jobs for their tenant"
  ON bulk_import_jobs FOR INSERT
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Users can update their jobs"
  ON bulk_import_jobs FOR UPDATE
  USING (tenant_id = auth.uid());

-- =====================================================
-- 4. PROPERTY ENRICHMENT CACHE TABLE
-- =====================================================
-- Caches enriched property data to avoid redundant API calls
-- Saves costs and improves performance

CREATE TABLE property_enrichment_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Address Identification (normalized)
  address_hash TEXT UNIQUE NOT NULL, -- MD5 hash of normalized address
  full_address TEXT NOT NULL,
  street_address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),

  -- Data Provider
  provider TEXT NOT NULL, -- propertyradar, batchdata, county_assessor, manual
  provider_id TEXT, -- External ID from provider

  -- Owner Information
  owner_name TEXT,
  owner_phone TEXT,
  owner_email TEXT,
  owner_mailing_address TEXT,

  -- Property Characteristics
  property_type TEXT, -- residential, commercial, multi-family
  year_built INTEGER,
  square_footage INTEGER,
  bedrooms INTEGER,
  bathrooms DECIMAL(3,1),
  lot_size DECIMAL,
  stories INTEGER,

  -- Financial Data
  assessed_value BIGINT,
  market_value BIGINT,
  last_sale_date DATE,
  last_sale_price BIGINT,
  equity_estimate BIGINT,
  mortgage_balance BIGINT,

  -- Roof-Specific Data
  roof_material TEXT,
  roof_age INTEGER,
  roof_condition TEXT,

  -- Full Property Data (raw from provider)
  property_data JSONB,

  -- Cache Management
  enriched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '6 months'), -- Refresh after 6 months
  hit_count INTEGER DEFAULT 0, -- Track cache usage
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_property_cache_hash ON property_enrichment_cache(address_hash);
CREATE INDEX idx_property_cache_address ON property_enrichment_cache(full_address);
CREATE INDEX idx_property_cache_location ON property_enrichment_cache(latitude, longitude);
CREATE INDEX idx_property_cache_expires ON property_enrichment_cache(expires_at);
CREATE INDEX idx_property_cache_provider ON property_enrichment_cache(provider);

-- No RLS - This is a shared cache table (tenant filtering done in application logic)

-- =====================================================
-- 5. EXTRACTED ADDRESSES TABLE (Temporary Storage)
-- =====================================================
-- Stores extracted addresses before enrichment and import
-- Acts as staging area for review and filtering

CREATE TABLE extracted_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Association
  targeting_area_id UUID NOT NULL REFERENCES storm_targeting_areas(id) ON DELETE CASCADE,
  bulk_import_job_id UUID REFERENCES bulk_import_jobs(id) ON DELETE CASCADE,

  -- Address Data
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  full_address TEXT,
  street_address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,

  -- Property Type (from OSM data)
  osm_property_type TEXT, -- residential, commercial, apartments, etc
  osm_building_type TEXT, -- house, detached, terrace, etc

  -- Enrichment Status
  is_enriched BOOLEAN DEFAULT FALSE,
  enrichment_cache_id UUID REFERENCES property_enrichment_cache(id),

  -- Selection for Import
  is_selected BOOLEAN DEFAULT TRUE, -- User can deselect addresses before import
  skip_reason TEXT, -- commercial, duplicate, invalid, etc

  -- Duplicate Detection
  is_duplicate BOOLEAN DEFAULT FALSE,
  duplicate_contact_id UUID, -- If matches existing contact

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_extracted_addresses_tenant ON extracted_addresses(tenant_id);
CREATE INDEX idx_extracted_addresses_area ON extracted_addresses(targeting_area_id);
CREATE INDEX idx_extracted_addresses_job ON extracted_addresses(bulk_import_job_id);
CREATE INDEX idx_extracted_addresses_location ON extracted_addresses(latitude, longitude);
CREATE INDEX idx_extracted_addresses_enriched ON extracted_addresses(is_enriched);
CREATE INDEX idx_extracted_addresses_selected ON extracted_addresses(is_selected);

-- RLS Policies
ALTER TABLE extracted_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view extracted addresses for their tenant"
  ON extracted_addresses FOR SELECT
  USING (tenant_id = auth.uid());

CREATE POLICY "Users can insert extracted addresses for their tenant"
  ON extracted_addresses FOR INSERT
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Users can update their extracted addresses"
  ON extracted_addresses FOR UPDATE
  USING (tenant_id = auth.uid());

CREATE POLICY "Users can delete their extracted addresses"
  ON extracted_addresses FOR DELETE
  USING (tenant_id = auth.uid());

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function: Calculate area of polygon in square miles
CREATE OR REPLACE FUNCTION calculate_polygon_area_sq_miles(poly GEOGRAPHY)
RETURNS DECIMAL AS $$
BEGIN
  -- ST_Area returns square meters, convert to square miles
  RETURN ST_Area(poly) / 2589988.11; -- 1 sq mile = 2,589,988.11 sq meters
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Check if point is within targeting area
CREATE OR REPLACE FUNCTION point_in_targeting_area(
  lat DECIMAL,
  lng DECIMAL,
  area_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  area_polygon GEOGRAPHY;
  point_geo GEOGRAPHY;
BEGIN
  -- Get the area polygon
  SELECT boundary_polygon INTO area_polygon
  FROM storm_targeting_areas
  WHERE id = area_id;

  IF area_polygon IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Create point geography
  point_geo := ST_SetSRID(ST_MakePoint(lng, lat), 4326)::GEOGRAPHY;

  -- Check containment
  RETURN ST_Covers(area_polygon, point_geo);
END;
$$ LANGUAGE plpgsql;

-- Function: Count addresses in targeting area (estimate)
CREATE OR REPLACE FUNCTION estimate_addresses_in_area(area_id UUID)
RETURNS INTEGER AS $$
DECLARE
  area_sq_miles DECIMAL;
  estimated_count INTEGER;
BEGIN
  -- Get area size
  SELECT calculate_polygon_area_sq_miles(boundary_polygon)
  INTO area_sq_miles
  FROM storm_targeting_areas
  WHERE id = area_id;

  -- Rough estimate: Tennessee avg ~50 residential properties per sq mile
  -- Urban areas: 200-500, Suburban: 50-200, Rural: 10-50
  -- Using conservative 75 per sq mile
  estimated_count := ROUND(area_sq_miles * 75);

  RETURN estimated_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Update targeting area statistics
CREATE OR REPLACE FUNCTION update_targeting_area_stats(area_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE storm_targeting_areas
  SET
    address_count = (
      SELECT COUNT(*)
      FROM extracted_addresses
      WHERE targeting_area_id = area_id
    ),
    estimated_properties = estimate_addresses_in_area(area_id),
    updated_at = NOW()
  WHERE id = area_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Update bulk import job progress
CREATE OR REPLACE FUNCTION update_import_job_progress(
  job_id UUID,
  processed INTEGER DEFAULT NULL,
  successful INTEGER DEFAULT NULL,
  failed INTEGER DEFAULT NULL,
  skipped INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE bulk_import_jobs
  SET
    processed_items = COALESCE(processed, processed_items),
    successful_items = COALESCE(successful, successful_items),
    failed_items = COALESCE(failed, failed_items),
    skipped_items = COALESCE(skipped, skipped_items),
    updated_at = NOW()
  WHERE id = job_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_storm_events_updated_at
  BEFORE UPDATE ON storm_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_targeting_areas_updated_at
  BEFORE UPDATE ON storm_targeting_areas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_import_jobs_updated_at
  BEFORE UPDATE ON bulk_import_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_extracted_addresses_updated_at
  BEFORE UPDATE ON extracted_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Uncomment to add sample NOAA storm event for Tennessee
/*
INSERT INTO storm_events (
  tenant_id,
  noaa_event_id,
  event_date,
  event_type,
  magnitude,
  state,
  county,
  city,
  latitude,
  longitude,
  path_length,
  path_width,
  property_damage,
  injuries,
  deaths,
  event_narrative
) VALUES (
  auth.uid(), -- Will fail without proper context, replace with actual UUID
  'TN-DAVIDSON-2025-HAIL-001',
  '2025-10-15',
  'hail',
  2.0, -- 2 inch hail
  'TN',
  'Davidson',
  'Nashville',
  36.1627,
  -86.7816,
  10.5, -- miles
  1.2, -- miles
  5000000, -- $5M damage
  3,
  0,
  'Large hail up to 2 inches in diameter caused significant roof damage across Davidson County.'
);
*/

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- Grant permissions (if using service role)
-- GRANT ALL ON storm_events TO authenticated;
-- GRANT ALL ON storm_targeting_areas TO authenticated;
-- GRANT ALL ON bulk_import_jobs TO authenticated;
-- GRANT ALL ON extracted_addresses TO authenticated;
-- GRANT SELECT ON property_enrichment_cache TO authenticated;

COMMENT ON TABLE storm_events IS 'Stores NOAA storm event data for overlay and targeting';
COMMENT ON TABLE storm_targeting_areas IS 'User-drawn polygons for bulk address extraction';
COMMENT ON TABLE bulk_import_jobs IS 'Background job tracking for address extraction and import';
COMMENT ON TABLE property_enrichment_cache IS 'Cached property data to reduce API costs';
COMMENT ON TABLE extracted_addresses IS 'Staging table for addresses before import to contacts';
