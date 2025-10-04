-- Tenant Customization System
-- Comprehensive admin panel for branding, settings, templates, and permissions

-- =====================================================
-- 1. TENANT SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Branding
  company_name VARCHAR(255),
  company_tagline VARCHAR(255),
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color
  secondary_color VARCHAR(7) DEFAULT '#10B981',
  accent_color VARCHAR(7) DEFAULT '#8B5CF6',

  -- Email Branding
  email_header_logo_url TEXT,
  email_footer_text TEXT,
  email_signature TEXT,

  -- System Settings
  timezone VARCHAR(100) DEFAULT 'America/New_York',
  locale VARCHAR(10) DEFAULT 'en-US',
  date_format VARCHAR(50) DEFAULT 'MM/DD/YYYY',
  time_format VARCHAR(50) DEFAULT '12h', -- '12h' or '24h'
  currency VARCHAR(3) DEFAULT 'USD',

  -- Business Hours (JSONB)
  business_hours JSONB DEFAULT '{
    "monday": {"open": "09:00", "close": "17:00", "enabled": true},
    "tuesday": {"open": "09:00", "close": "17:00", "enabled": true},
    "wednesday": {"open": "09:00", "close": "17:00", "enabled": true},
    "thursday": {"open": "09:00", "close": "17:00", "enabled": true},
    "friday": {"open": "09:00", "close": "17:00", "enabled": true},
    "saturday": {"open": "09:00", "close": "13:00", "enabled": false},
    "sunday": {"open": "09:00", "close": "13:00", "enabled": false}
  }'::jsonb,

  -- Notification Settings
  email_notifications_enabled BOOLEAN DEFAULT true,
  sms_notifications_enabled BOOLEAN DEFAULT true,
  push_notifications_enabled BOOLEAN DEFAULT true,

  -- Integration Settings (JSONB for flexibility)
  integrations JSONB DEFAULT '{
    "quickbooks": {"enabled": false, "company_id": null, "realm_id": null},
    "twilio": {"enabled": false, "account_sid": null, "auth_token": null, "phone_number": null},
    "google_maps": {"enabled": false, "api_key": null},
    "stripe": {"enabled": false, "publishable_key": null, "secret_key": null}
  }'::jsonb,

  -- Default Assignment Rules
  default_lead_assignee UUID REFERENCES auth.users(id),
  auto_assign_leads BOOLEAN DEFAULT false,
  round_robin_assignment BOOLEAN DEFAULT false,

  -- Additional Settings (flexible JSONB)
  custom_settings JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one settings record per tenant
  CONSTRAINT unique_tenant_settings UNIQUE (tenant_id)
);

-- =====================================================
-- 2. PIPELINE STAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color
  icon VARCHAR(50), -- Lucide icon name
  stage_order INTEGER NOT NULL, -- Display order

  -- Stage Type
  stage_type VARCHAR(50) DEFAULT 'active', -- 'active', 'won', 'lost'

  -- Probability (for forecasting)
  win_probability INTEGER DEFAULT 50 CHECK (win_probability >= 0 AND win_probability <= 100),

  -- Automation
  auto_actions JSONB DEFAULT '{
    "send_email": false,
    "send_sms": false,
    "create_task": false,
    "notify_manager": false
  }'::jsonb,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Ensure unique stage order per tenant
  CONSTRAINT unique_stage_order UNIQUE (tenant_id, stage_order)
);

-- =====================================================
-- 3. WIN/LOSS REASONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS win_loss_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  reason VARCHAR(255) NOT NULL,
  reason_type VARCHAR(10) NOT NULL CHECK (reason_type IN ('won', 'lost')),
  category VARCHAR(100), -- e.g., 'price', 'timing', 'competition', 'quality'
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- 4. EMAIL TEMPLATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  description TEXT,
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,

  -- Template Category
  category VARCHAR(100), -- 'lead_follow_up', 'quote_sent', 'appointment_reminder', etc.

  -- Variables (for documentation)
  available_variables JSONB DEFAULT '[
    {"name": "contact_name", "description": "Contact full name"},
    {"name": "contact_first_name", "description": "Contact first name"},
    {"name": "company_name", "description": "Your company name"},
    {"name": "user_name", "description": "Logged in user name"},
    {"name": "project_name", "description": "Project name"},
    {"name": "appointment_date", "description": "Appointment date/time"}
  ]'::jsonb,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- 5. SMS TEMPLATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  description TEXT,
  message TEXT NOT NULL CHECK (LENGTH(message) <= 1600), -- SMS limit

  -- Template Category
  category VARCHAR(100),

  -- Variables (for documentation)
  available_variables JSONB DEFAULT '[
    {"name": "contact_name", "description": "Contact full name"},
    {"name": "contact_first_name", "description": "Contact first name"},
    {"name": "company_name", "description": "Your company name"},
    {"name": "user_name", "description": "Logged in user name"},
    {"name": "appointment_date", "description": "Appointment date/time"}
  ]'::jsonb,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- 6. USER ROLES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- System Roles (cannot be deleted)
  is_system BOOLEAN DEFAULT false,

  -- Permissions (JSONB for flexibility)
  permissions JSONB DEFAULT '{
    "contacts": {"view": true, "create": true, "edit": true, "delete": false},
    "projects": {"view": true, "create": true, "edit": true, "delete": false},
    "tasks": {"view": true, "create": true, "edit": true, "delete": false},
    "calls": {"view": true, "create": true, "edit": true, "delete": false},
    "files": {"view": true, "create": true, "edit": true, "delete": false},
    "reports": {"view": true, "create": false, "edit": false, "delete": false},
    "settings": {"view": false, "create": false, "edit": false, "delete": false},
    "users": {"view": false, "create": false, "edit": false, "delete": false},
    "billing": {"view": false, "create": false, "edit": false, "delete": false}
  }'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Ensure unique role names per tenant
  CONSTRAINT unique_role_name UNIQUE (tenant_id, name)
);

-- =====================================================
-- 7. USER ROLE ASSIGNMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,

  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),

  -- Ensure one role per user per tenant
  CONSTRAINT unique_user_role UNIQUE (tenant_id, user_id)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant ON tenant_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_tenant ON pipeline_stages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_order ON pipeline_stages(tenant_id, stage_order);
CREATE INDEX IF NOT EXISTS idx_win_loss_reasons_tenant ON win_loss_reasons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_tenant ON email_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_sms_templates_tenant ON sms_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sms_templates_category ON sms_templates(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant ON user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_tenant ON user_role_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user ON user_role_assignments(user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenant_settings_updated_at BEFORE UPDATE ON tenant_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipeline_stages_updated_at BEFORE UPDATE ON pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sms_templates_updated_at BEFORE UPDATE ON sms_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE win_loss_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_assignments ENABLE ROW LEVEL SECURITY;

-- Tenant Settings Policies
CREATE POLICY "Users can view their tenant settings"
  ON tenant_settings FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()));

CREATE POLICY "Admins can update their tenant settings"
  ON tenant_settings FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()));

CREATE POLICY "Admins can insert their tenant settings"
  ON tenant_settings FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()));

-- Pipeline Stages Policies
CREATE POLICY "Users can view their tenant pipeline stages"
  ON pipeline_stages FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their tenant pipeline stages"
  ON pipeline_stages FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()));

-- Win/Loss Reasons Policies
CREATE POLICY "Users can view their tenant win/loss reasons"
  ON win_loss_reasons FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their tenant win/loss reasons"
  ON win_loss_reasons FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()));

-- Email Templates Policies
CREATE POLICY "Users can view their tenant email templates"
  ON email_templates FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their tenant email templates"
  ON email_templates FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()));

-- SMS Templates Policies
CREATE POLICY "Users can view their tenant sms templates"
  ON sms_templates FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their tenant sms templates"
  ON sms_templates FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()));

-- User Roles Policies
CREATE POLICY "Users can view their tenant roles"
  ON user_roles FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage their tenant roles"
  ON user_roles FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()));

-- User Role Assignments Policies
CREATE POLICY "Users can view their tenant role assignments"
  ON user_role_assignments FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage their tenant role assignments"
  ON user_role_assignments FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()));

-- =====================================================
-- SEED DEFAULT DATA
-- =====================================================

-- Insert default system roles (will be created per tenant on first login)
-- This is a template - actual insertion happens via application logic

-- Default Pipeline Stages
-- 1. Lead
-- 2. Qualified
-- 3. Proposal Sent
-- 4. Negotiation
-- 5. Closed Won
-- 6. Closed Lost

-- Default Win/Loss Reasons
-- Won: Best Price, Best Quality, Existing Relationship, Quick Response
-- Lost: Price Too High, Chose Competitor, Timing Not Right, No Response

-- Default Email Templates
-- - Lead Follow-up
-- - Appointment Confirmation
-- - Quote Sent
-- - Project Update
-- - Payment Reminder

-- Default SMS Templates
-- - Appointment Reminder
-- - On My Way
-- - Quote Ready
-- - Follow-up Request
