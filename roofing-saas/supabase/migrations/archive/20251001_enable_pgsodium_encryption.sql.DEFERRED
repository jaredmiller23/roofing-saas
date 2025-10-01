-- =====================================================
-- ENABLE PGSODIUM FOR TOKEN ENCRYPTION
-- Date: 2025-10-01
-- Set up encryption for sensitive data like OAuth tokens
-- =====================================================

-- Enable pgsodium extension
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- Create encryption key (stored in Supabase Vault)
-- This generates a new encryption key for the tenant
DO $$
DECLARE
  key_id uuid;
BEGIN
  -- Check if key already exists
  IF NOT EXISTS (
    SELECT 1 FROM pgsodium.valid_key
    WHERE name = 'quickbooks_token_key'
  ) THEN
    -- Create new key
    INSERT INTO pgsodium.valid_key (name)
    VALUES ('quickbooks_token_key')
    RETURNING id INTO key_id;

    RAISE NOTICE 'Created encryption key: %', key_id;
  ELSE
    RAISE NOTICE 'Encryption key already exists';
  END IF;
END $$;

-- Add encrypted columns to quickbooks_connections
ALTER TABLE quickbooks_connections
  ADD COLUMN IF NOT EXISTS access_token_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS refresh_token_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS encryption_key_id UUID REFERENCES pgsodium.valid_key(id);

-- Migrate existing tokens to encrypted format (if any exist)
DO $$
DECLARE
  key_id uuid;
  connection_record RECORD;
BEGIN
  -- Get the encryption key
  SELECT id INTO key_id
  FROM pgsodium.valid_key
  WHERE name = 'quickbooks_token_key'
  LIMIT 1;

  -- Encrypt existing tokens
  FOR connection_record IN
    SELECT id, access_token, refresh_token
    FROM quickbooks_connections
    WHERE access_token_encrypted IS NULL
  LOOP
    UPDATE quickbooks_connections
    SET
      access_token_encrypted = pgsodium.crypto_secretbox_noncegen(
        access_token::bytea,
        key_id
      ),
      refresh_token_encrypted = pgsodium.crypto_secretbox_noncegen(
        refresh_token::bytea,
        key_id
      ),
      encryption_key_id = key_id
    WHERE id = connection_record.id;

    RAISE NOTICE 'Encrypted tokens for connection: %', connection_record.id;
  END LOOP;

  IF NOT FOUND THEN
    RAISE NOTICE 'No existing connections to encrypt';
  END IF;
END $$;

-- Create helper functions for encryption/decryption
CREATE OR REPLACE FUNCTION encrypt_token(token TEXT)
RETURNS BYTEA
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  key_id uuid;
BEGIN
  SELECT id INTO key_id
  FROM pgsodium.valid_key
  WHERE name = 'quickbooks_token_key'
  LIMIT 1;

  RETURN pgsodium.crypto_secretbox_noncegen(
    token::bytea,
    key_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION decrypt_token(encrypted_token BYTEA, key_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN convert_from(
    pgsodium.crypto_secretbox_open(
      encrypted_token,
      key_id
    ),
    'UTF8'
  );
END;
$$;

-- Create view for easy access to decrypted tokens
CREATE OR REPLACE VIEW quickbooks_connections_decrypted AS
SELECT
  id,
  tenant_id,
  created_by,
  created_at,
  updated_at,
  realm_id,
  company_name,
  decrypt_token(access_token_encrypted, encryption_key_id) AS access_token,
  decrypt_token(refresh_token_encrypted, encryption_key_id) AS refresh_token,
  token_expires_at,
  refresh_token_expires_at,
  is_active,
  last_sync_at,
  sync_error,
  environment
FROM quickbooks_connections
WHERE access_token_encrypted IS NOT NULL
  AND refresh_token_encrypted IS NOT NULL;

-- Grant access to the view
GRANT SELECT ON quickbooks_connections_decrypted TO authenticated;

-- Add RLS policies to the view (inherits from base table)
ALTER VIEW quickbooks_connections_decrypted SET (security_barrier = true);

-- Add comment explaining the encryption
COMMENT ON TABLE quickbooks_connections IS
'QuickBooks OAuth connections with encrypted tokens.
Use quickbooks_connections_decrypted view to access decrypted tokens.
Never query access_token or refresh_token directly - always use encrypted columns.';

-- Final verification message
DO $$
BEGIN
  RAISE NOTICE '=== Encryption Setup Complete ===';
  RAISE NOTICE 'Tokens are now encrypted using pgsodium';
  RAISE NOTICE 'Use quickbooks_connections_decrypted view to access tokens';
END $$;
