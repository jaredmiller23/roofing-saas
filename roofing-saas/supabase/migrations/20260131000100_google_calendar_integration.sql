-- Google Calendar Integration Tables
-- Created: 2026-01-31
-- Purpose: Store Google OAuth tokens for Calendar and Tasks integration
-- Uses _encryption_keys table for key storage (same as QuickBooks)

-- ============================================================================
-- STEP 1: Create encryption key in _encryption_keys table (if not exists)
-- Uses gen_random_uuid() since gen_random_bytes is not directly available
-- ============================================================================
INSERT INTO _encryption_keys (key_name, key_value)
SELECT 'google_calendar_encryption_key',
       replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
WHERE NOT EXISTS (
  SELECT 1 FROM _encryption_keys WHERE key_name = 'google_calendar_encryption_key'
);

-- ============================================================================
-- STEP 2: Create helper function to get encryption key
-- ============================================================================
CREATE OR REPLACE FUNCTION get_google_calendar_encryption_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  SELECT key_value INTO encryption_key
  FROM _encryption_keys
  WHERE key_name = 'google_calendar_encryption_key';

  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Encryption key not found';
  END IF;

  RETURN encryption_key;
END;
$$;

-- ============================================================================
-- STEP 3: Create encryption/decryption functions
-- ============================================================================

-- Function to encrypt a token
CREATE OR REPLACE FUNCTION encrypt_google_token(plaintext TEXT)
RETURNS BYTEA
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  encryption_key := get_google_calendar_encryption_key();
  RETURN pgp_sym_encrypt(plaintext, encryption_key);
END;
$$;

-- Function to decrypt a token
CREATE OR REPLACE FUNCTION decrypt_google_token(encrypted_data BYTEA)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  IF encrypted_data IS NULL THEN
    RETURN NULL;
  END IF;

  encryption_key := get_google_calendar_encryption_key();
  RETURN pgp_sym_decrypt(encrypted_data, encryption_key);
END;
$$;

-- ============================================================================
-- STEP 4: Create Google Calendar tokens table
-- ============================================================================
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- OAuth tokens (encrypted with pgcrypto)
  access_token BYTEA NOT NULL,
  refresh_token BYTEA NOT NULL,

  -- Token metadata
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  scope TEXT, -- Stores granted scopes

  -- Google account info
  google_email TEXT, -- Email of connected Google account
  google_name TEXT,  -- Display name

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One Google Calendar connection per user per tenant
  UNIQUE(tenant_id, user_id)
);

-- ============================================================================
-- STEP 5: Create indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_tenant ON google_calendar_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_user ON google_calendar_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_expires ON google_calendar_tokens(expires_at);

-- ============================================================================
-- STEP 6: Enable RLS and create policies
-- ============================================================================
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view their own Google Calendar tokens
CREATE POLICY "Users can view their own Google Calendar tokens"
  ON google_calendar_tokens FOR SELECT
  USING (user_id = auth.uid());

-- Users can manage their own Google Calendar tokens
CREATE POLICY "Users can manage their own Google Calendar tokens"
  ON google_calendar_tokens FOR ALL
  USING (user_id = auth.uid());

-- ============================================================================
-- STEP 7: Create updated_at trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION update_google_calendar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_google_calendar_tokens_updated_at ON google_calendar_tokens;
CREATE TRIGGER update_google_calendar_tokens_updated_at
  BEFORE UPDATE ON google_calendar_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_google_calendar_updated_at();

-- ============================================================================
-- STEP 8: Grant permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION encrypt_google_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt_google_token(BYTEA) TO authenticated;

-- ============================================================================
-- STEP 9: Add comments
-- ============================================================================
COMMENT ON TABLE google_calendar_tokens IS 'Stores OAuth tokens for Google Calendar integration';
COMMENT ON COLUMN google_calendar_tokens.access_token IS 'Google OAuth access token - encrypted with pgcrypto pgp_sym_encrypt()';
COMMENT ON COLUMN google_calendar_tokens.refresh_token IS 'Google OAuth refresh token - encrypted with pgcrypto pgp_sym_encrypt()';
COMMENT ON FUNCTION encrypt_google_token(TEXT) IS 'Encrypts Google OAuth tokens using key from _encryption_keys';
COMMENT ON FUNCTION decrypt_google_token(BYTEA) IS 'Decrypts Google OAuth tokens using key from _encryption_keys';

-- Refresh PostgREST cache to pick up new table
NOTIFY pgrst, 'reload schema';
