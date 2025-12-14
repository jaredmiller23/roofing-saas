# Fix Messages Page Error

**Issue**: Messages page shows "1 Issue" error indicator
**Error**: `column a.is_deleted does not exist`
**Location**: `get_sms_conversations` database function

## Quick Fix

Run this SQL in Supabase Dashboard > SQL Editor:

```sql
-- Fix get_sms_conversations function to not require is_deleted column on activities
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
  SELECT
    c.id as contact_id,
    COALESCE(c.first_name || ' ' || c.last_name, c.company, 'Unknown') as contact_name,
    COALESCE(c.mobile_phone, c.phone)::TEXT as contact_phone,
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
```

## How to Apply

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/wfifizczqvogbcqamnmw
2. Navigate to SQL Editor
3. Paste the SQL above
4. Click "Run"
5. Refresh the Messages page - error should be gone

## Root Cause

The `get_sms_conversations` function was filtering on `activities.is_deleted`, but the `activities` table doesn't have that column. The fix removes this filter from the activities queries (contacts still filters on `is_deleted`).

## Migration Note

A migration file exists at `supabase/migrations/20251214140000_fix_sms_conversations_function.sql` but couldn't be pushed due to migration history sync issues. The SQL above is the same fix.
