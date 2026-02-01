-- ==================================================
-- BASELINE SCHEMA RECONCILIATION MIGRATION
-- ==================================================
-- Generated: 2026-02-01
-- Purpose: Create base tables that existed before migration tracking
-- 
-- This migration creates 62 tables that exist in NAS production
-- but were never captured in migration files (created before
-- migrations were adopted, or via direct SQL after NAS migration).
--
-- All statements use IF NOT EXISTS / IF EXISTS patterns to be
-- idempotent - safe to run even if tables/constraints already exist.
-- ==================================================

-- Extensions (needed for uuid_generate_v4)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- BASELINE SCHEMA RECONCILIATION MIGRATION

-- ----------------------------------------
-- Table: _encryption_keys
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public._encryption_keys (
  id integer NOT NULL DEFAULT nextval('_encryption_keys_id_seq'::regclass),
  key_name text NOT NULL,
  key_value text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- ----------------------------------------
-- Table: achievements
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text,
  requirement_type text NOT NULL,
  requirement_value integer,
  requirement_metadata jsonb DEFAULT '{}'::jsonb,
  points_reward integer DEFAULT 0,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  tenant_id uuid
);

-- ----------------------------------------
-- Table: activities
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  created_by uuid,
  contact_id uuid,
  project_id uuid,
  type varchar(50) NOT NULL,
  subtype varchar(50),
  subject varchar(255),
  content text,
  direction varchar(10),
  from_address varchar(255),
  to_address varchar(255),
  outcome varchar(100),
  outcome_details jsonb,
  duration_seconds integer,
  recording_url varchar(500),
  transcript text,
  scheduled_at timestamp with time zone,
  completed_at timestamp with time zone,
  reminder_at timestamp with time zone,
  external_id varchar(100),
  performed_by uuid,
  on_behalf_of uuid,
  is_impersonated_action boolean DEFAULT false,
  read_at timestamp with time zone,
  read_by uuid,
  is_deleted boolean DEFAULT false
);

-- ----------------------------------------
-- Table: automations
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.automations (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  created_by uuid,
  name varchar(255) NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  trigger_type varchar(50),
  trigger_config jsonb,
  actions jsonb,
  conditions jsonb,
  last_run_at timestamp with time zone,
  run_count integer DEFAULT 0,
  error_count integer DEFAULT 0
);

-- ----------------------------------------
-- Table: building_codes
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.building_codes (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  jurisdiction_level varchar(50),
  jurisdiction_name varchar(200),
  state_code varchar(2),
  county varchar(100),
  city varchar(100),
  code_type varchar(50),
  code_section varchar(50),
  code_title text,
  code_text text,
  applies_to _text,
  effective_date date,
  superseded_date date,
  superseded_by uuid,
  source_document text,
  source_url text,
  version varchar(100),
  last_verified date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ----------------------------------------
-- Table: business_card_interactions
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.business_card_interactions (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  card_id uuid NOT NULL,
  interaction_type varchar(50) NOT NULL,
  prospect_name varchar(255),
  prospect_email varchar(255),
  prospect_phone varchar(50),
  prospect_company varchar(255),
  prospect_message text,
  ip_address inet,
  user_agent text,
  referrer text,
  device_type varchar(50),
  browser varchar(100),
  os varchar(100),
  country varchar(100),
  city varchar(100),
  interaction_metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ----------------------------------------
-- Table: carrier_standards
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.carrier_standards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  carrier_id uuid,
  carrier_name varchar(255),
  category varchar(100) NOT NULL,
  standard_name varchar(255) NOT NULL,
  description text,
  timeframe varchar(100),
  timeframe_hours integer,
  official_source boolean DEFAULT false,
  source_document text,
  source_url text,
  confidence_level varchar(50) DEFAULT 'reported'::character varying,
  effective_date date,
  notes text,
  tips _text,
  verified_by uuid,
  verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ----------------------------------------
-- Table: challenges
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid,
  title text NOT NULL,
  description text,
  challenge_type text NOT NULL,
  requirement_type text NOT NULL,
  requirement_value integer NOT NULL,
  points_reward integer NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------
-- Table: claim_communications
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.claim_communications (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  claim_id uuid NOT NULL,
  type varchar(50),
  direction varchar(20),
  subject text,
  content text,
  sent_at timestamp with time zone,
  response_due_at timestamp with time zone,
  responded_at timestamp with time zone,
  response_overdue boolean DEFAULT false,
  from_address varchar(255),
  to_address varchar(255),
  cc_addresses _text,
  external_id varchar(255),
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  ingestion_source varchar(50),
  raw_email jsonb,
  message_id varchar(255),
  in_reply_to varchar(255),
  thread_id varchar(255)
);

-- ----------------------------------------
-- Table: claim_documents
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.claim_documents (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  claim_id uuid NOT NULL,
  document_type varchar(50),
  name varchar(255),
  file_url text,
  file_path text,
  file_size integer,
  mime_type varchar(100),
  extracted_text text,
  ai_analysis jsonb,
  created_at timestamp with time zone DEFAULT now(),
  uploaded_by uuid
);

-- ----------------------------------------
-- Table: claim_outcomes
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.claim_outcomes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  claim_id uuid NOT NULL,
  outcome text NOT NULL,
  paid_amount numeric,
  denial_reason text,
  attorney_referral boolean DEFAULT false,
  outcome_date date,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  requested_amount numeric,
  approved_amount numeric,
  disputed_items _text,
  denial_reasons _text,
  successful_arguments _text,
  adjuster_id uuid,
  days_to_decision integer,
  days_to_payment integer,
  supplements_filed integer DEFAULT 0,
  appeal_filed boolean DEFAULT false,
  appeal_outcome text
);

-- ----------------------------------------
-- Table: claim_supplements
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.claim_supplements (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  claim_id uuid NOT NULL,
  supplement_number integer,
  reason text,
  items jsonb,
  requested_amount numeric,
  approved_amount numeric,
  status varchar(50),
  submitted_at timestamp with time zone,
  resolved_at timestamp with time zone,
  supporting_documents _uuid,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid
);

-- ----------------------------------------
-- Table: claim_weather_data
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.claim_weather_data (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  claim_id uuid,
  storm_event_id uuid,
  date_of_loss date NOT NULL,
  noaa_event_id varchar(100),
  noaa_report_url text,
  hail_reported boolean,
  hail_size_inches numeric,
  wind_speed_mph integer,
  wind_direction varchar(10),
  precipitation_inches numeric,
  weather_station_id varchar(50),
  weather_station_distance_miles numeric,
  local_damage_reports jsonb,
  weather_report_pdf_url text,
  created_at timestamp with time zone DEFAULT now()
);

-- ----------------------------------------
-- Table: claims
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.claims (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  contact_id uuid,
  project_id uuid,
  claim_number varchar(100),
  policy_number varchar(100),
  date_of_loss date,
  date_filed date,
  insurance_carrier varchar(200),
  adjuster_name varchar(200),
  adjuster_email varchar(255),
  adjuster_phone varchar(50),
  estimated_damage numeric,
  insurance_estimate numeric,
  approved_amount numeric,
  deductible numeric,
  paid_amount numeric,
  recovered_amount numeric,
  status varchar(50) DEFAULT 'new'::character varying,
  coverage_analysis jsonb,
  missed_coverages jsonb,
  violations jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  notes text,
  custom_fields jsonb,
  claim_email_address varchar(255),
  carrier_id uuid,
  adjuster_id uuid,
  inspection_scheduled_at timestamp with time zone,
  inspection_completed_at timestamp with time zone,
  decision_date date,
  acknowledgment_date date
);

-- ----------------------------------------
-- Table: commission_rules
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.commission_rules (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  name varchar(255) NOT NULL,
  description text,
  applies_to varchar(50),
  applies_to_id uuid,
  calculation_type varchar(50),
  calculation_config jsonb,
  conditions jsonb,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0
);

-- ----------------------------------------
-- Table: commission_summary_by_user
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.commission_summary_by_user (
  tenant_id uuid,
  user_id uuid,
  total_commissions bigint,
  total_earned numeric,
  pending_amount numeric,
  paid_amount numeric
);

-- ----------------------------------------
-- Table: commissions
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.commissions (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL,
  rule_id uuid,
  project_value numeric,
  commission_rate numeric,
  commission_amount numeric,
  status varchar(50) DEFAULT 'pending'::character varying,
  approved_by uuid,
  approved_at timestamp with time zone,
  paid_at timestamp with time zone,
  notes text,
  dispute_reason text
);

-- ----------------------------------------
-- Table: court_cases
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.court_cases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  case_name varchar(500),
  citation varchar(255),
  docket_number varchar(100),
  court varchar(200),
  court_level varchar(50),
  jurisdiction varchar(100),
  plaintiff_type varchar(50),
  carrier_id uuid,
  carrier_name varchar(255),
  date_filed date,
  date_decided date,
  weather_event_type varchar(50),
  weather_event_date date,
  property_type varchar(50),
  claim_issues _text,
  coverage_types_at_issue _text,
  outcome varchar(50),
  outcome_details text,
  damages_awarded numeric,
  bad_faith_found boolean,
  attorney_fees_awarded numeric,
  punitive_damages numeric,
  key_holdings _text,
  legal_issues _text,
  statutes_cited _text,
  summary text,
  relevance_notes text,
  quotable_passages jsonb,
  full_opinion_url text,
  source varchar(100),
  relevance_tags _text,
  verified boolean DEFAULT false,
  verified_by uuid,
  verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ----------------------------------------
-- Table: dashboards
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.dashboards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft'::text,
  visibility text NOT NULL DEFAULT 'private'::text,
  is_template boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  template_category text,
  target_roles jsonb DEFAULT '[]'::jsonb,
  role_based boolean DEFAULT false,
  layout jsonb DEFAULT '{}'::jsonb,
  widgets jsonb DEFAULT '[]'::jsonb,
  settings jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  last_modified_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ----------------------------------------
-- Table: digital_business_cards
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.digital_business_cards (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  full_name varchar(255) NOT NULL,
  job_title varchar(255),
  phone varchar(50),
  email varchar(255),
  company_name varchar(255),
  company_address text,
  company_phone varchar(50),
  company_email varchar(255),
  company_website varchar(255),
  linkedin_url varchar(500),
  facebook_url varchar(500),
  instagram_url varchar(500),
  twitter_url varchar(500),
  tagline varchar(255),
  bio text,
  services text,
  brand_color varchar(7) DEFAULT '#3b82f6'::character varying,
  logo_url varchar(500),
  profile_photo_url varchar(500),
  background_image_url varchar(500),
  slug varchar(100) NOT NULL,
  qr_code_url varchar(500),
  card_url varchar(500),
  is_active boolean DEFAULT true,
  enable_contact_form boolean DEFAULT true,
  enable_appointment_booking boolean DEFAULT false,
  total_views integer DEFAULT 0,
  total_vcard_downloads integer DEFAULT 0,
  total_phone_clicks integer DEFAULT 0,
  total_email_clicks integer DEFAULT 0,
  total_contact_form_submissions integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_viewed_at timestamp with time zone
);

-- ----------------------------------------
-- Table: discontinued_shingles
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.discontinued_shingles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  manufacturer text NOT NULL,
  product_line text NOT NULL,
  product_name text NOT NULL,
  color text,
  discontinued_date date,
  replaced_by text,
  can_mix_with_replacement boolean DEFAULT false,
  manufacturer_statement text,
  visual_identifiers jsonb,
  sample_photos _text,
  itel_code text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ----------------------------------------
-- Table: documents
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  created_by uuid,
  entity_type varchar(50) NOT NULL,
  entity_id uuid NOT NULL,
  name varchar(255) NOT NULL,
  file_url varchar(500) NOT NULL,
  file_size integer,
  mime_type varchar(100),
  type varchar(50),
  tags _text,
  ai_description text,
  ai_tags jsonb,
  damage_detected boolean,
  version integer DEFAULT 1,
  previous_version_id uuid
);

-- ----------------------------------------
-- Table: email_drafts
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.email_drafts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid,
  claim_id uuid NOT NULL,
  communication_id uuid,
  tier varchar(20) NOT NULL,
  template_id varchar(50),
  to_email varchar(255),
  cc_emails _text,
  subject text NOT NULL,
  body_html text NOT NULL,
  body_text text NOT NULL,
  attachment_url text,
  attachment_name varchar(255),
  status varchar(20) DEFAULT 'pending'::character varying,
  message_id varchar(255),
  send_error text,
  generated_at timestamp with time zone DEFAULT now(),
  generated_by uuid,
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  approved_at timestamp with time zone,
  approved_by uuid,
  sent_at timestamp with time zone,
  context jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ----------------------------------------
-- Table: gamification_activities
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.gamification_activities (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  activity_type varchar(50) NOT NULL,
  points_earned integer NOT NULL,
  entity_type varchar(50),
  entity_id uuid,
  details jsonb
);

-- ----------------------------------------
-- Table: gamification_scores
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.gamification_scores (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  total_points integer DEFAULT 0,
  current_level integer DEFAULT 1,
  points_this_week integer DEFAULT 0,
  points_this_month integer DEFAULT 0,
  doors_knocked integer DEFAULT 0,
  contacts_made integer DEFAULT 0,
  appointments_set integer DEFAULT 0,
  deals_closed integer DEFAULT 0,
  referrals_generated integer DEFAULT 0,
  achievements jsonb DEFAULT '[]'::jsonb,
  badges jsonb DEFAULT '[]'::jsonb,
  current_streak_days integer DEFAULT 0,
  longest_streak_days integer DEFAULT 0,
  last_activity_date date,
  weekly_rank integer,
  monthly_rank integer,
  all_time_rank integer,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  enzy_user_id text
);

-- ----------------------------------------
-- Table: high_priority_pins
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.high_priority_pins (
  id uuid,
  tenant_id uuid,
  user_id uuid,
  latitude numeric,
  longitude numeric,
  address text,
  address_street text,
  address_city text,
  address_state text,
  address_zip text,
  disposition text,
  notes text,
  photos _text,
  voice_memo_url text,
  appointment_date timestamp with time zone,
  callback_date date,
  follow_up_notes text,
  contact_id uuid,
  contact_created boolean,
  territory_id uuid,
  device_location_accuracy numeric,
  knocked_from text,
  created_at timestamp with time zone,
  is_deleted boolean,
  pin_type varchar(50),
  sync_status varchar(20),
  damage_score integer,
  enrichment_source varchar(50),
  last_sync_attempt timestamp with time zone,
  sync_error text,
  owner_name text,
  property_data jsonb,
  contact_name text,
  contact_phone varchar(20),
  contact_email varchar(255)
);

-- ----------------------------------------
-- Table: industry_organizations
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.industry_organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  short_code varchar(50) NOT NULL,
  full_name varchar(500),
  description text,
  website text,
  authority_type varchar(50),
  credibility_level varchar(50) DEFAULT 'industry_standard'::character varying,
  areas_of_expertise _text,
  founded_year integer,
  headquarters_location varchar(200),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ----------------------------------------
-- Table: industry_standards
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.industry_standards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  standard_code varchar(100),
  title varchar(500) NOT NULL,
  category varchar(100),
  subcategory varchar(100),
  definition text,
  criteria text,
  methodology text,
  examples text,
  applies_to _text,
  damage_types _text,
  source_document varchar(500),
  source_edition varchar(100),
  source_page varchar(50),
  source_url text,
  commonly_cited_in _text,
  legal_weight varchar(50),
  effective_date date,
  superseded_date date,
  superseded_by uuid,
  keywords _text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ----------------------------------------
-- Table: insurance_carriers
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.insurance_carriers (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  name varchar(255) NOT NULL,
  claims_phone varchar(50),
  claims_email varchar(255),
  claims_portal_url text,
  claims_mailing_address text,
  statutory_response_days integer DEFAULT 60,
  published_response_days integer,
  avg_actual_response_days numeric,
  total_claims_tracked integer DEFAULT 0,
  avg_initial_response_days numeric,
  supplement_approval_rate numeric,
  dispute_success_rate numeric,
  known_issues _text,
  tips _text,
  last_updated timestamp with time zone,
  state_licenses jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  short_code varchar(20),
  website text,
  naic_code varchar(20),
  am_best_rating varchar(10),
  headquarters_state varchar(2),
  is_national boolean DEFAULT true
);

-- ----------------------------------------
-- Table: insurance_personnel
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.insurance_personnel (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid,
  first_name varchar(100),
  last_name varchar(100),
  role varchar(50),
  carrier_id uuid,
  email varchar(255),
  phone varchar(50),
  total_claims_handled integer DEFAULT 0,
  avg_response_days numeric,
  avg_claim_approval_rate numeric,
  avg_supplement_approval_rate numeric,
  common_omissions _text,
  communication_style varchar(50),
  notes text,
  tips _text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_interaction_at timestamp with time zone
);

-- ----------------------------------------
-- Table: kpi_snapshots
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.kpi_snapshots (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  metric_date date NOT NULL,
  metric_name varchar(100) NOT NULL,
  metric_value numeric,
  dimensions jsonb,
  previous_value numeric,
  target_value numeric
);

-- ----------------------------------------
-- Table: leaderboard
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.leaderboard (
  user_id uuid,
  tenant_id uuid,
  total_points bigint,
  active_days bigint,
  total_sales bigint,
  last_activity timestamp with time zone
);

-- ----------------------------------------
-- Table: manufacturer_directory
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.manufacturer_directory (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name varchar(200) NOT NULL,
  short_code varchar(20),
  website text,
  phone varchar(50),
  email varchar(255),
  product_support_phone varchar(50),
  product_support_email varchar(255),
  technical_services_email varchar(255),
  warranty_phone varchar(50),
  warranty_email varchar(255),
  claims_portal_url text,
  regional_contacts jsonb,
  avg_response_days numeric,
  total_inquiries integer DEFAULT 0,
  notes text,
  preferred_contact_method varchar(50),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ----------------------------------------
-- Table: manufacturer_specs
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.manufacturer_specs (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  manufacturer varchar(100) NOT NULL,
  product_category varchar(50),
  product_name varchar(200),
  installation_requirements jsonb,
  warranty_requirements jsonb,
  warranty_document_url text,
  matching_policy text,
  spec_sheet_url text,
  installation_guide_url text,
  last_verified date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ----------------------------------------
-- Table: n8n_chat_histories
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.n8n_chat_histories (
  id integer NOT NULL DEFAULT nextval('n8n_chat_histories_id_seq'::regclass),
  session_id varchar(255) NOT NULL,
  message jsonb NOT NULL
);

-- ----------------------------------------
-- Table: packets
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.packets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  project_id uuid NOT NULL,
  claim_id uuid,
  packet_data jsonb NOT NULL,
  pdf_url text,
  status text DEFAULT 'draft'::text,
  generated_at timestamp with time zone DEFAULT now(),
  generated_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ----------------------------------------
-- Table: performance_metrics
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  op text NOT NULL,
  name text NOT NULL,
  duration_ms integer NOT NULL,
  status text NOT NULL DEFAULT 'ok'::text,
  attributes jsonb DEFAULT '{}'::jsonb,
  error text,
  environment text DEFAULT 'production'::text
);

-- ----------------------------------------
-- Table: photos
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.photos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  contact_id uuid,
  project_id uuid,
  file_path text NOT NULL,
  file_url text NOT NULL,
  thumbnail_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  uploaded_by uuid NOT NULL,
  is_deleted boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  claim_id uuid,
  damage_type text,
  severity text,
  photo_order integer
);

-- ----------------------------------------
-- Table: pins_pending_sync
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.pins_pending_sync (
  id uuid,
  pin_type varchar(50),
  latitude numeric,
  longitude numeric,
  address text,
  disposition text,
  owner_name text,
  notes text,
  photos _text,
  sync_status varchar(20),
  sync_error text,
  last_sync_attempt timestamp with time zone,
  created_at timestamp with time zone,
  user_id uuid,
  tenant_id uuid
);

-- ----------------------------------------
-- Table: pipeline_metrics
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.pipeline_metrics (
  tenant_id uuid,
  date timestamp with time zone,
  stage varchar(50),
  count bigint,
  with_projects bigint
);

-- ----------------------------------------
-- Table: point_rules
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.point_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  points_value integer NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  tenant_id uuid
);

-- ----------------------------------------
-- Table: policy_provisions
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.policy_provisions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  carrier text NOT NULL,
  policy_form text,
  provision_type text NOT NULL,
  provision_name text NOT NULL,
  provision_text text NOT NULL,
  common_disputes _text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ----------------------------------------
-- Table: project_profit_loss
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.project_profit_loss (
  id uuid,
  project_id uuid,
  tenant_id uuid,
  project_name varchar(255),
  project_number varchar(50),
  status pipeline_stage,
  revenue numeric,
  total_estimated_cost numeric,
  total_actual_cost numeric,
  gross_profit numeric,
  profit_margin_percent numeric,
  cost_variance numeric,
  actual_labor numeric,
  actual_materials numeric,
  actual_equipment numeric,
  actual_other numeric,
  actual_start date,
  actual_completion date,
  created_at timestamp with time zone
);

-- ----------------------------------------
-- Table: projects
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  created_by uuid,
  is_deleted boolean DEFAULT false,
  contact_id uuid,
  parent_project_id uuid,
  name varchar(255) NOT NULL,
  project_number varchar(50),
  status varchar(50) DEFAULT 'estimate'::character varying,
  type varchar(50),
  estimated_value numeric,
  approved_value numeric,
  final_value numeric,
  materials_cost numeric,
  labor_cost numeric,
  overhead_cost numeric,
  profit_margin numeric,
  estimated_start date,
  scheduled_start date,
  actual_start date,
  estimated_completion date,
  actual_completion date,
  description text,
  scope_of_work text,
  materials_list jsonb,
  insurance_approved boolean DEFAULT false,
  insurance_approval_amount numeric,
  deductible_collected boolean DEFAULT false,
  supplements jsonb DEFAULT '[]'::jsonb,
  crew_assigned jsonb,
  weather_delays integer DEFAULT 0,
  quality_score integer,
  quickbooks_id varchar(100),
  quickbooks_sync_status varchar(50),
  custom_fields jsonb DEFAULT '{}'::jsonb,
  quickbooks_invoice_id text,
  proline_id text,
  estimated_labor_cost numeric,
  actual_labor_cost numeric DEFAULT 0,
  estimated_material_cost numeric,
  actual_material_cost numeric DEFAULT 0,
  estimated_equipment_cost numeric,
  actual_equipment_cost numeric DEFAULT 0,
  estimated_other_cost numeric,
  actual_other_cost numeric DEFAULT 0,
  cost_variance numeric,
  profit_amount numeric,
  profit_margin_percent numeric,
  total_revenue numeric,
  payments_received numeric DEFAULT 0,
  balance_due numeric,
  substatus text,
  pipeline_stage pipeline_stage NOT NULL DEFAULT 'prospect'::pipeline_stage,
  lead_source text,
  priority lead_priority DEFAULT 'normal'::lead_priority,
  lead_score integer DEFAULT 0,
  estimated_close_date timestamp with time zone,
  adjuster_contact_id uuid,
  stage_changed_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  claim_id uuid,
  storm_event_id uuid
);

-- ----------------------------------------
-- Table: quickbooks_connections
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.quickbooks_connections (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  realm_id text NOT NULL,
  company_name text,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamp with time zone NOT NULL,
  refresh_token_expires_at timestamp with time zone NOT NULL,
  is_active boolean DEFAULT true,
  last_sync_at timestamp with time zone,
  sync_error text,
  environment varchar(20) DEFAULT 'sandbox'::character varying
);

-- ----------------------------------------
-- Table: report_schedules
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.report_schedules (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  created_by uuid,
  name varchar(255) NOT NULL,
  report_type varchar(50),
  parameters jsonb,
  frequency varchar(20),
  schedule_config jsonb,
  next_run_at timestamp with time zone,
  recipients jsonb,
  format varchar(20),
  is_active boolean DEFAULT true
);

-- ----------------------------------------
-- Table: revenue_forecast
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.revenue_forecast (
  tenant_id uuid,
  month timestamp with time zone,
  status varchar(50),
  pipeline_value numeric,
  approved_value numeric,
  project_count bigint
);

-- ----------------------------------------
-- Table: shingle_products
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.shingle_products (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  manufacturer varchar(100) NOT NULL,
  product_line varchar(100) NOT NULL,
  color_name varchar(100),
  color_code varchar(50),
  primary_color_hex varchar(7),
  secondary_colors jsonb,
  granule_pattern text,
  dimensions jsonb,
  weight_per_square numeric,
  status varchar(50) DEFAULT 'available'::character varying,
  discontinuation_date date,
  replacement_product_id uuid,
  regional_availability jsonb,
  spec_sheet_url text,
  installation_guide_url text,
  warranty_info jsonb,
  matching_notes text,
  last_verified date,
  verification_source text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  image_url text,
  product_page_url text
);

-- ----------------------------------------
-- Table: signature_documents
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.signature_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  project_id uuid,
  contact_id uuid,
  title varchar(255) NOT NULL,
  description text,
  document_type varchar(50) NOT NULL,
  file_url text,
  template_id uuid,
  status varchar(50) NOT NULL DEFAULT 'draft'::character varying,
  requires_customer_signature boolean DEFAULT true,
  requires_company_signature boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  sent_at timestamp with time zone,
  viewed_at timestamp with time zone,
  signed_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_by uuid,
  search_vector tsvector,
  is_deleted boolean NOT NULL DEFAULT false,
  signature_fields jsonb DEFAULT '[]'::jsonb,
  notify_signers_on_complete boolean DEFAULT true
);

-- ----------------------------------------
-- Table: signatures
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.signatures (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  signer_type varchar(50) NOT NULL,
  signer_name varchar(255) NOT NULL,
  signer_email varchar(255),
  signer_ip_address inet,
  signature_data text NOT NULL,
  signature_method varchar(50) DEFAULT 'draw'::character varying,
  signed_at timestamp with time zone DEFAULT now(),
  user_agent text,
  is_verified boolean DEFAULT false,
  verification_code varchar(6),
  completed_fields jsonb DEFAULT '[]'::jsonb
);

-- ----------------------------------------
-- Table: templates
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.templates (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  created_by uuid,
  type varchar(50) NOT NULL,
  name varchar(255) NOT NULL,
  description text,
  subject varchar(255),
  content text NOT NULL,
  variables jsonb,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  usage_count integer DEFAULT 0,
  last_used_at timestamp with time zone
);

-- ----------------------------------------
-- Table: tenant_users
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_users (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role varchar(50) DEFAULT 'member'::character varying,
  joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  status varchar(20) DEFAULT 'active'::character varying,
  deactivated_at timestamp with time zone,
  deactivated_by uuid,
  deactivation_reason text
);

-- ----------------------------------------
-- Table: tenants
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  name varchar(255) NOT NULL,
  subdomain varchar(100) NOT NULL,
  custom_domain varchar(255),
  settings jsonb DEFAULT '{}'::jsonb,
  features jsonb DEFAULT '{"max_users": 10, "max_contacts": 10000}'::jsonb,
  subscription_status varchar(50) DEFAULT 'trial'::character varying,
  subscription_expires_at timestamp with time zone,
  logo_url varchar(500),
  primary_color varchar(7),
  secondary_color varchar(7),
  is_active boolean DEFAULT true,
  auto_create_project_for_homeowners text DEFAULT 'prompt'::text,
  stripe_customer_id varchar(255),
  subscription_tier varchar(50) DEFAULT 'starter'::character varying,
  grace_period_ends_at timestamp with time zone
);

-- ----------------------------------------
-- Table: user_achievements
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL,
  earned_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------
-- Table: user_challenges
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.user_challenges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  challenge_id uuid NOT NULL,
  current_progress integer DEFAULT 0,
  is_completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------
-- Table: user_points
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.user_points (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  points_earned integer NOT NULL,
  activity_id uuid,
  contact_id uuid,
  project_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  earned_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------
-- Table: user_streaks
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  streak_type text NOT NULL,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  last_activity_date date,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------
-- Table: users
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id uuid,
  email varchar(255),
  raw_user_meta_data jsonb,
  created_at timestamp with time zone
);

-- ----------------------------------------
-- Table: workflow_executions
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.workflow_executions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  trigger_data jsonb NOT NULL,
  status varchar(20) DEFAULT 'pending'::character varying,
  current_step_id uuid,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ----------------------------------------
-- Table: workflow_step_executions
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.workflow_step_executions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  execution_id uuid NOT NULL,
  step_id uuid NOT NULL,
  status varchar(20) DEFAULT 'pending'::character varying,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  result_data jsonb,
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

-- ----------------------------------------
-- Table: workflow_steps
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.workflow_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL,
  step_order integer NOT NULL,
  step_type varchar(50) NOT NULL,
  step_config jsonb NOT NULL,
  delay_minutes integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ----------------------------------------
-- Table: workflows
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.workflows (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name varchar(200) NOT NULL,
  description text,
  trigger_type varchar(50) NOT NULL,
  trigger_config jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_deleted boolean DEFAULT false
);


-- ==================================================
-- PRIMARY KEY CONSTRAINTS
-- ==================================================
-- Using DO blocks to safely add PKs only if they don't exist

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_encryption_keys_pkey') THEN
    ALTER TABLE public._encryption_keys ADD CONSTRAINT _encryption_keys_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'achievements_pkey') THEN
    ALTER TABLE public.achievements ADD CONSTRAINT achievements_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activities_pkey') THEN
    ALTER TABLE public.activities ADD CONSTRAINT activities_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'automations_pkey') THEN
    ALTER TABLE public.automations ADD CONSTRAINT automations_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'building_codes_pkey') THEN
    ALTER TABLE public.building_codes ADD CONSTRAINT building_codes_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_card_interactions_pkey') THEN
    ALTER TABLE public.business_card_interactions ADD CONSTRAINT business_card_interactions_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carrier_standards_pkey') THEN
    ALTER TABLE public.carrier_standards ADD CONSTRAINT carrier_standards_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'challenges_pkey') THEN
    ALTER TABLE public.challenges ADD CONSTRAINT challenges_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'claim_communications_pkey') THEN
    ALTER TABLE public.claim_communications ADD CONSTRAINT claim_communications_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'claim_documents_pkey') THEN
    ALTER TABLE public.claim_documents ADD CONSTRAINT claim_documents_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'claim_outcomes_pkey') THEN
    ALTER TABLE public.claim_outcomes ADD CONSTRAINT claim_outcomes_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'claim_supplements_pkey') THEN
    ALTER TABLE public.claim_supplements ADD CONSTRAINT claim_supplements_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'claim_weather_data_pkey') THEN
    ALTER TABLE public.claim_weather_data ADD CONSTRAINT claim_weather_data_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'claims_pkey') THEN
    ALTER TABLE public.claims ADD CONSTRAINT claims_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commission_rules_pkey') THEN
    ALTER TABLE public.commission_rules ADD CONSTRAINT commission_rules_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commission_summary_by_user_pkey') THEN
    ALTER TABLE public.commission_summary_by_user ADD CONSTRAINT commission_summary_by_user_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commissions_pkey') THEN
    ALTER TABLE public.commissions ADD CONSTRAINT commissions_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'court_cases_pkey') THEN
    ALTER TABLE public.court_cases ADD CONSTRAINT court_cases_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dashboards_pkey') THEN
    ALTER TABLE public.dashboards ADD CONSTRAINT dashboards_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'digital_business_cards_pkey') THEN
    ALTER TABLE public.digital_business_cards ADD CONSTRAINT digital_business_cards_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'discontinued_shingles_pkey') THEN
    ALTER TABLE public.discontinued_shingles ADD CONSTRAINT discontinued_shingles_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_pkey') THEN
    ALTER TABLE public.documents ADD CONSTRAINT documents_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_drafts_pkey') THEN
    ALTER TABLE public.email_drafts ADD CONSTRAINT email_drafts_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gamification_activities_pkey') THEN
    ALTER TABLE public.gamification_activities ADD CONSTRAINT gamification_activities_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gamification_scores_pkey') THEN
    ALTER TABLE public.gamification_scores ADD CONSTRAINT gamification_scores_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'high_priority_pins_pkey') THEN
    ALTER TABLE public.high_priority_pins ADD CONSTRAINT high_priority_pins_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'industry_organizations_pkey') THEN
    ALTER TABLE public.industry_organizations ADD CONSTRAINT industry_organizations_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'industry_standards_pkey') THEN
    ALTER TABLE public.industry_standards ADD CONSTRAINT industry_standards_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'insurance_carriers_pkey') THEN
    ALTER TABLE public.insurance_carriers ADD CONSTRAINT insurance_carriers_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'insurance_personnel_pkey') THEN
    ALTER TABLE public.insurance_personnel ADD CONSTRAINT insurance_personnel_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kpi_snapshots_pkey') THEN
    ALTER TABLE public.kpi_snapshots ADD CONSTRAINT kpi_snapshots_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leaderboard_pkey') THEN
    ALTER TABLE public.leaderboard ADD CONSTRAINT leaderboard_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'manufacturer_directory_pkey') THEN
    ALTER TABLE public.manufacturer_directory ADD CONSTRAINT manufacturer_directory_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'manufacturer_specs_pkey') THEN
    ALTER TABLE public.manufacturer_specs ADD CONSTRAINT manufacturer_specs_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'n8n_chat_histories_pkey') THEN
    ALTER TABLE public.n8n_chat_histories ADD CONSTRAINT n8n_chat_histories_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'packets_pkey') THEN
    ALTER TABLE public.packets ADD CONSTRAINT packets_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'performance_metrics_pkey') THEN
    ALTER TABLE public.performance_metrics ADD CONSTRAINT performance_metrics_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'photos_pkey') THEN
    ALTER TABLE public.photos ADD CONSTRAINT photos_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pins_pending_sync_pkey') THEN
    ALTER TABLE public.pins_pending_sync ADD CONSTRAINT pins_pending_sync_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pipeline_metrics_pkey') THEN
    ALTER TABLE public.pipeline_metrics ADD CONSTRAINT pipeline_metrics_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'point_rules_pkey') THEN
    ALTER TABLE public.point_rules ADD CONSTRAINT point_rules_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'policy_provisions_pkey') THEN
    ALTER TABLE public.policy_provisions ADD CONSTRAINT policy_provisions_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_profit_loss_pkey') THEN
    ALTER TABLE public.project_profit_loss ADD CONSTRAINT project_profit_loss_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_pkey') THEN
    ALTER TABLE public.projects ADD CONSTRAINT projects_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quickbooks_connections_pkey') THEN
    ALTER TABLE public.quickbooks_connections ADD CONSTRAINT quickbooks_connections_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'report_schedules_pkey') THEN
    ALTER TABLE public.report_schedules ADD CONSTRAINT report_schedules_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'revenue_forecast_pkey') THEN
    ALTER TABLE public.revenue_forecast ADD CONSTRAINT revenue_forecast_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shingle_products_pkey') THEN
    ALTER TABLE public.shingle_products ADD CONSTRAINT shingle_products_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'signature_documents_pkey') THEN
    ALTER TABLE public.signature_documents ADD CONSTRAINT signature_documents_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'signatures_pkey') THEN
    ALTER TABLE public.signatures ADD CONSTRAINT signatures_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'templates_pkey') THEN
    ALTER TABLE public.templates ADD CONSTRAINT templates_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenant_users_pkey') THEN
    ALTER TABLE public.tenant_users ADD CONSTRAINT tenant_users_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenants_pkey') THEN
    ALTER TABLE public.tenants ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_achievements_pkey') THEN
    ALTER TABLE public.user_achievements ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_challenges_pkey') THEN
    ALTER TABLE public.user_challenges ADD CONSTRAINT user_challenges_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_points_pkey') THEN
    ALTER TABLE public.user_points ADD CONSTRAINT user_points_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_streaks_pkey') THEN
    ALTER TABLE public.user_streaks ADD CONSTRAINT user_streaks_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_pkey') THEN
    ALTER TABLE public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workflow_executions_pkey') THEN
    ALTER TABLE public.workflow_executions ADD CONSTRAINT workflow_executions_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workflow_step_executions_pkey') THEN
    ALTER TABLE public.workflow_step_executions ADD CONSTRAINT workflow_step_executions_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workflow_steps_pkey') THEN
    ALTER TABLE public.workflow_steps ADD CONSTRAINT workflow_steps_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workflows_pkey') THEN
    ALTER TABLE public.workflows ADD CONSTRAINT workflows_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

