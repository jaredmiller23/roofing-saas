-- Migration: Add boundary_polygon column to storm_targeting_areas
-- Applied directly to production on 2026-02-01
--
-- ROOT CAUSE: The original migration (202511030002_storm_targeting_system.sql)
-- defined this column as GEOGRAPHY(POLYGON, 4326) NOT NULL, but the production
-- table was created without it. Either PostGIS wasn't available or the column
-- creation failed silently.
--
-- This fix adds the column as TEXT to store WKT POLYGON strings.
-- The code in extract-addresses/route.ts generates WKT strings via polygonToPostGIS()
-- which works with TEXT storage. If spatial queries are needed later, this can be
-- converted to GEOGRAPHY type.

ALTER TABLE storm_targeting_areas ADD COLUMN IF NOT EXISTS boundary_polygon TEXT;

-- Add comment for documentation
COMMENT ON COLUMN storm_targeting_areas.boundary_polygon IS 'WKT POLYGON string representing the targeting area boundary, e.g., POLYGON((lng1 lat1, lng2 lat2, ...)). Originally intended as GEOGRAPHY type but added as TEXT for compatibility.';
