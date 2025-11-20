-- Seed filter configurations for tasks and call_logs
-- This provides commonly used filters out of the box

-- First, update the entity_type check constraint to include tasks and call_logs
ALTER TABLE filter_configs DROP CONSTRAINT IF EXISTS filter_configs_entity_type_check;
ALTER TABLE filter_configs ADD CONSTRAINT filter_configs_entity_type_check
  CHECK (entity_type IN ('contacts', 'projects', 'pipeline', 'activities', 'tasks', 'call_logs'));

-- ============================================
-- TASKS FILTERS
-- ============================================

-- Status filter (multi-select dropdown)
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
  'tasks',
  'status',
  'Status',
  'multi_select',
  'in',
  '[
    {"value": "todo", "label": "To Do"},
    {"value": "in_progress", "label": "In Progress"},
    {"value": "review", "label": "In Review"},
    {"value": "done", "label": "Done"},
    {"value": "cancelled", "label": "Cancelled"}
  ]'::jsonb,
  10,
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
  'tasks',
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
  20,
  true,
  true,
  true
);

-- Assigned To filter (user select)
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
  'tasks',
  'assigned_to',
  'Assigned To',
  'user_select',
  'equals',
  '[]'::jsonb, -- Will be populated dynamically from users table
  30,
  true,
  true,
  true
);

-- Due Date filter (date range)
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
  'tasks',
  'due_date',
  'Due Date',
  'date_range',
  'between',
  '[]'::jsonb,
  40,
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
  'tasks',
  'created_at',
  'Created Date',
  'date_range',
  'between',
  '[]'::jsonb,
  50,
  false,
  true,
  true
);

-- ============================================
-- CALL LOGS FILTERS
-- ============================================

-- Direction filter (select dropdown)
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
  'call_logs',
  'direction',
  'Direction',
  'select',
  'equals',
  '[
    {"value": "inbound", "label": "Inbound"},
    {"value": "outbound", "label": "Outbound"}
  ]'::jsonb,
  10,
  true,
  true,
  true
);

-- Status filter (select dropdown)
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
  'call_logs',
  'status',
  'Status',
  'select',
  'equals',
  '[
    {"value": "completed", "label": "Completed"},
    {"value": "missed", "label": "Missed"},
    {"value": "voicemail", "label": "Voicemail"},
    {"value": "busy", "label": "Busy"},
    {"value": "no-answer", "label": "No Answer"},
    {"value": "failed", "label": "Failed"}
  ]'::jsonb,
  20,
  true,
  true,
  true
);

-- Duration filter (number range in seconds)
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
  'call_logs',
  'duration',
  'Duration (seconds)',
  'number_range',
  'between',
  '[]'::jsonb,
  30,
  false,
  true,
  true
);

-- Call Date filter (date range)
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
  'call_logs',
  'created_at',
  'Call Date',
  'date_range',
  'between',
  '[]'::jsonb,
  40,
  false,
  true,
  true
);

-- User/Agent filter (user select)
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
  'call_logs',
  'user_id',
  'User/Agent',
  'user_select',
  'equals',
  '[]'::jsonb, -- Will be populated dynamically from users table
  50,
  false,
  true,
  true
);

-- Add comments for documentation
COMMENT ON TABLE filter_configs IS 'Stores configurable filter definitions. System defaults use 00000000-0000-0000-0000-000000000000 as tenant_id. Now includes tasks and call_logs entity types.';
