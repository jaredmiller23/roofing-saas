-- Migration: Create Commission System Tables
-- Purpose: Add commission_plans, commission_records, and commission_summary_by_user view
-- Rollback: DROP VIEW commission_summary_by_user; DROP TABLE commission_records; DROP TABLE commission_plans;

-- Commission Plans Table
-- Defines commission structures with rules for different sales scenarios
CREATE TABLE commission_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  rules JSONB NOT NULL DEFAULT '[]', -- Array of commission rules
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Commission Records Table
-- Tracks individual commission entries for sales reps
CREATE TABLE commission_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  plan_id UUID REFERENCES commission_plans(id),
  project_id UUID REFERENCES projects(id),
  amount DECIMAL NOT NULL,
  percentage DECIMAL,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'paid'
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- View: Commission Summary by User
-- Aggregates commission records per user for reporting
CREATE OR REPLACE VIEW commission_summary_by_user AS
SELECT
  tenant_id,
  user_id,
  COUNT(*) as total_records,
  SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
  SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_amount,
  SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_amount,
  SUM(amount) as total_amount
FROM commission_records
GROUP BY tenant_id, user_id;

-- Enable Row Level Security
ALTER TABLE commission_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Commission Plans

-- All users can view their org's commission plans
CREATE POLICY "Users can view org commission plans" ON commission_plans
  FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Only admins can manage commission plans
CREATE POLICY "Admins can manage commission plans" ON commission_plans
  FOR ALL USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') = 'admin'
  );

-- RLS Policies: Commission Records

-- Users can view their own commissions, admins can view all
CREATE POLICY "Users can view own commissions" ON commission_records
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (user_id = auth.uid() OR (auth.jwt() ->> 'role') = 'admin')
  );

-- Only admins can manage commission records
CREATE POLICY "Admins can manage commissions" ON commission_records
  FOR ALL USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') = 'admin'
  );

-- Indexes for Performance

-- Commission Plans indexes
CREATE INDEX idx_commission_plans_tenant ON commission_plans(tenant_id);
CREATE INDEX idx_commission_plans_active ON commission_plans(tenant_id, is_active);

-- Commission Records indexes
CREATE INDEX idx_commission_records_tenant ON commission_records(tenant_id);
CREATE INDEX idx_commission_records_user ON commission_records(user_id);
CREATE INDEX idx_commission_records_status ON commission_records(status);
CREATE INDEX idx_commission_records_tenant_user ON commission_records(tenant_id, user_id);
