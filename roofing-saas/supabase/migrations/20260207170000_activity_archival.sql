-- Migration: Activity archival infrastructure
-- Creates archive table and function to move old deleted activities
-- Rollback: DROP FUNCTION IF EXISTS archive_old_activities(); DROP TABLE IF EXISTS activities_archive;

-- ----------------------------------------
-- Table: activities_archive
-- Archive storage for old deleted activities
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.activities_archive (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  created_at timestamp with time zone,
  created_by uuid,
  contact_id uuid,
  project_id uuid,
  type varchar(50) NOT NULL,
  subtype varchar(50),
  subject varchar(255),
  content text,
  direction varchar(10),
  from_address varchar(255),
  to_address varchar(255),
  outcome varchar(100),
  outcome_details jsonb,
  duration_seconds integer,
  recording_url varchar(500),
  transcript text,
  scheduled_at timestamp with time zone,
  completed_at timestamp with time zone,
  reminder_at timestamp with time zone,
  external_id varchar(100),
  performed_by uuid,
  on_behalf_of uuid,
  is_impersonated_action boolean DEFAULT false,
  read_at timestamp with time zone,
  read_by uuid,
  is_deleted boolean DEFAULT false,
  archived_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (id)
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_activities_archive_tenant_id ON activities_archive(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activities_archive_archived_at ON activities_archive(archived_at);
CREATE INDEX IF NOT EXISTS idx_activities_archive_contact_id ON activities_archive(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_archive_project_id ON activities_archive(project_id) WHERE project_id IS NOT NULL;

-- Enable RLS
ALTER TABLE activities_archive ENABLE ROW LEVEL SECURITY;

-- RLS policies (same as activities table)
DROP POLICY IF EXISTS "Users can view their tenant's archived activities" ON activities_archive;
CREATE POLICY "Users can view their tenant's archived activities" ON activities_archive
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM tenant_users
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Admins can manage archived activities" ON activities_archive;
CREATE POLICY "Admins can manage archived activities" ON activities_archive
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tu.tenant_id
      FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
      AND tu.status = 'active'
      AND tu.role IN ('admin', 'owner')
    )
  );

-- ----------------------------------------
-- Function: archive_old_activities
-- Moves soft-deleted activities older than 1 year to archive
-- ----------------------------------------
CREATE OR REPLACE FUNCTION archive_old_activities()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  archived_count INTEGER := 0;
  cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate cutoff date (1 year ago)
  cutoff_date := NOW() - INTERVAL '1 year';

  -- Move activities to archive
  WITH archived AS (
    INSERT INTO activities_archive (
      id, tenant_id, created_at, created_by, contact_id, project_id,
      type, subtype, subject, content, direction, from_address, to_address,
      outcome, outcome_details, duration_seconds, recording_url, transcript,
      scheduled_at, completed_at, reminder_at, external_id, performed_by,
      on_behalf_of, is_impersonated_action, read_at, read_by, is_deleted
    )
    SELECT
      id, tenant_id, created_at, created_by, contact_id, project_id,
      type, subtype, subject, content, direction, from_address, to_address,
      outcome, outcome_details, duration_seconds, recording_url, transcript,
      scheduled_at, completed_at, reminder_at, external_id, performed_by,
      on_behalf_of, is_impersonated_action, read_at, read_by, is_deleted
    FROM activities
    WHERE is_deleted = true
      AND created_at < cutoff_date
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  )
  SELECT COUNT(*) INTO archived_count FROM archived;

  -- Delete archived activities from main table
  DELETE FROM activities
  WHERE id IN (
    SELECT id FROM activities_archive
    WHERE archived_at >= NOW() - INTERVAL '1 minute'
  );

  RETURN archived_count;
END;
$$;

-- Add comment
COMMENT ON FUNCTION archive_old_activities() IS 'Archives soft-deleted activities older than 1 year. Returns count of archived rows.';
