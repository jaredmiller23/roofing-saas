# QuickBooks OAuth Token Encryption

**Date**: December 11, 2025
**Status**: CRITICAL SECURITY FIX - Ready to Apply
**Priority**: MUST BE DONE BEFORE PRODUCTION LAUNCH

---

## Overview

QuickBooks OAuth tokens (access_token, refresh_token) were previously stored in **PLAINTEXT** in the database, creating a CRITICAL security vulnerability. This migration encrypts all tokens using PostgreSQL's `pgcrypto` extension with symmetric encryption.

**Security Impact**: If the database was ever compromised, plaintext tokens would give attackers full access to QuickBooks accounts. This fix makes tokens unreadable without the encryption key.

---

## What Was Changed

### 1. Database Migration (`20251211_encrypt_quickbooks_tokens_v2.sql`)

**Actions**:
- Enables `pgcrypto` and `vault` extensions
- **Auto-generates encryption key** in Supabase Vault (if not exists)
- Creates `get_qb_encryption_key()` to retrieve key from Vault
- Creates `encrypt_qb_token()` and `decrypt_qb_token()` helper functions
- Adds encrypted BYTEA columns for tokens
- Migrates existing plaintext tokens to encrypted format
- Drops old plaintext columns

**Result**: All QuickBooks tokens stored as encrypted BYTEA with key securely stored in Supabase Vault.

### 2. Application Code Updates

**Files Modified**:
- `lib/quickbooks/client.ts` - Updated `getQuickBooksClient()` to decrypt tokens when reading
- `app/api/quickbooks/callback/route.ts` - Updated OAuth callback to encrypt tokens before storing

**Changes**:
- Tokens are **encrypted** before INSERT/UPDATE operations
- Tokens are **decrypted** on read using `decrypt_qb_token()` RPC function
- Token refresh flow encrypts new tokens before storage

---

## Setup Instructions

### Step 1: Apply Migration (Encryption Key Auto-Generated)

The migration now uses **Supabase Vault** to securely store the encryption key. The key is automatically generated during migration if it doesn't exist.

**⚠️ IMPORTANT**: The migration will create a random encryption key in Vault automatically. You should back up this key immediately after migration!

Run the migration using Supabase CLI or SQL Editor:

```bash
# Option 1: Using Supabase CLI (Recommended)
cd "/Users/ccai/Roofing SaaS/roofing-saas"
npx supabase db push

# Option 2: Using SQL Editor
# Copy the contents of supabase/migrations/20251211_encrypt_quickbooks_tokens_v2.sql
# Paste into Supabase Dashboard > SQL Editor > Run
```

### Step 2: Back Up Encryption Key from Vault

**CRITICAL**: Immediately after migration, back up the encryption key:

```sql
-- Get the encryption key from Vault (run in Supabase SQL Editor)
SELECT name, decrypted_secret
FROM vault.decrypted_secrets
WHERE name = 'quickbooks_encryption_key';
```

**Save this key securely**:
- Copy the `decrypted_secret` value
- Store in password manager (1Password, LastPass, etc.)
- NEVER commit to git
- Document key storage location

**Why this matters**: If you lose access to your Supabase project AND don't have this key backed up, you cannot decrypt QuickBooks tokens. Users will need to reconnect.

### Step 3: Verify Migration Success

Check that the migration completed successfully:

```sql
-- Check table structure (should show BYTEA columns)
\d quickbooks_tokens

-- Verify helper functions exist
\df encrypt_qb_token
\df decrypt_qb_token

-- Check existing tokens were encrypted (if any exist)
SELECT
  tenant_id,
  realm_id,
  expires_at,
  octet_length(access_token) as token_size_bytes,
  created_at
FROM quickbooks_tokens;

-- If you see token_size_bytes > 0, tokens are encrypted!
```

### Step 5: Test Encryption/Decryption

Test the encryption functions work:

```sql
-- Test encryption
SELECT encrypt_qb_token('test_token_123');
-- Should return a BYTEA value like: \x...

-- Test round-trip (encrypt then decrypt)
SELECT decrypt_qb_token(encrypt_qb_token('test_token_123'));
-- Should return: test_token_123
```

---

## How It Works

### Encryption (When Storing Tokens)

1. User completes QuickBooks OAuth flow → receives tokens
2. Backend calls `supabase.rpc('encrypt_qb_token', { plaintext: token })`
3. PostgreSQL encrypts token using `pgp_sym_encrypt(token, key)`
4. Encrypted BYTEA is stored in database
5. ✅ Token is now unreadable without encryption key

### Decryption (When Using Tokens)

1. Application needs to call QuickBooks API
2. Backend calls `supabase.rpc('decrypt_qb_token', { encrypted_data: token })`
3. PostgreSQL decrypts token using `pgp_sym_decrypt(token, key)`
4. Plaintext token is returned (in memory only, never stored)
5. ✅ API call proceeds with decrypted token

---

## Rollback Instructions

**⚠️ WARNING**: Rollback will permanently DELETE all encrypted tokens!

Only use if you have a backup and absolutely need to revert:

```sql
-- Drop encryption functions
DROP FUNCTION IF EXISTS decrypt_qb_token(BYTEA);
DROP FUNCTION IF EXISTS encrypt_qb_token(TEXT);

-- Drop encrypted columns
ALTER TABLE quickbooks_tokens DROP COLUMN IF EXISTS access_token;
ALTER TABLE quickbooks_tokens DROP COLUMN IF EXISTS refresh_token;

-- Re-add plaintext columns
ALTER TABLE quickbooks_tokens ADD COLUMN access_token TEXT;
ALTER TABLE quickbooks_tokens ADD COLUMN refresh_token TEXT;

-- Restore from backup (YOU MUST HAVE A BACKUP)
-- COPY quickbooks_tokens FROM '/path/to/backup.csv' WITH CSV HEADER;
```

---

## Testing Checklist

Before deploying to production, verify:

- [ ] Encryption key is set in database (`SHOW app.settings.quickbooks_encryption_key`)
- [ ] Migration applied successfully (no errors)
- [ ] Helper functions exist (`\df encrypt_qb_token`)
- [ ] Tokens table uses BYTEA columns (`\d quickbooks_tokens`)
- [ ] OAuth flow works (connect QuickBooks account)
- [ ] Token storage encrypts properly (check database after OAuth)
- [ ] Token retrieval decrypts properly (make API call)
- [ ] Token refresh encrypts new tokens (wait for token expiry)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] No build errors (`npm run build`)

---

## Production Deployment Steps

1. **Before Deployment**:
   - [ ] Generate production encryption key
   - [ ] Store key in secure password manager
   - [ ] Back up current database
   - [ ] Document key storage location

2. **During Deployment**:
   - [ ] Set encryption key in production database
   - [ ] Apply migration via Supabase dashboard or CLI
   - [ ] Verify migration success
   - [ ] Test OAuth flow in production

3. **After Deployment**:
   - [ ] Verify existing tokens still work
   - [ ] Test new OAuth connections
   - [ ] Monitor logs for decryption errors
   - [ ] Document deployment in session notes

---

## Troubleshooting

### Error: "Encryption key not found in Vault"

**Cause**: Vault secret `quickbooks_encryption_key` doesn't exist.

**Fix** (Create key manually):
```sql
-- Generate and store a new key in Vault
INSERT INTO vault.secrets (name, secret)
VALUES (
  'quickbooks_encryption_key',
  encode(gen_random_bytes(32), 'hex')
);

-- Verify it exists
SELECT name FROM vault.secrets WHERE name = 'quickbooks_encryption_key';
```

### Error: "Failed to decrypt QB tokens"

**Possible Causes**:
1. Encryption key changed after tokens were encrypted
2. Tokens corrupted in database
3. Wrong key being used

**Fix**:
1. Verify key: `SHOW app.settings.quickbooks_encryption_key`
2. If key is wrong, restore correct key
3. If tokens are corrupted, user must reconnect QuickBooks

### Error: "pgp_sym_encrypt does not exist"

**Cause**: `pgcrypto` extension not enabled.

**Fix**:
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

---

## Security Best Practices

1. **Key Management**:
   - Use a cryptographically secure random key (32+ bytes)
   - Never commit key to version control
   - Store key in secure vault (1Password, AWS Secrets Manager, etc.)
   - Rotate key periodically (requires re-encrypting all tokens)

2. **Access Control**:
   - Limit database access to essential personnel only
   - Use RLS policies (already in place for `quickbooks_tokens`)
   - Monitor database access logs

3. **Monitoring**:
   - Alert on failed decryption attempts
   - Log all QuickBooks OAuth connections
   - Monitor for unusual API activity

4. **Backup**:
   - Back up encryption key separately from database
   - Test key backup restoration process
   - Document key recovery procedures

---

## References

- PostgreSQL pgcrypto: https://www.postgresql.org/docs/current/pgcrypto.html
- QuickBooks OAuth 2.0: https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0
- Supabase Security: https://supabase.com/docs/guides/database/postgres/row-level-security

---

**Last Updated**: December 11, 2025
**Migration File**: `supabase/migrations/20251211_encrypt_quickbooks_tokens_v2.sql`
**Encryption Method**: Supabase Vault (pgcrypto + vault extensions)
**Status**: Ready to apply - CRITICAL SECURITY FIX
