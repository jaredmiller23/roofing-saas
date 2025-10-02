-- =====================================================
-- PERFORMANCE INDEXES
-- Date: 2025-10-01
-- Add indexes for frequently queried columns to improve performance
-- =====================================================

-- Tenant-based queries (most common pattern)
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activities_tenant_id ON activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_templates_tenant_id ON templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automations_tenant_id ON automations(tenant_id);

-- User lookups
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON tenant_users(tenant_id);

-- QuickBooks integration
CREATE INDEX IF NOT EXISTS idx_quickbooks_connections_tenant_id ON quickbooks_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quickbooks_connections_realm_id ON quickbooks_connections(realm_id);

-- Contact queries
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_stage ON contacts(stage);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);

-- Project queries
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- Activity queries
CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_project_id ON activities(project_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_stage ON contacts(tenant_id, stage);
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_type ON contacts(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_status ON projects(tenant_id, status);

-- Soft delete queries
CREATE INDEX IF NOT EXISTS idx_contacts_not_deleted ON contacts(tenant_id, is_deleted) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_projects_not_deleted ON projects(tenant_id, is_deleted) WHERE is_deleted = false;

-- NOTE: Indexes for future phase tables (voice_sessions, gamification_scores,
-- kpi_snapshots, commissions) will be added when those tables are created
-- in their respective phase migrations (Phases 3-5)

-- Verification
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%';

  RAISE NOTICE '=== Index Creation Complete ===';
  RAISE NOTICE 'Total custom indexes: %', index_count;
  RAISE NOTICE 'Performance optimization applied to all tenant-scoped tables';
END $$;
