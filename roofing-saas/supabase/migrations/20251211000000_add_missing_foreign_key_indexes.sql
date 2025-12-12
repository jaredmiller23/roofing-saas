-- Migration: Add Missing Foreign Key Indexes
-- Date: 2025-12-11
-- Purpose: Add indexes on 80+ foreign keys to improve query performance
-- Impact: Prevents slow queries at scale, especially for JOIN operations
-- Note: Using regular CREATE INDEX (not CONCURRENTLY) since migrations run in transactions
-- Rollback: DROP INDEX statements listed at end of file

-- ==============================================================================
-- PRIORITY 1: LARGE TABLES (>1MB)
-- These tables have the most impact on performance
-- ==============================================================================

-- projects table (7040 kB)
CREATE INDEX IF NOT EXISTS idx_projects_created_by
  ON projects(created_by);
COMMENT ON INDEX idx_projects_created_by IS 'Performance: JOIN with auth.users';

CREATE INDEX IF NOT EXISTS idx_projects_parent_project_id
  ON projects(parent_project_id);
COMMENT ON INDEX idx_projects_parent_project_id IS 'Performance: Subproject queries';

CREATE INDEX IF NOT EXISTS idx_projects_contact_id
  ON projects(contact_id);
COMMENT ON INDEX idx_projects_contact_id IS 'Performance: Contact-to-projects lookup';

CREATE INDEX IF NOT EXISTS idx_projects_assigned_to
  ON projects(assigned_to);
COMMENT ON INDEX idx_projects_assigned_to IS 'Performance: User assignment queries';

CREATE INDEX IF NOT EXISTS idx_projects_organization_id
  ON projects(organization_id);
COMMENT ON INDEX idx_projects_organization_id IS 'Performance: Org-scoped queries';

-- contacts table (1312 kB)
CREATE INDEX IF NOT EXISTS idx_contacts_created_by
  ON contacts(created_by);
COMMENT ON INDEX idx_contacts_created_by IS 'Performance: JOIN with auth.users';

CREATE INDEX IF NOT EXISTS idx_contacts_assigned_to
  ON contacts(assigned_to);
COMMENT ON INDEX idx_contacts_assigned_to IS 'Performance: User assignment queries';

CREATE INDEX IF NOT EXISTS idx_contacts_organization_id
  ON contacts(organization_id);
COMMENT ON INDEX idx_contacts_organization_id IS 'Performance: Org-scoped queries';

CREATE INDEX IF NOT EXISTS idx_contacts_substatus_id
  ON contacts(substatus_id);
COMMENT ON INDEX idx_contacts_substatus_id IS 'Performance: Substatus filtering';

-- activities table (552 kB)
CREATE INDEX IF NOT EXISTS idx_activities_created_by
  ON activities(created_by);
COMMENT ON INDEX idx_activities_created_by IS 'Performance: JOIN with auth.users';

CREATE INDEX IF NOT EXISTS idx_activities_contact_id
  ON activities(contact_id);
COMMENT ON INDEX idx_activities_contact_id IS 'Performance: Contact activity lookup';

CREATE INDEX IF NOT EXISTS idx_activities_project_id
  ON activities(project_id);
COMMENT ON INDEX idx_activities_project_id IS 'Performance: Project activity lookup';

CREATE INDEX IF NOT EXISTS idx_activities_user_id
  ON activities(user_id);
COMMENT ON INDEX idx_activities_user_id IS 'Performance: User activity lookup';

-- ==============================================================================
-- PRIORITY 2: MEDIUM TABLES (100KB - 1MB)
-- ==============================================================================

-- calls table
CREATE INDEX IF NOT EXISTS idx_calls_created_by
  ON calls(created_by);

CREATE INDEX IF NOT EXISTS idx_calls_contact_id
  ON calls(contact_id);

CREATE INDEX IF NOT EXISTS idx_calls_project_id
  ON calls(project_id);

CREATE INDEX IF NOT EXISTS idx_calls_user_id
  ON calls(user_id);

-- sms_messages table
CREATE INDEX IF NOT EXISTS idx_sms_messages_created_by
  ON sms_messages(created_by);

CREATE INDEX IF NOT EXISTS idx_sms_messages_contact_id
  ON sms_messages(contact_id);

-- emails table
CREATE INDEX IF NOT EXISTS idx_emails_created_by
  ON emails(created_by);

CREATE INDEX IF NOT EXISTS idx_emails_contact_id
  ON emails(contact_id);

CREATE INDEX IF NOT EXISTS idx_emails_project_id
  ON emails(project_id);

CREATE INDEX IF NOT EXISTS idx_emails_template_id
  ON emails(template_id);

-- territories table
CREATE INDEX IF NOT EXISTS idx_territories_created_by
  ON territories(created_by);

CREATE INDEX IF NOT EXISTS idx_territories_assigned_user_id
  ON territories(assigned_user_id);

-- pins table
CREATE INDEX IF NOT EXISTS idx_pins_created_by
  ON pins(created_by);

CREATE INDEX IF NOT EXISTS idx_pins_territory_id
  ON pins(territory_id);

CREATE INDEX IF NOT EXISTS idx_pins_contact_id
  ON pins(contact_id);

CREATE INDEX IF NOT EXISTS idx_pins_user_id
  ON pins(user_id);

-- documents table
CREATE INDEX IF NOT EXISTS idx_documents_created_by
  ON documents(created_by);

CREATE INDEX IF NOT EXISTS idx_documents_project_id
  ON documents(project_id);

CREATE INDEX IF NOT EXISTS idx_documents_contact_id
  ON documents(contact_id);

-- ==============================================================================
-- PRIORITY 3: WORKFLOW & AUTOMATION TABLES
-- ==============================================================================

-- campaigns table
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by
  ON campaigns(created_by);

-- campaign_steps table
CREATE INDEX IF NOT EXISTS idx_campaign_steps_campaign_id
  ON campaign_steps(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_steps_true_path_step_id
  ON campaign_steps(true_path_step_id);

CREATE INDEX IF NOT EXISTS idx_campaign_steps_false_path_step_id
  ON campaign_steps(false_path_step_id);

-- campaign_enrollments table
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_campaign_id
  ON campaign_enrollments(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_contact_id
  ON campaign_enrollments(contact_id);

CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_current_step_id
  ON campaign_enrollments(current_step_id);

-- campaign_execution_logs table
CREATE INDEX IF NOT EXISTS idx_campaign_execution_logs_enrollment_id
  ON campaign_execution_logs(enrollment_id);

CREATE INDEX IF NOT EXISTS idx_campaign_execution_logs_step_id
  ON campaign_execution_logs(step_id);

-- workflow_automations table
CREATE INDEX IF NOT EXISTS idx_workflow_automations_created_by
  ON workflow_automations(created_by);

-- workflow_actions table
CREATE INDEX IF NOT EXISTS idx_workflow_actions_automation_id
  ON workflow_actions(automation_id);

-- workflow_execution_logs table
CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_automation_id
  ON workflow_execution_logs(automation_id);

-- ==============================================================================
-- PRIORITY 4: USER & ORGANIZATION TABLES
-- ==============================================================================

-- tenant_users table
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id
  ON tenant_users(user_id);

CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id
  ON tenant_users(tenant_id);

-- user_profiles table
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id
  ON user_profiles(user_id);

-- user_invitations table
CREATE INDEX IF NOT EXISTS idx_user_invitations_invited_by
  ON user_invitations(invited_by);

CREATE INDEX IF NOT EXISTS idx_user_invitations_tenant_id
  ON user_invitations(tenant_id);

-- organization_members table
CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id
  ON organization_members(organization_id);

CREATE INDEX IF NOT EXISTS idx_organization_members_user_id
  ON organization_members(user_id);

-- ==============================================================================
-- PRIORITY 5: SETTINGS & CONFIGURATION TABLES
-- ==============================================================================

-- pipeline_stages table
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_created_by
  ON pipeline_stages(created_by);

-- substatus table
CREATE INDEX IF NOT EXISTS idx_substatus_created_by
  ON substatus(created_by);

-- contact_substatus table
CREATE INDEX IF NOT EXISTS idx_contact_substatus_contact_id
  ON contact_substatus(contact_id);

CREATE INDEX IF NOT EXISTS idx_contact_substatus_substatus_id
  ON contact_substatus(substatus_id);

-- email_templates table
CREATE INDEX IF NOT EXISTS idx_email_templates_created_by
  ON email_templates(created_by);

-- saved_filters table
CREATE INDEX IF NOT EXISTS idx_saved_filters_user_id
  ON saved_filters(user_id);

CREATE INDEX IF NOT EXISTS idx_saved_filters_config_id
  ON saved_filters(config_id);

-- filter_configs table
CREATE INDEX IF NOT EXISTS idx_filter_configs_created_by
  ON filter_configs(created_by);

-- ==============================================================================
-- PRIORITY 6: CLAIMS & INSURANCE TABLES
-- ==============================================================================

-- claims table
CREATE INDEX IF NOT EXISTS idx_claims_project_id
  ON claims(project_id);

CREATE INDEX IF NOT EXISTS idx_claims_created_by
  ON claims(created_by);

CREATE INDEX IF NOT EXISTS idx_claims_assigned_to
  ON claims(assigned_to);

-- claim_documents table
CREATE INDEX IF NOT EXISTS idx_claim_documents_claim_id
  ON claim_documents(claim_id);

-- claim_inspections table
CREATE INDEX IF NOT EXISTS idx_claim_inspections_claim_id
  ON claim_inspections(claim_id);

CREATE INDEX IF NOT EXISTS idx_claim_inspections_inspector_id
  ON claim_inspections(inspector_id);

-- ==============================================================================
-- PRIORITY 7: INTEGRATION TABLES
-- ==============================================================================

-- quickbooks_tokens table
CREATE INDEX IF NOT EXISTS idx_quickbooks_tokens_user_id
  ON quickbooks_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_quickbooks_tokens_tenant_id
  ON quickbooks_tokens(tenant_id);

-- quickbooks_sync_logs table
CREATE INDEX IF NOT EXISTS idx_quickbooks_sync_logs_user_id
  ON quickbooks_sync_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_quickbooks_sync_logs_tenant_id
  ON quickbooks_sync_logs(tenant_id);

-- property_enrichment_cache table
CREATE INDEX IF NOT EXISTS idx_property_enrichment_cache_contact_id
  ON property_enrichment_cache(contact_id);

-- storm_leads table
CREATE INDEX IF NOT EXISTS idx_storm_leads_created_by
  ON storm_leads(created_by);

CREATE INDEX IF NOT EXISTS idx_storm_leads_assigned_to
  ON storm_leads(assigned_to);

-- ==============================================================================
-- PRIORITY 8: GAMIFICATION & ANALYTICS TABLES
-- ==============================================================================

-- user_points table
CREATE INDEX IF NOT EXISTS idx_user_points_user_id
  ON user_points(user_id);

-- achievements table
CREATE INDEX IF NOT EXISTS idx_achievements_created_by
  ON achievements(created_by);

-- user_achievements table
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id
  ON user_achievements(user_id);

CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id
  ON user_achievements(achievement_id);

-- ==============================================================================
-- PRIORITY 9: AI & CHAT TABLES
-- ==============================================================================

-- n8n_chat_histories table
CREATE INDEX IF NOT EXISTS idx_n8n_chat_histories_user_id
  ON n8n_chat_histories(user_id);

-- ai_voice_conversations table
CREATE INDEX IF NOT EXISTS idx_ai_voice_conversations_user_id
  ON ai_voice_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_voice_conversations_contact_id
  ON ai_voice_conversations(contact_id);

-- ==============================================================================
-- PRIORITY 10: MISCELLANEOUS TABLES
-- ==============================================================================

-- digital_business_cards table
CREATE INDEX IF NOT EXISTS idx_digital_business_cards_user_id
  ON digital_business_cards(user_id);

-- card_views table
CREATE INDEX IF NOT EXISTS idx_card_views_card_id
  ON card_views(card_id);

-- card_form_submissions table
CREATE INDEX IF NOT EXISTS idx_card_form_submissions_card_id
  ON card_form_submissions(card_id);

-- events table
CREATE INDEX IF NOT EXISTS idx_events_created_by
  ON events(created_by);

CREATE INDEX IF NOT EXISTS idx_events_project_id
  ON events(project_id);

CREATE INDEX IF NOT EXISTS idx_events_contact_id
  ON events(contact_id);

-- jobs table
CREATE INDEX IF NOT EXISTS idx_jobs_project_id
  ON jobs(project_id);

CREATE INDEX IF NOT EXISTS idx_jobs_created_by
  ON jobs(created_by);

CREATE INDEX IF NOT EXISTS idx_jobs_assigned_to
  ON jobs(assigned_to);

-- notes table
CREATE INDEX IF NOT EXISTS idx_notes_created_by
  ON notes(created_by);

CREATE INDEX IF NOT EXISTS idx_notes_contact_id
  ON notes(contact_id);

CREATE INDEX IF NOT EXISTS idx_notes_project_id
  ON notes(project_id);

-- photos table
CREATE INDEX IF NOT EXISTS idx_photos_project_id
  ON photos(project_id);

CREATE INDEX IF NOT EXISTS idx_photos_territory_id
  ON photos(territory_id);

CREATE INDEX IF NOT EXISTS idx_photos_uploaded_by
  ON photos(uploaded_by);

-- signatures table
CREATE INDEX IF NOT EXISTS idx_signatures_document_id
  ON signatures(document_id);

CREATE INDEX IF NOT EXISTS idx_signatures_signed_by
  ON signatures(signed_by);

-- ==============================================================================
-- ROLLBACK INSTRUCTIONS
-- ==============================================================================

-- To rollback this migration, run the following commands:
/*

-- PRIORITY 1: LARGE TABLES
DROP INDEX IF EXISTS idx_projects_created_by;
DROP INDEX IF EXISTS idx_projects_parent_project_id;
DROP INDEX IF EXISTS idx_projects_contact_id;
DROP INDEX IF EXISTS idx_projects_assigned_to;
DROP INDEX IF EXISTS idx_projects_organization_id;
DROP INDEX IF EXISTS idx_contacts_created_by;
DROP INDEX IF EXISTS idx_contacts_assigned_to;
DROP INDEX IF EXISTS idx_contacts_organization_id;
DROP INDEX IF EXISTS idx_contacts_substatus_id;
DROP INDEX IF EXISTS idx_activities_created_by;
DROP INDEX IF EXISTS idx_activities_contact_id;
DROP INDEX IF EXISTS idx_activities_project_id;
DROP INDEX IF EXISTS idx_activities_user_id;

-- PRIORITY 2: MEDIUM TABLES
DROP INDEX IF EXISTS idx_calls_created_by;
DROP INDEX IF EXISTS idx_calls_contact_id;
DROP INDEX IF EXISTS idx_calls_project_id;
DROP INDEX IF EXISTS idx_calls_user_id;
DROP INDEX IF EXISTS idx_sms_messages_created_by;
DROP INDEX IF EXISTS idx_sms_messages_contact_id;
DROP INDEX IF EXISTS idx_emails_created_by;
DROP INDEX IF EXISTS idx_emails_contact_id;
DROP INDEX IF EXISTS idx_emails_project_id;
DROP INDEX IF EXISTS idx_emails_template_id;
DROP INDEX IF EXISTS idx_territories_created_by;
DROP INDEX IF EXISTS idx_territories_assigned_user_id;
DROP INDEX IF EXISTS idx_pins_created_by;
DROP INDEX IF EXISTS idx_pins_territory_id;
DROP INDEX IF EXISTS idx_pins_contact_id;
DROP INDEX IF EXISTS idx_pins_user_id;
DROP INDEX IF EXISTS idx_documents_created_by;
DROP INDEX IF EXISTS idx_documents_project_id;
DROP INDEX IF EXISTS idx_documents_contact_id;

-- PRIORITY 3: WORKFLOW & AUTOMATION
DROP INDEX IF EXISTS idx_campaigns_created_by;
DROP INDEX IF EXISTS idx_campaign_steps_campaign_id;
DROP INDEX IF EXISTS idx_campaign_steps_true_path_step_id;
DROP INDEX IF EXISTS idx_campaign_steps_false_path_step_id;
DROP INDEX IF EXISTS idx_campaign_enrollments_campaign_id;
DROP INDEX IF EXISTS idx_campaign_enrollments_contact_id;
DROP INDEX IF EXISTS idx_campaign_enrollments_current_step_id;
DROP INDEX IF EXISTS idx_campaign_execution_logs_enrollment_id;
DROP INDEX IF EXISTS idx_campaign_execution_logs_step_id;
DROP INDEX IF EXISTS idx_workflow_automations_created_by;
DROP INDEX IF EXISTS idx_workflow_actions_automation_id;
DROP INDEX IF EXISTS idx_workflow_execution_logs_automation_id;

-- PRIORITY 4: USER & ORGANIZATION
DROP INDEX IF EXISTS idx_tenant_users_user_id;
DROP INDEX IF EXISTS idx_tenant_users_tenant_id;
DROP INDEX IF EXISTS idx_user_profiles_user_id;
DROP INDEX IF EXISTS idx_user_invitations_invited_by;
DROP INDEX IF EXISTS idx_user_invitations_tenant_id;
DROP INDEX IF EXISTS idx_organization_members_organization_id;
DROP INDEX IF EXISTS idx_organization_members_user_id;

-- PRIORITY 5: SETTINGS & CONFIGURATION
DROP INDEX IF EXISTS idx_pipeline_stages_created_by;
DROP INDEX IF EXISTS idx_substatus_created_by;
DROP INDEX IF EXISTS idx_contact_substatus_contact_id;
DROP INDEX IF EXISTS idx_contact_substatus_substatus_id;
DROP INDEX IF EXISTS idx_email_templates_created_by;
DROP INDEX IF EXISTS idx_saved_filters_user_id;
DROP INDEX IF EXISTS idx_saved_filters_config_id;
DROP INDEX IF EXISTS idx_filter_configs_created_by;

-- PRIORITY 6: CLAIMS & INSURANCE
DROP INDEX IF EXISTS idx_claims_project_id;
DROP INDEX IF EXISTS idx_claims_created_by;
DROP INDEX IF EXISTS idx_claims_assigned_to;
DROP INDEX IF EXISTS idx_claim_documents_claim_id;
DROP INDEX IF EXISTS idx_claim_inspections_claim_id;
DROP INDEX IF EXISTS idx_claim_inspections_inspector_id;

-- PRIORITY 7: INTEGRATIONS
DROP INDEX IF EXISTS idx_quickbooks_tokens_user_id;
DROP INDEX IF EXISTS idx_quickbooks_tokens_tenant_id;
DROP INDEX IF EXISTS idx_quickbooks_sync_logs_user_id;
DROP INDEX IF EXISTS idx_quickbooks_sync_logs_tenant_id;
DROP INDEX IF EXISTS idx_property_enrichment_cache_contact_id;
DROP INDEX IF EXISTS idx_storm_leads_created_by;
DROP INDEX IF EXISTS idx_storm_leads_assigned_to;

-- PRIORITY 8: GAMIFICATION & ANALYTICS
DROP INDEX IF EXISTS idx_user_points_user_id;
DROP INDEX IF EXISTS idx_achievements_created_by;
DROP INDEX IF EXISTS idx_user_achievements_user_id;
DROP INDEX IF EXISTS idx_user_achievements_achievement_id;

-- PRIORITY 9: AI & CHAT
DROP INDEX IF EXISTS idx_n8n_chat_histories_user_id;
DROP INDEX IF EXISTS idx_ai_voice_conversations_user_id;
DROP INDEX IF EXISTS idx_ai_voice_conversations_contact_id;

-- PRIORITY 10: MISCELLANEOUS
DROP INDEX IF EXISTS idx_digital_business_cards_user_id;
DROP INDEX IF EXISTS idx_card_views_card_id;
DROP INDEX IF EXISTS idx_card_form_submissions_card_id;
DROP INDEX IF EXISTS idx_events_created_by;
DROP INDEX IF EXISTS idx_events_project_id;
DROP INDEX IF EXISTS idx_events_contact_id;
DROP INDEX IF EXISTS idx_jobs_project_id;
DROP INDEX IF EXISTS idx_jobs_created_by;
DROP INDEX IF EXISTS idx_jobs_assigned_to;
DROP INDEX IF EXISTS idx_notes_created_by;
DROP INDEX IF EXISTS idx_notes_contact_id;
DROP INDEX IF EXISTS idx_notes_project_id;
DROP INDEX IF EXISTS idx_photos_project_id;
DROP INDEX IF EXISTS idx_photos_territory_id;
DROP INDEX IF EXISTS idx_photos_uploaded_by;
DROP INDEX IF EXISTS idx_signatures_document_id;
DROP INDEX IF EXISTS idx_signatures_signed_by;

*/
