-- Migration: Fix broken RLS policies across multiple tables
-- Date: 2026-02-05
-- Context: Opus 4.6 day-one codebase audit found 14+ tables with broken RLS
-- Rollback: Revert policies to previous state (all were broken, so rollback = re-break)
--
-- Issues fixed:
--   C5: 12 tables reference non-existent 'user_tenants' table (should be 'tenant_users')
--   C6: storm_alerts + storm_response_mode use tenant_id = auth.uid() (wrong comparison)
--   C7: trial_emails has no RLS at all

-- ============================================================================
-- C5: Fix ARIA tables — replace user_tenants with tenant_users
-- ============================================================================

-- callback_requests
DROP POLICY IF EXISTS "Users can view their tenant callback requests" ON callback_requests;
DROP POLICY IF EXISTS "Users can insert callback requests for their tenant" ON callback_requests;
DROP POLICY IF EXISTS "Users can update their tenant callback requests" ON callback_requests;

CREATE POLICY "Users can view their tenant callback requests" ON callback_requests
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "Users can insert callback requests for their tenant" ON callback_requests
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "Users can update their tenant callback requests" ON callback_requests
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );

-- voicemail_messages
DROP POLICY IF EXISTS "Users can view their tenant voicemail messages" ON voicemail_messages;
DROP POLICY IF EXISTS "Users can insert voicemail messages for their tenant" ON voicemail_messages;
DROP POLICY IF EXISTS "Users can update their tenant voicemail messages" ON voicemail_messages;

CREATE POLICY "Users can view their tenant voicemail messages" ON voicemail_messages
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "Users can insert voicemail messages for their tenant" ON voicemail_messages
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "Users can update their tenant voicemail messages" ON voicemail_messages
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );

-- aria_conversations
DROP POLICY IF EXISTS "Users can view their tenant aria conversations" ON aria_conversations;
DROP POLICY IF EXISTS "Users can insert aria conversations for their tenant" ON aria_conversations;
DROP POLICY IF EXISTS "Users can update their tenant aria conversations" ON aria_conversations;

CREATE POLICY "Users can view their tenant aria conversations" ON aria_conversations
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "Users can insert aria conversations for their tenant" ON aria_conversations
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "Users can update their tenant aria conversations" ON aria_conversations
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );

-- aria_function_logs
DROP POLICY IF EXISTS "Users can view their tenant aria function logs" ON aria_function_logs;
DROP POLICY IF EXISTS "Users can insert aria function logs for their tenant" ON aria_function_logs;

CREATE POLICY "Users can view their tenant aria function logs" ON aria_function_logs
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "Users can insert aria function logs for their tenant" ON aria_function_logs
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );

-- ============================================================================
-- C5: Fix tenant customization tables — replace user_tenants with tenant_users
-- ============================================================================

-- tenant_settings
DROP POLICY IF EXISTS "tenant_settings_select" ON tenant_settings;
DROP POLICY IF EXISTS "tenant_settings_insert" ON tenant_settings;
DROP POLICY IF EXISTS "tenant_settings_update" ON tenant_settings;
DROP POLICY IF EXISTS "tenant_settings_delete" ON tenant_settings;

CREATE POLICY "tenant_settings_select" ON tenant_settings
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "tenant_settings_insert" ON tenant_settings
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "tenant_settings_update" ON tenant_settings
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "tenant_settings_delete" ON tenant_settings
  FOR DELETE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active'
      AND role IN ('admin', 'owner'))
  );

-- user_roles
DROP POLICY IF EXISTS "user_roles_select" ON user_roles;
DROP POLICY IF EXISTS "user_roles_insert" ON user_roles;
DROP POLICY IF EXISTS "user_roles_update" ON user_roles;
DROP POLICY IF EXISTS "user_roles_delete" ON user_roles;

CREATE POLICY "user_roles_select" ON user_roles
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "user_roles_insert" ON user_roles
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active'
      AND role IN ('admin', 'owner'))
  );
CREATE POLICY "user_roles_update" ON user_roles
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active'
      AND role IN ('admin', 'owner'))
  );
CREATE POLICY "user_roles_delete" ON user_roles
  FOR DELETE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active'
      AND role IN ('admin', 'owner'))
  );

-- user_role_assignments
DROP POLICY IF EXISTS "user_role_assignments_select" ON user_role_assignments;
DROP POLICY IF EXISTS "user_role_assignments_insert" ON user_role_assignments;
DROP POLICY IF EXISTS "user_role_assignments_update" ON user_role_assignments;
DROP POLICY IF EXISTS "user_role_assignments_delete" ON user_role_assignments;

CREATE POLICY "user_role_assignments_select" ON user_role_assignments
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "user_role_assignments_insert" ON user_role_assignments
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active'
      AND role IN ('admin', 'owner'))
  );
CREATE POLICY "user_role_assignments_update" ON user_role_assignments
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active'
      AND role IN ('admin', 'owner'))
  );
CREATE POLICY "user_role_assignments_delete" ON user_role_assignments
  FOR DELETE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active'
      AND role IN ('admin', 'owner'))
  );

-- permission_overrides
DROP POLICY IF EXISTS "permission_overrides_select" ON permission_overrides;
DROP POLICY IF EXISTS "permission_overrides_insert" ON permission_overrides;
DROP POLICY IF EXISTS "permission_overrides_update" ON permission_overrides;
DROP POLICY IF EXISTS "permission_overrides_delete" ON permission_overrides;

CREATE POLICY "permission_overrides_select" ON permission_overrides
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "permission_overrides_insert" ON permission_overrides
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active'
      AND role IN ('admin', 'owner'))
  );
CREATE POLICY "permission_overrides_update" ON permission_overrides
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active'
      AND role IN ('admin', 'owner'))
  );
CREATE POLICY "permission_overrides_delete" ON permission_overrides
  FOR DELETE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active'
      AND role IN ('admin', 'owner'))
  );

-- custom_fields
DROP POLICY IF EXISTS "custom_fields_select" ON custom_fields;
DROP POLICY IF EXISTS "custom_fields_insert" ON custom_fields;
DROP POLICY IF EXISTS "custom_fields_update" ON custom_fields;
DROP POLICY IF EXISTS "custom_fields_delete" ON custom_fields;

CREATE POLICY "custom_fields_select" ON custom_fields
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "custom_fields_insert" ON custom_fields
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active'
      AND role IN ('admin', 'owner'))
  );
CREATE POLICY "custom_fields_update" ON custom_fields
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active'
      AND role IN ('admin', 'owner'))
  );
CREATE POLICY "custom_fields_delete" ON custom_fields
  FOR DELETE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active'
      AND role IN ('admin', 'owner'))
  );

-- email_templates
DROP POLICY IF EXISTS "email_templates_select" ON email_templates;
DROP POLICY IF EXISTS "email_templates_insert" ON email_templates;
DROP POLICY IF EXISTS "email_templates_update" ON email_templates;
DROP POLICY IF EXISTS "email_templates_delete" ON email_templates;

CREATE POLICY "email_templates_select" ON email_templates
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "email_templates_insert" ON email_templates
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "email_templates_update" ON email_templates
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "email_templates_delete" ON email_templates
  FOR DELETE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active'
      AND role IN ('admin', 'owner'))
  );

-- sms_templates
DROP POLICY IF EXISTS "sms_templates_select" ON sms_templates;
DROP POLICY IF EXISTS "sms_templates_insert" ON sms_templates;
DROP POLICY IF EXISTS "sms_templates_update" ON sms_templates;
DROP POLICY IF EXISTS "sms_templates_delete" ON sms_templates;

CREATE POLICY "sms_templates_select" ON sms_templates
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "sms_templates_insert" ON sms_templates
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "sms_templates_update" ON sms_templates
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "sms_templates_delete" ON sms_templates
  FOR DELETE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active'
      AND role IN ('admin', 'owner'))
  );

-- notification_templates
DROP POLICY IF EXISTS "notification_templates_select" ON notification_templates;
DROP POLICY IF EXISTS "notification_templates_insert" ON notification_templates;
DROP POLICY IF EXISTS "notification_templates_update" ON notification_templates;
DROP POLICY IF EXISTS "notification_templates_delete" ON notification_templates;

CREATE POLICY "notification_templates_select" ON notification_templates
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "notification_templates_insert" ON notification_templates
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "notification_templates_update" ON notification_templates
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "notification_templates_delete" ON notification_templates
  FOR DELETE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active'
      AND role IN ('admin', 'owner'))
  );

-- ============================================================================
-- C6: Fix storm_alerts and storm_response_mode RLS
-- These use tenant_id = auth.uid() which compares tenant UUID to user UUID
-- ============================================================================

-- storm_alerts
DROP POLICY IF EXISTS "storm_alerts_select" ON storm_alerts;
DROP POLICY IF EXISTS "storm_alerts_insert" ON storm_alerts;
DROP POLICY IF EXISTS "storm_alerts_update" ON storm_alerts;
DROP POLICY IF EXISTS "storm_alerts_delete" ON storm_alerts;
-- Also drop old-style policy names if they exist
DROP POLICY IF EXISTS "Users can view their own storm alerts" ON storm_alerts;
DROP POLICY IF EXISTS "Users can insert their own storm alerts" ON storm_alerts;
DROP POLICY IF EXISTS "Users can update their own storm alerts" ON storm_alerts;
DROP POLICY IF EXISTS "Users can delete their own storm alerts" ON storm_alerts;

CREATE POLICY "storm_alerts_select" ON storm_alerts
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "storm_alerts_insert" ON storm_alerts
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "storm_alerts_update" ON storm_alerts
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "storm_alerts_delete" ON storm_alerts
  FOR DELETE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );

-- storm_response_mode
DROP POLICY IF EXISTS "storm_response_mode_select" ON storm_response_mode;
DROP POLICY IF EXISTS "storm_response_mode_insert" ON storm_response_mode;
DROP POLICY IF EXISTS "storm_response_mode_update" ON storm_response_mode;
DROP POLICY IF EXISTS "storm_response_mode_delete" ON storm_response_mode;
DROP POLICY IF EXISTS "Users can view their own storm response mode" ON storm_response_mode;
DROP POLICY IF EXISTS "Users can insert their own storm response mode" ON storm_response_mode;
DROP POLICY IF EXISTS "Users can update their own storm response mode" ON storm_response_mode;
DROP POLICY IF EXISTS "Users can delete their own storm response mode" ON storm_response_mode;

CREATE POLICY "storm_response_mode_select" ON storm_response_mode
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "storm_response_mode_insert" ON storm_response_mode
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "storm_response_mode_update" ON storm_response_mode
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "storm_response_mode_delete" ON storm_response_mode
  FOR DELETE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );

-- ============================================================================
-- C7: Enable RLS on trial_emails table (has tenant_id but no RLS)
-- ============================================================================

ALTER TABLE IF EXISTS trial_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trial_emails_select" ON trial_emails;
DROP POLICY IF EXISTS "trial_emails_insert" ON trial_emails;
DROP POLICY IF EXISTS "trial_emails_update" ON trial_emails;

CREATE POLICY "trial_emails_select" ON trial_emails
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "trial_emails_insert" ON trial_emails
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "trial_emails_update" ON trial_emails
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
  );
-- Service role (cron jobs) will bypass RLS naturally via createAdminClient
