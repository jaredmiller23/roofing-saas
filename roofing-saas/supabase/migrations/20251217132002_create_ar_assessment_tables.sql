-- =============================================
-- AR Assessment Tables
-- =============================================
-- Purpose: Create tables for augmented reality damage assessment feature
-- Date: 2025-12-17
-- Author: Claude Code via VEST
-- TaskSpec: VEST-P2-001 (f721f786-eec3-45f0-a5ac-76e4476b8a0e)
-- =============================================

-- =============================================
-- PHASE 1: CREATE AR SESSIONS TABLE
-- =============================================

CREATE TABLE ar_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  project_id UUID REFERENCES projects(id),
  user_id UUID NOT NULL,
  device_info JSONB,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  status TEXT DEFAULT 'in_progress',
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE ar_sessions IS 'AR assessment sessions for field damage documentation';
COMMENT ON COLUMN ar_sessions.tenant_id IS 'Organization tenant identifier for multi-tenant isolation';
COMMENT ON COLUMN ar_sessions.project_id IS 'Associated project (roof job)';
COMMENT ON COLUMN ar_sessions.user_id IS 'Technician conducting AR assessment';
COMMENT ON COLUMN ar_sessions.device_info IS 'Device capabilities and AR metadata';
COMMENT ON COLUMN ar_sessions.status IS 'Session status: in_progress, completed, cancelled';

-- =============================================
-- PHASE 2: CREATE AR MEASUREMENTS TABLE
-- =============================================

CREATE TABLE ar_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES ar_sessions(id) ON DELETE CASCADE,
  measurement_type TEXT NOT NULL, -- 'area', 'length', 'angle'
  value DECIMAL NOT NULL,
  unit TEXT NOT NULL, -- 'sq_ft', 'ft', 'degrees'
  coordinates JSONB, -- 3D coordinates
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE ar_measurements IS 'Measurements captured during AR sessions (area, length, angle)';
COMMENT ON COLUMN ar_measurements.measurement_type IS 'Type: area, length, or angle';
COMMENT ON COLUMN ar_measurements.value IS 'Numeric measurement value';
COMMENT ON COLUMN ar_measurements.unit IS 'Unit of measurement: sq_ft, ft, degrees';
COMMENT ON COLUMN ar_measurements.coordinates IS '3D coordinates where measurement was taken';

-- =============================================
-- PHASE 3: CREATE AR DAMAGE MARKERS TABLE
-- =============================================

CREATE TABLE ar_damage_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES ar_sessions(id) ON DELETE CASCADE,
  damage_type TEXT NOT NULL, -- 'missing_shingle', 'crack', 'dent', etc.
  severity TEXT DEFAULT 'moderate', -- 'minor', 'moderate', 'severe'
  coordinates JSONB,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE ar_damage_markers IS 'Damage markers placed during AR assessment';
COMMENT ON COLUMN ar_damage_markers.damage_type IS 'Type of damage: missing_shingle, crack, dent, etc.';
COMMENT ON COLUMN ar_damage_markers.severity IS 'Severity level: minor, moderate, severe';
COMMENT ON COLUMN ar_damage_markers.coordinates IS '3D coordinates of damage location';
COMMENT ON COLUMN ar_damage_markers.photo_url IS 'Photo evidence of damage';

-- =============================================
-- PHASE 4: ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE ar_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_damage_markers ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PHASE 5: CREATE RLS POLICIES
-- =============================================

-- AR Sessions: Tenant isolation
CREATE POLICY "Users can manage org AR sessions" ON ar_sessions
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- AR Measurements: Access via session tenant
CREATE POLICY "Users can manage AR measurements via session" ON ar_measurements
  FOR ALL USING (
    session_id IN (
      SELECT id FROM ar_sessions WHERE tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );

-- AR Damage Markers: Access via session tenant
CREATE POLICY "Users can manage AR damage markers via session" ON ar_damage_markers
  FOR ALL USING (
    session_id IN (
      SELECT id FROM ar_sessions WHERE tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );

-- =============================================
-- PHASE 6: CREATE PERFORMANCE INDEXES
-- =============================================

-- Tenant filtering (most common query pattern)
CREATE INDEX idx_ar_sessions_tenant ON ar_sessions(tenant_id);

-- Project lookups
CREATE INDEX idx_ar_sessions_project ON ar_sessions(project_id);

-- Session relationships (for joins)
CREATE INDEX idx_ar_measurements_session ON ar_measurements(session_id);
CREATE INDEX idx_ar_damage_markers_session ON ar_damage_markers(session_id);

-- Status filtering
CREATE INDEX idx_ar_sessions_status ON ar_sessions(status);

-- Time-based queries
CREATE INDEX idx_ar_sessions_started_at ON ar_sessions(started_at DESC);

-- =============================================
-- PHASE 7: VALIDATION
-- =============================================

DO $$
DECLARE
  sessions_table_exists BOOLEAN;
  measurements_table_exists BOOLEAN;
  markers_table_exists BOOLEAN;
  sessions_policies_count INTEGER;
  measurements_policies_count INTEGER;
  markers_policies_count INTEGER;
BEGIN
  -- Check tables exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'ar_sessions'
  ) INTO sessions_table_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'ar_measurements'
  ) INTO measurements_table_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'ar_damage_markers'
  ) INTO markers_table_exists;

  -- Check RLS policies exist
  SELECT COUNT(*) INTO sessions_policies_count
  FROM pg_policies WHERE tablename = 'ar_sessions';

  SELECT COUNT(*) INTO measurements_policies_count
  FROM pg_policies WHERE tablename = 'ar_measurements';

  SELECT COUNT(*) INTO markers_policies_count
  FROM pg_policies WHERE tablename = 'ar_damage_markers';

  RAISE NOTICE '';
  RAISE NOTICE '=== AR ASSESSMENT TABLES MIGRATION VALIDATION ===';
  RAISE NOTICE 'ar_sessions table: %', CASE WHEN sessions_table_exists THEN '✓ Created' ELSE '✗ Missing' END;
  RAISE NOTICE 'ar_measurements table: %', CASE WHEN measurements_table_exists THEN '✓ Created' ELSE '✗ Missing' END;
  RAISE NOTICE 'ar_damage_markers table: %', CASE WHEN markers_table_exists THEN '✓ Created' ELSE '✗ Missing' END;
  RAISE NOTICE '';
  RAISE NOTICE 'RLS Policies:';
  RAISE NOTICE '  ar_sessions: % policies', sessions_policies_count;
  RAISE NOTICE '  ar_measurements: % policies', measurements_policies_count;
  RAISE NOTICE '  ar_damage_markers: % policies', markers_policies_count;
  RAISE NOTICE '';

  IF sessions_table_exists AND measurements_table_exists AND markers_table_exists AND
     sessions_policies_count > 0 AND measurements_policies_count > 0 AND markers_policies_count > 0 THEN
    RAISE NOTICE '✓ Migration complete - All AR assessment tables created with RLS';
  ELSE
    RAISE WARNING '✗ Migration incomplete - Check errors above';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Verify TypeScript types in lib/types/ar.ts';
  RAISE NOTICE '2. Test AR assessment feature in app/api/ar/* routes';
  RAISE NOTICE '3. Test tenant isolation via RLS policies';
END $$;

-- =============================================
-- MIGRATION METADATA
-- =============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 20251217132002_create_ar_assessment_tables completed at %', NOW();
END $$;
