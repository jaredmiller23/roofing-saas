-- =====================================================
-- QUICKBOOKS OAUTH CONNECTIONS TABLE
-- Date: 2025-10-01
-- Purpose: Store QuickBooks OAuth tokens securely
-- =====================================================

-- QuickBooks OAuth connections (one per tenant)
CREATE TABLE quickbooks_connections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  -- QuickBooks identifiers
  realm_id TEXT NOT NULL UNIQUE,
  company_name TEXT,

  -- OAuth tokens
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,

  -- Token expiration tracking
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  refresh_token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Connection status
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_error TEXT,

  -- Metadata
  environment VARCHAR(20) DEFAULT 'sandbox', -- sandbox or production

  UNIQUE(tenant_id) -- One QuickBooks connection per tenant
);

-- Enable RLS
ALTER TABLE quickbooks_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their tenant's QuickBooks connection"
ON quickbooks_connections FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert their tenant's QuickBooks connection"
ON quickbooks_connections FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update their tenant's QuickBooks connection"
ON quickbooks_connections FOR UPDATE
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete their tenant's QuickBooks connection"
ON quickbooks_connections FOR DELETE
USING (tenant_id = get_user_tenant_id());

-- Update trigger
CREATE TRIGGER update_quickbooks_connections_updated_at
BEFORE UPDATE ON quickbooks_connections
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_quickbooks_connections_tenant ON quickbooks_connections(tenant_id);
CREATE INDEX idx_quickbooks_connections_realm ON quickbooks_connections(realm_id);
CREATE INDEX idx_quickbooks_connections_active ON quickbooks_connections(tenant_id, is_active);

-- Add quickbooks_id columns to existing tables for sync tracking
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS quickbooks_customer_id TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS quickbooks_invoice_id TEXT;

CREATE INDEX idx_contacts_qb_id ON contacts(quickbooks_customer_id) WHERE quickbooks_customer_id IS NOT NULL;
CREATE INDEX idx_projects_qb_id ON projects(quickbooks_invoice_id) WHERE quickbooks_invoice_id IS NOT NULL;

-- Verification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'quickbooks_connections'
  ) THEN
    RAISE NOTICE 'SUCCESS: QuickBooks connections table created';
  ELSE
    RAISE EXCEPTION 'QuickBooks connections table creation failed';
  END IF;
END $$;
