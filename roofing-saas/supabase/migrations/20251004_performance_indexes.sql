-- Performance Optimization: Add Missing Indexes
-- Created: October 4, 2025
-- Purpose: Improve query performance on frequently accessed columns

-- Contacts table indexes
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_status ON contacts(tenant_id, status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone) WHERE is_deleted = false;

-- Projects table indexes
CREATE INDEX IF NOT EXISTS idx_projects_tenant_status ON projects(tenant_id, status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_projects_contact_id ON projects(contact_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_projects_completion ON projects(actual_completion DESC) WHERE is_deleted = false AND actual_completion IS NOT NULL;

-- Activities table indexes (for dashboard and contact history)
CREATE INDEX IF NOT EXISTS idx_activities_tenant_created ON activities(tenant_id, created_at DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON activities(contact_id, created_at DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_activities_project_id ON activities(project_id, created_at DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(activity_type, created_at DESC) WHERE is_deleted = false;

-- Door knocks table indexes (for territory and gamification)
CREATE INDEX IF NOT EXISTS idx_door_knocks_tenant_date ON door_knocks(tenant_id, knock_date DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_door_knocks_user_id ON door_knocks(user_id, knock_date DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_door_knocks_territory ON door_knocks(territory_id, knock_date DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_door_knocks_outcome ON door_knocks(outcome, knock_date DESC) WHERE is_deleted = false;

-- Events table indexes (for calendar views)
CREATE INDEX IF NOT EXISTS idx_events_tenant_start ON events(tenant_id, start_at) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id, start_at) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_events_contact_id ON events(contact_id, start_at) WHERE is_deleted = false;

-- Call logs table indexes
CREATE INDEX IF NOT EXISTS idx_call_logs_tenant_created ON call_logs(tenant_id, created_at DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_call_logs_contact_id ON call_logs(contact_id, created_at DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_call_logs_user_id ON call_logs(user_id, created_at DESC) WHERE is_deleted = false;

-- Tasks table indexes
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_status ON tasks(tenant_id, status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id, status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE is_deleted = false AND status != 'completed';

-- Job expenses indexes (for costing reports)
CREATE INDEX IF NOT EXISTS idx_job_expenses_project_id ON job_expenses(project_id, expense_date DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_job_expenses_tenant_date ON job_expenses(tenant_id, expense_date DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_job_expenses_type ON job_expenses(expense_type, expense_date DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_job_expenses_vendor ON job_expenses(vendor_name, expense_date DESC) WHERE is_deleted = false;

-- Commission records indexes
CREATE INDEX IF NOT EXISTS idx_commission_records_user_id ON commission_records(user_id, period_start DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_commission_records_status ON commission_records(status, period_start DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_commission_records_project ON commission_records(project_id) WHERE is_deleted = false;

-- Signature documents indexes
CREATE INDEX IF NOT EXISTS idx_signature_docs_tenant_status ON signature_documents(tenant_id, status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_signature_docs_created ON signature_documents(created_at DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_signature_docs_project ON signature_documents(project_id) WHERE is_deleted = false;

-- Gamification indexes
CREATE INDEX IF NOT EXISTS idx_points_transactions_user ON points_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_points_transactions_tenant ON points_transactions(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id, unlocked_at DESC) WHERE is_deleted = false;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_projects_revenue_analysis ON projects(tenant_id, status, actual_completion)
  WHERE is_deleted = false AND actual_completion IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_pipeline ON contacts(tenant_id, status, created_at DESC)
  WHERE is_deleted = false AND status != 'archived';

CREATE INDEX IF NOT EXISTS idx_activities_recent ON activities(tenant_id, activity_type, created_at DESC)
  WHERE is_deleted = false;

-- COMMENT: These indexes significantly improve:
-- 1. Dashboard metrics queries (revenue, activities, pipeline)
-- 2. Contact and project list views with filtering
-- 3. Calendar event lookups
-- 4. Gamification leaderboards
-- 5. Financial reporting (P&L, commissions, job costing)
-- 6. Territory management and door knock tracking

-- Analyze tables to update statistics
ANALYZE contacts;
ANALYZE projects;
ANALYZE activities;
ANALYZE door_knocks;
ANALYZE events;
ANALYZE call_logs;
ANALYZE tasks;
ANALYZE job_expenses;
ANALYZE commission_records;
ANALYZE signature_documents;
ANALYZE points_transactions;
ANALYZE achievements;
