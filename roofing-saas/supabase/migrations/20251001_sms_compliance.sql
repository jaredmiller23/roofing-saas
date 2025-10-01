-- =====================================================
-- SMS COMPLIANCE TRACKING
-- Date: 2025-10-01
-- Add fields for TCPA compliance and opt-out management
-- =====================================================

-- Add SMS consent and opt-out tracking to contacts table
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_opt_in_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sms_opt_out BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_opt_out_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sms_opt_out_reason TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

-- Add index for quick opt-out lookups (important for send validation)
CREATE INDEX IF NOT EXISTS idx_contacts_sms_opt_out
ON contacts(sms_opt_out)
WHERE sms_opt_out = true;

-- Add index for SMS consent queries
CREATE INDEX IF NOT EXISTS idx_contacts_sms_opt_in
ON contacts(sms_opt_in)
WHERE sms_opt_in = true;

-- Create function to check if SMS can be sent to a contact
CREATE OR REPLACE FUNCTION can_send_sms_to_contact(
  contact_phone TEXT,
  contact_timezone TEXT DEFAULT 'America/New_York'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  current_hour INTEGER;
  is_opted_out BOOLEAN;
BEGIN
  -- Check opt-out status
  SELECT sms_opt_out INTO is_opted_out
  FROM contacts
  WHERE (phone = contact_phone OR mobile_phone = contact_phone)
  AND is_deleted = false
  LIMIT 1;

  -- If opted out, can't send
  IF is_opted_out = true THEN
    RETURN false;
  END IF;

  -- Check quiet hours (8am-9pm)
  current_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE contact_timezone);

  IF current_hour < 8 OR current_hour >= 21 THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION can_send_sms_to_contact IS
'Checks if SMS can be sent to a contact based on opt-out status and quiet hours (8am-9pm)';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '=== SMS Compliance Migration Complete ===';
  RAISE NOTICE 'Added SMS opt-in/opt-out tracking to contacts table';
  RAISE NOTICE 'Added timezone support for quiet hours enforcement';
  RAISE NOTICE 'Created can_send_sms_to_contact() function';
  RAISE NOTICE 'Quiet hours: 8am-9pm local time';
  RAISE NOTICE 'Default timezone: America/New_York';
END $$;
