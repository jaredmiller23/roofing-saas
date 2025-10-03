-- =====================================================
-- PHASE 4: VOICE ASSISTANT TABLES
-- Date: 2025-10-03
-- Create tables for OpenAI Realtime API voice sessions
-- =====================================================

-- Voice Sessions Table
-- Tracks voice assistant sessions with WebRTC connections
CREATE TABLE IF NOT EXISTS voice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session metadata
  session_id TEXT UNIQUE NOT NULL, -- OpenAI session ID
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, failed
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,

  -- Context (what user was working on during session)
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL, -- Active contact
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL, -- Active project
  context JSONB DEFAULT '{}'::jsonb, -- Session context (location, recent activities, etc.)

  -- Usage tracking
  total_audio_duration_seconds INTEGER DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,
  function_calls_count INTEGER DEFAULT 0,

  -- Technical details
  connection_info JSONB DEFAULT '{}'::jsonb, -- WebRTC connection details
  error_log JSONB[] DEFAULT ARRAY[]::JSONB[], -- Any errors during session

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Voice Function Calls Table
-- Logs all CRM actions performed via voice commands
CREATE TABLE IF NOT EXISTS voice_function_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES voice_sessions(id) ON DELETE CASCADE,

  -- Function details
  function_name TEXT NOT NULL, -- e.g., 'create_contact', 'add_note', 'search_contact'
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb, -- Function parameters passed
  result JSONB DEFAULT '{}'::jsonb, -- Function execution result
  status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed

  -- Entity references (what was created/modified)
  entity_type TEXT, -- 'contact', 'project', 'activity'
  entity_id UUID, -- ID of created/modified entity

  -- Timing
  called_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Error handling
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Voice Sessions indexes
CREATE INDEX idx_voice_sessions_tenant_id ON voice_sessions(tenant_id);
CREATE INDEX idx_voice_sessions_user_id ON voice_sessions(user_id);
CREATE INDEX idx_voice_sessions_status ON voice_sessions(status);
CREATE INDEX idx_voice_sessions_started_at ON voice_sessions(started_at DESC);
CREATE INDEX idx_voice_sessions_session_id ON voice_sessions(session_id);

-- Voice Function Calls indexes
CREATE INDEX idx_voice_function_calls_tenant_id ON voice_function_calls(tenant_id);
CREATE INDEX idx_voice_function_calls_session_id ON voice_function_calls(session_id);
CREATE INDEX idx_voice_function_calls_function_name ON voice_function_calls(function_name);
CREATE INDEX idx_voice_function_calls_status ON voice_function_calls(status);
CREATE INDEX idx_voice_function_calls_called_at ON voice_function_calls(called_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on both tables
ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_function_calls ENABLE ROW LEVEL SECURITY;

-- Voice Sessions RLS Policies

-- Users can view their own voice sessions
CREATE POLICY "Users can view their own voice sessions"
  ON voice_sessions FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Users can create their own voice sessions
CREATE POLICY "Users can create their own voice sessions"
  ON voice_sessions FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Users can update their own voice sessions
CREATE POLICY "Users can update their own voice sessions"
  ON voice_sessions FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Voice Function Calls RLS Policies

-- Users can view function calls from their own sessions
CREATE POLICY "Users can view their own function calls"
  ON voice_function_calls FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can create function call records
CREATE POLICY "Users can create function call records"
  ON voice_function_calls FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can update their own function calls
CREATE POLICY "Users can update their own function calls"
  ON voice_function_calls FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_voice_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on voice_sessions
CREATE TRIGGER voice_sessions_updated_at
  BEFORE UPDATE ON voice_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_voice_session_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE voice_sessions IS 'Tracks voice assistant sessions using OpenAI Realtime API with WebRTC';
COMMENT ON TABLE voice_function_calls IS 'Logs all CRM actions performed via voice commands during sessions';

COMMENT ON COLUMN voice_sessions.session_id IS 'Unique session ID from OpenAI Realtime API';
COMMENT ON COLUMN voice_sessions.status IS 'Session status: active, completed, failed';
COMMENT ON COLUMN voice_sessions.context IS 'Session context: location, recent activities, current work';
COMMENT ON COLUMN voice_sessions.connection_info IS 'WebRTC connection details and metadata';

COMMENT ON COLUMN voice_function_calls.function_name IS 'Name of CRM function called: create_contact, add_note, search_contact, etc.';
COMMENT ON COLUMN voice_function_calls.entity_type IS 'Type of entity created/modified: contact, project, activity';
COMMENT ON COLUMN voice_function_calls.entity_id IS 'ID of the created/modified entity';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== Phase 4: Voice Assistant Tables Created ===';
  RAISE NOTICE 'Created voice_sessions table with RLS policies';
  RAISE NOTICE 'Created voice_function_calls table with RLS policies';
  RAISE NOTICE 'Created indexes for performance';
  RAISE NOTICE 'Created helper functions and triggers';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Apply migration: npx supabase db push';
  RAISE NOTICE '2. Verify tables exist in Supabase dashboard';
  RAISE NOTICE '3. Test RLS policies with user authentication';
  RAISE NOTICE '4. Build /api/voice/session endpoint';
  RAISE NOTICE '5. Implement WebRTC client component';
END $$;
