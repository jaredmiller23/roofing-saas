-- Migration: Add SMS approval queue for ARIA responses
-- Purpose: Queue ARIA-generated SMS responses that need human review before sending
-- Rollback: DROP TABLE sms_approval_queue;

-- Create SMS approval queue table
CREATE TABLE IF NOT EXISTS sms_approval_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  inbound_message TEXT NOT NULL,
  suggested_response TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'complex',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'modified', 'rejected', 'expired')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  final_response TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours')
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sms_approval_queue_tenant_status
  ON sms_approval_queue(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_sms_approval_queue_phone
  ON sms_approval_queue(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_approval_queue_created
  ON sms_approval_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_approval_queue_expires
  ON sms_approval_queue(expires_at) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE sms_approval_queue ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only see/manage their tenant's approval queue
CREATE POLICY "Users can view own tenant SMS queue" ON sms_approval_queue
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can insert to own tenant SMS queue" ON sms_approval_queue
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can update own tenant SMS queue" ON sms_approval_queue
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Service role bypass for webhook processing
CREATE POLICY "Service role full access" ON sms_approval_queue
  FOR ALL USING (auth.role() = 'service_role');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_sms_approval_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sms_approval_queue_updated_at
  BEFORE UPDATE ON sms_approval_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_sms_approval_queue_updated_at();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
