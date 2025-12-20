-- Add tenant setting for auto-creating projects when homeowner contacts are created
-- Task: 1A584D7F-AUTOCREA001

-- Add auto_create_project_for_homeowners column to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS auto_create_project_for_homeowners TEXT DEFAULT 'prompt'
CHECK (auto_create_project_for_homeowners IN ('always', 'prompt', 'never'));

-- Add comment for documentation
COMMENT ON COLUMN tenants.auto_create_project_for_homeowners IS
'Controls behavior when homeowner contacts are created: always (auto-create project), prompt (ask user), never (manual only)';