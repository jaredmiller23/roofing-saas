-- =============================================
-- Digital Business Cards System Migration
-- =============================================
-- Purpose: Replace Surveys functionality with digital business cards
--          for sales reps to share contact info with prospects
-- Author: Claude Code
-- Date: 2025-11-18
-- =============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLES
-- =============================================

-- Digital Business Cards table
-- One card per sales rep (user) with customizable branding
CREATE TABLE IF NOT EXISTS digital_business_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Personal Information
  full_name VARCHAR(255) NOT NULL,
  job_title VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),

  -- Company Information
  company_name VARCHAR(255),
  company_address TEXT,
  company_phone VARCHAR(50),
  company_email VARCHAR(255),
  company_website VARCHAR(255),

  -- Social Links
  linkedin_url VARCHAR(500),
  facebook_url VARCHAR(500),
  instagram_url VARCHAR(500),
  twitter_url VARCHAR(500),

  -- Card Content
  tagline VARCHAR(255),
  bio TEXT,
  services TEXT, -- Comma-separated or JSON array

  -- Branding
  brand_color VARCHAR(7) DEFAULT '#3b82f6', -- Hex color
  logo_url VARCHAR(500),
  profile_photo_url VARCHAR(500),
  background_image_url VARCHAR(500),

  -- Card Settings
  slug VARCHAR(100) NOT NULL, -- Unique URL slug (/card/john-smith)
  qr_code_url VARCHAR(500), -- Generated QR code image URL
  card_url VARCHAR(500), -- Full public URL
  is_active BOOLEAN DEFAULT true,
  enable_contact_form BOOLEAN DEFAULT true,
  enable_appointment_booking BOOLEAN DEFAULT false,

  -- Analytics Summary
  total_views INTEGER DEFAULT 0,
  total_vcard_downloads INTEGER DEFAULT 0,
  total_phone_clicks INTEGER DEFAULT 0,
  total_email_clicks INTEGER DEFAULT 0,
  total_contact_form_submissions INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_viewed_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(tenant_id, user_id), -- One card per user per tenant
  UNIQUE(slug), -- Globally unique slugs
  CHECK (slug ~ '^[a-z0-9-]+$'), -- Only lowercase letters, numbers, hyphens
  CHECK (brand_color ~ '^#[0-9a-fA-F]{6}$') -- Valid hex color
);

-- Create index for fast slug lookups (public card page)
CREATE INDEX idx_digital_business_cards_slug ON digital_business_cards(slug) WHERE is_active = true;

-- Create index for tenant queries
CREATE INDEX idx_digital_business_cards_tenant_id ON digital_business_cards(tenant_id);

-- Create index for user queries
CREATE INDEX idx_digital_business_cards_user_id ON digital_business_cards(user_id);

-- Business Card Interactions table
-- Tracks all interactions with digital business cards
CREATE TABLE IF NOT EXISTS business_card_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID NOT NULL REFERENCES digital_business_cards(id) ON DELETE CASCADE,

  -- Interaction Details
  interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN (
    'view',
    'vcard_download',
    'phone_click',
    'email_click',
    'website_click',
    'linkedin_click',
    'facebook_click',
    'instagram_click',
    'twitter_click',
    'contact_form_submit',
    'appointment_booked'
  )),

  -- Prospect Information (optional, from contact form)
  prospect_name VARCHAR(255),
  prospect_email VARCHAR(255),
  prospect_phone VARCHAR(50),
  prospect_company VARCHAR(255),
  prospect_message TEXT,

  -- Tracking Data
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  device_type VARCHAR(50), -- 'mobile', 'tablet', 'desktop'
  browser VARCHAR(100),
  os VARCHAR(100),
  country VARCHAR(100),
  city VARCHAR(100),

  -- Metadata
  interaction_metadata JSONB, -- Additional flexible data
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Indexes inline
  CHECK (interaction_type IN (
    'view', 'vcard_download', 'phone_click', 'email_click', 'website_click',
    'linkedin_click', 'facebook_click', 'instagram_click', 'twitter_click',
    'contact_form_submit', 'appointment_booked'
  ))
);

-- Create index for card_id queries (analytics)
CREATE INDEX idx_business_card_interactions_card_id ON business_card_interactions(card_id);

-- Create index for interaction_type filtering
CREATE INDEX idx_business_card_interactions_type ON business_card_interactions(interaction_type);

-- Create index for date range queries (analytics)
CREATE INDEX idx_business_card_interactions_created_at ON business_card_interactions(created_at DESC);

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_digital_business_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_digital_business_cards_updated_at
  BEFORE UPDATE ON digital_business_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_digital_business_cards_updated_at();

-- Auto-increment analytics counters on interactions
CREATE OR REPLACE FUNCTION update_card_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last_viewed_at for any interaction
  UPDATE digital_business_cards
  SET last_viewed_at = NOW()
  WHERE id = NEW.card_id;

  -- Increment specific counters based on interaction type
  CASE NEW.interaction_type
    WHEN 'view' THEN
      UPDATE digital_business_cards
      SET total_views = total_views + 1
      WHERE id = NEW.card_id;

    WHEN 'vcard_download' THEN
      UPDATE digital_business_cards
      SET total_vcard_downloads = total_vcard_downloads + 1
      WHERE id = NEW.card_id;

    WHEN 'phone_click' THEN
      UPDATE digital_business_cards
      SET total_phone_clicks = total_phone_clicks + 1
      WHERE id = NEW.card_id;

    WHEN 'email_click' THEN
      UPDATE digital_business_cards
      SET total_email_clicks = total_email_clicks + 1
      WHERE id = NEW.card_id;

    WHEN 'contact_form_submit' THEN
      UPDATE digital_business_cards
      SET total_contact_form_submissions = total_contact_form_submissions + 1
      WHERE id = NEW.card_id;

    ELSE
      -- Other interaction types don't have dedicated counters
      NULL;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_card_analytics
  AFTER INSERT ON business_card_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_card_analytics();

-- Auto-generate slug from name if not provided
CREATE OR REPLACE FUNCTION generate_card_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- If slug is already provided, validate and return
  IF NEW.slug IS NOT NULL AND NEW.slug != '' THEN
    RETURN NEW;
  END IF;

  -- Generate base slug from full name
  base_slug := LOWER(REGEXP_REPLACE(NEW.full_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := TRIM(BOTH '-' FROM base_slug);

  -- Ensure slug is not empty
  IF base_slug = '' THEN
    base_slug := 'card-' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8);
  END IF;

  final_slug := base_slug;

  -- Check for uniqueness and append counter if needed
  WHILE EXISTS (SELECT 1 FROM digital_business_cards WHERE slug = final_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_card_slug
  BEFORE INSERT OR UPDATE ON digital_business_cards
  FOR EACH ROW
  EXECUTE FUNCTION generate_card_slug();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on both tables
ALTER TABLE digital_business_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_card_interactions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - digital_business_cards
-- =============================================

-- PUBLIC: Allow anyone to view active cards (for public card page)
CREATE POLICY "Public cards are viewable by anyone"
  ON digital_business_cards
  FOR SELECT
  USING (is_active = true);

-- SELECT: Users can view cards in their tenant
CREATE POLICY "Users can view cards in their tenant"
  ON digital_business_cards
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- INSERT: Admins can create cards for any user in their tenant
CREATE POLICY "Admins can create cards"
  ON digital_business_cards
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id
      FROM tenant_users
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- UPDATE: Users can update their own card, admins can update any card in tenant
CREATE POLICY "Users can update their own card, admins can update any"
  ON digital_business_cards
  FOR UPDATE
  USING (
    -- Own card
    (user_id = auth.uid())
    OR
    -- Admin in same tenant
    (tenant_id IN (
      SELECT tenant_id
      FROM tenant_users
      WHERE user_id = auth.uid()
      AND role = 'admin'
    ))
  );

-- DELETE: Only admins can delete cards
CREATE POLICY "Admins can delete cards"
  ON digital_business_cards
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM tenant_users
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- =============================================
-- RLS POLICIES - business_card_interactions
-- =============================================

-- INSERT: Anyone can create interactions (for public tracking)
-- Note: In production, you might want to add rate limiting or verification
CREATE POLICY "Anyone can create interactions"
  ON business_card_interactions
  FOR INSERT
  WITH CHECK (true);

-- SELECT: Users can view interactions for cards in their tenant
CREATE POLICY "Users can view interactions for their tenant's cards"
  ON business_card_interactions
  FOR SELECT
  USING (
    card_id IN (
      SELECT id
      FROM digital_business_cards
      WHERE tenant_id IN (
        SELECT tenant_id
        FROM tenant_users
        WHERE user_id = auth.uid()
      )
    )
  );

-- UPDATE: Not allowed (interactions are immutable)
-- DELETE: Only admins can delete interactions
CREATE POLICY "Admins can delete interactions"
  ON business_card_interactions
  FOR DELETE
  USING (
    card_id IN (
      SELECT id
      FROM digital_business_cards
      WHERE tenant_id IN (
        SELECT tenant_id
        FROM tenant_users
        WHERE user_id = auth.uid()
        AND role = 'admin'
      )
    )
  );

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to get card analytics summary
CREATE OR REPLACE FUNCTION get_card_analytics(
  p_card_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  interaction_type VARCHAR(50),
  count BIGINT,
  unique_ips BIGINT,
  latest_interaction TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.interaction_type,
    COUNT(*)::BIGINT as count,
    COUNT(DISTINCT i.ip_address)::BIGINT as unique_ips,
    MAX(i.created_at) as latest_interaction
  FROM business_card_interactions i
  WHERE i.card_id = p_card_id
    AND (p_start_date IS NULL OR i.created_at >= p_start_date)
    AND (p_end_date IS NULL OR i.created_at <= p_end_date)
  GROUP BY i.interaction_type
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get card performance metrics
CREATE OR REPLACE FUNCTION get_card_performance_metrics(
  p_card_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_views BIGINT,
  unique_visitors BIGINT,
  conversion_rate NUMERIC,
  avg_daily_views NUMERIC,
  top_referrer TEXT,
  top_country TEXT,
  top_device TEXT
) AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
BEGIN
  v_start_date := NOW() - (p_days || ' days')::INTERVAL;

  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) FILTER (WHERE interaction_type = 'view') as views,
      COUNT(DISTINCT ip_address) as uniques,
      COUNT(*) FILTER (WHERE interaction_type IN ('contact_form_submit', 'appointment_booked')) as conversions,
      MODE() WITHIN GROUP (ORDER BY referrer) as top_ref,
      MODE() WITHIN GROUP (ORDER BY country) as top_cntry,
      MODE() WITHIN GROUP (ORDER BY device_type) as top_dev
    FROM business_card_interactions
    WHERE card_id = p_card_id
      AND created_at >= v_start_date
  )
  SELECT
    s.views::BIGINT,
    s.uniques::BIGINT,
    CASE
      WHEN s.views > 0 THEN ROUND((s.conversions::NUMERIC / s.views::NUMERIC) * 100, 2)
      ELSE 0
    END,
    ROUND(s.views::NUMERIC / p_days::NUMERIC, 2),
    s.top_ref,
    s.top_cntry,
    s.top_dev
  FROM stats s;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE digital_business_cards IS 'Digital business cards for sales reps to share contact information with prospects';
COMMENT ON TABLE business_card_interactions IS 'Tracks all interactions with digital business cards for analytics';

COMMENT ON COLUMN digital_business_cards.slug IS 'Unique URL-safe identifier for public card access (/card/john-smith)';
COMMENT ON COLUMN digital_business_cards.qr_code_url IS 'Generated QR code image URL for easy sharing';
COMMENT ON COLUMN digital_business_cards.brand_color IS 'Primary brand color in hex format (#3b82f6)';

COMMENT ON FUNCTION get_card_analytics IS 'Returns analytics summary for a business card with optional date filtering';
COMMENT ON FUNCTION get_card_performance_metrics IS 'Returns comprehensive performance metrics for a business card over specified days';

-- =============================================
-- SAMPLE DATA (Optional - for development)
-- =============================================

-- Note: Sample data would be inserted here for development environments
-- In production, cards are created by users through the UI

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- This migration creates:
-- ✓ digital_business_cards table with branding and analytics
-- ✓ business_card_interactions table for tracking
-- ✓ Auto-increment analytics triggers
-- ✓ Auto-generate slug trigger
-- ✓ RLS policies for multi-tenant security
-- ✓ Public access for active cards
-- ✓ Helper functions for analytics
-- ✓ Indexes for performance
-- ✓ Constraints for data integrity
