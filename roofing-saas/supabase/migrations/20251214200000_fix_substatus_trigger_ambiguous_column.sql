-- Migration: Fix ambiguous column reference in set_default_substatus trigger
-- Rollback: N/A - original function was broken, no benefit to reverting
--
-- Issue: Variable "status_value" conflicted with column name "status_value"
-- in status_substatus_configs table, causing:
--   ERROR: column reference "status_value" is ambiguous
--
-- Root cause: Line 145 in original migration (20251119000500_substatus_system.sql)
--   AND status_value = status_value
-- PostgreSQL couldn't tell if this meant column=column or column=variable

CREATE OR REPLACE FUNCTION set_default_substatus()
RETURNS TRIGGER AS $$
DECLARE
  default_substatus TEXT;
  entity_type_name TEXT;
  status_field TEXT;
  current_status_value TEXT;  -- RENAMED from status_value to avoid ambiguity
BEGIN
  -- Determine entity type and status field based on table
  IF TG_TABLE_NAME = 'contacts' THEN
    entity_type_name := 'contacts';
    status_field := 'stage';
    current_status_value := NEW.stage;
  ELSIF TG_TABLE_NAME = 'projects' THEN
    entity_type_name := 'projects';
    status_field := 'status';
    current_status_value := NEW.status;
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
      AND status_value = current_status_value  -- FIXED: now unambiguous
      AND is_default = true
      AND is_active = true
    LIMIT 1;

    -- Set default substatus if found, otherwise null
    NEW.substatus := default_substatus;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: No need to recreate triggers - they reference the function by name
-- and will automatically use the updated definition
