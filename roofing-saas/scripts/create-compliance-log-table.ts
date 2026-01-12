#!/usr/bin/env npx tsx
/**
 * Create call_compliance_log table on NAS
 *
 * Usage:
 *   SUPABASE_URL=https://api.jobclarity.io SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/create-compliance-log-table.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log('Creating call_compliance_log table on NAS...')
  console.log(`URL: ${supabaseUrl}`)

  // Test if table exists
  const { error: checkError } = await supabase
    .from('call_compliance_log')
    .select('id')
    .limit(1)

  if (!checkError) {
    console.log('Table call_compliance_log already exists!')
    process.exit(0)
  }

  if (checkError.code !== 'PGRST205') {
    console.error('Unexpected error:', checkError)
    process.exit(1)
  }

  console.log('Table does not exist, need to create it.')
  console.log('')
  console.log('For self-hosted Supabase (NAS), run this SQL in your database:')
  console.log('')
  console.log(`
-- Create call_compliance_log table
CREATE TABLE IF NOT EXISTS call_compliance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  contact_id UUID,
  call_log_id UUID,
  user_id UUID,
  phone_number TEXT NOT NULL,
  check_type TEXT NOT NULL,
  result TEXT NOT NULL,
  reason TEXT,
  dnc_source TEXT,
  contact_timezone TEXT,
  contact_local_time TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_call_compliance_log_tenant_id ON call_compliance_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_call_compliance_log_contact_id ON call_compliance_log(contact_id);
CREATE INDEX IF NOT EXISTS idx_call_compliance_log_check_type ON call_compliance_log(check_type);
CREATE INDEX IF NOT EXISTS idx_call_compliance_log_result ON call_compliance_log(result);
CREATE INDEX IF NOT EXISTS idx_call_compliance_log_created_at ON call_compliance_log(created_at DESC);

-- Enable RLS
ALTER TABLE call_compliance_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view compliance log in their tenant"
  ON call_compliance_log FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create compliance log entries"
  ON call_compliance_log FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Service role bypass
CREATE POLICY "Service role can manage compliance log"
  ON call_compliance_log FOR ALL
  USING (auth.role() = 'service_role');
  `)

  console.log('')
  console.log('You can run this via:')
  console.log('1. Supabase Studio SQL Editor (if available)')
  console.log('2. Direct psql connection to the database')
  console.log('3. The database management interface on your NAS')
}

main().catch(console.error)
