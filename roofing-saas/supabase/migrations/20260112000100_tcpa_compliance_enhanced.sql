-- =====================================================
-- TCPA COMPLIANCE ENHANCEMENT
-- Date: 2026-01-12
-- Purpose: Enhanced TCPA/FCC compliance for lawsuit protection
--
-- Legal Requirements Addressed:
-- 1. FTC DNC Registry - 31-day sync tracking
-- 2. April 2025 TCPA Rules - 10-day opt-out deadline, 10-min follow-up
-- 3. PEWC (Prior Express Written Consent) - IP address, method, legal text
-- 4. Two-party recording consent states detection
-- 5. Tennessee State DNC ($500/year, covers SMS as of July 2024)
-- =====================================================

-- =====================================================
-- PHASE 1: CONSENT PROOF FIELDS (PEWC)
-- Required to defend lawsuits - IP + timestamp + method + legal text
-- =====================================================

-- Add consent proof fields to contacts table
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS call_consent_ip TEXT,
ADD COLUMN IF NOT EXISTS call_consent_method TEXT CHECK (
  call_consent_method IS NULL OR
  call_consent_method IN ('web_form', 'verbal', 'written', 'sms', 'electronic_signature')
),
ADD COLUMN IF NOT EXISTS call_consent_form_version TEXT,
ADD COLUMN IF NOT EXISTS call_consent_legal_text TEXT,
ADD COLUMN IF NOT EXISTS call_consent_user_agent TEXT;

-- Add SMS consent proof fields (parallel to call consent)
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS sms_consent_ip TEXT,
ADD COLUMN IF NOT EXISTS sms_consent_method TEXT CHECK (
  sms_consent_method IS NULL OR
  sms_consent_method IN ('web_form', 'verbal', 'written', 'sms', 'electronic_signature')
),
ADD COLUMN IF NOT EXISTS sms_consent_form_version TEXT,
ADD COLUMN IF NOT EXISTS sms_consent_legal_text TEXT,
ADD COLUMN IF NOT EXISTS sms_consent_user_agent TEXT;

-- =====================================================
-- PHASE 2: OPT-OUT DEADLINE TRACKING (APRIL 2025 TCPA RULE)
-- Must honor opt-out within 10 business days
-- Single follow-up allowed within 10 minutes of STOP
-- =====================================================

-- Add opt-out deadline fields to contacts
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS call_opt_out_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS call_opt_out_follow_up_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sms_opt_out_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sms_opt_out_follow_up_sent_at TIMESTAMPTZ;

-- Opt-out processing queue for deadline monitoring
CREATE TABLE IF NOT EXISTS call_opt_out_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- Contact information
  phone_number TEXT NOT NULL, -- E.164 format

  -- Opt-out details
  opt_out_type TEXT NOT NULL CHECK (opt_out_type IN ('call', 'sms', 'both')),
  opt_out_requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opt_out_source TEXT NOT NULL CHECK (
    opt_out_source IN ('sms_stop', 'verbal', 'web_form', 'email', 'manual', 'ivr')
  ),

  -- Deadline tracking (April 2025 TCPA Rule: 10 business days)
  deadline TIMESTAMPTZ NOT NULL,

  -- Follow-up tracking (April 2025 TCPA Rule: single follow-up within 10 min)
  follow_up_sent_at TIMESTAMPTZ,
  follow_up_message TEXT,

  -- Processing status
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'follow_up_sent', 'processed', 'overdue', 'cancelled')
  ),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PHASE 3: RECORDING CONSENT (TWO-PARTY STATES)
-- TN is one-party, but CA/FL/PA/WA etc require all-party consent
-- =====================================================

-- Add recording consent fields to contacts
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS recording_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recording_consent_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS recording_consent_method TEXT CHECK (
  recording_consent_method IS NULL OR
  recording_consent_method IN ('verbal', 'written', 'electronic', 'call_announcement')
);

-- Two-party recording consent states lookup table
CREATE TABLE IF NOT EXISTS recording_consent_states (
  state_code TEXT PRIMARY KEY,
  state_name TEXT NOT NULL,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('one_party', 'two_party', 'all_party')),
  notes TEXT,
  effective_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed two-party consent states (as of January 2025)
INSERT INTO recording_consent_states (state_code, state_name, consent_type, notes) VALUES
  ('AL', 'Alabama', 'one_party', 'One party consent sufficient'),
  ('AK', 'Alaska', 'one_party', 'One party consent sufficient'),
  ('AZ', 'Arizona', 'one_party', 'One party consent sufficient'),
  ('AR', 'Arkansas', 'one_party', 'One party consent sufficient'),
  ('CA', 'California', 'two_party', 'All parties must consent - Cal. Penal Code § 632'),
  ('CO', 'Colorado', 'one_party', 'One party consent sufficient'),
  ('CT', 'Connecticut', 'two_party', 'All parties must consent - Conn. Gen. Stat. § 52-570d'),
  ('DE', 'Delaware', 'one_party', 'One party consent sufficient'),
  ('FL', 'Florida', 'two_party', 'All parties must consent - Fla. Stat. § 934.03'),
  ('GA', 'Georgia', 'one_party', 'One party consent sufficient'),
  ('HI', 'Hawaii', 'one_party', 'One party consent sufficient'),
  ('ID', 'Idaho', 'one_party', 'One party consent sufficient'),
  ('IL', 'Illinois', 'two_party', 'All parties must consent - 720 ILCS 5/14-2'),
  ('IN', 'Indiana', 'one_party', 'One party consent sufficient'),
  ('IA', 'Iowa', 'one_party', 'One party consent sufficient'),
  ('KS', 'Kansas', 'one_party', 'One party consent sufficient'),
  ('KY', 'Kentucky', 'one_party', 'One party consent sufficient'),
  ('LA', 'Louisiana', 'one_party', 'One party consent sufficient'),
  ('ME', 'Maine', 'one_party', 'One party consent sufficient'),
  ('MD', 'Maryland', 'two_party', 'All parties must consent - Md. Code, Cts. & Jud. Proc. § 10-402'),
  ('MA', 'Massachusetts', 'two_party', 'All parties must consent - M.G.L.A. 272 § 99'),
  ('MI', 'Michigan', 'two_party', 'All parties must consent - M.C.L.A. 750.539c'),
  ('MN', 'Minnesota', 'one_party', 'One party consent sufficient'),
  ('MS', 'Mississippi', 'one_party', 'One party consent sufficient'),
  ('MO', 'Missouri', 'one_party', 'One party consent sufficient'),
  ('MT', 'Montana', 'two_party', 'All parties must consent - Mont. Code Ann. § 45-8-213'),
  ('NE', 'Nebraska', 'one_party', 'One party consent sufficient'),
  ('NV', 'Nevada', 'one_party', 'One party consent sufficient'),
  ('NH', 'New Hampshire', 'two_party', 'All parties must consent - N.H. Rev. Stat. § 570-A:2'),
  ('NJ', 'New Jersey', 'one_party', 'One party consent sufficient'),
  ('NM', 'New Mexico', 'one_party', 'One party consent sufficient'),
  ('NY', 'New York', 'one_party', 'One party consent sufficient'),
  ('NC', 'North Carolina', 'one_party', 'One party consent sufficient'),
  ('ND', 'North Dakota', 'one_party', 'One party consent sufficient'),
  ('OH', 'Ohio', 'one_party', 'One party consent sufficient'),
  ('OK', 'Oklahoma', 'one_party', 'One party consent sufficient'),
  ('OR', 'Oregon', 'one_party', 'One party consent sufficient'),
  ('PA', 'Pennsylvania', 'two_party', 'All parties must consent - 18 Pa.C.S. § 5703'),
  ('RI', 'Rhode Island', 'one_party', 'One party consent sufficient'),
  ('SC', 'South Carolina', 'one_party', 'One party consent sufficient'),
  ('SD', 'South Dakota', 'one_party', 'One party consent sufficient'),
  ('TN', 'Tennessee', 'one_party', 'One party consent sufficient - T.C.A. § 39-13-601'),
  ('TX', 'Texas', 'one_party', 'One party consent sufficient'),
  ('UT', 'Utah', 'one_party', 'One party consent sufficient'),
  ('VT', 'Vermont', 'one_party', 'One party consent sufficient'),
  ('VA', 'Virginia', 'one_party', 'One party consent sufficient'),
  ('WA', 'Washington', 'two_party', 'All parties must consent - RCW 9.73.030'),
  ('WV', 'West Virginia', 'one_party', 'One party consent sufficient'),
  ('WI', 'Wisconsin', 'one_party', 'One party consent sufficient'),
  ('WY', 'Wyoming', 'one_party', 'One party consent sufficient'),
  ('DC', 'District of Columbia', 'one_party', 'One party consent sufficient')
ON CONFLICT (state_code) DO UPDATE SET
  consent_type = EXCLUDED.consent_type,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- =====================================================
-- PHASE 4: DNC SYNC TRACKING (FTC 31-DAY REQUIREMENT)
-- =====================================================

-- Track DNC sync jobs for compliance verification
CREATE TABLE IF NOT EXISTS dnc_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Sync type
  sync_type TEXT NOT NULL CHECK (sync_type IN ('federal', 'state_tn', 'state_other', 'internal')),

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'running', 'completed', 'failed', 'cancelled')
  ),

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Statistics
  records_processed INTEGER DEFAULT 0,
  records_added INTEGER DEFAULT 0,
  records_removed INTEGER DEFAULT 0,
  records_unchanged INTEGER DEFAULT 0,

  -- Error handling
  error_message TEXT,
  error_details JSONB,

  -- Next sync due (FTC requires 31 days for federal)
  next_sync_due TIMESTAMPTZ NOT NULL,

  -- Source information
  source_file TEXT,
  source_url TEXT,
  source_checksum TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- PHASE 5: ADMIN ALERTS FOR COMPLIANCE VIOLATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Alert type
  type TEXT NOT NULL CHECK (type IN (
    'dnc_sync_overdue',
    'opt_out_overdue',
    'opt_out_approaching',
    'consent_expiring',
    'compliance_violation',
    'state_dnc_expiring'
  )),

  -- Severity
  severity TEXT NOT NULL CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),

  -- Content
  message TEXT NOT NULL,
  metadata JSONB,

  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  read_by UUID REFERENCES auth.users(id),
  is_dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMPTZ,
  dismissed_by UUID REFERENCES auth.users(id),

  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- Auto-dismiss after expiry
);

-- =====================================================
-- PHASE 6: RETENTION TRACKING (5-YEAR TCPA REQUIREMENT)
-- =====================================================

-- Add retention tracking to compliance log
ALTER TABLE call_compliance_log
ADD COLUMN IF NOT EXISTS retention_expires_at TIMESTAMPTZ;

-- Function to set 5-year retention on compliance records
CREATE OR REPLACE FUNCTION set_compliance_retention()
RETURNS TRIGGER AS $$
BEGIN
  -- 5 years from creation (TCPA statute of limitations + buffer)
  IF NEW.retention_expires_at IS NULL THEN
    NEW.retention_expires_at := NEW.checked_at + INTERVAL '5 years';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for retention (only if doesn't exist)
DROP TRIGGER IF EXISTS trigger_set_compliance_retention ON call_compliance_log;
CREATE TRIGGER trigger_set_compliance_retention
  BEFORE INSERT ON call_compliance_log
  FOR EACH ROW
  EXECUTE FUNCTION set_compliance_retention();

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Opt-out queue indexes
CREATE INDEX IF NOT EXISTS idx_opt_out_queue_tenant_id ON call_opt_out_queue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_opt_out_queue_contact_id ON call_opt_out_queue(contact_id);
CREATE INDEX IF NOT EXISTS idx_opt_out_queue_deadline ON call_opt_out_queue(deadline) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_opt_out_queue_status ON call_opt_out_queue(status);
CREATE INDEX IF NOT EXISTS idx_opt_out_queue_overdue ON call_opt_out_queue(deadline, status)
  WHERE status IN ('pending', 'overdue');

-- DNC sync jobs indexes
CREATE INDEX IF NOT EXISTS idx_dnc_sync_tenant_id ON dnc_sync_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dnc_sync_next_due ON dnc_sync_jobs(next_sync_due) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_dnc_sync_status ON dnc_sync_jobs(status);

-- Admin alerts indexes
CREATE INDEX IF NOT EXISTS idx_admin_alerts_tenant_id ON admin_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_unread ON admin_alerts(tenant_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_admin_alerts_type ON admin_alerts(type, severity);

-- Contacts consent indexes
CREATE INDEX IF NOT EXISTS idx_contacts_call_consent_date ON contacts(call_consent_date)
  WHERE call_consent IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_opt_out_deadline ON contacts(call_opt_out_deadline)
  WHERE call_opt_out_deadline IS NOT NULL;

-- Compliance log retention index
CREATE INDEX IF NOT EXISTS idx_compliance_log_retention ON call_compliance_log(retention_expires_at);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Opt-out queue RLS
ALTER TABLE call_opt_out_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view opt-out queue in their tenant"
  ON call_opt_out_queue FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert opt-out queue entries"
  ON call_opt_out_queue FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update opt-out queue in their tenant"
  ON call_opt_out_queue FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- DNC sync jobs RLS
ALTER TABLE dnc_sync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view DNC sync jobs in their tenant"
  ON dnc_sync_jobs FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert DNC sync jobs"
  ON dnc_sync_jobs FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update DNC sync jobs in their tenant"
  ON dnc_sync_jobs FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Admin alerts RLS
ALTER TABLE admin_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view admin alerts in their tenant"
  ON admin_alerts FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert admin alerts"
  ON admin_alerts FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update admin alerts in their tenant"
  ON admin_alerts FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Recording consent states (public read)
ALTER TABLE recording_consent_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read recording consent states"
  ON recording_consent_states FOR SELECT
  USING (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to calculate 10 business days (skipping weekends)
CREATE OR REPLACE FUNCTION calculate_business_days_deadline(
  start_date TIMESTAMPTZ,
  business_days INTEGER DEFAULT 10
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  current_date DATE := start_date::DATE;
  days_added INTEGER := 0;
BEGIN
  WHILE days_added < business_days LOOP
    current_date := current_date + 1;
    -- Skip weekends (0 = Sunday, 6 = Saturday)
    IF EXTRACT(DOW FROM current_date) NOT IN (0, 6) THEN
      days_added := days_added + 1;
    END IF;
  END LOOP;

  RETURN current_date::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql;

-- Function to check if within 10-minute follow-up window
CREATE OR REPLACE FUNCTION is_within_followup_window(
  opt_out_requested_at TIMESTAMPTZ
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (NOW() - opt_out_requested_at) <= INTERVAL '10 minutes';
END;
$$ LANGUAGE plpgsql;

-- Function to get recording consent requirement for a phone number
CREATE OR REPLACE FUNCTION get_recording_consent_type(
  phone_number TEXT
)
RETURNS TEXT AS $$
DECLARE
  area_code TEXT;
  state_code TEXT;
  consent TEXT;
BEGIN
  -- Extract area code from E.164 format (+14235551234 -> 423)
  area_code := substring(phone_number from '^\+1(\d{3})');

  IF area_code IS NULL THEN
    -- Can't determine, default to two_party (safer)
    RETURN 'two_party';
  END IF;

  -- Area code to state mapping (Tennessee area codes)
  CASE area_code
    -- Tennessee (one_party)
    WHEN '423', '615', '629', '731', '865', '901', '931' THEN state_code := 'TN';
    -- California (two_party)
    WHEN '209', '213', '310', '323', '408', '415', '424', '442', '510', '530',
         '559', '562', '619', '626', '628', '650', '657', '661', '669', '707',
         '714', '747', '760', '805', '818', '831', '858', '909', '916', '925',
         '949', '951' THEN state_code := 'CA';
    -- Florida (two_party)
    WHEN '239', '305', '321', '352', '386', '407', '561', '727', '754', '772',
         '786', '813', '850', '863', '904', '941', '954' THEN state_code := 'FL';
    -- Pennsylvania (two_party)
    WHEN '215', '223', '267', '272', '412', '445', '484', '570', '610', '717',
         '724', '814', '878' THEN state_code := 'PA';
    -- Washington (two_party)
    WHEN '206', '253', '360', '425', '509', '564' THEN state_code := 'WA';
    -- Default to one_party for unknown
    ELSE state_code := NULL;
  END CASE;

  IF state_code IS NULL THEN
    RETURN 'one_party'; -- Default assumption
  END IF;

  -- Look up in states table
  SELECT rcs.consent_type INTO consent
  FROM recording_consent_states rcs
  WHERE rcs.state_code = get_recording_consent_type.state_code;

  RETURN COALESCE(consent, 'one_party');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- UPDATE TRIGGERS
-- =====================================================

-- Update timestamp trigger for opt_out_queue
CREATE OR REPLACE FUNCTION update_opt_out_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_opt_out_queue_updated_at ON call_opt_out_queue;
CREATE TRIGGER trigger_opt_out_queue_updated_at
  BEFORE UPDATE ON call_opt_out_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_opt_out_queue_updated_at();

-- Update timestamp trigger for dnc_sync_jobs
CREATE OR REPLACE FUNCTION update_dnc_sync_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_dnc_sync_jobs_updated_at ON dnc_sync_jobs;
CREATE TRIGGER trigger_dnc_sync_jobs_updated_at
  BEFORE UPDATE ON dnc_sync_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_dnc_sync_jobs_updated_at();

-- =====================================================
-- VIEWS
-- =====================================================

-- View for pending opt-out deadlines
CREATE OR REPLACE VIEW pending_opt_out_deadlines AS
SELECT
  ooq.*,
  c.first_name,
  c.last_name,
  c.email,
  CASE
    WHEN ooq.deadline < NOW() THEN 'overdue'
    WHEN ooq.deadline < NOW() + INTERVAL '2 days' THEN 'approaching'
    ELSE 'ok'
  END as deadline_status,
  EXTRACT(DAY FROM ooq.deadline - NOW()) as days_remaining
FROM call_opt_out_queue ooq
JOIN contacts c ON ooq.contact_id = c.id
WHERE ooq.status IN ('pending', 'follow_up_sent')
ORDER BY ooq.deadline ASC;

-- View for DNC sync status
CREATE OR REPLACE VIEW dnc_sync_status AS
SELECT
  dsj.tenant_id,
  dsj.sync_type,
  dsj.status as last_sync_status,
  dsj.completed_at as last_sync_date,
  dsj.records_processed,
  dsj.next_sync_due,
  CASE
    WHEN dsj.next_sync_due < NOW() THEN 'overdue'
    WHEN dsj.next_sync_due < NOW() + INTERVAL '7 days' THEN 'due_soon'
    ELSE 'ok'
  END as sync_status,
  EXTRACT(DAY FROM dsj.next_sync_due - NOW()) as days_until_due
FROM dnc_sync_jobs dsj
WHERE dsj.id = (
  SELECT id FROM dnc_sync_jobs dsj2
  WHERE dsj2.tenant_id = dsj.tenant_id
    AND dsj2.sync_type = dsj.sync_type
    AND dsj2.status = 'completed'
  ORDER BY dsj2.completed_at DESC
  LIMIT 1
);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE call_opt_out_queue IS 'Queue for tracking opt-out processing deadlines per April 2025 TCPA rules';
COMMENT ON TABLE dnc_sync_jobs IS 'Track DNC registry sync jobs for FTC 31-day compliance requirement';
COMMENT ON TABLE recording_consent_states IS 'Lookup table for two-party recording consent states';
COMMENT ON TABLE admin_alerts IS 'Compliance alerts for administrators';

COMMENT ON COLUMN contacts.call_consent_ip IS 'IP address captured when consent was given (PEWC proof)';
COMMENT ON COLUMN contacts.call_consent_method IS 'How consent was obtained: web_form, verbal, written, sms, electronic_signature';
COMMENT ON COLUMN contacts.call_consent_legal_text IS 'Exact legal text customer agreed to (for audit trail)';
COMMENT ON COLUMN contacts.call_opt_out_deadline IS '10 business day deadline for processing opt-out (April 2025 rule)';
COMMENT ON COLUMN contacts.recording_consent IS 'Whether customer has consented to call recording';

COMMENT ON FUNCTION calculate_business_days_deadline IS 'Calculate deadline N business days from start (skips weekends)';
COMMENT ON FUNCTION is_within_followup_window IS 'Check if within 10-minute follow-up window after opt-out';
COMMENT ON FUNCTION get_recording_consent_type IS 'Determine if phone number requires two-party recording consent';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== TCPA Compliance Enhancement Migration Complete ===';
  RAISE NOTICE '';
  RAISE NOTICE 'Phase 1: Consent Proof Fields (PEWC)';
  RAISE NOTICE '  - Added call_consent_ip, call_consent_method, call_consent_legal_text';
  RAISE NOTICE '  - Added sms_consent_ip, sms_consent_method, sms_consent_legal_text';
  RAISE NOTICE '';
  RAISE NOTICE 'Phase 2: Opt-Out Deadline Tracking (April 2025 TCPA)';
  RAISE NOTICE '  - Created call_opt_out_queue table';
  RAISE NOTICE '  - Added call_opt_out_deadline, call_opt_out_follow_up_sent_at';
  RAISE NOTICE '  - calculate_business_days_deadline() function';
  RAISE NOTICE '  - is_within_followup_window() function';
  RAISE NOTICE '';
  RAISE NOTICE 'Phase 3: Recording Consent (Two-Party States)';
  RAISE NOTICE '  - Created recording_consent_states table (51 states seeded)';
  RAISE NOTICE '  - Added recording_consent fields to contacts';
  RAISE NOTICE '  - get_recording_consent_type() function';
  RAISE NOTICE '';
  RAISE NOTICE 'Phase 4: DNC Sync Tracking (FTC 31-Day)';
  RAISE NOTICE '  - Created dnc_sync_jobs table';
  RAISE NOTICE '';
  RAISE NOTICE 'Phase 5: Admin Alerts';
  RAISE NOTICE '  - Created admin_alerts table';
  RAISE NOTICE '';
  RAISE NOTICE 'Phase 6: Retention Tracking (5-Year TCPA)';
  RAISE NOTICE '  - Added retention_expires_at to call_compliance_log';
  RAISE NOTICE '  - Auto-set trigger for 5-year retention';
  RAISE NOTICE '';
  RAISE NOTICE 'Two-Party Recording Consent States:';
  RAISE NOTICE '  CA, CT, FL, IL, MD, MA, MI, MT, NH, PA, WA';
  RAISE NOTICE '';
  RAISE NOTICE 'Legal Requirements Addressed:';
  RAISE NOTICE '  1. FTC DNC Registry - 31-day sync tracking via dnc_sync_jobs';
  RAISE NOTICE '  2. April 2025 TCPA - 10-day opt-out, 10-min follow-up';
  RAISE NOTICE '  3. PEWC Proof - IP + timestamp + method + legal text';
  RAISE NOTICE '  4. Two-Party States - State lookup for recording consent';
  RAISE NOTICE '  5. 5-Year Retention - Automatic expiration tracking';
END $$;
