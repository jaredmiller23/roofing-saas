-- =====================================================
-- ADD TENANT_ID TO QUOTE_LINE_ITEMS
-- Date: 2026-01-11
--
-- Problem: quote_line_items relies on indirect join for tenant isolation
-- which is slower and less secure than direct tenant_id filtering.
-- Also, RLS policies use JWT claims which don't work with our auth setup.
--
-- This migration:
-- 1. Adds tenant_id column to quote_line_items
-- 2. Backfills tenant_id from quote_options
-- 3. Updates RLS policies to use tenant_users lookup
-- =====================================================

-- =====================================================
-- STEP 1: Add tenant_id column to quote_line_items
-- =====================================================

ALTER TABLE quote_line_items
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Create index for tenant filtering
CREATE INDEX IF NOT EXISTS idx_quote_line_items_tenant ON quote_line_items(tenant_id);

-- =====================================================
-- STEP 2: Backfill tenant_id from quote_options
-- =====================================================

UPDATE quote_line_items
SET tenant_id = (
  SELECT qo.tenant_id
  FROM quote_options qo
  WHERE qo.id = quote_line_items.quote_option_id
)
WHERE tenant_id IS NULL;

-- =====================================================
-- STEP 3: Fix RLS policy on quote_options
-- =====================================================

DROP POLICY IF EXISTS "Users can manage org quotes" ON quote_options;
DROP POLICY IF EXISTS "Users can manage quotes in their tenant" ON quote_options;

CREATE POLICY "Users can manage quotes in their tenant" ON quote_options
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- =====================================================
-- STEP 4: Fix RLS policy on quote_line_items
-- =====================================================

DROP POLICY IF EXISTS "Users can manage quote line items" ON quote_line_items;
DROP POLICY IF EXISTS "Users can manage quote line items in their tenant" ON quote_line_items;

-- Use direct tenant_id check instead of subquery
CREATE POLICY "Users can manage quote line items in their tenant" ON quote_line_items
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '=== Quote Line Items Tenant Isolation Fix ===';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  - Added tenant_id column to quote_line_items';
  RAISE NOTICE '  - Backfilled tenant_id from quote_options';
  RAISE NOTICE '  - Updated RLS to use tenant_users lookup';
  RAISE NOTICE '';
  RAISE NOTICE 'NOTE: New quote_line_items must include tenant_id.';
  RAISE NOTICE '      API routes should set tenant_id when inserting.';
END $$;
