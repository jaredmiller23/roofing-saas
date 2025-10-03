-- =====================================================
-- JOBS TABLE
-- Date: 2025-10-03
-- Purpose: Production job management separate from sales projects
-- Critical for: Crew scheduling, job tracking, production workflow
-- =====================================================

-- Jobs Table
-- Manages production jobs/installations (separate from sales projects)
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Job identification
  job_number TEXT UNIQUE,
  job_type TEXT CHECK (job_type IN ('roof_replacement', 'roof_repair', 'inspection', 'maintenance', 'emergency', 'other')),

  -- Scheduling
  scheduled_date DATE,
  scheduled_start_time TIME,
  scheduled_end_time TIME,
  estimated_duration_hours DECIMAL(5, 2), -- e.g., 8.5 hours

  -- Actual timing
  actual_start_at TIMESTAMPTZ,
  actual_end_at TIMESTAMPTZ,
  actual_duration_hours DECIMAL(5, 2),

  -- Completion
  completion_date DATE,
  completion_percentage INTEGER DEFAULT 0, -- 0-100

  -- Crew assignment
  crew_lead UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  crew_members UUID[], -- Array of user IDs
  crew_size INTEGER, -- Number of crew members

  -- Job status
  status TEXT CHECK (status IN ('scheduled', 'in_progress', 'on_hold', 'completed', 'cancelled')) DEFAULT 'scheduled',

  -- Weather tracking
  weather_delay_days INTEGER DEFAULT 0,
  weather_notes TEXT,

  -- Job details
  scope_of_work TEXT,
  materials_needed JSONB, -- Array of materials with quantities
  equipment_needed TEXT[],

  -- Quality & Safety
  safety_inspection_completed BOOLEAN DEFAULT FALSE,
  safety_inspector UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  safety_inspection_date DATE,
  safety_notes TEXT,

  quality_score INTEGER, -- 1-10 rating
  quality_inspector UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  quality_inspection_date DATE,
  quality_notes TEXT,

  -- Photos/Documentation
  before_photos TEXT[], -- Array of Supabase Storage URLs
  during_photos TEXT[],
  after_photos TEXT[],
  final_inspection_photos TEXT[],

  -- Customer interaction
  customer_present BOOLEAN DEFAULT FALSE,
  customer_signature_url TEXT, -- E-signature for completion
  customer_feedback TEXT,

  -- Profitability tracking
  labor_cost DECIMAL(10, 2),
  material_cost DECIMAL(10, 2),
  equipment_cost DECIMAL(10, 2),
  other_costs DECIMAL(10, 2),
  total_cost DECIMAL(10, 2) GENERATED ALWAYS AS (
    COALESCE(labor_cost, 0) +
    COALESCE(material_cost, 0) +
    COALESCE(equipment_cost, 0) +
    COALESCE(other_costs, 0)
  ) STORED,

  -- Notes
  notes TEXT,
  internal_notes TEXT, -- Only visible to crew/managers

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_jobs_tenant_id ON jobs(tenant_id);
CREATE INDEX idx_jobs_project_id ON jobs(project_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_crew_lead ON jobs(crew_lead);
CREATE INDEX idx_jobs_scheduled_date ON jobs(scheduled_date);
CREATE INDEX idx_jobs_completion_date ON jobs(completion_date);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

-- Composite index for crew lead's scheduled jobs
CREATE INDEX idx_jobs_crew_scheduled ON jobs(crew_lead, scheduled_date) WHERE status IN ('scheduled', 'in_progress');

-- Index for finding jobs by crew members
CREATE INDEX idx_jobs_crew_members ON jobs USING GIN (crew_members);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Users can view jobs in their tenant
CREATE POLICY "Users can view jobs in their tenant"
  ON jobs FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can create jobs in their tenant
CREATE POLICY "Users can create jobs"
  ON jobs FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can update jobs in their tenant
CREATE POLICY "Users can update jobs"
  ON jobs FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can delete jobs in their tenant
CREATE POLICY "Users can delete jobs"
  ON jobs FOR DELETE
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
CREATE OR REPLACE FUNCTION update_job_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on jobs
CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_job_updated_at();

-- Function to auto-generate job number
CREATE OR REPLACE FUNCTION generate_job_number()
RETURNS TRIGGER AS $$
DECLARE
  year_prefix TEXT;
  sequence_num INTEGER;
  new_job_number TEXT;
BEGIN
  IF NEW.job_number IS NULL THEN
    year_prefix := TO_CHAR(CURRENT_DATE, 'YY');

    -- Get next sequence number for this year
    SELECT COALESCE(MAX(
      CASE
        WHEN job_number ~ ('^' || year_prefix || '-[0-9]+$')
        THEN CAST(SUBSTRING(job_number FROM '[0-9]+$') AS INTEGER)
        ELSE 0
      END
    ), 0) + 1
    INTO sequence_num
    FROM jobs
    WHERE tenant_id = NEW.tenant_id;

    NEW.job_number := year_prefix || '-' || LPAD(sequence_num::TEXT, 4, '0');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate job number
CREATE TRIGGER jobs_generate_number
  BEFORE INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION generate_job_number();

-- Function to calculate actual duration when job completes
CREATE OR REPLACE FUNCTION calculate_job_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.actual_end_at IS NOT NULL AND NEW.actual_start_at IS NOT NULL THEN
    NEW.actual_duration_hours := EXTRACT(EPOCH FROM (NEW.actual_end_at - NEW.actual_start_at)) / 3600.0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to calculate actual duration
CREATE TRIGGER jobs_calculate_duration
  BEFORE INSERT OR UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION calculate_job_duration();

-- Function to get crew member jobs
CREATE OR REPLACE FUNCTION get_crew_member_jobs(p_user_id UUID, p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS TABLE (
  job_id UUID,
  job_number TEXT,
  project_name TEXT,
  scheduled_date DATE,
  status TEXT,
  crew_lead_name TEXT
) AS $$
DECLARE
  start_filter DATE;
  end_filter DATE;
BEGIN
  start_filter := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
  end_filter := COALESCE(p_end_date, CURRENT_DATE + INTERVAL '30 days');

  RETURN QUERY
  SELECT
    j.id AS job_id,
    j.job_number,
    p.name AS project_name,
    j.scheduled_date,
    j.status,
    u.full_name AS crew_lead_name
  FROM jobs j
  LEFT JOIN projects p ON j.project_id = p.id
  LEFT JOIN profiles u ON j.crew_lead = u.id
  WHERE (
    j.crew_lead = p_user_id
    OR p_user_id = ANY(j.crew_members)
  )
  AND j.scheduled_date BETWEEN start_filter AND end_filter
  AND j.is_deleted = FALSE
  ORDER BY j.scheduled_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get job stats by crew lead
CREATE OR REPLACE FUNCTION get_crew_lead_stats(p_user_id UUID, p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  result JSON;
  start_filter DATE;
  end_filter DATE;
BEGIN
  start_filter := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
  end_filter := COALESCE(p_end_date, CURRENT_DATE);

  SELECT json_build_object(
    'total_jobs', COUNT(*),
    'completed_jobs', COUNT(*) FILTER (WHERE status = 'completed'),
    'in_progress_jobs', COUNT(*) FILTER (WHERE status = 'in_progress'),
    'scheduled_jobs', COUNT(*) FILTER (WHERE status = 'scheduled'),
    'cancelled_jobs', COUNT(*) FILTER (WHERE status = 'cancelled'),
    'avg_quality_score', ROUND(AVG(quality_score), 2),
    'total_weather_delays', SUM(weather_delay_days),
    'avg_completion_percentage', ROUND(AVG(completion_percentage), 2)
  )
  INTO result
  FROM jobs
  WHERE crew_lead = p_user_id
    AND scheduled_date BETWEEN start_filter AND end_filter
    AND is_deleted = FALSE;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for today's jobs with crew info
CREATE OR REPLACE VIEW todays_jobs AS
SELECT
  j.*,
  p.name as project_name,
  c.first_name || ' ' || c.last_name as customer_name,
  lead.full_name as crew_lead_name,
  lead.email as crew_lead_email
FROM jobs j
LEFT JOIN projects p ON j.project_id = p.id
LEFT JOIN contacts c ON p.contact_id = c.id
LEFT JOIN profiles lead ON j.crew_lead = lead.id
WHERE j.scheduled_date = CURRENT_DATE
  AND j.status IN ('scheduled', 'in_progress')
  AND j.is_deleted = FALSE
ORDER BY j.scheduled_start_time;

-- View for upcoming jobs
CREATE OR REPLACE VIEW upcoming_jobs AS
SELECT
  j.*,
  p.name as project_name,
  c.first_name || ' ' || c.last_name as customer_name,
  lead.full_name as crew_lead_name
FROM jobs j
LEFT JOIN projects p ON j.project_id = p.id
LEFT JOIN contacts c ON p.contact_id = c.id
LEFT JOIN profiles lead ON j.crew_lead = lead.id
WHERE j.scheduled_date > CURRENT_DATE
  AND j.status = 'scheduled'
  AND j.is_deleted = FALSE
ORDER BY j.scheduled_date, j.scheduled_start_time;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE jobs IS 'Production jobs/installations separate from sales projects (crew scheduling, job tracking)';
COMMENT ON COLUMN jobs.job_number IS 'Auto-generated job number in format YY-####';
COMMENT ON COLUMN jobs.crew_members IS 'Array of user IDs assigned to this job';
COMMENT ON COLUMN jobs.completion_percentage IS 'Job completion progress: 0-100%';
COMMENT ON COLUMN jobs.total_cost IS 'Auto-calculated total cost (labor + materials + equipment + other)';
COMMENT ON COLUMN jobs.customer_signature_url IS 'URL to customer e-signature for job completion';
COMMENT ON COLUMN jobs.internal_notes IS 'Internal notes only visible to crew/managers (not customers)';

COMMENT ON VIEW todays_jobs IS 'Jobs scheduled for today with crew and customer details';
COMMENT ON VIEW upcoming_jobs IS 'Future scheduled jobs';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== Jobs Table Created ===';
  RAISE NOTICE 'Created jobs table with RLS policies';
  RAISE NOTICE 'Created indexes for performance';
  RAISE NOTICE 'Created triggers for auto-numbering and duration calculation';
  RAISE NOTICE 'Created helper functions for crew stats';
  RAISE NOTICE 'Created views for todays and upcoming jobs';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Build job scheduling UI (calendar view)';
  RAISE NOTICE '2. Implement crew assignment workflow';
  RAISE NOTICE '3. Build mobile job tracking for crew leads';
  RAISE NOTICE '4. Add job photo upload (before/during/after)';
  RAISE NOTICE '5. Implement e-signature for job completion';
  RAISE NOTICE '6. Create crew performance dashboard';
END $$;
