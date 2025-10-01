-- =====================================================
-- COMPREHENSIVE RLS POLICIES FOR ALL TABLES
-- Date: 2025-10-01
-- Issue: RLS enabled on all tables but policies only defined for contacts
-- Critical: tenant_users had RLS but no SELECT policy, breaking get_user_tenant_id()
-- =====================================================

-- =====================================================
-- CRITICAL FIX: tenant_users SELECT policy
-- This MUST come first to fix circular dependency
-- =====================================================

-- Allow users to view their own tenant memberships
-- This is required for get_user_tenant_id() function to work
CREATE POLICY "Users can view their own tenant membership"
ON tenant_users FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to view other members of their tenant (for admin features)
CREATE POLICY "Users can view members of their tenant"
ON tenant_users FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  )
);

-- =====================================================
-- TENANTS TABLE POLICIES
-- =====================================================

CREATE POLICY "Users can view their tenant"
ON tenants FOR SELECT
USING (
  id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their tenant"
ON tenants FOR UPDATE
USING (
  id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  )
);

-- =====================================================
-- PROJECTS TABLE POLICIES
-- =====================================================

CREATE POLICY "Users can view projects in their tenant"
ON projects FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert projects in their tenant"
ON projects FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update projects in their tenant"
ON projects FOR UPDATE
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete projects in their tenant"
ON projects FOR DELETE
USING (tenant_id = get_user_tenant_id());

-- =====================================================
-- ACTIVITIES TABLE POLICIES
-- =====================================================

CREATE POLICY "Users can view activities in their tenant"
ON activities FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert activities in their tenant"
ON activities FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update activities in their tenant"
ON activities FOR UPDATE
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete activities in their tenant"
ON activities FOR DELETE
USING (tenant_id = get_user_tenant_id());

-- =====================================================
-- DOCUMENTS TABLE POLICIES
-- =====================================================

CREATE POLICY "Users can view documents in their tenant"
ON documents FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert documents in their tenant"
ON documents FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update documents in their tenant"
ON documents FOR UPDATE
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete documents in their tenant"
ON documents FOR DELETE
USING (tenant_id = get_user_tenant_id());

-- =====================================================
-- TEMPLATES TABLE POLICIES
-- =====================================================

CREATE POLICY "Users can view templates in their tenant"
ON templates FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert templates in their tenant"
ON templates FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update templates in their tenant"
ON templates FOR UPDATE
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete templates in their tenant"
ON templates FOR DELETE
USING (tenant_id = get_user_tenant_id());

-- =====================================================
-- AUTOMATIONS TABLE POLICIES
-- =====================================================

CREATE POLICY "Users can view automations in their tenant"
ON automations FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert automations in their tenant"
ON automations FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update automations in their tenant"
ON automations FOR UPDATE
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete automations in their tenant"
ON automations FOR DELETE
USING (tenant_id = get_user_tenant_id());

-- =====================================================
-- GAMIFICATION TABLES POLICIES
-- =====================================================

CREATE POLICY "Users can view gamification scores in their tenant"
ON gamification_scores FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert their own gamification scores"
ON gamification_scores FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id() AND user_id = auth.uid());

CREATE POLICY "Users can update their own gamification scores"
ON gamification_scores FOR UPDATE
USING (tenant_id = get_user_tenant_id() AND user_id = auth.uid());

CREATE POLICY "Users can view gamification activities in their tenant"
ON gamification_activities FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert their own gamification activities"
ON gamification_activities FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id() AND user_id = auth.uid());

-- =====================================================
-- REPORTING TABLES POLICIES
-- =====================================================

CREATE POLICY "Users can view KPI snapshots in their tenant"
ON kpi_snapshots FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert KPI snapshots in their tenant"
ON kpi_snapshots FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can view report schedules in their tenant"
ON report_schedules FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert report schedules in their tenant"
ON report_schedules FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update report schedules in their tenant"
ON report_schedules FOR UPDATE
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete report schedules in their tenant"
ON report_schedules FOR DELETE
USING (tenant_id = get_user_tenant_id());

-- =====================================================
-- VOICE AI ASSISTANT POLICIES
-- =====================================================

CREATE POLICY "Users can view voice sessions in their tenant"
ON voice_sessions FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert their own voice sessions"
ON voice_sessions FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id() AND user_id = auth.uid());

CREATE POLICY "Users can update their own voice sessions"
ON voice_sessions FOR UPDATE
USING (tenant_id = get_user_tenant_id() AND user_id = auth.uid());

CREATE POLICY "Users can view voice conversations in their sessions"
ON voice_conversations FOR SELECT
USING (
  session_id IN (
    SELECT id FROM voice_sessions WHERE tenant_id = get_user_tenant_id()
  )
);

CREATE POLICY "Users can insert voice conversations in their sessions"
ON voice_conversations FOR INSERT
WITH CHECK (
  session_id IN (
    SELECT id FROM voice_sessions WHERE tenant_id = get_user_tenant_id()
  )
);

CREATE POLICY "Users can view knowledge base in their tenant"
ON knowledge_base FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert knowledge base in their tenant"
ON knowledge_base FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update knowledge base in their tenant"
ON knowledge_base FOR UPDATE
USING (tenant_id = get_user_tenant_id());

-- =====================================================
-- FINANCIAL & COMMISSIONS POLICIES
-- =====================================================

CREATE POLICY "Users can view commission rules in their tenant"
ON commission_rules FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert commission rules in their tenant"
ON commission_rules FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update commission rules in their tenant"
ON commission_rules FOR UPDATE
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete commission rules in their tenant"
ON commission_rules FOR DELETE
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can view commissions in their tenant"
ON commissions FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert commissions in their tenant"
ON commissions FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update commissions in their tenant"
ON commissions FOR UPDATE
USING (tenant_id = get_user_tenant_id());

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify all tables have policies
DO $$
DECLARE
  table_record RECORD;
  policy_count INTEGER;
  tables_without_policies TEXT := '';
BEGIN
  FOR table_record IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT LIKE 'archon_%'
    AND rowsecurity = true
  LOOP
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = table_record.tablename;

    IF policy_count = 0 THEN
      tables_without_policies := tables_without_policies || table_record.tablename || ', ';
    END IF;

    RAISE NOTICE 'Table: % - Policies: %', table_record.tablename, policy_count;
  END LOOP;

  IF tables_without_policies != '' THEN
    RAISE WARNING 'Tables with RLS enabled but no policies: %', RTRIM(tables_without_policies, ', ');
  ELSE
    RAISE NOTICE 'SUCCESS: All tables with RLS have policies defined';
  END IF;
END $$;
