-- Migration: Add Pipeline Fields to Projects Table
-- Phase 2: Extend Data Model for Unified Pipeline
-- Date: 2025-11-20

-- ============================================================================
-- STEP 1: Create Enums
-- ============================================================================

-- Pipeline stage enum: Full sales-to-production lifecycle
CREATE TYPE pipeline_stage AS ENUM (
  'prospect',        -- Initial contact, not yet qualified
  'qualified',       -- Qualified lead, has genuine interest and budget
  'quote_sent',      -- Quote/estimate has been sent
  'negotiation',     -- In negotiations, addressing concerns
  'won',            -- Deal won, contract signed
  'production',     -- Job in progress
  'complete',       -- Project completed
  'lost'            -- Opportunity lost
);

-- Priority enum for lead prioritization
CREATE TYPE lead_priority AS ENUM (
  'urgent',         -- Hot lead, immediate attention needed
  'high',           -- High priority, follow up soon
  'normal',         -- Standard priority
  'low'             -- Low priority, long-term nurture
);

-- ============================================================================
-- STEP 2: Add New Columns to Projects Table
-- ============================================================================

-- Add pipeline_stage column (nullable initially for existing records)
ALTER TABLE projects
ADD COLUMN pipeline_stage pipeline_stage;

-- Add lead tracking fields
ALTER TABLE projects
ADD COLUMN lead_source text,
ADD COLUMN priority lead_priority DEFAULT 'normal',
ADD COLUMN lead_score integer DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
ADD COLUMN estimated_close_date timestamp with time zone;

-- Add comments for documentation
COMMENT ON COLUMN projects.pipeline_stage IS 'Unified pipeline stage: prospect → qualified → quote_sent → negotiation → won → production → complete → lost';
COMMENT ON COLUMN projects.lead_source IS 'Where the opportunity came from (referral, door knock, storm targeting, website, etc.)';
COMMENT ON COLUMN projects.priority IS 'Lead priority for sales team: urgent, high, normal, low';
COMMENT ON COLUMN projects.lead_score IS 'Lead scoring for prioritization (0-100)';
COMMENT ON COLUMN projects.estimated_close_date IS 'Estimated date when deal will close (for sales forecasting)';

-- ============================================================================
-- STEP 3: Migrate Existing Data
-- ============================================================================

-- Map existing 'status' field to new 'pipeline_stage' field
-- Current status values: estimate, approved, in_progress, completed, cancelled

UPDATE projects
SET pipeline_stage = CASE
  WHEN status = 'estimate' THEN 'quote_sent'::pipeline_stage
  WHEN status = 'approved' THEN 'won'::pipeline_stage
  WHEN status = 'in_progress' THEN 'production'::pipeline_stage
  WHEN status = 'completed' THEN 'complete'::pipeline_stage
  WHEN status = 'cancelled' THEN 'lost'::pipeline_stage
  ELSE 'prospect'::pipeline_stage
END
WHERE pipeline_stage IS NULL;

-- Migrate priority from contacts to projects (for existing project-contact relationships)
UPDATE projects p
SET
  priority = CASE
    WHEN c.priority = 'urgent' THEN 'urgent'::lead_priority
    WHEN c.priority = 'high' THEN 'high'::lead_priority
    WHEN c.priority = 'low' THEN 'low'::lead_priority
    ELSE 'normal'::lead_priority
  END,
  lead_score = COALESCE(c.lead_score, 0),
  lead_source = c.source
FROM contacts c
WHERE p.contact_id = c.id
AND p.lead_source IS NULL;

-- ============================================================================
-- STEP 4: Make pipeline_stage NOT NULL (now that data is migrated)
-- ============================================================================

-- Set default for new records
ALTER TABLE projects
ALTER COLUMN pipeline_stage SET DEFAULT 'prospect'::pipeline_stage;

-- Make it required (all existing records should have values now)
ALTER TABLE projects
ALTER COLUMN pipeline_stage SET NOT NULL;

-- ============================================================================
-- STEP 5: Create Index for Pipeline Queries
-- ============================================================================

-- Index for filtering by pipeline_stage (used frequently in kanban view)
CREATE INDEX idx_projects_pipeline_stage ON projects(pipeline_stage)
WHERE is_deleted = false;

-- Index for filtering by priority
CREATE INDEX idx_projects_priority ON projects(priority)
WHERE is_deleted = false;

-- Composite index for common queries (stage + priority + estimated close date)
CREATE INDEX idx_projects_pipeline_active ON projects(pipeline_stage, priority, estimated_close_date)
WHERE is_deleted = false
AND pipeline_stage NOT IN ('complete', 'lost');

-- ============================================================================
-- STEP 6: Update RLS Policies (if needed)
-- ============================================================================

-- Note: RLS policies should already cover projects table
-- Verify that existing policies work with new columns

-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================

-- Count projects by pipeline stage
-- SELECT pipeline_stage, COUNT(*) FROM projects GROUP BY pipeline_stage;

-- Check migration results
-- SELECT id, name, status, pipeline_stage, priority, lead_score FROM projects LIMIT 10;
