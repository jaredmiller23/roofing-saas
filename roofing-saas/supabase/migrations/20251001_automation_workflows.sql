-- =====================================================
-- AUTOMATION WORKFLOWS
-- Date: 2025-10-01
-- Tables for workflow automation and triggers
-- =====================================================

-- Workflows table: Define automation workflows
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(50) NOT NULL, -- 'contact_created', 'project_status_changed', 'call_missed', 'email_opened', etc.
  trigger_config JSONB DEFAULT '{}', -- Configuration for trigger (e.g., specific status values)
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);

-- Workflow steps table: Individual actions in a workflow
CREATE TABLE IF NOT EXISTS workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL, -- Order of execution
  step_type VARCHAR(50) NOT NULL, -- 'send_sms', 'send_email', 'create_task', 'wait', 'update_contact', etc.
  step_config JSONB NOT NULL, -- Configuration for the action
  delay_minutes INTEGER DEFAULT 0, -- Delay before executing this step
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow executions table: Track workflow runs
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  trigger_data JSONB NOT NULL, -- Data that triggered the workflow
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
  current_step_id UUID REFERENCES workflow_steps(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow step executions table: Track individual step runs
CREATE TABLE IF NOT EXISTS workflow_step_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'skipped'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  result_data JSONB, -- Result of the step execution
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflows_tenant_id ON workflows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflows_trigger_type ON workflows(trigger_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow_id ON workflow_steps(workflow_id, step_order);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status) WHERE status IN ('pending', 'running');
CREATE INDEX IF NOT EXISTS idx_workflow_step_executions_execution_id ON workflow_step_executions(execution_id);

-- Add RLS policies
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_step_executions ENABLE ROW LEVEL SECURITY;

-- Workflows policies
CREATE POLICY workflows_tenant_isolation ON workflows
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- Workflow steps policies
CREATE POLICY workflow_steps_tenant_isolation ON workflow_steps
  FOR ALL
  USING (
    workflow_id IN (
      SELECT id FROM workflows
      WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID
    )
  );

-- Workflow executions policies
CREATE POLICY workflow_executions_tenant_isolation ON workflow_executions
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- Workflow step executions policies
CREATE POLICY workflow_step_executions_tenant_isolation ON workflow_step_executions
  FOR ALL
  USING (
    execution_id IN (
      SELECT id FROM workflow_executions
      WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_workflows_updated_at();

CREATE TRIGGER workflow_steps_updated_at
  BEFORE UPDATE ON workflow_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_workflows_updated_at();

CREATE TRIGGER workflow_executions_updated_at
  BEFORE UPDATE ON workflow_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_workflows_updated_at();

-- Comments
COMMENT ON TABLE workflows IS 'Automation workflows with triggers and actions';
COMMENT ON TABLE workflow_steps IS 'Individual steps/actions in a workflow';
COMMENT ON TABLE workflow_executions IS 'Track workflow execution history';
COMMENT ON TABLE workflow_step_executions IS 'Track individual step execution history';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '=== Automation Workflows Migration Complete ===';
  RAISE NOTICE 'Created workflows, workflow_steps, workflow_executions, workflow_step_executions tables';
  RAISE NOTICE 'Added RLS policies for multi-tenant isolation';
  RAISE NOTICE 'Added indexes for performance';
  RAISE NOTICE 'Trigger types: contact_created, project_status_changed, call_missed, email_opened, etc.';
  RAISE NOTICE 'Step types: send_sms, send_email, create_task, wait, update_contact, etc.';
END $$;
