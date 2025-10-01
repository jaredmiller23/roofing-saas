-- =====================================================
-- ROOFING SAAS DATABASE SCHEMA v2.0
-- Multi-Tenant Architecture with Row-Level Security
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS "vector"; -- For AI embeddings
CREATE EXTENSION IF NOT EXISTS "pg_cron"; -- For scheduled jobs

-- =====================================================
-- TENANT MANAGEMENT
-- =====================================================

-- Master tenant table
CREATE TABLE tenants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  -- Tenant info
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) UNIQUE NOT NULL,
  custom_domain VARCHAR(255),

  -- Settings
  settings JSONB DEFAULT '{}',
  features JSONB DEFAULT '{"max_users": 10, "max_contacts": 10000}',

  -- Billing
  subscription_status VARCHAR(50) DEFAULT 'trial',
  subscription_expires_at TIMESTAMP WITH TIME ZONE,

  -- Branding
  logo_url VARCHAR(500),
  primary_color VARCHAR(7),
  secondary_color VARCHAR(7),

  is_active BOOLEAN DEFAULT true
);

-- Tenant user association
CREATE TABLE tenant_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member', -- admin, manager, member, viewer
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  UNIQUE(tenant_id, user_id)
);

-- =====================================================
-- CORE CRM TABLES (Multi-Tenant)
-- =====================================================

-- Contacts (Leads/Customers)
CREATE TABLE contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT FALSE,

  -- Contact fields
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  mobile_phone VARCHAR(20),

  -- Address
  address_street VARCHAR(255),
  address_city VARCHAR(100),
  address_state VARCHAR(2),
  address_zip VARCHAR(10),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- CRM fields
  type VARCHAR(50) DEFAULT 'lead', -- lead, customer, prospect
  stage VARCHAR(50) DEFAULT 'new', -- new, contacted, qualified, proposal, won, lost
  source VARCHAR(100), -- website, referral, door-knock, etc.
  source_details JSONB,
  assigned_to UUID REFERENCES auth.users(id),

  -- Roofing specific
  property_type VARCHAR(50), -- residential, commercial, multi-family
  roof_type VARCHAR(100),
  roof_age INTEGER,
  last_inspection_date DATE,
  property_value DECIMAL(12, 2),
  square_footage INTEGER,
  stories INTEGER,

  -- Insurance
  insurance_carrier VARCHAR(100),
  policy_number VARCHAR(100),
  claim_number VARCHAR(100),
  deductible DECIMAL(10, 2),

  -- Scoring
  lead_score INTEGER DEFAULT 0,
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent

  -- Custom fields
  custom_fields JSONB DEFAULT '{}',
  tags TEXT[],

  -- Search
  search_vector tsvector,

  -- Indexes
  UNIQUE(tenant_id, email),
  INDEX idx_contacts_tenant (tenant_id),
  INDEX idx_contacts_stage (tenant_id, stage),
  INDEX idx_contacts_assigned (tenant_id, assigned_to),
  INDEX idx_contacts_search (search_vector)
);

-- Projects/Jobs
CREATE TABLE projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT FALSE,

  -- Relationships
  contact_id UUID NOT NULL REFERENCES contacts(id),
  parent_project_id UUID REFERENCES projects(id), -- For supplementals

  -- Project info
  name VARCHAR(255) NOT NULL,
  project_number VARCHAR(50),
  status VARCHAR(50) DEFAULT 'estimate', -- estimate, approved, scheduled, in_progress, completed, cancelled
  type VARCHAR(50), -- repair, replacement, maintenance, emergency

  -- Financial
  estimated_value DECIMAL(12, 2),
  approved_value DECIMAL(12, 2),
  final_value DECIMAL(12, 2),

  -- Costs
  materials_cost DECIMAL(12, 2),
  labor_cost DECIMAL(12, 2),
  overhead_cost DECIMAL(12, 2),
  profit_margin DECIMAL(5, 2),

  -- Dates
  estimated_start DATE,
  scheduled_start DATE,
  actual_start DATE,
  estimated_completion DATE,
  actual_completion DATE,

  -- Details
  description TEXT,
  scope_of_work TEXT,
  materials_list JSONB,

  -- Insurance
  insurance_approved BOOLEAN DEFAULT FALSE,
  insurance_approval_amount DECIMAL(12, 2),
  deductible_collected BOOLEAN DEFAULT FALSE,
  supplements JSONB DEFAULT '[]',

  -- Production
  crew_assigned JSONB,
  weather_delays INTEGER DEFAULT 0,
  quality_score INTEGER,

  -- Integration
  quickbooks_id VARCHAR(100),
  quickbooks_sync_status VARCHAR(50),

  -- Custom
  custom_fields JSONB DEFAULT '{}',

  INDEX idx_projects_tenant (tenant_id),
  INDEX idx_projects_contact (tenant_id, contact_id),
  INDEX idx_projects_status (tenant_id, status)
);

-- Activities (All interactions)
CREATE TABLE activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_by UUID REFERENCES auth.users(id),

  -- Relationships
  contact_id UUID REFERENCES contacts(id),
  project_id UUID REFERENCES projects(id),

  -- Activity details
  type VARCHAR(50) NOT NULL, -- call, email, sms, meeting, note, task, door_knock
  subtype VARCHAR(50), -- inbound, outbound, follow_up, etc.

  -- Content
  subject VARCHAR(255),
  content TEXT,

  -- Communication specific
  direction VARCHAR(10), -- inbound, outbound
  from_address VARCHAR(255),
  to_address VARCHAR(255),

  -- Results
  outcome VARCHAR(100),
  outcome_details JSONB,

  -- Metadata
  duration_seconds INTEGER,
  recording_url VARCHAR(500),
  transcript TEXT,

  -- Scheduling
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  reminder_at TIMESTAMP WITH TIME ZONE,

  -- Integration
  external_id VARCHAR(100), -- Twilio SID, email ID, etc.

  INDEX idx_activities_tenant (tenant_id),
  INDEX idx_activities_contact (tenant_id, contact_id),
  INDEX idx_activities_project (tenant_id, project_id),
  INDEX idx_activities_type (tenant_id, type),
  INDEX idx_activities_scheduled (tenant_id, scheduled_at)
);

-- =====================================================
-- DOCUMENTS & MEDIA
-- =====================================================

CREATE TABLE documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_by UUID REFERENCES auth.users(id),

  -- Relationships
  entity_type VARCHAR(50) NOT NULL, -- contact, project, activity
  entity_id UUID NOT NULL,

  -- File info
  name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),

  -- Metadata
  type VARCHAR(50), -- photo, contract, invoice, report, etc.
  tags TEXT[],

  -- AI analysis (for photos)
  ai_description TEXT,
  ai_tags JSONB,
  damage_detected BOOLEAN,

  -- Versioning
  version INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES documents(id),

  INDEX idx_documents_tenant (tenant_id),
  INDEX idx_documents_entity (tenant_id, entity_type, entity_id)
);

-- =====================================================
-- TEMPLATES & AUTOMATION
-- =====================================================

CREATE TABLE templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_by UUID REFERENCES auth.users(id),

  -- Template info
  type VARCHAR(50) NOT NULL, -- email, sms, contract, proposal
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Content
  subject VARCHAR(255),
  content TEXT NOT NULL,
  variables JSONB, -- Available merge variables

  -- Settings
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,

  -- Usage
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,

  INDEX idx_templates_tenant (tenant_id),
  INDEX idx_templates_type (tenant_id, type)
);

CREATE TABLE automations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_by UUID REFERENCES auth.users(id),

  -- Automation info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,

  -- Trigger
  trigger_type VARCHAR(50), -- stage_change, time_based, event, manual
  trigger_config JSONB,

  -- Actions
  actions JSONB, -- Array of actions to perform

  -- Conditions
  conditions JSONB, -- Conditions that must be met

  -- Execution
  last_run_at TIMESTAMP WITH TIME ZONE,
  run_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,

  INDEX idx_automations_tenant (tenant_id),
  INDEX idx_automations_active (tenant_id, is_active)
);

-- =====================================================
-- GAMIFICATION
-- =====================================================

CREATE TABLE gamification_scores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Points and levels
  total_points INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  points_this_week INTEGER DEFAULT 0,
  points_this_month INTEGER DEFAULT 0,

  -- Activity counts
  doors_knocked INTEGER DEFAULT 0,
  contacts_made INTEGER DEFAULT 0,
  appointments_set INTEGER DEFAULT 0,
  deals_closed INTEGER DEFAULT 0,
  referrals_generated INTEGER DEFAULT 0,

  -- Achievements
  achievements JSONB DEFAULT '[]',
  badges JSONB DEFAULT '[]',

  -- Streaks
  current_streak_days INTEGER DEFAULT 0,
  longest_streak_days INTEGER DEFAULT 0,
  last_activity_date DATE,

  -- Rankings
  weekly_rank INTEGER,
  monthly_rank INTEGER,
  all_time_rank INTEGER,

  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  UNIQUE(tenant_id, user_id),
  INDEX idx_gamification_tenant (tenant_id),
  INDEX idx_gamification_points (tenant_id, total_points DESC)
);

CREATE TABLE gamification_activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  -- Activity
  activity_type VARCHAR(50) NOT NULL,
  points_earned INTEGER NOT NULL,

  -- Context
  entity_type VARCHAR(50),
  entity_id UUID,
  details JSONB,

  INDEX idx_gamification_activities_tenant (tenant_id),
  INDEX idx_gamification_activities_user (tenant_id, user_id)
);

-- =====================================================
-- REPORTING & ANALYTICS
-- =====================================================

CREATE TABLE kpi_snapshots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  -- Metrics
  metric_date DATE NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(20, 4),

  -- Dimensions
  dimensions JSONB, -- user_id, team, territory, etc.

  -- Comparisons
  previous_value DECIMAL(20, 4),
  target_value DECIMAL(20, 4),

  UNIQUE(tenant_id, metric_date, metric_name, dimensions),
  INDEX idx_kpi_tenant (tenant_id),
  INDEX idx_kpi_date (tenant_id, metric_date)
);

CREATE TABLE report_schedules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_by UUID REFERENCES auth.users(id),

  -- Report info
  name VARCHAR(255) NOT NULL,
  report_type VARCHAR(50),
  parameters JSONB,

  -- Schedule
  frequency VARCHAR(20), -- daily, weekly, monthly
  schedule_config JSONB,
  next_run_at TIMESTAMP WITH TIME ZONE,

  -- Distribution
  recipients JSONB,
  format VARCHAR(20), -- pdf, excel, csv

  is_active BOOLEAN DEFAULT true,

  INDEX idx_report_schedules_tenant (tenant_id)
);

-- =====================================================
-- VOICE AI ASSISTANT
-- =====================================================

CREATE TABLE voice_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  ended_at TIMESTAMP WITH TIME ZONE,

  -- Session info
  session_type VARCHAR(50), -- voice, text, phone
  device_info JSONB,

  -- Metrics
  duration_seconds INTEGER,
  turn_count INTEGER DEFAULT 0,
  commands_executed INTEGER DEFAULT 0,

  -- Cost tracking
  tokens_used INTEGER,
  audio_minutes DECIMAL(10, 2),
  estimated_cost DECIMAL(10, 4),

  INDEX idx_voice_sessions_tenant (tenant_id),
  INDEX idx_voice_sessions_user (tenant_id, user_id)
);

CREATE TABLE voice_conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES voice_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  -- Turn info
  turn_number INTEGER NOT NULL,
  speaker VARCHAR(20), -- user, assistant

  -- Content
  audio_url VARCHAR(500),
  transcript TEXT,
  intent VARCHAR(100),
  entities JSONB,

  -- Response
  response_text TEXT,
  response_audio_url VARCHAR(500),
  actions_taken JSONB,

  -- Metrics
  confidence_score DECIMAL(3, 2),
  processing_time_ms INTEGER,

  INDEX idx_voice_conversations_session (session_id)
);

-- AI Knowledge Base for RAG
CREATE TABLE knowledge_base (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  -- Content
  source_type VARCHAR(50), -- document, faq, training, auto_learned
  source_id UUID,
  title VARCHAR(255),
  content TEXT NOT NULL,

  -- Embeddings
  embedding vector(1536), -- OpenAI embeddings

  -- Metadata
  metadata JSONB,
  usage_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,

  INDEX idx_knowledge_tenant (tenant_id),
  INDEX idx_knowledge_embedding (embedding vector_cosine_ops)
);

-- =====================================================
-- FINANCIAL & COMMISSIONS
-- =====================================================

CREATE TABLE commission_rules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  -- Rule info
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Application
  applies_to VARCHAR(50), -- user, role, team
  applies_to_id UUID,

  -- Calculation
  calculation_type VARCHAR(50), -- percentage, flat, tiered
  calculation_config JSONB,

  -- Conditions
  conditions JSONB,

  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,

  INDEX idx_commission_rules_tenant (tenant_id)
);

CREATE TABLE commissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  -- Relationships
  user_id UUID NOT NULL REFERENCES auth.users(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  rule_id UUID REFERENCES commission_rules(id),

  -- Amounts
  project_value DECIMAL(12, 2),
  commission_rate DECIMAL(5, 2),
  commission_amount DECIMAL(12, 2),

  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, paid, disputed
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,

  -- Notes
  notes TEXT,
  dispute_reason TEXT,

  INDEX idx_commissions_tenant (tenant_id),
  INDEX idx_commissions_user (tenant_id, user_id),
  INDEX idx_commissions_status (tenant_id, status)
);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

-- Function to get user's tenant
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM tenant_users
  WHERE user_id = auth.uid()
  LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER;

-- RLS Policies (example for contacts table, repeat pattern for others)
CREATE POLICY "Users can view contacts in their tenant"
  ON contacts FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert contacts in their tenant"
  ON contacts FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update contacts in their tenant"
  ON contacts FOR UPDATE
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete contacts in their tenant"
  ON contacts FOR DELETE
  USING (tenant_id = get_user_tenant_id());

-- =====================================================
-- TRIGGERS & FUNCTIONS
-- =====================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to tables with updated_at
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Search vector update for contacts
CREATE OR REPLACE FUNCTION update_contact_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.first_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.last_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.email, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.phone, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.address_street, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contact_search_vector BEFORE INSERT OR UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_contact_search_vector();

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

CREATE VIEW pipeline_metrics AS
SELECT
  tenant_id,
  DATE_TRUNC('day', created_at) as date,
  stage,
  COUNT(*) as count,
  SUM(CASE WHEN projects.id IS NOT NULL THEN 1 ELSE 0 END) as with_projects
FROM contacts
LEFT JOIN projects ON contacts.id = projects.contact_id
GROUP BY tenant_id, DATE_TRUNC('day', created_at), stage;

CREATE VIEW revenue_forecast AS
SELECT
  tenant_id,
  DATE_TRUNC('month', estimated_completion) as month,
  status,
  SUM(estimated_value) as pipeline_value,
  SUM(approved_value) as approved_value,
  COUNT(*) as project_count
FROM projects
WHERE status NOT IN ('completed', 'cancelled')
GROUP BY tenant_id, DATE_TRUNC('month', estimated_completion), status;

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Default tenant for development
INSERT INTO tenants (name, subdomain)
VALUES ('Demo Company', 'demo')
ON CONFLICT DO NOTHING;

-- Default achievement types
INSERT INTO knowledge_base (tenant_id, source_type, title, content)
SELECT
  id,
  'training',
  'Default Commands',
  'Common voice commands: Check status, Schedule appointment, Send contract, View pipeline, Generate report'
FROM tenants
WHERE subdomain = 'demo';

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_contacts_full_text ON contacts USING GIN(search_vector);
CREATE INDEX idx_activities_date_range ON activities (tenant_id, created_at DESC);
CREATE INDEX idx_projects_pipeline ON projects (tenant_id, status, estimated_value);
CREATE INDEX idx_documents_recent ON documents (tenant_id, created_at DESC);
CREATE INDEX idx_gamification_leaderboard ON gamification_scores (tenant_id, points_this_month DESC);