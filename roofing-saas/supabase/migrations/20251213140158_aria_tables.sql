-- Migration: ARIA (AI Roofing Intelligent Assistant) Tables
-- Creates tables for callback scheduling, voicemail, and conversation memory
-- Rollback: DROP TABLE aria_conversations; DROP TABLE voicemail_messages; DROP TABLE callback_requests;

-- =============================================================================
-- Callback Requests
-- Schedules callback requests from customers (via voice AI, web form, etc.)
-- =============================================================================

CREATE TABLE IF NOT EXISTS callback_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  -- Call context
  call_sid TEXT,                    -- Twilio call SID if from a call
  phone TEXT NOT NULL,              -- Phone number to call back

  -- Scheduling
  requested_time TIMESTAMPTZ,       -- When customer requested callback
  scheduled_time TIMESTAMPTZ,       -- When callback is scheduled
  completed_at TIMESTAMPTZ,         -- When callback was completed

  -- Details
  reason TEXT,                      -- Why they want a callback
  notes TEXT,                       -- Internal notes
  priority TEXT DEFAULT 'normal',   -- normal, high, urgent

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled', 'no_answer')),
  attempts INTEGER DEFAULT 0,       -- Number of callback attempts
  last_attempt_at TIMESTAMPTZ,      -- Last attempt timestamp

  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for callback_requests
CREATE INDEX idx_callback_requests_tenant ON callback_requests(tenant_id);
CREATE INDEX idx_callback_requests_status ON callback_requests(status);
CREATE INDEX idx_callback_requests_scheduled ON callback_requests(scheduled_time) WHERE status = 'scheduled';
CREATE INDEX idx_callback_requests_contact ON callback_requests(contact_id);
CREATE INDEX idx_callback_requests_assigned ON callback_requests(assigned_to) WHERE status IN ('pending', 'scheduled');

-- RLS for callback_requests
ALTER TABLE callback_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for callback_requests" ON callback_requests
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

-- =============================================================================
-- Voicemail Messages
-- Stores transcribed voicemails from the AI voice system
-- =============================================================================

CREATE TABLE IF NOT EXISTS voicemail_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  -- Call context
  call_sid TEXT,                    -- Twilio call SID
  from_phone TEXT,                  -- Caller's phone number

  -- Recording
  recording_url TEXT,               -- URL to recording file
  recording_sid TEXT,               -- Twilio recording SID
  duration_seconds INTEGER,         -- Recording duration

  -- Transcription
  transcription TEXT,               -- Full transcription
  transcription_confidence DECIMAL(3,2), -- 0.00 to 1.00
  transcription_provider TEXT,      -- 'twilio', 'openai_whisper', etc.

  -- Analysis
  summary TEXT,                     -- AI-generated summary
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'urgent')),
  detected_intent TEXT,             -- What they're calling about
  sentiment TEXT,                   -- positive, neutral, negative

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'transcribed', 'reviewed', 'actioned', 'archived')),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),

  -- Follow-up
  callback_scheduled BOOLEAN DEFAULT false,
  callback_request_id UUID REFERENCES callback_requests(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for voicemail_messages
CREATE INDEX idx_voicemail_tenant ON voicemail_messages(tenant_id);
CREATE INDEX idx_voicemail_status ON voicemail_messages(status);
CREATE INDEX idx_voicemail_urgency ON voicemail_messages(urgency) WHERE status = 'pending';
CREATE INDEX idx_voicemail_contact ON voicemail_messages(contact_id);
CREATE INDEX idx_voicemail_created ON voicemail_messages(created_at DESC);

-- RLS for voicemail_messages
ALTER TABLE voicemail_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for voicemail_messages" ON voicemail_messages
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

-- =============================================================================
-- ARIA Conversations
-- Tracks conversation context and memory across sessions
-- =============================================================================

CREATE TABLE IF NOT EXISTS aria_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Participants
  user_id UUID REFERENCES auth.users(id),     -- Employee if internal
  contact_id UUID REFERENCES contacts(id),     -- Customer if external

  -- Channel info
  channel TEXT NOT NULL CHECK (channel IN ('voice_inbound', 'voice_outbound', 'chat', 'sms')),
  session_id TEXT,                             -- Provider session ID
  call_sid TEXT,                               -- Twilio call SID if voice

  -- Context
  project_id UUID REFERENCES projects(id),     -- Related project if any
  initial_context JSONB DEFAULT '{}'::jsonb,   -- Context at start

  -- Summary
  summary TEXT,                                -- AI-generated summary
  key_topics TEXT[],                           -- Main topics discussed
  action_items TEXT[],                         -- Follow-up items identified

  -- Timing
  created_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,

  -- Metrics
  message_count INTEGER DEFAULT 0,
  function_calls_count INTEGER DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended', 'error')),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for aria_conversations
CREATE INDEX idx_aria_conv_tenant ON aria_conversations(tenant_id);
CREATE INDEX idx_aria_conv_user ON aria_conversations(user_id);
CREATE INDEX idx_aria_conv_contact ON aria_conversations(contact_id);
CREATE INDEX idx_aria_conv_channel ON aria_conversations(channel);
CREATE INDEX idx_aria_conv_created ON aria_conversations(created_at DESC);
CREATE INDEX idx_aria_conv_active ON aria_conversations(tenant_id, status) WHERE status = 'active';

-- RLS for aria_conversations
ALTER TABLE aria_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for aria_conversations" ON aria_conversations
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

-- =============================================================================
-- ARIA Function Logs
-- Tracks all ARIA function executions for audit and analytics
-- =============================================================================

CREATE TABLE IF NOT EXISTS aria_function_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Context
  conversation_id UUID REFERENCES aria_conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),

  -- Function info
  function_name TEXT NOT NULL,
  function_category TEXT NOT NULL,  -- crm, quickbooks, actions, weather, knowledge

  -- Execution
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB,
  success BOOLEAN NOT NULL,
  error_message TEXT,

  -- Performance
  execution_time_ms INTEGER,

  -- Channel
  channel TEXT NOT NULL,

  -- Timing
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for aria_function_logs
CREATE INDEX idx_aria_func_tenant ON aria_function_logs(tenant_id);
CREATE INDEX idx_aria_func_name ON aria_function_logs(function_name);
CREATE INDEX idx_aria_func_category ON aria_function_logs(function_category);
CREATE INDEX idx_aria_func_created ON aria_function_logs(created_at DESC);
CREATE INDEX idx_aria_func_conv ON aria_function_logs(conversation_id);
CREATE INDEX idx_aria_func_success ON aria_function_logs(success);

-- RLS for aria_function_logs
ALTER TABLE aria_function_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for aria_function_logs" ON aria_function_logs
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

-- =============================================================================
-- Update Triggers
-- =============================================================================

-- Updated_at trigger for callback_requests
CREATE TRIGGER update_callback_requests_updated_at
  BEFORE UPDATE ON callback_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Updated_at trigger for voicemail_messages
CREATE TRIGGER update_voicemail_messages_updated_at
  BEFORE UPDATE ON voicemail_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE callback_requests IS 'Customer callback requests from ARIA voice AI';
COMMENT ON TABLE voicemail_messages IS 'Transcribed voicemails with AI analysis';
COMMENT ON TABLE aria_conversations IS 'ARIA conversation sessions across all channels';
COMMENT ON TABLE aria_function_logs IS 'Audit log of all ARIA function executions';
