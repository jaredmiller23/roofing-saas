-- =====================================================
-- CALL LOGS TABLE
-- Date: 2025-10-03
-- Purpose: Track phone calls with recording and transcription
-- Critical for: Call recording (client requirement), activity tracking, compliance
-- =====================================================

-- Call Logs Table
-- Tracks all phone calls made through the system (via Twilio)
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Call relationships
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id), -- User who made/received the call

  -- Call details
  direction TEXT CHECK (direction IN ('inbound', 'outbound')) NOT NULL,
  phone_number TEXT NOT NULL, -- E.164 format (e.g., +14235551234)
  from_number TEXT, -- Calling number
  to_number TEXT, -- Receiving number

  -- Twilio details
  twilio_call_sid TEXT UNIQUE, -- Twilio Call SID (unique identifier)
  twilio_status TEXT, -- queued, ringing, in-progress, completed, busy, failed, no-answer, canceled

  -- Call metrics
  duration INTEGER, -- Call duration in seconds
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,

  -- Recording
  recording_url TEXT, -- URL to call recording (Twilio or Supabase Storage)
  recording_duration INTEGER, -- Recording duration in seconds
  recording_sid TEXT, -- Twilio Recording SID

  -- Transcription (optional, AI-powered)
  transcription TEXT, -- Full call transcription
  transcription_confidence DECIMAL(3,2), -- 0.00 to 1.00
  transcription_provider TEXT, -- 'twilio', 'whisper', 'deepgram'

  -- Call summary (AI-generated)
  summary TEXT, -- Brief summary of call content
  sentiment TEXT, -- 'positive', 'neutral', 'negative'
  key_points TEXT[], -- Array of key discussion points

  -- Call outcome
  outcome TEXT, -- 'answered', 'voicemail', 'busy', 'no_answer', 'failed'
  disposition TEXT, -- 'qualified', 'not_interested', 'callback', 'appointment_set', etc.
  notes TEXT, -- Manual notes added by user

  -- Follow-up
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date DATE,
  follow_up_notes TEXT,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_call_logs_tenant_id ON call_logs(tenant_id);
CREATE INDEX idx_call_logs_contact_id ON call_logs(contact_id);
CREATE INDEX idx_call_logs_project_id ON call_logs(project_id);
CREATE INDEX idx_call_logs_user_id ON call_logs(user_id);
CREATE INDEX idx_call_logs_direction ON call_logs(direction);
CREATE INDEX idx_call_logs_twilio_call_sid ON call_logs(twilio_call_sid);
CREATE INDEX idx_call_logs_created_at ON call_logs(created_at DESC);
CREATE INDEX idx_call_logs_started_at ON call_logs(started_at DESC);

-- Composite index for recent calls by user
CREATE INDEX idx_call_logs_user_recent ON call_logs(user_id, created_at DESC);

-- Index for follow-up queries
CREATE INDEX idx_call_logs_follow_up ON call_logs(follow_up_required, follow_up_date) WHERE follow_up_required = TRUE;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- Users can view call logs in their tenant
CREATE POLICY "Users can view call logs in their tenant"
  ON call_logs FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can create call logs in their tenant
CREATE POLICY "Users can create call logs"
  ON call_logs FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can update call logs in their tenant
CREATE POLICY "Users can update call logs"
  ON call_logs FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can delete call logs in their tenant
CREATE POLICY "Users can delete call logs"
  ON call_logs FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for recent calls with related data
CREATE OR REPLACE VIEW recent_calls AS
SELECT
  cl.*,
  c.first_name || ' ' || c.last_name as contact_name,
  p.name as project_name,
  u.full_name as user_name
FROM call_logs cl
LEFT JOIN contacts c ON cl.contact_id = c.id
LEFT JOIN projects p ON cl.project_id = p.id
LEFT JOIN profiles u ON cl.user_id = u.id
WHERE cl.is_deleted = FALSE
ORDER BY cl.created_at DESC;

-- View for calls requiring follow-up
CREATE OR REPLACE VIEW calls_needing_followup AS
SELECT
  cl.*,
  c.first_name || ' ' || c.last_name as contact_name,
  p.name as project_name,
  u.full_name as user_name
FROM call_logs cl
LEFT JOIN contacts c ON cl.contact_id = c.id
LEFT JOIN projects p ON cl.project_id = p.id
LEFT JOIN profiles u ON cl.user_id = u.id
WHERE cl.follow_up_required = TRUE
  AND cl.is_deleted = FALSE
ORDER BY cl.follow_up_date ASC NULLS LAST;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to calculate call metrics by user
CREATE OR REPLACE FUNCTION get_user_call_metrics(p_user_id UUID, p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  result JSON;
  start_filter TIMESTAMPTZ;
  end_filter TIMESTAMPTZ;
BEGIN
  start_filter := COALESCE(p_start_date::TIMESTAMPTZ, NOW() - INTERVAL '30 days');
  end_filter := COALESCE(p_end_date::TIMESTAMPTZ, NOW());

  SELECT json_build_object(
    'total_calls', COUNT(*),
    'total_duration', SUM(duration),
    'avg_duration', AVG(duration),
    'inbound_calls', COUNT(*) FILTER (WHERE direction = 'inbound'),
    'outbound_calls', COUNT(*) FILTER (WHERE direction = 'outbound'),
    'answered_calls', COUNT(*) FILTER (WHERE outcome = 'answered'),
    'voicemail_calls', COUNT(*) FILTER (WHERE outcome = 'voicemail'),
    'missed_calls', COUNT(*) FILTER (WHERE outcome IN ('no_answer', 'busy')),
    'recorded_calls', COUNT(*) FILTER (WHERE recording_url IS NOT NULL)
  )
  INTO result
  FROM call_logs
  WHERE user_id = p_user_id
    AND created_at BETWEEN start_filter AND end_filter
    AND is_deleted = FALSE;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get call count by contact
CREATE OR REPLACE FUNCTION get_contact_call_count(p_contact_id UUID)
RETURNS INTEGER AS $$
DECLARE
  call_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO call_count
  FROM call_logs
  WHERE contact_id = p_contact_id
    AND is_deleted = FALSE;

  RETURN call_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE call_logs IS 'Phone call tracking with recording, transcription, and AI analysis via Twilio';
COMMENT ON COLUMN call_logs.twilio_call_sid IS 'Twilio Call SID (unique identifier for the call)';
COMMENT ON COLUMN call_logs.direction IS 'Call direction: inbound (received) or outbound (made)';
COMMENT ON COLUMN call_logs.recording_url IS 'URL to call recording file (Twilio or Supabase Storage)';
COMMENT ON COLUMN call_logs.transcription IS 'Full text transcription of call (AI-generated)';
COMMENT ON COLUMN call_logs.summary IS 'AI-generated summary of call content';
COMMENT ON COLUMN call_logs.sentiment IS 'Sentiment analysis: positive, neutral, negative';
COMMENT ON COLUMN call_logs.disposition IS 'Call outcome: qualified, not_interested, callback, appointment_set';

COMMENT ON VIEW recent_calls IS 'Recent calls with contact, project, and user details';
COMMENT ON VIEW calls_needing_followup IS 'Calls marked for follow-up, ordered by follow-up date';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== Call Logs Table Created ===';
  RAISE NOTICE 'Created call_logs table with RLS policies';
  RAISE NOTICE 'Created indexes for performance';
  RAISE NOTICE 'Created views for recent calls and follow-ups';
  RAISE NOTICE 'Created helper functions for call metrics';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Set up Twilio account and get credentials';
  RAISE NOTICE '2. Configure Twilio webhooks for call events';
  RAISE NOTICE '3. Build call dialer UI (click-to-call)';
  RAISE NOTICE '4. Implement call recording storage';
  RAISE NOTICE '5. Add AI transcription (Whisper API)';
  RAISE NOTICE '6. Build call log viewer UI';
  RAISE NOTICE '7. Add call recording playback';
END $$;
