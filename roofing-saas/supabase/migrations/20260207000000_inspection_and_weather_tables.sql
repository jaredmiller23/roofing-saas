-- Project Inspections and Weather Reports tables
-- Used by the packet generator for insurance claims documentation
-- Idempotent: safe to re-run

-- ============================================================
-- Table 1: project_inspections
-- Stores inspection records for projects
-- ============================================================

CREATE TABLE IF NOT EXISTS project_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Inspection details
  inspection_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  inspector_name TEXT,
  inspector_id UUID REFERENCES auth.users(id),
  inspection_type TEXT NOT NULL DEFAULT 'standard', -- 'standard', 'initial', 'follow_up', 'final'

  -- Damage assessment
  damage_summary TEXT,
  affected_areas TEXT[] DEFAULT '{}',
  test_square_count INTEGER,
  hail_hits_per_square INTEGER,
  damage_level TEXT, -- 'none', 'minor', 'moderate', 'severe', 'catastrophic'

  -- Additional data
  notes TEXT,
  metadata JSONB DEFAULT '{}',

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_inspections_tenant_id
  ON project_inspections(tenant_id);

CREATE INDEX IF NOT EXISTS idx_project_inspections_project_id
  ON project_inspections(project_id);

CREATE INDEX IF NOT EXISTS idx_project_inspections_not_deleted
  ON project_inspections(tenant_id) WHERE NOT is_deleted;

-- RLS
ALTER TABLE project_inspections ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'project_inspections' AND policyname = 'Users can view inspections in their tenant'
  ) THEN
    CREATE POLICY "Users can view inspections in their tenant"
      ON project_inspections FOR SELECT
      USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'project_inspections' AND policyname = 'Users can create inspections in their tenant'
  ) THEN
    CREATE POLICY "Users can create inspections in their tenant"
      ON project_inspections FOR INSERT
      WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'project_inspections' AND policyname = 'Users can update inspections in their tenant'
  ) THEN
    CREATE POLICY "Users can update inspections in their tenant"
      ON project_inspections FOR UPDATE
      USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'project_inspections' AND policyname = 'Users can delete inspections in their tenant'
  ) THEN
    CREATE POLICY "Users can delete inspections in their tenant"
      ON project_inspections FOR DELETE
      USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Updated_at trigger
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_project_inspections_updated_at'
  ) THEN
    CREATE TRIGGER set_project_inspections_updated_at
      BEFORE UPDATE ON project_inspections
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- ============================================================
-- Table 2: weather_reports
-- Stores generated weather/causation reports per project
-- ============================================================

CREATE TABLE IF NOT EXISTS weather_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Report content
  causation_narrative TEXT,
  evidence_score INTEGER, -- 0-100
  events JSONB DEFAULT '[]', -- Array of weather events

  -- Source data
  storm_event_id UUID, -- Reference to storm_events if applicable
  data_sources TEXT[] DEFAULT '{}', -- 'nws', 'hail_catalog', 'noaa', etc.

  -- PDF export
  pdf_url TEXT,

  -- Audit
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_weather_reports_tenant_id
  ON weather_reports(tenant_id);

CREATE INDEX IF NOT EXISTS idx_weather_reports_project_id
  ON weather_reports(project_id);

CREATE INDEX IF NOT EXISTS idx_weather_reports_not_deleted
  ON weather_reports(tenant_id) WHERE NOT is_deleted;

-- RLS
ALTER TABLE weather_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'weather_reports' AND policyname = 'Users can view weather reports in their tenant'
  ) THEN
    CREATE POLICY "Users can view weather reports in their tenant"
      ON weather_reports FOR SELECT
      USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'weather_reports' AND policyname = 'Users can create weather reports in their tenant'
  ) THEN
    CREATE POLICY "Users can create weather reports in their tenant"
      ON weather_reports FOR INSERT
      WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'weather_reports' AND policyname = 'Users can update weather reports in their tenant'
  ) THEN
    CREATE POLICY "Users can update weather reports in their tenant"
      ON weather_reports FOR UPDATE
      USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'weather_reports' AND policyname = 'Users can delete weather reports in their tenant'
  ) THEN
    CREATE POLICY "Users can delete weather reports in their tenant"
      ON weather_reports FOR DELETE
      USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Updated_at trigger
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_weather_reports_updated_at'
  ) THEN
    CREATE TRIGGER set_weather_reports_updated_at
      BEFORE UPDATE ON weather_reports
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
