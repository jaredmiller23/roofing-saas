-- =====================================================
-- ORGANIZATIONS TABLE
-- Date: 2025-10-03
-- Purpose: Track business clients (real estate, property managers, developers)
-- Critical for: Commercial client management, referral tracking
-- =====================================================

-- Organizations Table
-- Manages business entities that generate multiple projects
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Organization details
  name TEXT NOT NULL,
  org_type TEXT CHECK (org_type IN ('real_estate', 'developer', 'property_manager', 'local_business', 'other')),
  stage TEXT CHECK (stage IN ('new', 'active', 'inactive')) DEFAULT 'new',

  -- Primary contact
  primary_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  -- Address
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,

  -- Contact info
  phone TEXT,
  email TEXT,
  website TEXT,

  -- Additional details
  notes TEXT,
  tags TEXT[], -- Array of tags for categorization

  -- Defaults for new projects
  default_assignee UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Add organization_id to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_organizations_tenant_id ON organizations(tenant_id);
CREATE INDEX idx_organizations_org_type ON organizations(org_type);
CREATE INDEX idx_organizations_stage ON organizations(stage);
CREATE INDEX idx_organizations_primary_contact_id ON organizations(primary_contact_id);
CREATE INDEX idx_organizations_created_at ON organizations(created_at DESC);

CREATE INDEX idx_projects_organization_id ON projects(organization_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Users can view organizations in their tenant
CREATE POLICY "Users can view organizations in their tenant"
  ON organizations FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can create organizations in their tenant
CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can update organizations in their tenant
CREATE POLICY "Users can update organizations"
  ON organizations FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can delete (soft delete) organizations in their tenant
CREATE POLICY "Users can delete organizations"
  ON organizations FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_organization_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on organizations
CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE organizations IS 'Business entities that generate multiple projects (real estate agents, property managers, developers, local businesses)';
COMMENT ON COLUMN organizations.org_type IS 'Type of organization: real_estate, developer, property_manager, local_business, other';
COMMENT ON COLUMN organizations.stage IS 'Organization lifecycle stage: new, active, inactive';
COMMENT ON COLUMN organizations.primary_contact_id IS 'Main point of contact at this organization';
COMMENT ON COLUMN organizations.default_assignee IS 'Default user to assign new projects from this organization';
COMMENT ON COLUMN organizations.tags IS 'Array of tags for categorization and filtering';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== Organizations Table Created ===';
  RAISE NOTICE 'Created organizations table with RLS policies';
  RAISE NOTICE 'Added organization_id column to projects table';
  RAISE NOTICE 'Created indexes for performance';
  RAISE NOTICE 'Created helper functions and triggers';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Build Organizations CRUD UI';
  RAISE NOTICE '2. Add organization selector to project creation';
  RAISE NOTICE '3. Build organization detail page';
  RAISE NOTICE '4. Import existing organization data (if any)';
END $$;
