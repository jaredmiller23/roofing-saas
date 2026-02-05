-- Trial Nurture Emails
-- Tracks which nurture sequence emails have been sent to each trial tenant.
-- Used by the daily cron job to determine which emails are due.

CREATE TABLE IF NOT EXISTS trial_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email_key VARCHAR(50) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resend_id VARCHAR(255),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, email_key)
);

CREATE INDEX idx_trial_emails_tenant ON trial_emails(tenant_id);
