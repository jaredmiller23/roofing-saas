-- QuickBooks Integration Tables
-- Created: 2025-10-04
-- Purpose: Store QB OAuth tokens, sync logs, and mapping data

-- QuickBooks tokens (encrypted)
CREATE TABLE IF NOT EXISTS quickbooks_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- OAuth tokens
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  realm_id TEXT NOT NULL, -- QuickBooks company ID

  -- Token metadata
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  token_type TEXT DEFAULT 'Bearer',

  -- Connection info
  company_name TEXT,
  country TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One QB connection per tenant
  UNIQUE(tenant_id)
);

-- QuickBooks sync logs (audit trail)
CREATE TABLE IF NOT EXISTS quickbooks_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- What was synced
  entity_type TEXT NOT NULL, -- 'contact', 'project', 'invoice', 'payment'
  entity_id UUID, -- CRM entity ID
  qb_id TEXT, -- QuickBooks entity ID

  -- Sync details
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'fetch'
  direction TEXT NOT NULL, -- 'to_qb', 'from_qb', 'bidirectional'
  status TEXT NOT NULL, -- 'success', 'failed', 'partial'

  -- Error handling
  error_message TEXT,
  error_code TEXT,

  -- Payload tracking
  request_payload JSONB,
  response_payload JSONB,

  -- Timestamps
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes for common queries
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- QB entity mappings (link CRM records to QB records)
CREATE TABLE IF NOT EXISTS quickbooks_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_qb_tokens_tenant ON quickbooks_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qb_sync_logs_tenant ON quickbooks_sync_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qb_sync_logs_entity ON quickbooks_sync_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_qb_sync_logs_status ON quickbooks_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_qb_sync_logs_created ON quickbooks_sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qb_mappings_tenant ON quickbooks_mappings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qb_mappings_crm ON quickbooks_mappings(crm_entity_type, crm_entity_id);
CREATE INDEX IF NOT EXISTS idx_qb_mappings_qb ON quickbooks_mappings(qb_entity_type, qb_entity_id);

-- RLS Policies
ALTER TABLE quickbooks_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE quickbooks_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quickbooks_mappings ENABLE ROW LEVEL SECURITY;

-- Tokens: Only accessible by tenant members
CREATE POLICY "Users can view their tenant's QB tokens"
  ON quickbooks_tokens FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their tenant's QB tokens"
  ON quickbooks_tokens FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Sync logs: Read-only for tenant members
CREATE POLICY "Users can view their tenant's sync logs"
  ON quickbooks_sync_logs FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert sync logs"
  ON quickbooks_sync_logs FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Mappings: Full access for tenant members
CREATE POLICY "Users can manage their tenant's QB mappings"
  ON quickbooks_mappings FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quickbooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_quickbooks_tokens_updated_at
  BEFORE UPDATE ON quickbooks_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_quickbooks_updated_at();

CREATE TRIGGER update_quickbooks_mappings_updated_at
  BEFORE UPDATE ON quickbooks_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_quickbooks_updated_at();

-- Comments
COMMENT ON TABLE quickbooks_tokens IS 'Stores OAuth tokens for QuickBooks Online integration';
COMMENT ON TABLE quickbooks_sync_logs IS 'Audit trail for all QuickBooks sync operations';
COMMENT ON TABLE quickbooks_mappings IS 'Maps CRM entities to QuickBooks entities';
