-- Seed default filter configurations for contacts
-- This provides commonly used filters out of the box

-- Stage filter (select dropdown)
INSERT INTO filter_configs (
  tenant_id,
  entity_type,
  field_name,
  field_label,
  field_type,
  filter_operator,
  filter_options,
  display_order,
  is_quick_filter,
  is_advanced_filter,
  is_active
) VALUES
(
  '00000000-0000-0000-0000-000000000000'::uuid, -- System default
  'contacts',
  'stage',
  'Stage',
  'select',
  'equals',
  '[
    {"value": "lead", "label": "Lead"},
    {"value": "active", "label": "Active"},
    {"value": "customer", "label": "Customer"},
    {"value": "lost", "label": "Lost"}
  ]'::jsonb,
  10,
  true,
  true,
  true
);

-- Type filter (select dropdown)
INSERT INTO filter_configs (
  tenant_id,
  entity_type,
  field_name,
  field_label,
  field_type,
  filter_operator,
  filter_options,
  display_order,
  is_quick_filter,
  is_advanced_filter,
  is_active
) VALUES
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'contacts',
  'type',
  'Type',
  'select',
  'equals',
  '[
    {"value": "lead", "label": "Lead"},
    {"value": "prospect", "label": "Prospect"},
    {"value": "customer", "label": "Customer"}
  ]'::jsonb,
  20,
  true,
  true,
  true
);

-- Priority filter (select dropdown)
INSERT INTO filter_configs (
  tenant_id,
  entity_type,
  field_name,
  field_label,
  field_type,
  filter_operator,
  filter_options,
  display_order,
  is_quick_filter,
  is_advanced_filter,
  is_active
) VALUES
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'contacts',
  'priority',
  'Priority',
  'select',
  'equals',
  '[
    {"value": "urgent", "label": "Urgent"},
    {"value": "high", "label": "High"},
    {"value": "normal", "label": "Normal"},
    {"value": "low", "label": "Low"}
  ]'::jsonb,
  30,
  true,
  true,
  true
);

-- Lead Score filter (number range)
INSERT INTO filter_configs (
  tenant_id,
  entity_type,
  field_name,
  field_label,
  field_type,
  filter_operator,
  filter_options,
  display_order,
  is_quick_filter,
  is_advanced_filter,
  is_active
) VALUES
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'contacts',
  'lead_score',
  'Lead Score',
  'number_range',
  'greater_than_or_equal',
  '[]'::jsonb,
  40,
  false,
  true,
  true
);

-- Company filter (text search)
INSERT INTO filter_configs (
  tenant_id,
  entity_type,
  field_name,
  field_label,
  field_type,
  filter_operator,
  filter_options,
  display_order,
  is_quick_filter,
  is_advanced_filter,
  is_active
) VALUES
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'contacts',
  'company',
  'Company',
  'text',
  'contains',
  '[]'::jsonb,
  50,
  false,
  true,
  true
);

-- Source filter (text search)
INSERT INTO filter_configs (
  tenant_id,
  entity_type,
  field_name,
  field_label,
  field_type,
  filter_operator,
  filter_options,
  display_order,
  is_quick_filter,
  is_advanced_filter,
  is_active
) VALUES
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'contacts',
  'source',
  'Source',
  'text',
  'contains',
  '[]'::jsonb,
  60,
  false,
  true,
  true
);

-- Email filter (text search)
INSERT INTO filter_configs (
  tenant_id,
  entity_type,
  field_name,
  field_label,
  field_type,
  filter_operator,
  filter_options,
  display_order,
  is_quick_filter,
  is_advanced_filter,
  is_active
) VALUES
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'contacts',
  'email',
  'Email',
  'text',
  'contains',
  '[]'::jsonb,
  70,
  false,
  true,
  true
);

-- Phone filter (text search)
INSERT INTO filter_configs (
  tenant_id,
  entity_type,
  field_name,
  field_label,
  field_type,
  filter_operator,
  filter_options,
  display_order,
  is_quick_filter,
  is_advanced_filter,
  is_active
) VALUES
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'contacts',
  'phone',
  'Phone',
  'text',
  'contains',
  '[]'::jsonb,
  80,
  false,
  true,
  true
);

-- Created Date filter (date range)
INSERT INTO filter_configs (
  tenant_id,
  entity_type,
  field_name,
  field_label,
  field_type,
  filter_operator,
  filter_options,
  display_order,
  is_quick_filter,
  is_advanced_filter,
  is_active
) VALUES
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'contacts',
  'created_at',
  'Created Date',
  'date_range',
  'greater_than',
  '[]'::jsonb,
  90,
  false,
  true,
  true
);

-- Tags filter (multi-select) - Note: Requires tags infrastructure
INSERT INTO filter_configs (
  tenant_id,
  entity_type,
  field_name,
  field_label,
  field_type,
  filter_operator,
  filter_options,
  display_order,
  is_quick_filter,
  is_advanced_filter,
  is_active
) VALUES
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'contacts',
  'tags',
  'Tags',
  'tag_select',
  'in',
  '[]'::jsonb,
  100,
  false,
  true,
  false -- Disabled until tags system is implemented
);

-- Create a default "High Priority Leads" saved filter
INSERT INTO saved_filters (
  tenant_id,
  entity_type,
  name,
  description,
  filter_criteria,
  created_by,
  is_shared,
  is_default,
  usage_count
) VALUES
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'contacts',
  'High Priority Leads',
  'New leads with high or urgent priority',
  '{
    "stage": {"operator": "equals", "value": "lead"},
    "priority": {"operator": "in", "value": ["high", "urgent"]}
  }'::jsonb,
  '00000000-0000-0000-0000-000000000000'::uuid, -- System user
  true,
  true,
  0
);

-- Create a default "Active Customers" saved filter
INSERT INTO saved_filters (
  tenant_id,
  entity_type,
  name,
  description,
  filter_criteria,
  created_by,
  is_shared,
  is_default,
  usage_count
) VALUES
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'contacts',
  'Active Customers',
  'Contacts marked as customers',
  '{
    "stage": {"operator": "equals", "value": "customer"}
  }'::jsonb,
  '00000000-0000-0000-0000-000000000000'::uuid,
  true,
  true,
  0
);

-- Add comment for future reference
COMMENT ON TABLE filter_configs IS 'Stores configurable filter definitions. System defaults use 00000000-0000-0000-0000-000000000000 as tenant_id.';
COMMENT ON TABLE saved_filters IS 'Stores user-saved filter presets. System defaults use 00000000-0000-0000-0000-000000000000 as tenant_id and created_by.';
