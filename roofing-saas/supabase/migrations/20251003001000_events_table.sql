-- =====================================================
-- EVENTS TABLE
-- Date: 2025-10-03
-- Purpose: Calendar and scheduling for appointments, inspections, meetings
-- Critical for: Adjuster meeting coordination, appointment tracking
-- =====================================================

-- Events Table
-- Manages all calendar events and appointments
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Event details
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT CHECK (event_type IN (
    'appointment',
    'inspection',
    'adjuster_meeting',
    'crew_meeting',
    'follow_up',
    'callback',
    'estimate',
    'other'
  )),

  -- Timing
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  timezone TEXT DEFAULT 'America/New_York',

  -- Relationships
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,

  -- Location
  location TEXT,
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Attendees
  organizer UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  attendees UUID[], -- Array of user IDs
  external_attendees JSONB, -- Array of {name, email} for non-users

  -- Status & Outcome
  status TEXT CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show')) DEFAULT 'scheduled',
  outcome TEXT,
  outcome_notes TEXT,

  -- Reminders
  reminder_minutes_before INTEGER DEFAULT 60, -- Minutes before event to send reminder
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_sent_at TIMESTAMPTZ,

  -- Recurrence (for future enhancement)
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT, -- iCal RRULE format
  parent_event_id UUID REFERENCES events(id) ON DELETE CASCADE,

  -- Integration
  google_calendar_id TEXT,
  outlook_calendar_id TEXT,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_events_tenant_id ON events(tenant_id);
CREATE INDEX idx_events_contact_id ON events(contact_id);
CREATE INDEX idx_events_project_id ON events(project_id);
CREATE INDEX idx_events_job_id ON events(job_id);
CREATE INDEX idx_events_organizer ON events(organizer);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_start_at ON events(start_at);
CREATE INDEX idx_events_created_at ON events(created_at DESC);

-- Composite index for calendar views
CREATE INDEX idx_events_calendar ON events(start_at, end_at) WHERE status NOT IN ('cancelled');

-- Index for attendee queries
CREATE INDEX idx_events_attendees ON events USING GIN (attendees);

-- Index for reminders
CREATE INDEX idx_events_reminders ON events(start_at, reminder_sent) WHERE reminder_sent = FALSE AND status = 'scheduled';

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Users can view events in their tenant
CREATE POLICY "Users can view events in their tenant"
  ON events FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can create events in their tenant
CREATE POLICY "Users can create events"
  ON events FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can update events in their tenant
CREATE POLICY "Users can update events"
  ON events FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can delete events in their tenant
CREATE POLICY "Users can delete events"
  ON events FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_event_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on events
CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_event_updated_at();

-- Function to validate event times
CREATE OR REPLACE FUNCTION validate_event_times()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_at <= NEW.start_at THEN
    RAISE EXCEPTION 'Event end time must be after start time';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate event times
CREATE TRIGGER events_validate_times
  BEFORE INSERT OR UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION validate_event_times();

-- Function to get user's calendar events
CREATE OR REPLACE FUNCTION get_user_calendar_events(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  event_id UUID,
  title TEXT,
  event_type TEXT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  status TEXT,
  contact_name TEXT,
  project_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id AS event_id,
    e.title,
    e.event_type,
    e.start_at,
    e.end_at,
    e.status,
    c.first_name || ' ' || c.last_name AS contact_name,
    p.name AS project_name
  FROM events e
  LEFT JOIN contacts c ON e.contact_id = c.id
  LEFT JOIN projects p ON e.project_id = p.id
  WHERE (
    e.organizer = p_user_id
    OR p_user_id = ANY(e.attendees)
  )
  AND e.start_at >= p_start_date
  AND e.start_at < p_end_date
  AND e.status NOT IN ('cancelled')
  AND e.is_deleted = FALSE
  ORDER BY e.start_at;
END;
$$ LANGUAGE plpgsql;

-- Function to get events needing reminders
CREATE OR REPLACE FUNCTION get_events_needing_reminders()
RETURNS TABLE (
  event_id UUID,
  title TEXT,
  start_at TIMESTAMPTZ,
  organizer UUID,
  attendees UUID[],
  contact_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id AS event_id,
    e.title,
    e.start_at,
    e.organizer,
    e.attendees,
    e.contact_id
  FROM events e
  WHERE e.reminder_sent = FALSE
    AND e.status = 'scheduled'
    AND e.start_at - (e.reminder_minutes_before || ' minutes')::INTERVAL <= NOW()
    AND e.start_at > NOW()
    AND e.is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for today's events
CREATE OR REPLACE VIEW todays_events AS
SELECT
  e.*,
  c.first_name || ' ' || c.last_name as contact_name,
  p.name as project_name,
  org.full_name as organizer_name
FROM events e
LEFT JOIN contacts c ON e.contact_id = c.id
LEFT JOIN projects p ON e.project_id = p.id
LEFT JOIN profiles org ON e.organizer = org.id
WHERE DATE(e.start_at AT TIME ZONE e.timezone) = CURRENT_DATE
  AND e.status NOT IN ('cancelled')
  AND e.is_deleted = FALSE
ORDER BY e.start_at;

-- View for upcoming events
CREATE OR REPLACE VIEW upcoming_events AS
SELECT
  e.*,
  c.first_name || ' ' || c.last_name as contact_name,
  p.name as project_name,
  org.full_name as organizer_name
FROM events e
LEFT JOIN contacts c ON e.contact_id = c.id
LEFT JOIN projects p ON e.project_id = p.id
LEFT JOIN profiles org ON e.organizer = org.id
WHERE e.start_at > NOW()
  AND e.status NOT IN ('cancelled', 'completed')
  AND e.is_deleted = FALSE
ORDER BY e.start_at
LIMIT 50;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE events IS 'Calendar events for appointments, inspections, meetings, and follow-ups';
COMMENT ON COLUMN events.event_type IS 'Type: appointment, inspection, adjuster_meeting, crew_meeting, follow_up, callback, estimate, other';
COMMENT ON COLUMN events.all_day IS 'Whether this is an all-day event';
COMMENT ON COLUMN events.attendees IS 'Array of user IDs who are invited to this event';
COMMENT ON COLUMN events.external_attendees IS 'JSONB array of {name, email} for external attendees (customers, adjusters)';
COMMENT ON COLUMN events.reminder_minutes_before IS 'Minutes before event to send reminder (default: 60)';
COMMENT ON COLUMN events.recurrence_rule IS 'iCal RRULE format for recurring events';
COMMENT ON COLUMN events.parent_event_id IS 'Links recurring instances to parent event';

COMMENT ON VIEW todays_events IS 'All non-cancelled events scheduled for today';
COMMENT ON VIEW upcoming_events IS 'Next 50 upcoming events (not cancelled or completed)';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== Events Table Created ===';
  RAISE NOTICE 'Created events table with RLS policies';
  RAISE NOTICE 'Created indexes for performance';
  RAISE NOTICE 'Created triggers for validation and auto-updates';
  RAISE NOTICE 'Created helper functions for calendar queries';
  RAISE NOTICE 'Created views for today and upcoming events';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Build calendar UI (day/week/month views)';
  RAISE NOTICE '2. Implement event creation from contacts/projects';
  RAISE NOTICE '3. Add reminder notification system';
  RAISE NOTICE '4. Integrate with Google Calendar/Outlook (optional)';
  RAISE NOTICE '5. Build recurring event support';
END $$;
