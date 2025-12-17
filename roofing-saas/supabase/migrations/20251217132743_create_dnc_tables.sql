-- DNC (Do Not Call) Compliance Tables
-- Created: 2025-12-17
-- Purpose: Track phone numbers that should not be called for TCPA compliance

CREATE TABLE dnc_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  phone_number TEXT NOT NULL,
  reason TEXT, -- 'customer_request', 'federal_dnc', 'state_dnc', 'internal'
  source TEXT, -- 'manual', 'import', 'api'
  added_by UUID,
  added_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ, -- null = permanent
  is_active BOOLEAN DEFAULT true,
  UNIQUE(tenant_id, phone_number)
);

CREATE TABLE dnc_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  records_total INTEGER DEFAULT 0,
  records_imported INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_log JSONB,
  imported_by UUID,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE dnc_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE dnc_imports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage org DNC" ON dnc_registry
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Users can manage org DNC imports" ON dnc_imports
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Indexes
CREATE INDEX idx_dnc_registry_tenant ON dnc_registry(tenant_id);
CREATE INDEX idx_dnc_registry_phone ON dnc_registry(phone_number);
CREATE INDEX idx_dnc_imports_tenant ON dnc_imports(tenant_id);
