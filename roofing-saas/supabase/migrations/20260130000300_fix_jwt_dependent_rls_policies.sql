-- Fix JWT-dependent RLS policies
-- 16 policies across 10 tables use auth.jwt() ->> 'tenant_id' for isolation,
-- but no custom JWT hook exists to populate tenant_id into the JWT.
-- This means auth.jwt() ->> 'tenant_id' returns NULL, and these policies
-- silently block all user-context access (features return empty results).
-- This migration rewrites all of them to use the proven tenant_users subquery pattern.

-- ============================================================================
-- AR Assessment tables (dormant - unused in application code, but fix anyway)
-- ============================================================================

-- ar_sessions
DROP POLICY IF EXISTS "Users can manage org AR sessions" ON ar_sessions;
CREATE POLICY "Users can manage org AR sessions" ON ar_sessions
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  ) WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- ar_damage_markers (join through ar_sessions)
DROP POLICY IF EXISTS "Users can manage AR damage markers via session" ON ar_damage_markers;
CREATE POLICY "Users can manage AR damage markers via session" ON ar_damage_markers
  FOR ALL USING (
    session_id IN (
      SELECT id FROM ar_sessions
      WHERE tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
    )
  ) WITH CHECK (
    session_id IN (
      SELECT id FROM ar_sessions
      WHERE tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
    )
  );

-- ar_measurements (join through ar_sessions)
DROP POLICY IF EXISTS "Users can manage AR measurements via session" ON ar_measurements;
CREATE POLICY "Users can manage AR measurements via session" ON ar_measurements
  FOR ALL USING (
    session_id IN (
      SELECT id FROM ar_sessions
      WHERE tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
    )
  ) WITH CHECK (
    session_id IN (
      SELECT id FROM ar_sessions
      WHERE tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
    )
  );

-- ============================================================================
-- Audit log (admin-only SELECT, INSERT handled by service role)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view org audit log" ON audit_log;
CREATE POLICY "Admins can view org audit log" ON audit_log
  FOR SELECT USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      JOIN user_role_assignments ura ON ura.user_id = tu.user_id AND ura.tenant_id = tu.tenant_id
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE tu.user_id = auth.uid() AND ur.name IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- Commission system
-- ============================================================================

-- commission_plans: users can view, admins can manage
DROP POLICY IF EXISTS "Admins can manage commission plans" ON commission_plans;
DROP POLICY IF EXISTS "Users can view org commission plans" ON commission_plans;

CREATE POLICY "Users can view org commission plans" ON commission_plans
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage commission plans" ON commission_plans
  FOR ALL USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      JOIN user_role_assignments ura ON ura.user_id = tu.user_id AND ura.tenant_id = tu.tenant_id
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE tu.user_id = auth.uid() AND ur.name IN ('owner', 'admin')
    )
  ) WITH CHECK (
    tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      JOIN user_role_assignments ura ON ura.user_id = tu.user_id AND ura.tenant_id = tu.tenant_id
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE tu.user_id = auth.uid() AND ur.name IN ('owner', 'admin')
    )
  );

-- commission_records: users can view own, admins can manage all
DROP POLICY IF EXISTS "Admins can manage commissions" ON commission_records;
DROP POLICY IF EXISTS "Users can view own commissions" ON commission_records;

CREATE POLICY "Users can view own commissions" ON commission_records
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM user_role_assignments ura
        JOIN user_roles ur ON ur.id = ura.role_id
        WHERE ura.user_id = auth.uid()
        AND ura.tenant_id = commission_records.tenant_id
        AND ur.name IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY "Admins can manage commissions" ON commission_records
  FOR ALL USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      JOIN user_role_assignments ura ON ura.user_id = tu.user_id AND ura.tenant_id = tu.tenant_id
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE tu.user_id = auth.uid() AND ur.name IN ('owner', 'admin')
    )
  ) WITH CHECK (
    tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      JOIN user_role_assignments ura ON ura.user_id = tu.user_id AND ura.tenant_id = tu.tenant_id
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE tu.user_id = auth.uid() AND ur.name IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- DNC Compliance
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage org DNC imports" ON dnc_imports;
CREATE POLICY "Users can manage org DNC imports" ON dnc_imports
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  ) WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can manage org DNC" ON dnc_registry;
CREATE POLICY "Users can manage org DNC" ON dnc_registry
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  ) WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- ============================================================================
-- Insurance personnel
-- Original had separate SELECT (allows NULL tenant), UPDATE, DELETE policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their tenant's insurance personnel" ON insurance_personnel;
DROP POLICY IF EXISTS "Users can update their tenant's insurance personnel" ON insurance_personnel;
DROP POLICY IF EXISTS "Users can delete their tenant's insurance personnel" ON insurance_personnel;

CREATE POLICY "Users can view insurance personnel" ON insurance_personnel
  FOR SELECT USING (
    tenant_id IS NULL
    OR tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their tenant's insurance personnel" ON insurance_personnel
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete their tenant's insurance personnel" ON insurance_personnel
  FOR DELETE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- ============================================================================
-- Roofing knowledge base
-- Global knowledge readable by all, tenant-specific by tenant, admin manage
-- ============================================================================

DROP POLICY IF EXISTS "Global knowledge readable by all authenticated users" ON roofing_knowledge;
DROP POLICY IF EXISTS "Admins can manage knowledge" ON roofing_knowledge;

CREATE POLICY "Knowledge readable by tenant" ON roofing_knowledge
  FOR SELECT USING (
    is_global = true
    OR tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage knowledge" ON roofing_knowledge
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.name IN ('owner', 'admin')
      AND ura.tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.name IN ('owner', 'admin')
      AND ura.tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
    )
  );

-- ============================================================================
-- Query history (user-scoped within tenant)
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage own query history" ON query_history;
CREATE POLICY "Users can manage own query history" ON query_history
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
    AND user_id = auth.uid()
  ) WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
    AND user_id = auth.uid()
  );
