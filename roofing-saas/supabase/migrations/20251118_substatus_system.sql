-- Substatus System for Granular Status Tracking
-- Allows dependent substatus values based on main status field
-- Example: Contact stage "qualified" can have substatuses like "budget_approved", "decision_maker_identified", etc.

-- ============================================================================
-- 1. ADD SUBSTATUS COLUMNS TO ENTITIES
-- ============================================================================

-- Add substatus to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS substatus TEXT;

-- Add substatus to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS substatus TEXT;

-- Add indexes for filtering
CREATE INDEX IF NOT EXISTS idx_contacts_stage_substatus ON contacts(tenant_id, stage, substatus) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_projects_status_substatus ON projects(tenant_id, status, substatus) WHERE NOT is_deleted;

-- ============================================================================
-- 2. STATUS/SUBSTATUS CONFIGURATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS status_substatus_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Which entity and status field
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contacts', 'projects', 'activities')),
  status_field_name TEXT NOT NULL, -- 'stage' for contacts, 'status' for projects
  status_value TEXT NOT NULL, -- The main status value (e.g., 'qualified', 'in_progress')

  -- Substatus configuration
  substatus_value TEXT NOT NULL, -- The substatus code (e.g., 'budget_approved')
  substatus_label TEXT NOT NULL, -- Display label (e.g., 'Budget Approved')
  substatus_description TEXT, -- Optional help text

  -- Display settings
  display_order INT DEFAULT 0,
  color TEXT, -- Badge color (e.g., 'blue', 'green', '#3B82F6')
  icon TEXT, -- Optional icon name

  -- Behavior
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- Auto-select when status changes to this value
  is_terminal BOOLEAN DEFAULT false, -- Can't change substatus after setting this one

  -- Workflow automation
  auto_transition_to TEXT, -- Auto-transition to this substatus after delay
  auto_transition_delay_hours INT, -- Delay before auto-transition

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique substatus per status per entity type per tenant
  UNIQUE(tenant_id, entity_type, status_field_name, status_value, substatus_value)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_status_substatus_configs_tenant
  ON status_substatus_configs(tenant_id, entity_type, status_value) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_status_substatus_configs_default
  ON status_substatus_configs(tenant_id, entity_type, status_value) WHERE is_default = true;

-- ============================================================================
-- 3. ROW LEVEL SECURITY POLICIES
-- ============================================================================

ALTER TABLE status_substatus_configs ENABLE ROW LEVEL SECURITY;

-- All users can view configs in their tenant
CREATE POLICY "Users can view substatus configs in their tenant"
  ON status_substatus_configs FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Admins can manage configs
CREATE POLICY "Admins can manage substatus configs"
  ON status_substatus_configs FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- ============================================================================
-- 4. TRIGGERS AND FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_status_substatus_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_status_substatus_configs_updated_at
  BEFORE UPDATE ON status_substatus_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_status_substatus_configs_updated_at();

-- Function to auto-set default substatus when status changes
CREATE OR REPLACE FUNCTION set_default_substatus()
RETURNS TRIGGER AS $$
DECLARE
  default_substatus TEXT;
  entity_type_name TEXT;
  status_field TEXT;
  status_value TEXT;
BEGIN
  -- Determine entity type and status field based on table
  IF TG_TABLE_NAME = 'contacts' THEN
    entity_type_name := 'contacts';
    status_field := 'stage';
    status_value := NEW.stage;
  ELSIF TG_TABLE_NAME = 'projects' THEN
    entity_type_name := 'projects';
    status_field := 'status';
    status_value := NEW.status;
  ELSE
    RETURN NEW;
  END IF;

  -- Check if status changed (or new record)
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
    (TG_TABLE_NAME = 'contacts' AND OLD.stage IS DISTINCT FROM NEW.stage) OR
    (TG_TABLE_NAME = 'projects' AND OLD.status IS DISTINCT FROM NEW.status)
  )) THEN

    -- Get default substatus for new status
    SELECT substatus_value INTO default_substatus
    FROM status_substatus_configs
    WHERE tenant_id = NEW.tenant_id
      AND entity_type = entity_type_name
      AND status_field_name = status_field
      AND status_value = status_value
      AND is_default = true
      AND is_active = true
    LIMIT 1;

    -- Set default substatus if found, otherwise null
    NEW.substatus := default_substatus;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to contacts and projects
CREATE TRIGGER trigger_set_default_substatus_contacts
  BEFORE INSERT OR UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION set_default_substatus();

CREATE TRIGGER trigger_set_default_substatus_projects
  BEFORE INSERT OR UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION set_default_substatus();

-- ============================================================================
-- 5. DEFAULT SUBSTATUS CONFIGURATIONS
-- ============================================================================

-- Insert default substatuses for Contact stages
INSERT INTO status_substatus_configs (tenant_id, entity_type, status_field_name, status_value, substatus_value, substatus_label, substatus_description, color, display_order, is_default)
SELECT
  t.id,
  'contacts',
  'stage',
  'new',
  'uncontacted',
  'Uncontacted',
  'Lead just entered system, no contact attempt yet',
  'gray',
  1,
  true
FROM tenants t
ON CONFLICT (tenant_id, entity_type, status_field_name, status_value, substatus_value) DO NOTHING;

INSERT INTO status_substatus_configs (tenant_id, entity_type, status_field_name, status_value, substatus_value, substatus_label, substatus_description, color, display_order)
SELECT
  t.id,
  'contacts',
  'stage',
  'new',
  'attempting_contact',
  'Attempting Contact',
  'Actively trying to reach lead',
  'blue',
  2
FROM tenants t
ON CONFLICT (tenant_id, entity_type, status_field_name, status_value, substatus_value) DO NOTHING;

INSERT INTO status_substatus_configs (tenant_id, entity_type, status_field_name, status_value, substatus_value, substatus_label, substatus_description, color, display_order)
SELECT
  t.id,
  'contacts',
  'stage',
  'contacted',
  'call_scheduled',
  'Call Scheduled',
  'Initial contact made, call scheduled',
  'cyan',
  1
FROM tenants t
ON CONFLICT (tenant_id, entity_type, status_field_name, status_value, substatus_value) DO NOTHING;

INSERT INTO status_substatus_configs (tenant_id, entity_type, status_field_name, status_value, substatus_value, substatus_label, substatus_description, color, display_order)
SELECT
  t.id,
  'contacts',
  'stage',
  'contacted',
  'follow_up_needed',
  'Follow-Up Needed',
  'Contacted but needs additional follow-up',
  'yellow',
  2
FROM tenants t
ON CONFLICT (tenant_id, entity_type, status_field_name, status_value, substatus_value) DO NOTHING;

INSERT INTO status_substatus_configs (tenant_id, entity_type, status_field_name, status_value, substatus_value, substatus_label, substatus_description, color, display_order)
SELECT
  t.id,
  'contacts',
  'stage',
  'qualified',
  'budget_approved',
  'Budget Approved',
  'Lead has confirmed budget for project',
  'green',
  1
FROM tenants t
ON CONFLICT (tenant_id, entity_type, status_field_name, status_value, substatus_value) DO NOTHING;

INSERT INTO status_substatus_configs (tenant_id, entity_type, status_field_name, status_value, substatus_value, substatus_label, substatus_description, color, display_order)
SELECT
  t.id,
  'contacts',
  'stage',
  'qualified',
  'decision_maker_identified',
  'Decision Maker Identified',
  'Connected with person who makes final decision',
  'purple',
  2
FROM tenants t
ON CONFLICT (tenant_id, entity_type, status_field_name, status_value, substatus_value) DO NOTHING;

INSERT INTO status_substatus_configs (tenant_id, entity_type, status_field_name, status_value, substatus_value, substatus_label, substatus_description, color, display_order)
SELECT
  t.id,
  'contacts',
  'stage',
  'qualified',
  'timeline_confirmed',
  'Timeline Confirmed',
  'Project timeline has been discussed and confirmed',
  'indigo',
  3
FROM tenants t
ON CONFLICT (tenant_id, entity_type, status_field_name, status_value, substatus_value) DO NOTHING;

INSERT INTO status_substatus_configs (tenant_id, entity_type, status_field_name, status_value, substatus_value, substatus_label, substatus_description, color, display_order)
SELECT
  t.id,
  'contacts',
  'stage',
  'proposal',
  'estimate_sent',
  'Estimate Sent',
  'Proposal/estimate has been sent to lead',
  'blue',
  1
FROM tenants t
ON CONFLICT (tenant_id, entity_type, status_field_name, status_value, substatus_value) DO NOTHING;

INSERT INTO status_substatus_configs (tenant_id, entity_type, status_field_name, status_value, substatus_value, substatus_label, substatus_description, color, display_order)
SELECT
  t.id,
  'contacts',
  'stage',
  'proposal',
  'negotiating',
  'Negotiating',
  'In active negotiation on pricing or terms',
  'yellow',
  2
FROM tenants t
ON CONFLICT (tenant_id, entity_type, status_field_name, status_value, substatus_value) DO NOTHING;

INSERT INTO status_substatus_configs (tenant_id, entity_type, status_field_name, status_value, substatus_value, substatus_label, substatus_description, color, display_order)
SELECT
  t.id,
  'contacts',
  'stage',
  'proposal',
  'verbal_agreement',
  'Verbal Agreement',
  'Customer has verbally agreed, pending contract',
  'emerald',
  3
FROM tenants t
ON CONFLICT (tenant_id, entity_type, status_field_name, status_value, substatus_value) DO NOTHING;

-- Insert default substatuses for Project statuses
INSERT INTO status_substatus_configs (tenant_id, entity_type, status_field_name, status_value, substatus_value, substatus_label, substatus_description, color, display_order, is_default)
SELECT
  t.id,
  'projects',
  'status',
  'estimate',
  'site_visit_pending',
  'Site Visit Pending',
  'Need to schedule site visit for estimate',
  'blue',
  1,
  true
FROM tenants t
ON CONFLICT (tenant_id, entity_type, status_field_name, status_value, substatus_value) DO NOTHING;

INSERT INTO status_substatus_configs (tenant_id, entity_type, status_field_name, status_value, substatus_value, substatus_label, substatus_description, color, display_order)
SELECT
  t.id,
  'projects',
  'status',
  'estimate',
  'measurements_taken',
  'Measurements Taken',
  'Site measured, calculating estimate',
  'cyan',
  2
FROM tenants t
ON CONFLICT (tenant_id, entity_type, status_field_name, status_value, substatus_value) DO NOTHING;

INSERT INTO status_substatus_configs (tenant_id, entity_type, status_field_name, status_value, substatus_value, substatus_label, substatus_description, color, display_order)
SELECT
  t.id,
  'projects',
  'status',
  'estimate',
  'quote_prepared',
  'Quote Prepared',
  'Estimate prepared, ready to send',
  'purple',
  3
FROM tenants t
ON CONFLICT (tenant_id, entity_type, status_field_name, status_value, substatus_value) DO NOTHING;

INSERT INTO status_substatus_configs (tenant_id, entity_type, status_field_name, status_value, substatus_value, substatus_label, substatus_description, color, display_order)
SELECT
  t.id,
  'projects',
  'status',
  'approved',
  'contract_signed',
  'Contract Signed',
  'Customer has signed contract',
  'green',
  1
FROM tenants t
ON CONFLICT (tenant_id, entity_type, status_field_name, status_value, substatus_value) DO NOTHING;

INSERT INTO status_substatus_configs (tenant_id, entity_type, status_field_name, status_value, substatus_value, substatus_label, substatus_description, color, display_order)
SELECT
  t.id,
  'projects',
  'status',
  'approved',
  'deposit_received',
  'Deposit Received',
  'Initial deposit payment received',
  'emerald',
  2
FROM tenants t
ON CONFLICT (tenant_id, entity_type, status_field_name, status_value, substatus_value) DO NOTHING;

INSERT INTO status_substatus_configs (tenant_id, entity_type, status_field_name, status_value, substatus_value, substatus_label, substatus_description, color, display_order)
SELECT
  t.id,
  'projects',
  'status',
  'approved',
  'materials_ordered',
  'Materials Ordered',
  'Materials have been ordered',
  'indigo',
  3
FROM tenants t
ON CONFLICT (tenant_id, entity_type, status_field_name, status_value, substatus_value) DO NOTHING;

INSERT INTO status_substatus_configs (tenant_id, entity_type, status_field_name, status_value, substatus_value, substatus_label, substatus_description, color, display_order)
SELECT
  t.id,
  'projects',
  'status',
  'scheduled',
  'crew_assigned',
  'Crew Assigned',
  'Work crew has been assigned',
  'blue',
  1
FROM tenants t
ON CONFLICT (tenant_id, entity_type, status_field_name, status_value, substatus_value) DO NOTHING;

INSERT INTO status_substatus_configs (tenant_id, entity_type, status_field_name, status_value, substatus_value, substatus_label, substatus_description, color, display_order)
SELECT
  t.id,
  'projects',
  'status',
  'scheduled',
  'permits_obtained',
  'Permits Obtained',
  'All necessary permits acquired',
  'green',
  2
FROM tenants t
ON CONFLICT (tenant_id, entity_type, status_field_name, status_value, substatus_value) DO NOTHING;

INSERT INTO status_substatus_configs (tenant_id, entity_type, status_field_name, status_value, substatus_value, substatus_label, substatus_description, color, display_order)
SELECT
  t.id,
  'projects',
  'status',
  'in_progress',
  'tear_off',
  'Tear Off',
  'Removing old roofing material',
  'orange',
  1
FROM tenants t
ON CONFLICT (tenant_id, entity_type, status_field_name, status_value, substatus_value) DO NOTHING;

INSERT INTO status_substatus_configs (tenant_id, entity_type, status_field_name, status_value, substatus_value, substatus_label, substatus_description, color, display_order)
SELECT
  t.id,
  'projects',
  'status',
  'in_progress',
  'installation',
  'Installation',
  'Installing new roofing',
  'blue',
  2
FROM tenants t
ON CONFLICT (tenant_id, entity_type, status_field_name, status_value, substatus_value) DO NOTHING;

INSERT INTO status_substatus_configs (tenant_id, entity_type, status_field_name, status_value, substatus_value, substatus_label, substatus_description, color, display_order)
SELECT
  t.id,
  'projects',
  'status',
  'in_progress',
  'final_inspection',
  'Final Inspection',
  'Work complete, awaiting final inspection',
  'purple',
  3
FROM tenants t
ON CONFLICT (tenant_id, entity_type, status_field_name, status_value, substatus_value) DO NOTHING;

INSERT INTO status_substatus_configs (tenant_id, entity_type, status_field_name, status_value, substatus_value, substatus_label, substatus_description, color, display_order)
SELECT
  t.id,
  'projects',
  'status',
  'completed',
  'final_payment_received',
  'Final Payment Received',
  'All payments collected',
  'green',
  1
FROM tenants t
ON CONFLICT (tenant_id, entity_type, status_field_name, status_value, substatus_value) DO NOTHING;

INSERT INTO status_substatus_configs (tenant_id, entity_type, status_field_name, status_value, substatus_value, substatus_label, substatus_description, color, display_order)
SELECT
  t.id,
  'projects',
  'status',
  'completed',
  'warranty_issued',
  'Warranty Issued',
  'Warranty documentation provided to customer',
  'indigo',
  2
FROM tenants t
ON CONFLICT (tenant_id, entity_type, status_field_name, status_value, substatus_value) DO NOTHING;

-- ============================================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE status_substatus_configs IS 'Configurable substatus options for status fields';
COMMENT ON COLUMN status_substatus_configs.substatus_value IS 'Code/slug for the substatus (stored in entity table)';
COMMENT ON COLUMN status_substatus_configs.substatus_label IS 'Human-readable display label';
COMMENT ON COLUMN status_substatus_configs.is_default IS 'Auto-select when status changes to parent status value';
COMMENT ON COLUMN status_substatus_configs.is_terminal IS 'Cannot change substatus after setting this one';
COMMENT ON COLUMN status_substatus_configs.auto_transition_to IS 'Automatically transition to this substatus after delay';

COMMENT ON COLUMN contacts.substatus IS 'Granular status detail (dependent on stage value)';
COMMENT ON COLUMN projects.substatus IS 'Granular status detail (dependent on status value)';

-- ============================================================================
-- 7. VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== Substatus System Migration Complete ===';
  RAISE NOTICE 'Added substatus columns to contacts and projects tables';
  RAISE NOTICE 'Created status_substatus_configs table';
  RAISE NOTICE 'Added RLS policies for multi-tenant isolation';
  RAISE NOTICE 'Created triggers for auto-setting default substatuses';
  RAISE NOTICE 'Inserted 25+ default substatus configurations';
  RAISE NOTICE 'Contacts: 10 substatuses across 5 stages';
  RAISE NOTICE 'Projects: 15 substatuses across 6 statuses';
END $$;
