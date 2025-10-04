-- =====================================================
-- ADD VOICE PROVIDER SUPPORT
-- Date: 2025-10-04
-- Add provider field to support multiple voice providers (OpenAI, ElevenLabs)
-- =====================================================

-- Add provider column
ALTER TABLE voice_sessions
  ADD COLUMN provider TEXT NOT NULL DEFAULT 'openai';

-- Update comment on session_id
COMMENT ON COLUMN voice_sessions.session_id IS 'Provider-specific session ID (OpenAI session ID or ElevenLabs conversation ID)';

-- Drop existing unique constraint on session_id
ALTER TABLE voice_sessions
  DROP CONSTRAINT IF EXISTS voice_sessions_session_id_key;

-- Add composite unique constraint on (provider, session_id)
ALTER TABLE voice_sessions
  ADD CONSTRAINT voice_sessions_provider_session_id_key
  UNIQUE (provider, session_id);

-- Add index on provider for queries
CREATE INDEX idx_voice_sessions_provider ON voice_sessions(provider);

-- Update table comment
COMMENT ON TABLE voice_sessions IS 'Tracks voice assistant sessions using OpenAI Realtime API or ElevenLabs Conversational AI with WebRTC';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== Voice Provider Support Added ===';
  RAISE NOTICE 'Added provider column to voice_sessions';
  RAISE NOTICE 'Updated unique constraint to (provider, session_id)';
  RAISE NOTICE 'Added index on provider field';
  RAISE NOTICE '';
  RAISE NOTICE 'Supported providers: openai, elevenlabs';
END $$;
