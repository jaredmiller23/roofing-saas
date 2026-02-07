-- Migration: Scale indexes and constraints
-- Date: 2026-02-07
-- Purpose: GIN indexes for JSONB columns + unique email constraint per tenant
-- Rollback: DROP INDEX IF EXISTS idx_projects_custom_fields_gin;
--           DROP INDEX IF EXISTS idx_contacts_custom_fields_gin;
--           DROP INDEX IF EXISTS idx_contacts_unique_email_per_tenant;

-- =============================================================================
-- 1. GIN Indexes for JSONB columns
-- =============================================================================
-- GIN indexes dramatically speed up JSONB containment queries (@>, ?, ?|, ?&)
-- and path lookups (->>, #>>) on custom_fields columns.

CREATE INDEX IF NOT EXISTS idx_projects_custom_fields_gin
  ON projects USING GIN (custom_fields jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_contacts_custom_fields_gin
  ON contacts USING GIN (custom_fields jsonb_path_ops);

-- =============================================================================
-- 2. Partial Unique Index: Case-insensitive email per tenant
-- =============================================================================
-- Prevents duplicate emails within the same tenant while allowing:
-- - NULL emails (partial index excludes them)
-- - Empty string emails (partial index excludes them)
-- - Soft-deleted contacts (partial index excludes them)
-- - Same email in different tenants (tenant_id is in the index)
-- - Case-insensitive matching (LOWER(email))
--
-- Pre-check: Verified 0 duplicate emails exist in production (2026-02-07)

CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_unique_email_per_tenant
  ON contacts (tenant_id, LOWER(email))
  WHERE email IS NOT NULL
    AND email != ''
    AND is_deleted = false;
