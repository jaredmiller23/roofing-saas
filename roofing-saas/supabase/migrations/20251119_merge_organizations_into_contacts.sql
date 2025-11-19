-- =============================================
-- Organizations → Contacts Migration
-- =============================================
-- Purpose: Merge organizations table into contacts with enhanced type system
-- Date: 2025-11-19
-- Author: Claude Code
-- Research: /docs/research/ORGANIZATIONS_MIGRATION_RESEARCH.md
-- =============================================

-- =============================================
-- PHASE 0: PRE-MIGRATION VALIDATION & BACKUP
-- =============================================

DO $$
DECLARE
  org_count INTEGER;
  contact_count INTEGER;
  project_org_count INTEGER;
BEGIN
  -- Count records for logging
  SELECT COUNT(*) INTO org_count FROM organizations WHERE is_deleted = false;
  SELECT COUNT(*) INTO contact_count FROM contacts WHERE is_deleted = false;
  SELECT COUNT(*) INTO project_org_count FROM projects WHERE organization_id IS NOT NULL;

  RAISE NOTICE '=== PRE-MIGRATION STATUS ===';
  RAISE NOTICE 'Organizations (active): %', org_count;
  RAISE NOTICE 'Contacts (active): %', contact_count;
  RAISE NOTICE 'Projects with organization_id: %', project_org_count;
  RAISE NOTICE '';

  IF org_count > 0 THEN
    RAISE NOTICE 'WARNING: % organizations will be migrated to contacts', org_count;
  ELSE
    RAISE NOTICE 'INFO: No organizations to migrate (table unused as expected)';
  END IF;
END $$;

-- Create backup tables (for rollback if needed)
CREATE TABLE IF NOT EXISTS organizations_backup_20251119 AS
SELECT * FROM organizations;

CREATE TABLE IF NOT EXISTS contacts_backup_20251119 AS
SELECT * FROM contacts;

CREATE TABLE IF NOT EXISTS projects_backup_20251119 AS
SELECT id, organization_id, contact_id FROM projects;

RAISE NOTICE 'Backup tables created: organizations_backup_20251119, contacts_backup_20251119, projects_backup_20251119';

-- =============================================
-- PHASE 1: ADD NEW FIELDS TO CONTACTS TABLE
-- =============================================

-- Add is_organization flag
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS is_organization BOOLEAN DEFAULT false;

-- Add company name field
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS company TEXT;

-- Add website field
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS website TEXT;

-- Add contact_category field (replaces org_type + adds more)
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS contact_category TEXT;

-- Add constraint for contact_category values
ALTER TABLE contacts
ADD CONSTRAINT IF NOT EXISTS contact_category_check
CHECK (contact_category IS NULL OR contact_category IN (
  'homeowner',
  'adjuster',
  'sub_contractor',
  'real_estate_agent',
  'developer',
  'property_manager',
  'local_business',
  'other'
));

RAISE NOTICE 'Added new columns to contacts table: is_organization, company, website, contact_category';

-- =============================================
-- PHASE 2: SET DEFAULTS FOR EXISTING CONTACTS
-- =============================================

-- Set default category for existing contacts (assume homeowner)
UPDATE contacts
SET contact_category = 'homeowner'
WHERE contact_category IS NULL;

-- Set NOT NULL constraint after setting defaults
ALTER TABLE contacts
ALTER COLUMN contact_category SET DEFAULT 'homeowner';

ALTER TABLE contacts
ALTER COLUMN contact_category SET NOT NULL;

RAISE NOTICE 'Set default contact_category = homeowner for existing contacts';

-- =============================================
-- PHASE 3: MIGRATE ORGANIZATIONS DATA
-- =============================================

DO $$
DECLARE
  migrated_count INTEGER := 0;
  org_record RECORD;
  new_contact_id UUID;
BEGIN
  RAISE NOTICE '=== STARTING ORGANIZATIONS MIGRATION ===';

  -- Loop through each organization
  FOR org_record IN
    SELECT * FROM organizations WHERE is_deleted = false
  LOOP
    -- Insert organization as a contact
    INSERT INTO contacts (
      tenant_id,
      is_organization,
      company,
      first_name,
      last_name,
      email,
      phone,
      mobile_phone,
      address_street,
      address_city,
      address_state,
      address_zip,
      website,
      contact_category,
      type,
      stage,
      source,
      assigned_to,
      tags,
      custom_fields,
      created_at,
      updated_at,
      created_by,
      is_deleted
    )
    VALUES (
      org_record.tenant_id,
      true,                                    -- is_organization
      org_record.name,                        -- company
      org_record.name,                        -- first_name (company name)
      '',                                     -- last_name (empty for orgs)
      org_record.email,
      org_record.phone,
      NULL,                                   -- mobile_phone
      org_record.address_street,
      org_record.address_city,
      org_record.address_state,
      org_record.address_zip,
      org_record.website,
      -- Map org_type to contact_category
      CASE org_record.org_type
        WHEN 'real_estate' THEN 'real_estate_agent'
        WHEN 'developer' THEN 'developer'
        WHEN 'property_manager' THEN 'property_manager'
        WHEN 'local_business' THEN 'local_business'
        ELSE 'other'
      END,
      -- Map org stage to contact type (sales stage)
      CASE org_record.stage
        WHEN 'new' THEN 'lead'
        WHEN 'active' THEN 'customer'
        WHEN 'inactive' THEN 'prospect'
        ELSE 'lead'
      END,
      -- Map org stage to contact stage (pipeline stage)
      CASE org_record.stage
        WHEN 'new' THEN 'new'
        WHEN 'active' THEN 'won'
        WHEN 'inactive' THEN 'lost'
        ELSE 'new'
      END,
      'Organization Migration',               -- source
      org_record.default_assignee,           -- assigned_to
      org_record.tags,
      jsonb_build_object(
        'migrated_from_organization_id', org_record.id::TEXT,
        'original_org_type', org_record.org_type,
        'migration_date', NOW()::TEXT
      ),
      org_record.created_at,
      org_record.updated_at,
      org_record.created_by,
      org_record.is_deleted
    )
    RETURNING id INTO new_contact_id;

    -- Update projects that referenced this organization
    -- Link them to the migrated contact
    UPDATE projects
    SET contact_id = new_contact_id
    WHERE organization_id = org_record.id
      AND contact_id IS NULL;  -- Only update if no contact already set

    -- Also update if there was a primary_contact_id
    -- Prefer the primary contact over the org contact
    UPDATE projects
    SET contact_id = COALESCE(org_record.primary_contact_id, new_contact_id)
    WHERE organization_id = org_record.id;

    migrated_count := migrated_count + 1;
  END LOOP;

  RAISE NOTICE 'Migrated % organizations to contacts', migrated_count;

  IF migrated_count > 0 THEN
    RAISE NOTICE 'Organization data preserved in custom_fields.migrated_from_organization_id';
  END IF;
END $$;

-- =============================================
-- PHASE 4: UPDATE PROJECT RELATIONSHIPS
-- =============================================

-- For projects that still have organization_id but no contact_id,
-- try to use the organization's primary_contact_id
UPDATE projects p
SET contact_id = o.primary_contact_id
FROM organizations o
WHERE p.organization_id = o.id
  AND p.contact_id IS NULL
  AND o.primary_contact_id IS NOT NULL;

RAISE NOTICE 'Updated project contacts from organization primary_contact_id references';

-- =============================================
-- PHASE 5: DROP ORGANIZATION REFERENCES
-- =============================================

-- Drop organization_id column from projects
ALTER TABLE projects
DROP COLUMN IF EXISTS organization_id;

RAISE NOTICE 'Dropped organization_id column from projects table';

-- =============================================
-- PHASE 6: DROP ORGANIZATIONS TABLE
-- =============================================

-- Drop all organizations table policies first
DROP POLICY IF EXISTS "Users can view organizations in their tenant" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Users can update organizations" ON organizations;
DROP POLICY IF EXISTS "Users can delete organizations" ON organizations;

-- Drop triggers
DROP TRIGGER IF EXISTS organizations_updated_at ON organizations;

-- Drop functions
DROP FUNCTION IF EXISTS update_organization_updated_at();

-- Drop indexes
DROP INDEX IF EXISTS idx_organizations_tenant_id;
DROP INDEX IF EXISTS idx_organizations_org_type;
DROP INDEX IF EXISTS idx_organizations_stage;
DROP INDEX IF EXISTS idx_organizations_primary_contact_id;
DROP INDEX IF EXISTS idx_organizations_created_at;
DROP INDEX IF EXISTS idx_projects_organization_id;

-- Finally, drop the table
DROP TABLE IF EXISTS organizations CASCADE;

RAISE NOTICE 'Dropped organizations table and all associated policies, triggers, functions, and indexes';

-- =============================================
-- PHASE 7: CREATE NEW INDEXES FOR PERFORMANCE
-- =============================================

-- Index on is_organization for filtering
CREATE INDEX IF NOT EXISTS idx_contacts_is_organization
ON contacts(is_organization)
WHERE is_organization = true;

-- Index on company for searching
CREATE INDEX IF NOT EXISTS idx_contacts_company
ON contacts(company)
WHERE company IS NOT NULL;

-- GIN index on company for full-text search
CREATE INDEX IF NOT EXISTS idx_contacts_company_gin
ON contacts USING gin(to_tsvector('english', company))
WHERE company IS NOT NULL;

-- Index on contact_category for filtering
CREATE INDEX IF NOT EXISTS idx_contacts_contact_category
ON contacts(contact_category);

-- Composite index for combined type filtering
CREATE INDEX IF NOT EXISTS idx_contacts_type_category
ON contacts(type, contact_category);

-- Index on website
CREATE INDEX IF NOT EXISTS idx_contacts_website
ON contacts(website)
WHERE website IS NOT NULL;

RAISE NOTICE 'Created performance indexes on new contact fields';

-- =============================================
-- PHASE 8: UPDATE SEARCH VECTOR (if exists)
-- =============================================

-- Check if search_vector column exists and update it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'search_vector'
  ) THEN
    -- Update search vector to include company name
    UPDATE contacts
    SET search_vector = to_tsvector('english',
      COALESCE(first_name, '') || ' ' ||
      COALESCE(last_name, '') || ' ' ||
      COALESCE(company, '') || ' ' ||
      COALESCE(email, '') || ' ' ||
      COALESCE(phone, '')
    )
    WHERE company IS NOT NULL;

    RAISE NOTICE 'Updated search_vector to include company names';
  END IF;
END $$;

-- =============================================
-- PHASE 9: VALIDATION & VERIFICATION
-- =============================================

DO $$
DECLARE
  final_contact_count INTEGER;
  org_contact_count INTEGER;
  projects_without_contact INTEGER;
  projects_with_contact INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== POST-MIGRATION VALIDATION ===';

  -- Count contacts
  SELECT COUNT(*) INTO final_contact_count FROM contacts WHERE is_deleted = false;
  SELECT COUNT(*) INTO org_contact_count FROM contacts WHERE is_organization = true AND is_deleted = false;

  RAISE NOTICE 'Total contacts (active): %', final_contact_count;
  RAISE NOTICE 'Organization contacts: %', org_contact_count;

  -- Check projects
  SELECT COUNT(*) INTO projects_with_contact FROM projects WHERE contact_id IS NOT NULL;
  SELECT COUNT(*) INTO projects_without_contact FROM projects WHERE contact_id IS NULL;

  RAISE NOTICE 'Projects with contact_id: %', projects_with_contact;
  RAISE NOTICE 'Projects without contact_id: %', projects_without_contact;

  -- Verify organizations table is gone
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    RAISE NOTICE '✓ Organizations table successfully dropped';
  ELSE
    RAISE WARNING '✗ Organizations table still exists!';
  END IF;

  -- Verify new columns exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'is_organization') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'company') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'contact_category') THEN
    RAISE NOTICE '✓ New contact columns successfully added';
  ELSE
    RAISE WARNING '✗ Some new columns missing from contacts table!';
  END IF;

  -- Check for orphaned data
  IF projects_without_contact > 0 THEN
    RAISE WARNING 'WARNING: % projects have no contact_id (may need manual assignment)', projects_without_contact;
  ELSE
    RAISE NOTICE '✓ All projects have contact assignments';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '=== MIGRATION COMPLETE ===';
  RAISE NOTICE 'Backup tables preserved for rollback if needed:';
  RAISE NOTICE '  - organizations_backup_20251119';
  RAISE NOTICE '  - contacts_backup_20251119';
  RAISE NOTICE '  - projects_backup_20251119';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test contact creation with new fields';
  RAISE NOTICE '2. Update TypeScript types (/lib/types/contact.ts)';
  RAISE NOTICE '3. Update UI components to use new fields';
  RAISE NOTICE '4. If successful, drop backup tables after 7 days';
END $$;

-- =============================================
-- ROLLBACK PROCEDURE (if needed)
-- =============================================

/*
-- ONLY RUN IF MIGRATION FAILED AND ROLLBACK IS NEEDED

-- 1. Restore organizations table
CREATE TABLE organizations AS SELECT * FROM organizations_backup_20251119;

-- 2. Restore contacts table
DROP TABLE contacts;
CREATE TABLE contacts AS SELECT * FROM contacts_backup_20251119;

-- 3. Restore projects organization_id
ALTER TABLE projects ADD COLUMN organization_id UUID;
UPDATE projects p
SET organization_id = pb.organization_id
FROM projects_backup_20251119 pb
WHERE p.id = pb.id;

-- 4. Re-create all organizations indexes, policies, triggers
-- (Run the original organizations migration script)

-- 5. Drop backup tables
DROP TABLE organizations_backup_20251119;
DROP TABLE contacts_backup_20251119;
DROP TABLE projects_backup_20251119;

RAISE NOTICE 'Rollback complete - organizations table restored';
*/

-- =============================================
-- COMMENTS FOR NEW FIELDS
-- =============================================

COMMENT ON COLUMN contacts.is_organization IS 'True if this contact represents a company/organization, false if individual person';
COMMENT ON COLUMN contacts.company IS 'Company name - can be set for both organizations and individuals (employer)';
COMMENT ON COLUMN contacts.website IS 'Company or personal website URL';
COMMENT ON COLUMN contacts.contact_category IS 'Contact category: homeowner, adjuster, sub_contractor, real_estate_agent, developer, property_manager, local_business, or other';

-- =============================================
-- MIGRATION METADATA
-- =============================================

-- Log migration execution
DO $$
BEGIN
  -- You could insert into a migrations_log table if you have one
  RAISE NOTICE 'Migration 20251119_merge_organizations_into_contacts completed at %', NOW();
END $$;
