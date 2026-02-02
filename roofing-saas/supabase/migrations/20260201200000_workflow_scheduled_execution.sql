-- Migration: Add scheduled execution support to workflow step executions
-- Purpose: Replace setTimeout with persistent job scheduling that survives restarts
-- Pattern: Follows the same approach as campaign_step_executions

-- Add scheduled_at column for delayed step execution
ALTER TABLE workflow_step_executions
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- Add index for efficient querying of pending scheduled jobs
CREATE INDEX IF NOT EXISTS idx_workflow_step_executions_pending_scheduled
ON workflow_step_executions (scheduled_at)
WHERE status = 'pending' AND scheduled_at IS NOT NULL;

-- Add index for finding pending jobs that are due
CREATE INDEX IF NOT EXISTS idx_workflow_step_executions_due
ON workflow_step_executions (scheduled_at, status)
WHERE status = 'pending';

-- Add trigger_data column to workflow_step_executions for context preservation
-- (needed to resume execution after delay without re-fetching)
ALTER TABLE workflow_step_executions
ADD COLUMN IF NOT EXISTS trigger_data JSONB;

COMMENT ON COLUMN workflow_step_executions.scheduled_at IS 'When this step should be executed. NULL means execute immediately.';
COMMENT ON COLUMN workflow_step_executions.trigger_data IS 'Preserved trigger context for resuming execution after delay.';
