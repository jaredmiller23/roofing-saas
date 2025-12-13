-- =====================================================
-- CALL COMPLIANCE SYSTEM
-- Date: 2025-12-13
-- Purpose: TCPA/TSR compliance for outbound calling
-- Critical for: DNC registry, time restrictions, audit logging, regulatory compliance
-- Rollback: DROP TABLE call_compliance_log, dnc_imports, dnc_registry;
--           ALTER TABLE call_logs DROP COLUMN recording_announced, DROP COLUMN compliance_check_id;
--           ALTER TABLE contacts DROP COLUMN call_opt_out, DROP COLUMN call_opt_out_date,
--             DROP COLUMN call_opt_out_reason, DROP COLUMN call_consent, DROP COLUMN call_consent_date,
--             DROP COLUMN call_consent_method, DROP COLUMN call_consent_ip, DROP COLUMN dnc_status,
--             DROP COLUMN dnc_last_checked, DROP COLUMN dnc_federal_listed, DROP COLUMN dnc_state_listed,
--             DROP COLUMN dnc_internal_listed;
-- =====================================================

-- =====================================================
-- STEP 1: ALTER CONTACTS TABLE
-- Add call consent and DNC status tracking
-- =====================================================

-- Call opt-out tracking (similar to SMS pattern)
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS call_opt_out BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS call_opt_out_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS call_opt_out_reason TEXT;

-- Call consent tracking (TCPA requires explicit consent)
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS call_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS call_consent_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS call_consent_method TEXT, -- 'verbal', 'written', 'web_form', 'sms'
ADD COLUMN IF NOT EXISTS call_consent_ip TEXT; -- IP address where consent was obtained

-- DNC status tracking
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS dnc_status TEXT CHECK (dnc_status IN ('clear', 'federal', 'state', 'both', 'internal')) DEFAULT 'clear',
ADD COLUMN IF NOT EXISTS dnc_last_checked TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dnc_federal_listed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS dnc_state_listed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS dnc_internal_listed BOOLEAN DEFAULT FALSE;

-- =====================================================
-- INDEXES FOR CONTACTS
-- =====================================================

-- Quick lookups for DNC status and opt-outs
CREATE INDEX IF NOT EXISTS idx_contacts_call_opt_out
ON contacts(call_opt_out)
WHERE call_opt_out = TRUE;

CREATE INDEX IF NOT EXISTS idx_contacts_dnc_status
ON contacts(dnc_status)
WHERE dnc_status != 'clear';

CREATE INDEX IF NOT EXISTS idx_contacts_call_consent
ON contacts(call_consent)
WHERE call_consent = TRUE;

-- =====================================================
-- STEP 2: CREATE DNC REGISTRY TABLE
-- Federal and state Do Not Call lists
-- =====================================================

CREATE TABLE IF NOT EXISTS dnc_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Phone number (E.164 format: +14235551234)
  phone_number TEXT NOT NULL,
  phone_hash TEXT NOT NULL, -- SHA256 hash for privacy/fast lookups

  -- DNC source
  source TEXT NOT NULL CHECK (source IN ('federal', 'state_tn', 'internal')),

  -- Phone metadata
  area_code TEXT, -- Extracted from phone_number for filtering

  -- Listing details
  listed_date DATE, -- When number was added to DNC list
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at DATE, -- Some DNC entries expire after 5 years

  -- Metadata (JSONB for flexibility)
  metadata JSONB, -- { "notes": "...", "verified": true, etc. }

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- =====================================================
-- INDEXES FOR DNC REGISTRY
-- =====================================================

-- Primary lookup by phone hash (extremely fast)
CREATE INDEX idx_dnc_registry_phone_hash ON dnc_registry(phone_hash);

-- Lookup by tenant and source
CREATE INDEX idx_dnc_registry_tenant_source ON dnc_registry(tenant_id, source);

-- Lookup by area code (for area code filtering)
CREATE INDEX idx_dnc_registry_area_code ON dnc_registry(area_code);

-- Unique constraint: one entry per tenant/phone/source
CREATE UNIQUE INDEX idx_dnc_registry_unique ON dnc_registry(tenant_id, phone_hash, source);

-- =====================================================
-- STEP 3: CREATE DNC IMPORTS TABLE
-- Track import history for audit trail
-- =====================================================

CREATE TABLE IF NOT EXISTS dnc_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Import details
  source TEXT NOT NULL CHECK (source IN ('federal', 'state_tn', 'internal')),
  import_type TEXT NOT NULL CHECK (import_type IN ('full', 'incremental', 'removal')),
  file_name TEXT, -- Original filename

  -- Import statistics
  records_total INTEGER DEFAULT 0,
  records_new INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_removed INTEGER DEFAULT 0,

  -- Import status
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  error_message TEXT,

  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Audit
  imported_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR DNC IMPORTS
-- =====================================================

CREATE INDEX idx_dnc_imports_tenant_id ON dnc_imports(tenant_id);
CREATE INDEX idx_dnc_imports_source ON dnc_imports(source);
CREATE INDEX idx_dnc_imports_status ON dnc_imports(status);
CREATE INDEX idx_dnc_imports_started_at ON dnc_imports(started_at DESC);

-- =====================================================
-- STEP 4: CREATE CALL COMPLIANCE LOG TABLE
-- Audit log for every compliance check
-- =====================================================

CREATE TABLE IF NOT EXISTS call_compliance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Related entities
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  call_log_id UUID REFERENCES call_logs(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Phone number checked
  phone_number TEXT NOT NULL,

  -- Compliance check type
  check_type TEXT NOT NULL CHECK (check_type IN ('dnc_check', 'time_check', 'consent_check', 'opt_out_check')),

  -- Check result
  result TEXT NOT NULL CHECK (result IN ('pass', 'fail', 'warning')),
  reason TEXT, -- Human-readable explanation

  -- DNC specific
  dnc_source TEXT, -- 'federal', 'state_tn', 'internal' if DNC match found

  -- Time restriction specific
  contact_timezone TEXT, -- Timezone of contact (for time checks)
  contact_local_time TIME, -- Local time at contact location when check occurred

  -- Metadata (JSONB for flexibility)
  metadata JSONB, -- { "calling_hours": "8am-9pm", "holidays_checked": true, etc. }

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR CALL COMPLIANCE LOG
-- =====================================================

CREATE INDEX idx_call_compliance_log_tenant_id ON call_compliance_log(tenant_id);
CREATE INDEX idx_call_compliance_log_contact_id ON call_compliance_log(contact_id);
CREATE INDEX idx_call_compliance_log_call_log_id ON call_compliance_log(call_log_id);
CREATE INDEX idx_call_compliance_log_created_at ON call_compliance_log(created_at DESC);
CREATE INDEX idx_call_compliance_log_result ON call_compliance_log(result);
CREATE INDEX idx_call_compliance_log_check_type ON call_compliance_log(check_type);

-- Composite index for recent failures by tenant
CREATE INDEX idx_call_compliance_log_tenant_failures
ON call_compliance_log(tenant_id, result, created_at DESC)
WHERE result = 'fail';

-- =====================================================
-- STEP 5: ALTER CALL_LOGS TABLE
-- Add compliance fields
-- =====================================================

ALTER TABLE call_logs
ADD COLUMN IF NOT EXISTS recording_announced BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS compliance_check_id UUID REFERENCES call_compliance_log(id);

-- Index for compliance check reference
CREATE INDEX IF NOT EXISTS idx_call_logs_compliance_check_id
ON call_logs(compliance_check_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE dnc_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE dnc_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_compliance_log ENABLE ROW LEVEL SECURITY;

-- DNC Registry Policies
CREATE POLICY "Users can view DNC registry in their tenant"
  ON dnc_registry FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add to DNC registry"
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

CREATE POLICY "Users can delete DNC registry entries"
  ON dnc_registry FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- DNC Imports Policies
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

-- Call Compliance Log Policies (read-only for non-admins, append-only)
CREATE POLICY "Users can view compliance logs in their tenant"
  ON call_compliance_log FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can create compliance logs"
  ON call_compliance_log FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if a call can be made to a contact
-- Combines DNC check, time check, and consent check
CREATE OR REPLACE FUNCTION can_make_call_to_contact(
  p_contact_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id UUID;
  v_phone_number TEXT;
  v_phone_hash TEXT;
  v_timezone TEXT;
  v_local_hour INTEGER;
  v_call_opt_out BOOLEAN;
  v_call_consent BOOLEAN;
  v_dnc_status TEXT;
  v_is_dnc_listed BOOLEAN;
  v_result JSON;
BEGIN
  -- Get contact details
  SELECT
    c.tenant_id,
    COALESCE(c.phone, c.mobile_phone),
    c.timezone,
    c.call_opt_out,
    c.call_consent,
    c.dnc_status
  INTO
    v_tenant_id,
    v_phone_number,
    v_timezone,
    v_call_opt_out,
    v_call_consent,
    v_dnc_status
  FROM contacts c
  WHERE c.id = p_contact_id
    AND c.is_deleted = FALSE;

  -- If contact not found or no phone number
  IF v_phone_number IS NULL THEN
    RETURN json_build_object(
      'can_call', false,
      'reason', 'No phone number found for contact',
      'checks', json_build_object()
    );
  END IF;

  -- Generate phone hash
  v_phone_hash := encode(digest(v_phone_number, 'sha256'), 'hex');

  -- Check if opted out
  IF v_call_opt_out = TRUE THEN
    RETURN json_build_object(
      'can_call', false,
      'reason', 'Contact has opted out of calls',
      'checks', json_build_object(
        'opt_out_check', 'fail'
      )
    );
  END IF;

  -- Check DNC status
  IF v_dnc_status != 'clear' THEN
    RETURN json_build_object(
      'can_call', false,
      'reason', 'Contact is on Do Not Call list (' || v_dnc_status || ')',
      'checks', json_build_object(
        'dnc_check', 'fail',
        'dnc_source', v_dnc_status
      )
    );
  END IF;

  -- Check if in DNC registry
  SELECT EXISTS(
    SELECT 1 FROM dnc_registry
    WHERE tenant_id = v_tenant_id
      AND phone_hash = v_phone_hash
      AND is_deleted = FALSE
      AND (expires_at IS NULL OR expires_at > CURRENT_DATE)
  ) INTO v_is_dnc_listed;

  IF v_is_dnc_listed = TRUE THEN
    RETURN json_build_object(
      'can_call', false,
      'reason', 'Phone number is in DNC registry',
      'checks', json_build_object(
        'dnc_check', 'fail'
      )
    );
  END IF;

  -- Check calling hours (8am-9pm local time)
  v_timezone := COALESCE(v_timezone, 'America/New_York');
  v_local_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE v_timezone);

  IF v_local_hour < 8 OR v_local_hour >= 21 THEN
    RETURN json_build_object(
      'can_call', false,
      'reason', 'Outside calling hours (8am-9pm local time)',
      'checks', json_build_object(
        'time_check', 'fail',
        'local_hour', v_local_hour,
        'timezone', v_timezone
      )
    );
  END IF;

  -- Check for explicit consent (optional, can be warning)
  IF v_call_consent != TRUE THEN
    RETURN json_build_object(
      'can_call', true,
      'warning', 'No explicit call consent recorded',
      'checks', json_build_object(
        'opt_out_check', 'pass',
        'dnc_check', 'pass',
        'time_check', 'pass',
        'consent_check', 'warning'
      )
    );
  END IF;

  -- All checks passed
  RETURN json_build_object(
    'can_call', true,
    'reason', 'All compliance checks passed',
    'checks', json_build_object(
      'opt_out_check', 'pass',
      'dnc_check', 'pass',
      'time_check', 'pass',
      'consent_check', 'pass'
    )
  );
END;
$$;

-- Function to hash a phone number (for DNC lookups)
CREATE OR REPLACE FUNCTION hash_phone_number(p_phone_number TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(digest(p_phone_number, 'sha256'), 'hex');
END;
$$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE dnc_registry IS 'Do Not Call registry (federal, state, and internal lists)';
COMMENT ON TABLE dnc_imports IS 'Import history for DNC list updates';
COMMENT ON TABLE call_compliance_log IS 'Audit log for all call compliance checks (TCPA/TSR)';

COMMENT ON COLUMN contacts.call_opt_out IS 'Contact has opted out of receiving calls';
COMMENT ON COLUMN contacts.call_consent IS 'Contact has given explicit consent to be called';
COMMENT ON COLUMN contacts.dnc_status IS 'DNC status: clear, federal, state, both, or internal';

COMMENT ON COLUMN dnc_registry.phone_hash IS 'SHA256 hash of phone number (for privacy and fast lookups)';
COMMENT ON COLUMN dnc_registry.source IS 'DNC list source: federal, state_tn, or internal';

COMMENT ON COLUMN call_compliance_log.check_type IS 'Type of check: dnc_check, time_check, consent_check, opt_out_check';
COMMENT ON COLUMN call_compliance_log.result IS 'Check result: pass, fail, or warning';

COMMENT ON COLUMN call_logs.recording_announced IS 'Whether recording announcement was played (TCPA requirement)';
COMMENT ON COLUMN call_logs.compliance_check_id IS 'Reference to compliance check log entry';

COMMENT ON FUNCTION can_make_call_to_contact IS
'Comprehensive compliance check before making a call (DNC, time restrictions, consent, opt-out)';
COMMENT ON FUNCTION hash_phone_number IS
'Generate SHA256 hash of phone number for DNC lookups';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_contacts_columns INTEGER;
  v_dnc_registry_count INTEGER;
  v_dnc_imports_count INTEGER;
  v_compliance_log_count INTEGER;
  v_call_logs_columns INTEGER;
BEGIN
  -- Count new columns in contacts
  SELECT COUNT(*) INTO v_contacts_columns
  FROM information_schema.columns
  WHERE table_name = 'contacts'
    AND column_name IN ('call_opt_out', 'call_consent', 'dnc_status');

  -- Count tables
  SELECT COUNT(*) INTO v_dnc_registry_count
  FROM information_schema.tables
  WHERE table_name = 'dnc_registry';

  SELECT COUNT(*) INTO v_dnc_imports_count
  FROM information_schema.tables
  WHERE table_name = 'dnc_imports';

  SELECT COUNT(*) INTO v_compliance_log_count
  FROM information_schema.tables
  WHERE table_name = 'call_compliance_log';

  -- Count new columns in call_logs
  SELECT COUNT(*) INTO v_call_logs_columns
  FROM information_schema.columns
  WHERE table_name = 'call_logs'
    AND column_name IN ('recording_announced', 'compliance_check_id');

  RAISE NOTICE '=== Call Compliance System Migration Complete ===';
  RAISE NOTICE '';
  RAISE NOTICE 'CONTACTS TABLE UPDATES:';
  RAISE NOTICE '  - Call opt-out tracking: call_opt_out, call_opt_out_date, call_opt_out_reason';
  RAISE NOTICE '  - Call consent tracking: call_consent, call_consent_date, call_consent_method, call_consent_ip';
  RAISE NOTICE '  - DNC status tracking: dnc_status, dnc_last_checked, dnc_federal_listed, dnc_state_listed, dnc_internal_listed';
  RAISE NOTICE '  - New columns added: %', v_contacts_columns;
  RAISE NOTICE '';
  RAISE NOTICE 'NEW TABLES CREATED:';
  RAISE NOTICE '  - dnc_registry: % (Federal, state, internal DNC lists)', v_dnc_registry_count;
  RAISE NOTICE '  - dnc_imports: % (Import history and audit trail)', v_dnc_imports_count;
  RAISE NOTICE '  - call_compliance_log: % (Compliance check audit log)', v_compliance_log_count;
  RAISE NOTICE '';
  RAISE NOTICE 'CALL_LOGS TABLE UPDATES:';
  RAISE NOTICE '  - recording_announced: TCPA recording notification tracking';
  RAISE NOTICE '  - compliance_check_id: Reference to compliance log';
  RAISE NOTICE '  - New columns added: %', v_call_logs_columns;
  RAISE NOTICE '';
  RAISE NOTICE 'HELPER FUNCTIONS:';
  RAISE NOTICE '  - can_make_call_to_contact(contact_id): Comprehensive compliance check';
  RAISE NOTICE '  - hash_phone_number(phone): SHA256 hash for DNC lookups';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS POLICIES:';
  RAISE NOTICE '  - All tables secured with tenant-based RLS';
  RAISE NOTICE '  - Call compliance log is append-only for audit trail';
  RAISE NOTICE '';
  RAISE NOTICE 'COMPLIANCE FEATURES:';
  RAISE NOTICE '  ✓ DNC registry (federal, state TN, internal)';
  RAISE NOTICE '  ✓ Time restrictions (8am-9pm local time)';
  RAISE NOTICE '  ✓ Opt-out tracking';
  RAISE NOTICE '  ✓ Explicit consent tracking';
  RAISE NOTICE '  ✓ Recording announcement tracking';
  RAISE NOTICE '  ✓ Complete audit trail';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Build DNC import UI (federal/state list uploads)';
  RAISE NOTICE '2. Create compliance check API endpoint';
  RAISE NOTICE '3. Integrate compliance checks into call dialer';
  RAISE NOTICE '4. Add recording announcement to Twilio flow';
  RAISE NOTICE '5. Build compliance reporting dashboard';
  RAISE NOTICE '6. Schedule automatic DNC list updates';
  RAISE NOTICE '7. Add consent capture forms';
END $$;
