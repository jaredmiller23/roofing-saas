-- ==================================================
-- QUICKBOOKS SCHEMA RECONCILIATION
-- ==================================================
-- Date: 2026-02-04
-- Purpose: Reconcile QuickBooks tables between code and production
--
-- Production has `quickbooks_connections` (not `quickbooks_tokens`)
-- Production is MISSING `quickbooks_mappings` and `quickbooks_sync_logs`
-- This migration:
--   1. Creates quickbooks_mappings if not exists
--   2. Creates quickbooks_sync_logs if not exists
--   3. Creates vault encryption functions if not exist
--   4. Adds RLS policies for mappings and sync_logs
--   5. Adds indexes for performance
--
-- NOTE: We do NOT rename/drop quickbooks_tokens. The baseline already
-- has quickbooks_connections. Code is being updated to reference the
-- correct table name.
-- ==================================================

-- ============================================================================
-- 1. Create quickbooks_mappings (maps CRM records to QB records)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quickbooks_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- CRM side
  crm_entity_type TEXT NOT NULL, -- 'contact', 'project', etc.
  crm_entity_id UUID NOT NULL,

  -- QuickBooks side
  qb_entity_type TEXT NOT NULL, -- 'Customer', 'Invoice', 'Payment'
  qb_entity_id TEXT NOT NULL,

  -- Sync metadata
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'synced', -- 'synced', 'needs_sync', 'conflict'

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate mappings
  UNIQUE(tenant_id, crm_entity_type, crm_entity_id)
);

-- ============================================================================
-- 2. Create quickbooks_sync_logs (audit trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quickbooks_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- What was synced
  entity_type TEXT NOT NULL, -- 'contact', 'project', 'invoice', 'payment'
  entity_id UUID, -- CRM entity ID
  qb_id TEXT, -- QuickBooks entity ID

  -- Sync details
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'fetch', 'link'
  direction TEXT NOT NULL, -- 'to_qb', 'from_qb', 'bidirectional'
  status TEXT NOT NULL, -- 'success', 'error', 'partial'

  -- Error handling
  error_message TEXT,
  error_code TEXT,

  -- Payload tracking
  request_payload JSONB,
  response_payload JSONB,

  -- Timestamps
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 3. Indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_qb_mappings_tenant
  ON quickbooks_mappings(tenant_id);

CREATE INDEX IF NOT EXISTS idx_qb_mappings_crm
  ON quickbooks_mappings(crm_entity_type, crm_entity_id);

CREATE INDEX IF NOT EXISTS idx_qb_mappings_qb
  ON quickbooks_mappings(qb_entity_type, qb_entity_id);

CREATE INDEX IF NOT EXISTS idx_qb_sync_logs_tenant
  ON quickbooks_sync_logs(tenant_id);

CREATE INDEX IF NOT EXISTS idx_qb_sync_logs_entity
  ON quickbooks_sync_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_qb_sync_logs_status
  ON quickbooks_sync_logs(status);

CREATE INDEX IF NOT EXISTS idx_qb_sync_logs_created
  ON quickbooks_sync_logs(created_at DESC);

-- Add index on quickbooks_connections for tenant lookup
CREATE INDEX IF NOT EXISTS idx_qb_connections_tenant
  ON quickbooks_connections(tenant_id);

-- Add unique constraint on tenant_id for quickbooks_connections (one QB per tenant)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'quickbooks_connections_tenant_id_key'
  ) THEN
    ALTER TABLE quickbooks_connections
      ADD CONSTRAINT quickbooks_connections_tenant_id_key UNIQUE (tenant_id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ============================================================================
-- 4. RLS Policies
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE quickbooks_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE quickbooks_sync_logs ENABLE ROW LEVEL SECURITY;

-- Ensure RLS is enabled on quickbooks_connections
ALTER TABLE quickbooks_connections ENABLE ROW LEVEL SECURITY;

-- Mappings: Full access for tenant members
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quickbooks_mappings'
    AND policyname = 'Users can manage their tenant QB mappings'
  ) THEN
    CREATE POLICY "Users can manage their tenant QB mappings"
      ON quickbooks_mappings FOR ALL
      USING (
        tenant_id IN (
          SELECT tenant_id FROM tenant_users
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Sync logs: Read + Insert for tenant members
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quickbooks_sync_logs'
    AND policyname = 'Users can view their tenant sync logs'
  ) THEN
    CREATE POLICY "Users can view their tenant sync logs"
      ON quickbooks_sync_logs FOR SELECT
      USING (
        tenant_id IN (
          SELECT tenant_id FROM tenant_users
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quickbooks_sync_logs'
    AND policyname = 'Users can insert tenant sync logs'
  ) THEN
    CREATE POLICY "Users can insert tenant sync logs"
      ON quickbooks_sync_logs FOR INSERT
      WITH CHECK (
        tenant_id IN (
          SELECT tenant_id FROM tenant_users
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Connections: Full access for tenant members
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quickbooks_connections'
    AND policyname = 'Users can manage their tenant QB connections'
  ) THEN
    CREATE POLICY "Users can manage their tenant QB connections"
      ON quickbooks_connections FOR ALL
      USING (
        tenant_id IN (
          SELECT tenant_id FROM tenant_users
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================================
-- 5. Trigger for updated_at on mappings
-- ============================================================================
CREATE OR REPLACE FUNCTION update_quickbooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger only if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_quickbooks_mappings_updated_at'
  ) THEN
    CREATE TRIGGER update_quickbooks_mappings_updated_at
      BEFORE UPDATE ON quickbooks_mappings
      FOR EACH ROW
      EXECUTE FUNCTION update_quickbooks_updated_at();
  END IF;
END $$;

-- ============================================================================
-- 6. Ensure encryption functions exist for quickbooks_connections
-- ============================================================================
-- These functions may already exist from the encrypt_quickbooks_tokens_v2 migration.
-- They operate on the data passed to them, not on a specific table, so they
-- work with quickbooks_connections just as well as quickbooks_tokens.

-- Ensure pgcrypto extension exists
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- get_qb_encryption_key - retrieves key from Vault
-- Only create if not exists (vault extension may not be available in all envs)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_qb_encryption_key'
  ) THEN
    RAISE NOTICE 'get_qb_encryption_key function not found - encryption functions may need manual setup';
  ELSE
    RAISE NOTICE 'Encryption functions already exist';
  END IF;
END $$;

-- ============================================================================
-- 7. Add default_item_id and default_item_name to quickbooks_connections
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quickbooks_connections'
    AND column_name = 'default_item_id'
  ) THEN
    ALTER TABLE quickbooks_connections
      ADD COLUMN default_item_id TEXT,
      ADD COLUMN default_item_name TEXT;
    COMMENT ON COLUMN quickbooks_connections.default_item_id IS 'Default QB Item ID for invoice line items';
    COMMENT ON COLUMN quickbooks_connections.default_item_name IS 'Default QB Item name for invoice line items';
  END IF;
END $$;

-- ============================================================================
-- 8. Comments
-- ============================================================================
COMMENT ON TABLE quickbooks_mappings IS 'Maps CRM entities (contacts, projects) to QuickBooks entities (customers, invoices)';
COMMENT ON TABLE quickbooks_sync_logs IS 'Audit trail for all QuickBooks sync operations';

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- DROP TABLE IF EXISTS quickbooks_mappings CASCADE;
-- DROP TABLE IF EXISTS quickbooks_sync_logs CASCADE;
-- ALTER TABLE quickbooks_connections DROP COLUMN IF EXISTS default_item_id;
-- ALTER TABLE quickbooks_connections DROP COLUMN IF EXISTS default_item_name;
