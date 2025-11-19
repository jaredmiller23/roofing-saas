-- Configurable Pipeline Filters System
-- Allows admins to configure which filters appear for contacts, projects, pipeline
-- Enables saved filter presets for quick access

-- ============================================================================
-- 1. FILTER CONFIGURATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS filter_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Which entity this filter applies to
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contacts', 'projects', 'pipeline', 'activities')),

  -- Field configuration
  field_name TEXT NOT NULL, -- The database column name
  field_label TEXT NOT NULL, -- Display label in UI
  field_type TEXT NOT NULL CHECK (field_type IN (
    'text', 'select', 'multi_select', 'date', 'date_range',
    'number', 'number_range', 'boolean', 'user_select', 'tag_select'
  )),

  -- Filter behavior
  filter_operator TEXT NOT NULL DEFAULT 'equals' CHECK (filter_operator IN (
    'equals', 'not_equals', 'contains', 'not_contains', 'starts_with',
    'ends_with', 'greater_than', 'less_than', 'greater_than_or_equal',
    'less_than_or_equal', 'in', 'not_in', 'between', 'is_null', 'is_not_null'
  )),

  -- Options for select/multi-select fields
  filter_options JSONB DEFAULT '[]'::jsonb,
  -- Example: [
  --   {"value": "new", "label": "New", "color": "blue"},
  --   {"value": "contacted", "label": "Contacted", "color": "green"}
  -- ]

  -- Display settings
  display_order INT DEFAULT 0,
  is_quick_filter BOOLEAN DEFAULT false, -- Show in quick filters bar
  is_advanced_filter BOOLEAN DEFAULT true, -- Show in advanced panel
  is_active BOOLEAN DEFAULT true,

  -- Custom field integration
  custom_field_id UUID, -- If this is a custom field

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique field per entity type per tenant
  UNIQUE(tenant_id, entity_type, field_name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_filter_configs_tenant
  ON filter_configs(tenant_id, entity_type) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_filter_configs_entity
  ON filter_configs(entity_type, display_order) WHERE is_active = true;

-- ============================================================================
-- 2. SAVED FILTERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS saved_filters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Filter identification
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contacts', 'projects', 'pipeline', 'activities')),
  name TEXT NOT NULL,
  description TEXT,

  -- Filter criteria (actual filter values)
  filter_criteria JSONB NOT NULL,
  -- Example: {
  --   "stage": {"operator": "in", "value": ["qualified", "proposal"]},
  --   "lead_score": {"operator": "greater_than", "value": 50},
  --   "assigned_to": {"operator": "equals", "value": "user-uuid"}
  -- }

  -- Sharing settings
  created_by UUID NOT NULL REFERENCES auth.users(id),
  is_shared BOOLEAN DEFAULT false, -- Share with other users in tenant
  is_default BOOLEAN DEFAULT false, -- Auto-apply when opening page
  is_system BOOLEAN DEFAULT false, -- System-created (can't be deleted)

  -- Usage tracking
  usage_count INT DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique name per entity type per tenant
  UNIQUE(tenant_id, entity_type, name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_filters_tenant
  ON saved_filters(tenant_id, entity_type);

CREATE INDEX IF NOT EXISTS idx_saved_filters_user
  ON saved_filters(created_by) WHERE NOT is_shared;

CREATE INDEX IF NOT EXISTS idx_saved_filters_default
  ON saved_filters(tenant_id, entity_type) WHERE is_default = true;

-- ============================================================================
-- 3. FILTER USAGE LOGS TABLE (Analytics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS filter_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Who used what
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  filter_field TEXT NOT NULL, -- Which field was filtered

  -- Filter details
  filter_config_id UUID REFERENCES filter_configs(id) ON DELETE SET NULL,
  saved_filter_id UUID REFERENCES saved_filters(id) ON DELETE SET NULL,
  filter_value JSONB, -- The value that was applied

  -- Results
  results_count INT, -- How many results returned

  -- When
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partitioning by month (for performance with large datasets)
CREATE INDEX IF NOT EXISTS idx_filter_usage_logs_user
  ON filter_usage_logs(user_id, used_at DESC);

CREATE INDEX IF NOT EXISTS idx_filter_usage_logs_tenant
  ON filter_usage_logs(tenant_id, used_at DESC);

-- ============================================================================
-- 4. ROW LEVEL SECURITY POLICIES
-- ============================================================================

ALTER TABLE filter_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE filter_usage_logs ENABLE ROW LEVEL SECURITY;

-- Filter Configs: Admins can manage, all users can view
CREATE POLICY "Users can view filter configs in their tenant"
  ON filter_configs FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage filter configs"
  ON filter_configs FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- Saved Filters: Users can manage own, view shared
CREATE POLICY "Users can view own and shared filters"
  ON saved_filters FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
    AND (
      created_by = auth.uid() OR is_shared = true
    )
  );

CREATE POLICY "Users can create own filters"
  ON saved_filters FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update own filters"
  ON saved_filters FOR UPDATE
  USING (
    created_by = auth.uid()
    AND tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own filters (except system)"
  ON saved_filters FOR DELETE
  USING (
    created_by = auth.uid()
    AND is_system = false
    AND tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Admins can manage all filters
CREATE POLICY "Admins can manage all filters"
  ON saved_filters FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- Filter Usage Logs: Users can view own, admins can view all
CREATE POLICY "Users can view own filter usage"
  ON filter_usage_logs FOR SELECT
  USING (
    user_id = auth.uid()
    OR tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can insert own filter usage"
  ON filter_usage_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 5. UPDATE TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_filter_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_filter_configs_updated_at
  BEFORE UPDATE ON filter_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_filter_configs_updated_at();

CREATE OR REPLACE FUNCTION update_saved_filters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_saved_filters_updated_at
  BEFORE UPDATE ON saved_filters
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_filters_updated_at();

-- Increment usage count when saved filter is used
CREATE OR REPLACE FUNCTION increment_saved_filter_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.saved_filter_id IS NOT NULL THEN
    UPDATE saved_filters
    SET usage_count = usage_count + 1,
        last_used_at = NOW()
    WHERE id = NEW.saved_filter_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_saved_filter_usage
  AFTER INSERT ON filter_usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION increment_saved_filter_usage();

-- ============================================================================
-- 6. DEFAULT FILTER CONFIGURATIONS
-- ============================================================================

-- Insert default filter configs for Contacts
INSERT INTO filter_configs (tenant_id, entity_type, field_name, field_label, field_type, filter_operator, filter_options, is_quick_filter, display_order)
SELECT
  t.id,
  'contacts',
  'stage',
  'Stage',
  'multi_select',
  'in',
  '[
    {"value": "new", "label": "New", "color": "blue"},
    {"value": "contacted", "label": "Contacted", "color": "cyan"},
    {"value": "qualified", "label": "Qualified", "color": "green"},
    {"value": "proposal", "label": "Proposal", "color": "yellow"},
    {"value": "won", "label": "Won", "color": "emerald"},
    {"value": "lost", "label": "Lost", "color": "red"}
  ]'::jsonb,
  true,
  1
FROM tenants t
ON CONFLICT (tenant_id, entity_type, field_name) DO NOTHING;

INSERT INTO filter_configs (tenant_id, entity_type, field_name, field_label, field_type, filter_operator, is_quick_filter, display_order)
SELECT
  t.id,
  'contacts',
  'assigned_to',
  'Assigned To',
  'user_select',
  'equals',
  true,
  2
FROM tenants t
ON CONFLICT (tenant_id, entity_type, field_name) DO NOTHING;

INSERT INTO filter_configs (tenant_id, entity_type, field_name, field_label, field_type, filter_operator, filter_options, display_order)
SELECT
  t.id,
  'contacts',
  'source',
  'Lead Source',
  'select',
  'equals',
  '[
    {"value": "website", "label": "Website"},
    {"value": "referral", "label": "Referral"},
    {"value": "door-knock", "label": "Door Knock"},
    {"value": "social-media", "label": "Social Media"},
    {"value": "advertisement", "label": "Advertisement"}
  ]'::jsonb,
  3
FROM tenants t
ON CONFLICT (tenant_id, entity_type, field_name) DO NOTHING;

INSERT INTO filter_configs (tenant_id, entity_type, field_name, field_label, field_type, filter_operator, display_order)
SELECT
  t.id,
  'contacts',
  'lead_score',
  'Lead Score',
  'number_range',
  'between',
  4
FROM tenants t
ON CONFLICT (tenant_id, entity_type, field_name) DO NOTHING;

INSERT INTO filter_configs (tenant_id, entity_type, field_name, field_label, field_type, filter_operator, filter_options, display_order)
SELECT
  t.id,
  'contacts',
  'priority',
  'Priority',
  'select',
  'equals',
  '[
    {"value": "low", "label": "Low", "color": "gray"},
    {"value": "normal", "label": "Normal", "color": "blue"},
    {"value": "high", "label": "High", "color": "orange"},
    {"value": "urgent", "label": "Urgent", "color": "red"}
  ]'::jsonb,
  5
FROM tenants t
ON CONFLICT (tenant_id, entity_type, field_name) DO NOTHING;

INSERT INTO filter_configs (tenant_id, entity_type, field_name, field_label, field_type, filter_operator, display_order)
SELECT
  t.id,
  'contacts',
  'created_at',
  'Created Date',
  'date_range',
  'between',
  6
FROM tenants t
ON CONFLICT (tenant_id, entity_type, field_name) DO NOTHING;

-- Insert default filter configs for Projects
INSERT INTO filter_configs (tenant_id, entity_type, field_name, field_label, field_type, filter_operator, filter_options, is_quick_filter, display_order)
SELECT
  t.id,
  'projects',
  'status',
  'Status',
  'multi_select',
  'in',
  '[
    {"value": "estimate", "label": "Estimate", "color": "blue"},
    {"value": "approved", "label": "Approved", "color": "green"},
    {"value": "scheduled", "label": "Scheduled", "color": "cyan"},
    {"value": "in_progress", "label": "In Progress", "color": "yellow"},
    {"value": "completed", "label": "Completed", "color": "emerald"},
    {"value": "cancelled", "label": "Cancelled", "color": "red"}
  ]'::jsonb,
  true,
  1
FROM tenants t
ON CONFLICT (tenant_id, entity_type, field_name) DO NOTHING;

INSERT INTO filter_configs (tenant_id, entity_type, field_name, field_label, field_type, filter_operator, filter_options, display_order)
SELECT
  t.id,
  'projects',
  'type',
  'Project Type',
  'select',
  'equals',
  '[
    {"value": "repair", "label": "Repair"},
    {"value": "replacement", "label": "Replacement"},
    {"value": "maintenance", "label": "Maintenance"},
    {"value": "emergency", "label": "Emergency"}
  ]'::jsonb,
  2
FROM tenants t
ON CONFLICT (tenant_id, entity_type, field_name) DO NOTHING;

INSERT INTO filter_configs (tenant_id, entity_type, field_name, field_label, field_type, filter_operator, display_order)
SELECT
  t.id,
  'projects',
  'estimated_value',
  'Estimated Value',
  'number_range',
  'between',
  3
FROM tenants t
ON CONFLICT (tenant_id, entity_type, field_name) DO NOTHING;

-- Insert default saved filters
INSERT INTO saved_filters (tenant_id, entity_type, name, description, filter_criteria, is_shared, is_system, is_default)
SELECT
  t.id,
  'contacts',
  'My Active Leads',
  'Contacts assigned to me in active stages',
  jsonb_build_object(
    'stage', jsonb_build_object('operator', 'in', 'value', jsonb_build_array('new', 'contacted', 'qualified', 'proposal')),
    'assigned_to', jsonb_build_object('operator', 'equals', 'value', 'current_user')
  ),
  false,
  true,
  false
FROM tenants t
ON CONFLICT (tenant_id, entity_type, name) DO NOTHING;

INSERT INTO saved_filters (tenant_id, entity_type, name, description, filter_criteria, is_shared, is_system)
SELECT
  t.id,
  'contacts',
  'Hot Leads (Score >70)',
  'High-scoring leads ready for follow-up',
  jsonb_build_object(
    'lead_score', jsonb_build_object('operator', 'greater_than', 'value', 70),
    'stage', jsonb_build_object('operator', 'not_in', 'value', jsonb_build_array('won', 'lost'))
  ),
  true,
  true
FROM tenants t
ON CONFLICT (tenant_id, entity_type, name) DO NOTHING;

INSERT INTO saved_filters (tenant_id, entity_type, name, description, filter_criteria, is_shared, is_system)
SELECT
  t.id,
  'projects',
  'Projects In Progress',
  'All active projects',
  jsonb_build_object(
    'status', jsonb_build_object('operator', 'in', 'value', jsonb_build_array('approved', 'scheduled', 'in_progress'))
  ),
  true,
  true
FROM tenants t
ON CONFLICT (tenant_id, entity_type, name) DO NOTHING;

-- ============================================================================
-- 7. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE filter_configs IS 'Admin-configurable filter definitions for entities';
COMMENT ON TABLE saved_filters IS 'User-saved filter presets for quick access';
COMMENT ON TABLE filter_usage_logs IS 'Analytics tracking for filter usage';

COMMENT ON COLUMN filter_configs.field_type IS 'UI component type: text, select, multi_select, date, date_range, number, number_range, boolean, user_select, tag_select';
COMMENT ON COLUMN filter_configs.filter_operator IS 'Comparison operator: equals, contains, greater_than, between, etc.';
COMMENT ON COLUMN filter_configs.is_quick_filter IS 'Show in quick filters bar (visible without expanding)';
COMMENT ON COLUMN filter_configs.is_advanced_filter IS 'Show in advanced filters panel';

COMMENT ON COLUMN saved_filters.filter_criteria IS 'JSONB object with field names as keys and {operator, value} as values';
COMMENT ON COLUMN saved_filters.is_shared IS 'Share with other users in tenant';
COMMENT ON COLUMN saved_filters.is_default IS 'Auto-apply when user opens entity page';
COMMENT ON COLUMN saved_filters.is_system IS 'System-created filter (cannot be deleted by users)';

-- ============================================================================
-- 8. VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== Configurable Filters Migration Complete ===';
  RAISE NOTICE 'Created filter_configs, saved_filters, filter_usage_logs tables';
  RAISE NOTICE 'Added RLS policies for multi-tenant isolation';
  RAISE NOTICE 'Added indexes for performance';
  RAISE NOTICE 'Inserted default filter configurations for contacts and projects';
  RAISE NOTICE 'Created 3 default saved filters';
END $$;
