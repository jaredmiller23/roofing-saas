-- Migration: Add SMS read tracking for Messages tab
-- Rollback:
--   DROP FUNCTION IF EXISTS get_sms_conversations(UUID);
--   DROP INDEX IF EXISTS idx_activities_sms_by_contact;
--   DROP INDEX IF EXISTS idx_activities_sms_unread;
--   ALTER TABLE activities DROP COLUMN IF EXISTS read_by;
--   ALTER TABLE activities DROP COLUMN IF EXISTS read_at;

-- Add read tracking columns to activities table
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS read_by UUID REFERENCES auth.users(id);

COMMENT ON COLUMN activities.read_at IS 'Timestamp when SMS message was read (for Messages tab thread view)';
COMMENT ON COLUMN activities.read_by IS 'User who read the SMS message (for Messages tab unread tracking)';

-- Index for unread message queries (WHERE read_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_activities_sms_unread
  ON activities(tenant_id, contact_id, read_at)
  WHERE type = 'sms' AND read_at IS NULL;

-- Index for conversation list queries (latest message per contact)
CREATE INDEX IF NOT EXISTS idx_activities_sms_by_contact
  ON activities(tenant_id, contact_id, created_at DESC)
  WHERE type = 'sms';

-- Database function to get SMS conversations with unread counts
-- This replaces N+1 queries with a single efficient query
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
    SELECT DISTINCT ON (a.contact_id)
      a.contact_id,
      a.content,
      a.created_at,
      a.direction
    FROM activities a
    WHERE a.tenant_id = p_tenant_id
      AND a.type = 'sms'
      AND a.is_deleted = false
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
      AND a.is_deleted = false
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

COMMENT ON FUNCTION get_sms_conversations(UUID) IS 'Get all SMS conversations for a tenant with unread counts. Used by Messages tab conversation list.';
