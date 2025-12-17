-- Migration: Create Audit Log Table
-- Rollback: DROP TABLE audit_log;

-- Audit Log Table
-- For tracking all user actions (create, update, delete, login, export, etc.)
-- Security compliance and debugging

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'login', 'export', etc.
  entity_type TEXT NOT NULL, -- 'contact', 'project', 'user', etc.
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy (admins only can view)
CREATE POLICY "Admins can view org audit log" ON audit_log
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') = 'admin'
  );

-- Insert policy for system
CREATE POLICY "System can insert audit logs" ON audit_log
  FOR INSERT WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Indexes
CREATE INDEX idx_audit_log_tenant ON audit_log(tenant_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
