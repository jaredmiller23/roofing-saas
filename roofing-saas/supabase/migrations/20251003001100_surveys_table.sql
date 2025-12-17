-- =====================================================
-- SURVEYS TABLE
-- Date: 2025-10-03
-- Purpose: Customer feedback and review management with review gating
-- Critical for: 170% more reviews (Enzy stat), reputation management
-- =====================================================

-- Surveys Table
-- Manages customer satisfaction surveys and review gating
CREATE TABLE IF NOT EXISTS surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Survey relationships
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Rep/crew lead

  -- Survey delivery
  survey_type TEXT CHECK (survey_type IN ('post_job', 'mid_project', 'follow_up', 'general')) DEFAULT 'post_job',
  delivery_method TEXT CHECK (delivery_method IN ('sms', 'email', 'qr_code', 'link')) DEFAULT 'sms',

  -- QR Code for mobile
  qr_code_url TEXT, -- URL to generated QR code image
  survey_link TEXT UNIQUE, -- Unique survey link (e.g., /survey/abc123)
  survey_token TEXT UNIQUE, -- Token for accessing survey

  -- Delivery tracking
  sent_at TIMESTAMPTZ,
  sent_to_phone TEXT,
  sent_to_email TEXT,
  delivery_status TEXT CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed')) DEFAULT 'pending',
  delivery_error TEXT,

  -- Response tracking
  opened_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Survey responses
  rating INTEGER CHECK (rating BETWEEN 1 AND 5), -- 1-5 stars
  feedback TEXT,

  -- Additional questions (customizable)
  question_1_response TEXT,
  question_2_response TEXT,
  question_3_response TEXT,
  additional_responses JSONB, -- For dynamic questions

  -- Review gating logic
  review_threshold INTEGER DEFAULT 4, -- If rating >= threshold, prompt for public review
  review_requested BOOLEAN DEFAULT FALSE, -- Whether we asked them to post public review
  review_posted BOOLEAN DEFAULT FALSE, -- Whether they posted public review
  review_platform TEXT, -- 'google', 'facebook', 'yelp', etc.
  review_url TEXT, -- Deep link to review page
  review_posted_at TIMESTAMPTZ,

  -- Negative feedback handling
  is_negative_feedback BOOLEAN DEFAULT FALSE, -- rating < threshold
  manager_notified BOOLEAN DEFAULT FALSE,
  manager_notified_at TIMESTAMPTZ,
  manager_response TEXT,
  issue_resolved BOOLEAN DEFAULT FALSE,
  resolution_notes TEXT,

  -- Metadata
  response_time_seconds INTEGER, -- Time to complete survey
  device_info JSONB, -- Browser, OS, device type
  ip_address TEXT,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_surveys_tenant_id ON surveys(tenant_id);
CREATE INDEX idx_surveys_project_id ON surveys(project_id);
CREATE INDEX idx_surveys_contact_id ON surveys(contact_id);
CREATE INDEX idx_surveys_job_id ON surveys(job_id);
CREATE INDEX idx_surveys_user_id ON surveys(user_id);
CREATE INDEX idx_surveys_rating ON surveys(rating);
CREATE INDEX idx_surveys_survey_token ON surveys(survey_token);
CREATE INDEX idx_surveys_created_at ON surveys(created_at DESC);

-- Index for review tracking
CREATE INDEX idx_surveys_reviews ON surveys(rating, review_posted) WHERE completed_at IS NOT NULL;

-- Index for negative feedback alerts
CREATE INDEX idx_surveys_negative ON surveys(is_negative_feedback, manager_notified) WHERE is_negative_feedback = TRUE;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

-- Users can view surveys in their tenant
CREATE POLICY "Users can view surveys in their tenant"
  ON surveys FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can create surveys in their tenant
CREATE POLICY "Users can create surveys"
  ON surveys FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can update surveys in their tenant
CREATE POLICY "Users can update surveys"
  ON surveys FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Public can update surveys via token (for customer responses)
CREATE POLICY "Public can submit survey via token"
  ON surveys FOR UPDATE
  USING (survey_token IS NOT NULL);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_survey_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on surveys
CREATE TRIGGER surveys_updated_at
  BEFORE UPDATE ON surveys
  FOR EACH ROW
  EXECUTE FUNCTION update_survey_updated_at();

-- Function to generate unique survey token
CREATE OR REPLACE FUNCTION generate_survey_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.survey_token IS NULL THEN
    NEW.survey_token := encode(gen_random_bytes(16), 'base64');
    NEW.survey_link := '/survey/' || NEW.survey_token;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to generate survey token
CREATE TRIGGER surveys_generate_token
  BEFORE INSERT ON surveys
  FOR EACH ROW
  EXECUTE FUNCTION generate_survey_token();

-- Function to handle review gating logic
CREATE OR REPLACE FUNCTION handle_survey_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if rating meets threshold for review request
  IF NEW.rating IS NOT NULL AND OLD.rating IS NULL THEN
    IF NEW.rating >= NEW.review_threshold THEN
      -- Positive rating: request public review
      NEW.review_requested := TRUE;
      NEW.is_negative_feedback := FALSE;
    ELSE
      -- Negative rating: flag for manager follow-up
      NEW.is_negative_feedback := TRUE;
      NEW.review_requested := FALSE;
    END IF;

    -- Calculate response time
    IF NEW.started_at IS NOT NULL THEN
      NEW.response_time_seconds := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at));
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to handle rating logic
CREATE TRIGGER surveys_handle_rating
  BEFORE UPDATE ON surveys
  FOR EACH ROW
  WHEN (NEW.rating IS NOT NULL)
  EXECUTE FUNCTION handle_survey_rating();

-- Function to get survey stats by user
CREATE OR REPLACE FUNCTION get_user_survey_stats(p_user_id UUID, p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  result JSON;
  start_filter TIMESTAMPTZ;
  end_filter TIMESTAMPTZ;
BEGIN
  start_filter := COALESCE(p_start_date::TIMESTAMPTZ, NOW() - INTERVAL '30 days');
  end_filter := COALESCE(p_end_date::TIMESTAMPTZ, NOW());

  SELECT json_build_object(
    'total_surveys_sent', COUNT(*),
    'surveys_completed', COUNT(*) FILTER (WHERE completed_at IS NOT NULL),
    'completion_rate', ROUND(
      (COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::DECIMAL /
       NULLIF(COUNT(*), 0) * 100), 2
    ),
    'avg_rating', ROUND(AVG(rating), 2),
    'five_star_count', COUNT(*) FILTER (WHERE rating = 5),
    'four_star_count', COUNT(*) FILTER (WHERE rating = 4),
    'three_star_count', COUNT(*) FILTER (WHERE rating = 3),
    'two_star_count', COUNT(*) FILTER (WHERE rating = 2),
    'one_star_count', COUNT(*) FILTER (WHERE rating = 1),
    'reviews_posted', COUNT(*) FILTER (WHERE review_posted = TRUE),
    'negative_feedback_count', COUNT(*) FILTER (WHERE is_negative_feedback = TRUE)
  )
  INTO result
  FROM surveys
  WHERE user_id = p_user_id
    AND created_at BETWEEN start_filter AND end_filter
    AND is_deleted = FALSE;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for pending review requests (4-5 stars, not posted yet)
CREATE OR REPLACE VIEW pending_review_requests AS
SELECT
  s.*,
  c.first_name || ' ' || c.last_name as customer_name,
  c.email as customer_email,
  c.phone as customer_phone,
  p.name as project_name,
  u.full_name as rep_name
FROM surveys s
LEFT JOIN contacts c ON s.contact_id = c.id
LEFT JOIN projects p ON s.project_id = p.id
LEFT JOIN profiles u ON s.user_id = u.id
WHERE s.review_requested = TRUE
  AND s.review_posted = FALSE
  AND s.completed_at IS NOT NULL
  AND s.is_deleted = FALSE
ORDER BY s.completed_at DESC;

-- View for negative feedback needing attention
CREATE OR REPLACE VIEW negative_feedback_alerts AS
SELECT
  s.*,
  c.first_name || ' ' || c.last_name as customer_name,
  c.phone as customer_phone,
  p.name as project_name,
  u.full_name as rep_name
FROM surveys s
LEFT JOIN contacts c ON s.contact_id = c.id
LEFT JOIN projects p ON s.project_id = p.id
LEFT JOIN profiles u ON s.user_id = u.id
WHERE s.is_negative_feedback = TRUE
  AND s.issue_resolved = FALSE
  AND s.is_deleted = FALSE
ORDER BY s.completed_at DESC;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE surveys IS 'Customer satisfaction surveys with review gating (4-5 stars → public review, 1-3 → internal)';
COMMENT ON COLUMN surveys.review_threshold IS 'Minimum rating to request public review (default: 4)';
COMMENT ON COLUMN surveys.survey_token IS 'Unique token for accessing survey without auth';
COMMENT ON COLUMN surveys.review_requested IS 'Whether customer was asked to post public review (rating >= threshold)';
COMMENT ON COLUMN surveys.is_negative_feedback IS 'Whether rating is below threshold (needs manager attention)';
COMMENT ON COLUMN surveys.qr_code_url IS 'URL to QR code image for mobile scanning';

COMMENT ON VIEW pending_review_requests IS 'Surveys with 4-5 star ratings that haven\'t posted public reviews yet';
COMMENT ON VIEW negative_feedback_alerts IS 'Surveys with low ratings needing manager follow-up';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== Surveys Table Created ===';
  RAISE NOTICE 'Created surveys table with RLS policies';
  RAISE NOTICE 'Created indexes for performance';
  RAISE NOTICE 'Created triggers for auto-token generation and rating logic';
  RAISE NOTICE 'Created helper functions for survey stats';
  RAISE NOTICE 'Created views for review requests and negative feedback';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Build survey landing page (public, no auth)';
  RAISE NOTICE '2. Generate QR codes per rep/job';
  RAISE NOTICE '3. Implement SMS survey sending via Twilio';
  RAISE NOTICE '4. Build review gating logic (4-5 → Google, 1-3 → internal)';
  RAISE NOTICE '5. Create manager alert system for negative feedback';
  RAISE NOTICE '6. Add Google review deep linking';
END $$;
