-- Create call_compliance_log table for compliance audit trail
-- This matches the schema expected by lib/compliance/call-compliance.ts
-- Date: 2026-01-12

CREATE TABLE IF NOT EXISTS call_compliance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  contact_id UUID,
  call_log_id UUID,
  user_id UUID,
  phone_number TEXT NOT NULL,
  check_type TEXT NOT NULL, -- 'dnc_check', 'time_check', 'consent_check', 'opt_out_check'
  result TEXT NOT NULL, -- 'pass', 'fail', 'warning'
  reason TEXT,
  dnc_source TEXT, -- 'federal', 'state_tn', 'internal', etc.
  contact_timezone TEXT,
  contact_local_time TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_call_compliance_log_tenant_id ON call_compliance_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_call_compliance_log_contact_id ON call_compliance_log(contact_id);
CREATE INDEX IF NOT EXISTS idx_call_compliance_log_check_type ON call_compliance_log(check_type);
CREATE INDEX IF NOT EXISTS idx_call_compliance_log_result ON call_compliance_log(result);
CREATE INDEX IF NOT EXISTS idx_call_compliance_log_created_at ON call_compliance_log(created_at DESC);

-- Enable RLS
ALTER TABLE call_compliance_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy for tenant isolation
CREATE POLICY "Users can view compliance log in their tenant"
  ON call_compliance_log FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create compliance log entries"
  ON call_compliance_log FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Service role bypass policy for automated compliance checks
CREATE POLICY "Service role can manage compliance log"
  ON call_compliance_log FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE call_compliance_log IS 'Audit trail for TCPA/DNC compliance checks';
COMMENT ON COLUMN call_compliance_log.check_type IS 'Type of compliance check: dnc_check, time_check, consent_check, opt_out_check';
COMMENT ON COLUMN call_compliance_log.result IS 'Check result: pass, fail, warning';
COMMENT ON COLUMN call_compliance_log.dnc_source IS 'If DNC check, which registry flagged it: federal, state_tn, internal';
