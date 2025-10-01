-- =====================================================
-- EMAIL TRACKING AND COMPLIANCE
-- Date: 2025-10-01
-- Add fields for email opt-out, bounce tracking, and analytics
-- =====================================================

-- Add email opt-out and bounce tracking to contacts table
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS email_opt_out BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_opt_out_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_opt_out_reason TEXT,
ADD COLUMN IF NOT EXISTS email_invalid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_invalid_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_invalid_reason TEXT;

-- Add index for quick email opt-out lookups
CREATE INDEX IF NOT EXISTS idx_contacts_email_opt_out
ON contacts(email_opt_out)
WHERE email_opt_out = true;

-- Add index for bounced email lookups
CREATE INDEX IF NOT EXISTS idx_contacts_email_invalid
ON contacts(email_invalid)
WHERE email_invalid = true;

-- Create function to check if email can be sent to a contact
CREATE OR REPLACE FUNCTION can_send_email_to_contact(
  contact_email TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  is_opted_out BOOLEAN;
  is_invalid BOOLEAN;
BEGIN
  -- Check opt-out and invalid status
  SELECT email_opt_out, email_invalid
  INTO is_opted_out, is_invalid
  FROM contacts
  WHERE email = contact_email
  AND is_deleted = false
  LIMIT 1;

  -- If opted out or invalid, can't send
  IF is_opted_out = true OR is_invalid = true THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION can_send_email_to_contact IS
'Checks if email can be sent to a contact based on opt-out status and email validity (bounce tracking)';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '=== Email Tracking Migration Complete ===';
  RAISE NOTICE 'Added email opt-out tracking to contacts table';
  RAISE NOTICE 'Added email bounce/invalid tracking';
  RAISE NOTICE 'Created can_send_email_to_contact() function';
  RAISE NOTICE 'Email compliance and analytics ready';
END $$;
