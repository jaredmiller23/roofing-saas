-- =====================================================
-- CALL COMPLIANCE SYSTEM
-- Date: 2025-12-14
-- Purpose: TCPA/TSR compliance for outbound calling
-- Critical for: DNC scrubbing, time restrictions, audit logging, compliance tracking
-- =====================================================

-- =====================================================
-- DNC REGISTRY TABLE
-- =====================================================

-- Store Do Not Call registry data with privacy-conscious hashing
CREATE TABLE IF NOT EXISTS dnc_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Phone number data
  phone_number TEXT NOT NULL, -- E.164 format (e.g., +14235551234)
  phone_hash TEXT NOT NULL, -- SHA256 hash for privacy and quick lookups
  area_code TEXT, -- First 3 digits after +1 for geographic filtering

  -- DNC source information
  source TEXT NOT NULL CHECK (source IN ('federal', 'state', 'internal', 'manual', 'customer_request')),
  source_details TEXT, -- Additional details about DNC source

  -- Status tracking
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ, -- Some DNC entries may have expiration dates

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- DNC IMPORTS TABLE
-- =====================================================

-- Track DNC registry import history and status
CREATE TABLE IF NOT EXISTS dnc_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Import details
  source TEXT NOT NULL CHECK (source IN ('federal', 'state', 'internal', 'manual')),
  file_name TEXT,
  file_size BIGINT, -- File size in bytes

  -- Processing statistics
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  duplicate_records INTEGER DEFAULT 0,

  -- Status tracking
  import_status TEXT NOT NULL DEFAULT 'pending' CHECK (import_status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  error_details TEXT, -- JSON array of error messages

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- =====================================================
-- CALL COMPLIANCE LOG TABLE
-- =====================================================

-- Audit trail for all compliance checks and decisions
CREATE TABLE IF NOT EXISTS call_compliance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Related records
  call_log_id UUID REFERENCES call_logs(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  -- Target information
  phone_number TEXT NOT NULL, -- E.164 format

  -- Compliance check details
  compliance_check_type TEXT NOT NULL CHECK (compliance_check_type IN ('dnc_check', 'time_restriction', 'consent_verification', 'opt_out_check', 'recording_consent')),
  check_result TEXT NOT NULL CHECK (check_result IN ('allowed', 'blocked', 'warning', 'bypassed')),
  check_details JSONB, -- Detailed information about the check

  -- Context
  user_agent TEXT, -- System or user that triggered the check
  bypass_reason TEXT, -- If check was bypassed, why?

  -- Audit fields
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_by UUID REFERENCES auth.users(id) -- NULL for automated checks
);

-- =====================================================
-- UPDATE CONTACTS TABLE - CALL COMPLIANCE FIELDS
-- =====================================================

-- Add call compliance tracking fields to existing contacts table
-- Following the SMS compliance pattern from archive/phase2/20251001_sms_compliance.sql
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS call_opt_out BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS call_opt_out_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS call_opt_out_reason TEXT,
ADD COLUMN IF NOT EXISTS call_consent TEXT CHECK (call_consent IN ('explicit', 'implied', 'prior_business_relationship', 'none')) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS call_consent_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dnc_status TEXT CHECK (dnc_status IN ('clean', 'suppressed', 'unknown', 'checking')) DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS dnc_check_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS call_time_restriction TEXT; -- Custom time restrictions (JSON format)

-- =====================================================
-- UPDATE CALL_LOGS TABLE - COMPLIANCE FIELDS
-- =====================================================

-- Add compliance tracking fields to existing call_logs table
ALTER TABLE call_logs
ADD COLUMN IF NOT EXISTS recording_announced BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS compliance_check_id UUID REFERENCES call_compliance_log(id);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- DNC Registry indexes
CREATE INDEX idx_dnc_registry_tenant_id ON dnc_registry(tenant_id);
CREATE INDEX idx_dnc_registry_phone_hash ON dnc_registry(phone_hash);
CREATE INDEX idx_dnc_registry_area_code ON dnc_registry(area_code);
CREATE INDEX idx_dnc_registry_source ON dnc_registry(source);
CREATE INDEX idx_dnc_registry_active ON dnc_registry(is_active) WHERE is_active = TRUE;

-- Composite index for fast DNC lookups
CREATE UNIQUE INDEX idx_dnc_registry_unique_phone ON dnc_registry(tenant_id, phone_hash, source) WHERE is_active = TRUE;

-- DNC Imports indexes
CREATE INDEX idx_dnc_imports_tenant_id ON dnc_imports(tenant_id);
CREATE INDEX idx_dnc_imports_status ON dnc_imports(import_status);
CREATE INDEX idx_dnc_imports_created_at ON dnc_imports(created_at DESC);

-- Call Compliance Log indexes
CREATE INDEX idx_call_compliance_log_tenant_id ON call_compliance_log(tenant_id);
CREATE INDEX idx_call_compliance_log_call_id ON call_compliance_log(call_log_id);
CREATE INDEX idx_call_compliance_log_contact_id ON call_compliance_log(contact_id);
CREATE INDEX idx_call_compliance_log_phone ON call_compliance_log(phone_number);
CREATE INDEX idx_call_compliance_log_type ON call_compliance_log(compliance_check_type);
CREATE INDEX idx_call_compliance_log_result ON call_compliance_log(check_result);
CREATE INDEX idx_call_compliance_log_checked_at ON call_compliance_log(checked_at DESC);

-- Contacts table compliance indexes
CREATE INDEX IF NOT EXISTS idx_contacts_call_opt_out ON contacts(call_opt_out) WHERE call_opt_out = TRUE;
CREATE INDEX IF NOT EXISTS idx_contacts_dnc_status ON contacts(dnc_status);
CREATE INDEX IF NOT EXISTS idx_contacts_call_consent ON contacts(call_consent);

-- Call logs compliance indexes
CREATE INDEX IF NOT EXISTS idx_call_logs_compliance_check ON call_logs(compliance_check_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- DNC Registry RLS
ALTER TABLE dnc_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view DNC registry in their tenant"
  ON dnc_registry FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create DNC registry entries"
  ON dnc_registry FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update DNC registry in their tenant"
  ON dnc_registry FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete DNC registry in their tenant"
  ON dnc_registry FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- DNC Imports RLS
ALTER TABLE dnc_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view DNC imports in their tenant"
  ON dnc_imports FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create DNC imports"
  ON dnc_imports FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update DNC imports in their tenant"
  ON dnc_imports FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Call Compliance Log RLS
ALTER TABLE call_compliance_log ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users can update compliance log in their tenant"
  ON call_compliance_log FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to generate phone hash for DNC lookups
CREATE OR REPLACE FUNCTION generate_phone_hash(phone_number TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Remove all non-digits and normalize to E.164 format
  phone_number := regexp_replace(phone_number, '[^0-9]', '', 'g');

  -- Add +1 if it's a 10-digit US number
  IF length(phone_number) = 10 THEN
    phone_number := '1' || phone_number;
  END IF;

  -- Generate SHA256 hash
  RETURN encode(digest(phone_number, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to check if a phone number is on the DNC registry
CREATE OR REPLACE FUNCTION check_dnc_status(
  p_tenant_id UUID,
  p_phone_number TEXT
)
RETURNS TABLE(
  is_on_dnc BOOLEAN,
  dnc_source TEXT,
  dnc_details JSONB
) AS $$
DECLARE
  phone_hash TEXT;
  dnc_record RECORD;
BEGIN
  -- Generate hash for lookup
  phone_hash := generate_phone_hash(p_phone_number);

  -- Check DNC registry
  SELECT dr.source, dr.source_details, dr.created_at
  INTO dnc_record
  FROM dnc_registry dr
  WHERE dr.tenant_id = p_tenant_id
    AND dr.phone_hash = phone_hash
    AND dr.is_active = TRUE
    AND (dr.expires_at IS NULL OR dr.expires_at > NOW())
  ORDER BY dr.created_at DESC
  LIMIT 1;

  IF dnc_record IS NOT NULL THEN
    RETURN QUERY SELECT
      TRUE,
      dnc_record.source,
      jsonb_build_object(
        'source_details', dnc_record.source_details,
        'added_date', dnc_record.created_at,
        'phone_hash', phone_hash
      );
  ELSE
    RETURN QUERY SELECT
      FALSE,
      NULL::TEXT,
      jsonb_build_object(
        'phone_hash', phone_hash,
        'checked_date', NOW()
      );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to check if calls can be made to a contact (similar to SMS function)
CREATE OR REPLACE FUNCTION can_call_contact(
  p_tenant_id UUID,
  p_contact_id UUID DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL,
  p_contact_timezone TEXT DEFAULT 'America/New_York'
)
RETURNS TABLE(
  can_call BOOLEAN,
  block_reason TEXT,
  compliance_details JSONB
) AS $$
DECLARE
  contact_record RECORD;
  current_hour INTEGER;
  dnc_check RECORD;
  phone_to_check TEXT;
BEGIN
  -- Get contact info if contact_id provided
  IF p_contact_id IS NOT NULL THEN
    SELECT c.call_opt_out, c.call_consent, c.dnc_status, c.phone, c.mobile_phone, c.timezone
    INTO contact_record
    FROM contacts c
    WHERE c.id = p_contact_id AND c.tenant_id = p_tenant_id AND c.is_deleted = FALSE;

    phone_to_check := COALESCE(contact_record.mobile_phone, contact_record.phone);
    p_contact_timezone := COALESCE(contact_record.timezone, p_contact_timezone);
  ELSE
    phone_to_check := p_phone_number;
  END IF;

  -- Check if we have a phone number to validate
  IF phone_to_check IS NULL THEN
    RETURN QUERY SELECT FALSE, 'no_phone_number', jsonb_build_object('error', 'No phone number provided');
    RETURN;
  END IF;

  -- Check explicit opt-out
  IF contact_record.call_opt_out = TRUE THEN
    RETURN QUERY SELECT FALSE, 'opt_out', jsonb_build_object(
      'opt_out_date', contact_record.call_opt_out_date,
      'phone_number', phone_to_check
    );
    RETURN;
  END IF;

  -- Check DNC status
  SELECT * INTO dnc_check FROM check_dnc_status(p_tenant_id, phone_to_check);

  IF dnc_check.is_on_dnc = TRUE THEN
    RETURN QUERY SELECT FALSE, 'dnc_registry', jsonb_build_object(
      'dnc_source', dnc_check.dnc_source,
      'dnc_details', dnc_check.dnc_details,
      'phone_number', phone_to_check
    );
    RETURN;
  END IF;

  -- Check time restrictions (TCPA quiet hours: 8am-9pm local time)
  current_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE p_contact_timezone);

  IF current_hour < 8 OR current_hour >= 21 THEN
    RETURN QUERY SELECT FALSE, 'quiet_hours', jsonb_build_object(
      'current_hour', current_hour,
      'timezone', p_contact_timezone,
      'phone_number', phone_to_check,
      'allowed_hours', '8am-9pm local time'
    );
    RETURN;
  END IF;

  -- Check consent (required for some call types)
  IF contact_record.call_consent = 'none' THEN
    RETURN QUERY SELECT TRUE, 'no_explicit_consent', jsonb_build_object(
      'warning', 'No explicit consent recorded',
      'phone_number', phone_to_check,
      'recommendation', 'Obtain explicit consent before calling'
    );
    RETURN;
  END IF;

  -- All checks passed
  RETURN QUERY SELECT TRUE, NULL::TEXT, jsonb_build_object(
    'consent_type', contact_record.call_consent,
    'phone_number', phone_to_check,
    'timezone', p_contact_timezone
  );
END;
$$ LANGUAGE plpgsql;

-- Function to log compliance checks
CREATE OR REPLACE FUNCTION log_compliance_check(
  p_tenant_id UUID,
  p_call_log_id UUID DEFAULT NULL,
  p_contact_id UUID DEFAULT NULL,
  p_phone_number TEXT,
  p_check_type TEXT,
  p_check_result TEXT,
  p_check_details JSONB DEFAULT NULL,
  p_checked_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  compliance_log_id UUID;
BEGIN
  INSERT INTO call_compliance_log (
    tenant_id,
    call_log_id,
    contact_id,
    phone_number,
    compliance_check_type,
    check_result,
    check_details,
    checked_by
  )
  VALUES (
    p_tenant_id,
    p_call_log_id,
    p_contact_id,
    p_phone_number,
    p_check_type,
    p_check_result,
    p_check_details,
    p_checked_by
  )
  RETURNING id INTO compliance_log_id;

  RETURN compliance_log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update DNC registry timestamps
CREATE OR REPLACE FUNCTION update_dnc_registry_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for DNC registry updated_at
CREATE TRIGGER trigger_dnc_registry_updated_at
  BEFORE UPDATE ON dnc_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_dnc_registry_updated_at();

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for compliance dashboard
CREATE OR REPLACE VIEW compliance_dashboard AS
SELECT
  t.id as tenant_id,
  -- DNC Registry stats
  (SELECT COUNT(*) FROM dnc_registry WHERE tenant_id = t.id AND is_active = TRUE) as total_dnc_entries,
  (SELECT COUNT(*) FROM dnc_registry WHERE tenant_id = t.id AND is_active = TRUE AND source = 'federal') as federal_dnc_count,
  (SELECT COUNT(*) FROM dnc_registry WHERE tenant_id = t.id AND is_active = TRUE AND source = 'state') as state_dnc_count,
  (SELECT COUNT(*) FROM dnc_registry WHERE tenant_id = t.id AND is_active = TRUE AND source = 'internal') as internal_dnc_count,

  -- Contact compliance stats
  (SELECT COUNT(*) FROM contacts WHERE tenant_id = t.id AND is_deleted = FALSE AND call_opt_out = TRUE) as opted_out_contacts,
  (SELECT COUNT(*) FROM contacts WHERE tenant_id = t.id AND is_deleted = FALSE AND dnc_status = 'suppressed') as suppressed_contacts,
  (SELECT COUNT(*) FROM contacts WHERE tenant_id = t.id AND is_deleted = FALSE AND call_consent = 'explicit') as explicit_consent_contacts,

  -- Recent compliance activity
  (SELECT COUNT(*) FROM call_compliance_log WHERE tenant_id = t.id AND checked_at >= NOW() - INTERVAL '24 hours') as compliance_checks_today,
  (SELECT COUNT(*) FROM call_compliance_log WHERE tenant_id = t.id AND checked_at >= NOW() - INTERVAL '24 hours' AND check_result = 'blocked') as blocked_calls_today
FROM tenants t;

-- View for recent compliance violations
CREATE OR REPLACE VIEW recent_compliance_violations AS
SELECT
  ccl.*,
  c.first_name || ' ' || c.last_name as contact_name,
  cl.direction as call_direction,
  cl.started_at as call_started_at
FROM call_compliance_log ccl
LEFT JOIN contacts c ON ccl.contact_id = c.id
LEFT JOIN call_logs cl ON ccl.call_log_id = cl.id
WHERE ccl.check_result = 'blocked'
ORDER BY ccl.checked_at DESC;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE dnc_registry IS 'Do Not Call registry with hashed phone numbers for TCPA compliance';
COMMENT ON TABLE dnc_imports IS 'Track DNC registry import batches and processing status';
COMMENT ON TABLE call_compliance_log IS 'Audit trail for all call compliance checks and decisions';

COMMENT ON COLUMN dnc_registry.phone_hash IS 'SHA256 hash of normalized phone number for privacy';
COMMENT ON COLUMN dnc_registry.source IS 'Source of DNC entry: federal, state, internal, manual, customer_request';
COMMENT ON COLUMN call_compliance_log.compliance_check_type IS 'Type of compliance check performed';
COMMENT ON COLUMN call_compliance_log.check_result IS 'Result of compliance check: allowed, blocked, warning, bypassed';
COMMENT ON COLUMN contacts.call_consent IS 'Level of call consent: explicit, implied, prior_business_relationship, none';
COMMENT ON COLUMN contacts.dnc_status IS 'DNC registry status: clean, suppressed, unknown, checking';

COMMENT ON FUNCTION generate_phone_hash IS 'Generate SHA256 hash of normalized phone number for DNC lookups';
COMMENT ON FUNCTION check_dnc_status IS 'Check if phone number exists in DNC registry';
COMMENT ON FUNCTION can_call_contact IS 'Comprehensive check if contact can be called (opt-out, DNC, time restrictions)';
COMMENT ON FUNCTION log_compliance_check IS 'Log a compliance check result for audit trail';

COMMENT ON VIEW compliance_dashboard IS 'High-level compliance metrics for tenant dashboard';
COMMENT ON VIEW recent_compliance_violations IS 'Recent blocked calls and compliance violations';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== Call Compliance System Created ===';
  RAISE NOTICE 'Created dnc_registry table for Do Not Call tracking';
  RAISE NOTICE 'Created dnc_imports table for import batch tracking';
  RAISE NOTICE 'Created call_compliance_log table for audit trail';
  RAISE NOTICE 'Updated contacts table with call compliance fields';
  RAISE NOTICE 'Updated call_logs table with compliance tracking';
  RAISE NOTICE 'Created indexes for performance optimization';
  RAISE NOTICE 'Enabled RLS with tenant-based policies';
  RAISE NOTICE 'Created helper functions for compliance checks';
  RAISE NOTICE 'Created views for compliance dashboard';
  RAISE NOTICE '';
  RAISE NOTICE 'Call compliance features:';
  RAISE NOTICE '• DNC registry management (federal, state, internal)';
  RAISE NOTICE '• Automated DNC checking before calls';
  RAISE NOTICE '• TCPA quiet hours enforcement (8am-9pm)';
  RAISE NOTICE '• Contact opt-out tracking';
  RAISE NOTICE '• Call consent management';
  RAISE NOTICE '• Comprehensive compliance audit logging';
  RAISE NOTICE '• Recording consent tracking';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Import federal/state DNC registries';
  RAISE NOTICE '2. Integrate compliance checks into calling workflow';
  RAISE NOTICE '3. Build compliance dashboard UI';
  RAISE NOTICE '4. Set up automated DNC registry updates';
  RAISE NOTICE '5. Configure compliance reporting';
  RAISE NOTICE '6. Add opt-out keyword handling for SMS/calls';
  RAISE NOTICE '7. Implement recording consent workflows';
END $$;