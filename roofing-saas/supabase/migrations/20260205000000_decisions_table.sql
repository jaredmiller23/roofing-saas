-- Decisions table for tracking team decisions
-- This table powers the dev dashboard decisions tracking feature

CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  meeting_date DATE NOT NULL,
  decision_text TEXT NOT NULL,
  context TEXT,
  decided_by UUID[],
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'superseded', 'reversed')),
  related_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_decisions_tenant ON decisions(tenant_id);
CREATE INDEX idx_decisions_meeting_date ON decisions(meeting_date DESC);
CREATE INDEX idx_decisions_status ON decisions(status);
CREATE INDEX idx_decisions_tags ON decisions USING GIN(tags);

-- Row Level Security
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view decisions in their tenant"
  ON decisions FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can create decisions in their tenant"
  ON decisions FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update decisions in their tenant"
  ON decisions FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- Updated_at trigger (using existing function if available, or create if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_decisions_updated_at
  BEFORE UPDATE ON decisions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed initial decisions from 2026-02-05 planning session
INSERT INTO decisions (tenant_id, meeting_date, decision_text, context, tags, status)
SELECT
  t.id,
  '2026-02-05'::DATE,
  d.decision_text,
  d.context,
  d.tags,
  'active'
FROM
  tenants t,
  (VALUES
    ('Use substatus system for 18-stage workflow (not enum expansion)',
     'Pipeline tracking requires granular stages. Substatuses provide flexibility without schema changes.',
     ARRAY['architecture', 'pipeline']),
    ('Campaign auto-cancel on stage exit - implemented',
     'When a contact moves to a different stage, active campaigns for prior stage are automatically cancelled.',
     ARRAY['campaign', 'automation']),
    ('Perfect Packet validation blocks production without 4 required items',
     'Material orders require: slope, waste factor, deck type, and at least one measurement.',
     ARRAY['workflow', 'validation']),
    ('Material calculator: 1.11 waste factor, one-click ordering',
     'Standard 11% waste factor applied. Simplified ordering workflow to single click after validation.',
     ARRAY['features', 'automation']),
    ('Speed vs automation tradeoff accepted - slightly slower than ProLine is OK',
     'Product strategy decision: prioritize automation and accuracy over raw speed. Users value reducing manual work more than milliseconds.',
     ARRAY['product', 'strategy'])
  ) AS d(decision_text, context, tags)
LIMIT 5;
