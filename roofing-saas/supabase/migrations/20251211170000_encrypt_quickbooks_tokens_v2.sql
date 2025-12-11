-- Migration: Encrypt QuickBooks OAuth tokens (Supabase Vault Edition)
-- Date: December 11, 2025
-- Reason: CRITICAL SECURITY - OAuth tokens were stored in plaintext
-- Uses Supabase Vault for encryption key storage

-- ============================================================================
-- STEP 1: Enable required extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vault;

-- ============================================================================
-- STEP 2: Create encryption key in Vault (if not exists)
-- ============================================================================
-- Note: The key will be stored securely in Supabase Vault
-- You can also create this manually via Supabase dashboard > Vault

-- Check if key exists, if not, create a secure random one
DO $$
DECLARE
  key_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM vault.secrets
    WHERE name = 'quickbooks_encryption_key'
  ) INTO key_exists;

  IF NOT key_exists THEN
    -- Generate a secure 32-byte random key and store in Vault
    INSERT INTO vault.secrets (name, secret)
    VALUES (
      'quickbooks_encryption_key',
      encode(gen_random_bytes(32), 'hex')
    );
    RAISE NOTICE 'Created encryption key in Vault: quickbooks_encryption_key';
  ELSE
    RAISE NOTICE 'Encryption key already exists in Vault';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Create helper function to get encryption key from Vault
-- ============================================================================
CREATE OR REPLACE FUNCTION get_qb_encryption_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Get key from Vault
  SELECT decrypted_secret INTO encryption_key
  FROM vault.decrypted_secrets
  WHERE name = 'quickbooks_encryption_key';

  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Encryption key not found in Vault. Please create it first.';
  END IF;

  RETURN encryption_key;
END;
$$;

-- ============================================================================
-- STEP 4: Add encrypted columns (BYTEA for encrypted data)
-- ============================================================================
ALTER TABLE quickbooks_tokens
  ADD COLUMN IF NOT EXISTS access_token_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS refresh_token_encrypted BYTEA;

-- ============================================================================
-- STEP 5: Create encryption/decryption functions
-- ============================================================================

-- Function to encrypt a token (for inserts/updates from application)
CREATE OR REPLACE FUNCTION encrypt_qb_token(plaintext TEXT)
RETURNS BYTEA
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  encryption_key := get_qb_encryption_key();
  RETURN pgp_sym_encrypt(plaintext, encryption_key);
END;
$$;

-- Function to decrypt a token (for reads by application)
CREATE OR REPLACE FUNCTION decrypt_qb_token(encrypted_data BYTEA)
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

  encryption_key := get_qb_encryption_key();
  RETURN pgp_sym_decrypt(encrypted_data, encryption_key);
END;
$$;

-- ============================================================================
-- STEP 6: Migrate existing tokens to encrypted format
-- ============================================================================
DO $$
DECLARE
  row_count INTEGER;
BEGIN
  -- Encrypt existing tokens
  UPDATE quickbooks_tokens
  SET
    access_token_encrypted = encrypt_qb_token(access_token),
    refresh_token_encrypted = encrypt_qb_token(refresh_token)
  WHERE access_token IS NOT NULL
    AND refresh_token IS NOT NULL
    AND access_token_encrypted IS NULL
    AND refresh_token_encrypted IS NULL;

  GET DIAGNOSTICS row_count = ROW_COUNT;
  RAISE NOTICE 'Encrypted % QuickBooks token records', row_count;
END $$;

-- ============================================================================
-- STEP 7: Verify migration success
-- ============================================================================
DO $$
DECLARE
  unencrypted_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unencrypted_count
  FROM quickbooks_tokens
  WHERE access_token IS NOT NULL
    AND access_token_encrypted IS NULL;

  IF unencrypted_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % records still have unencrypted tokens', unencrypted_count;
  END IF;

  RAISE NOTICE 'Verification passed: All tokens encrypted successfully';
END $$;

-- ============================================================================
-- STEP 8: Drop old plaintext columns
-- ============================================================================
ALTER TABLE quickbooks_tokens
  DROP COLUMN IF EXISTS access_token CASCADE,
  DROP COLUMN IF EXISTS refresh_token CASCADE;

-- ============================================================================
-- STEP 9: Rename encrypted columns to original names
-- ============================================================================
ALTER TABLE quickbooks_tokens
  RENAME COLUMN access_token_encrypted TO access_token;

ALTER TABLE quickbooks_tokens
  RENAME COLUMN refresh_token_encrypted TO refresh_token;

-- ============================================================================
-- STEP 10: Add NOT NULL constraints
-- ============================================================================
ALTER TABLE quickbooks_tokens
  ALTER COLUMN access_token SET NOT NULL,
  ALTER COLUMN refresh_token SET NOT NULL;

-- ============================================================================
-- STEP 11: Add comments documenting encryption
-- ============================================================================
COMMENT ON COLUMN quickbooks_tokens.access_token IS 'QuickBooks OAuth access token - encrypted with pgcrypto pgp_sym_encrypt() using Vault key';
COMMENT ON COLUMN quickbooks_tokens.refresh_token IS 'QuickBooks OAuth refresh token - encrypted with pgcrypto pgp_sym_encrypt() using Vault key';
COMMENT ON FUNCTION encrypt_qb_token(TEXT) IS 'Encrypts QuickBooks OAuth tokens using key from Supabase Vault';
COMMENT ON FUNCTION decrypt_qb_token(BYTEA) IS 'Decrypts QuickBooks OAuth tokens using key from Supabase Vault';
COMMENT ON FUNCTION get_qb_encryption_key() IS 'Retrieves encryption key from Supabase Vault';

-- ============================================================================
-- STEP 12: Grant permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION encrypt_qb_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt_qb_token(BYTEA) TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- QuickBooks OAuth tokens are now encrypted at rest using pgcrypto
-- Encryption key is stored securely in Supabase Vault
-- Application code uses encrypt_qb_token() and decrypt_qb_token() functions

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- WARNING: This will permanently delete encrypted tokens!
-- Only use if you have a backup and need to revert.
--
-- DROP FUNCTION IF EXISTS decrypt_qb_token(BYTEA);
-- DROP FUNCTION IF EXISTS encrypt_qb_token(TEXT);
-- DROP FUNCTION IF EXISTS get_qb_encryption_key();
-- ALTER TABLE quickbooks_tokens DROP COLUMN IF EXISTS access_token;
-- ALTER TABLE quickbooks_tokens DROP COLUMN IF EXISTS refresh_token;
-- ALTER TABLE quickbooks_tokens ADD COLUMN access_token TEXT;
-- ALTER TABLE quickbooks_tokens ADD COLUMN refresh_token TEXT;
-- DELETE FROM vault.secrets WHERE name = 'quickbooks_encryption_key';
-- -- Then restore from backup
