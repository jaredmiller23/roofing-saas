-- Migration: Fix get_sms_conversations function to not require is_deleted column on activities
-- The activities table may not have is_deleted column, so we remove that filter
-- Rollback: Re-run the original function with is_deleted checks

-- Drop and recreate the function without is_deleted checks on activities
CREATE OR REPLACE FUNCTION get_sms_conversations(p_tenant_id UUID)
RETURNS TABLE (
  contact_id UUID,
  contact_name TEXT,
  contact_phone TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_direction VARCHAR(10),
  unread_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH latest_messages AS (
    -- Get the most recent SMS message per contact
    -- Note: Removed is_deleted filter since activities table may not have this column
    SELECT DISTINCT ON (a.contact_id)
      a.contact_id,
      a.content,
      a.created_at,
      a.direction
    FROM activities a
    WHERE a.tenant_id = p_tenant_id
      AND a.type = 'sms'
    ORDER BY a.contact_id, a.created_at DESC
  ),
  unread_counts AS (
    -- Count unread inbound messages per contact
    SELECT
      a.contact_id,
      COUNT(*) as unread
    FROM activities a
    WHERE a.tenant_id = p_tenant_id
      AND a.type = 'sms'
      AND a.direction = 'inbound'
      AND a.read_at IS NULL
    GROUP BY a.contact_id
  )
  -- Join contacts with latest message and unread count
  SELECT
    c.id as contact_id,
    COALESCE(c.first_name || ' ' || c.last_name, c.company, 'Unknown') as contact_name,
    COALESCE(c.mobile_phone, c.phone) as contact_phone,
    lm.content as last_message,
    lm.created_at as last_message_at,
    lm.direction as last_message_direction,
    COALESCE(uc.unread, 0) as unread_count
  FROM contacts c
  INNER JOIN latest_messages lm ON c.id = lm.contact_id
  LEFT JOIN unread_counts uc ON c.id = uc.contact_id
  WHERE c.tenant_id = p_tenant_id
    AND c.is_deleted = false
  ORDER BY lm.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_sms_conversations(UUID) IS 'Get all SMS conversations for a tenant with unread counts. Used by Messages tab conversation list. Fixed Dec 14 2025 to not require is_deleted on activities.';
