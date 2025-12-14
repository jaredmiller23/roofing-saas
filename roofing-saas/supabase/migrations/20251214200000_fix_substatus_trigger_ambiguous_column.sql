-- Migration: Fix ambiguous column reference in set_default_substatus trigger
-- Rollback: N/A - original function was broken, no benefit to reverting
--
-- Issues fixed:
-- 1. Variable "status_value" conflicted with column name "status_value"
--    causing: ERROR: column reference "status_value" is ambiguous
-- 2. OLD.status referenced on contacts table (which has "stage" not "status")
--    causing: ERROR: record "old" has no field "status"
--
-- Fix: Use separate IF blocks per table to avoid cross-table column references

CREATE OR REPLACE FUNCTION set_default_substatus()
RETURNS TRIGGER AS $$
DECLARE
  default_substatus TEXT;
  entity_type_name TEXT;
  status_field TEXT;
  current_status_value TEXT;
  should_update_substatus BOOLEAN := FALSE;
BEGIN
  -- Handle contacts table
  IF TG_TABLE_NAME = 'contacts' THEN
    entity_type_name := 'contacts';
    status_field := 'stage';
    current_status_value := NEW.stage;

    -- Check if this is an insert or if stage changed
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.stage IS DISTINCT FROM NEW.stage) THEN
      should_update_substatus := TRUE;
    END IF;

  -- Handle projects table
  ELSIF TG_TABLE_NAME = 'projects' THEN
    entity_type_name := 'projects';
    status_field := 'status';
    current_status_value := NEW.status;

    -- Check if this is an insert or if status changed
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
      should_update_substatus := TRUE;
    END IF;

  ELSE
    RETURN NEW;
  END IF;

  -- Update substatus if needed
  IF should_update_substatus THEN
    SELECT substatus_value INTO default_substatus
    FROM status_substatus_configs
    WHERE tenant_id = NEW.tenant_id
      AND entity_type = entity_type_name
      AND status_field_name = status_field
      AND status_value = current_status_value
      AND is_default = true
      AND is_active = true
    LIMIT 1;

    NEW.substatus := default_substatus;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: No need to recreate triggers - they reference the function by name
-- and will automatically use the updated definition
