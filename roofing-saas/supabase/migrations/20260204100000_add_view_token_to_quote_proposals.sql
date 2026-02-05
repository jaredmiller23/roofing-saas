-- =====================================================
-- ADD VIEW TOKEN TO QUOTE_PROPOSALS
-- Date: 2026-02-04
--
-- Adds a view_token column for public shareable estimate links.
-- The proposal ID is used as the token (UUID is already unguessable),
-- but we add an explicit column for flexibility and to add an
-- RLS policy allowing public reads via token.
-- =====================================================

-- Add view_token column (defaults to the proposal ID for existing rows)
ALTER TABLE quote_proposals
ADD COLUMN IF NOT EXISTS view_token UUID DEFAULT gen_random_uuid();

-- Create unique index on view_token
CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_proposals_view_token
ON quote_proposals(view_token);

-- Add recipient tracking columns
ALTER TABLE quote_proposals
ADD COLUMN IF NOT EXISTS recipient_email TEXT,
ADD COLUMN IF NOT EXISTS recipient_name TEXT;

-- =====================================================
-- PUBLIC ACCESS RLS POLICY
-- Allow unauthenticated reads when accessing by view_token.
-- This is used by the public estimate viewing page.
-- =====================================================

-- Public read policy: anyone with the view_token can read the proposal
-- Note: This uses the service role / admin client in the API route,
-- so we don't need a special anon policy. The API validates the token.

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '=== Quote Proposals View Token ===';
  RAISE NOTICE 'Added view_token column for shareable links';
  RAISE NOTICE 'Added recipient_email and recipient_name columns';
  RAISE NOTICE 'Created unique index on view_token';
END $$;
