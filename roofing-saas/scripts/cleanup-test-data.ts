#!/usr/bin/env npx tsx
/**
 * Cleanup E2E Test Data
 *
 * Removes all test data with "E2E-" prefix from the SANDBOX tenant.
 * Run before CI to ensure a clean slate.
 *
 * Usage:
 *   npx tsx scripts/cleanup-test-data.ts
 *
 * Or add to package.json:
 *   "cleanup:test": "npx tsx scripts/cleanup-test-data.ts"
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local
config({ path: '.env.local' })

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  console.error('Run with environment variables set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// SANDBOX tenant - Clarity AI Development
const TENANT_ID = '478d279b-5b8a-4040-a805-75d595d59702'

// E2E prefix for all test data
const PREFIX = 'E2E'

console.log('🧹 Cleaning up E2E test data...')
console.log(`   Tenant: ${TENANT_ID} (Clarity AI Development - SANDBOX)`)
console.log(`   Prefix: ${PREFIX}-`)
console.log('')

async function cleanupCampaigns(): Promise<void> {
  console.log('📧 Cleaning up campaigns...')

  // First get campaign IDs to delete steps and triggers
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id')
    .eq('tenant_id', TENANT_ID)
    .like('name', `${PREFIX}-%`)

  if (campaigns && campaigns.length > 0) {
    const campaignIds = campaigns.map(c => c.id)

    // Delete campaign steps
    const { error: stepsError } = await supabase
      .from('campaign_steps')
      .delete()
      .in('campaign_id', campaignIds)

    if (stepsError) {
      console.error('   ⚠️ Error deleting campaign steps:', stepsError.message)
    }

    // Delete campaign triggers
    const { error: triggersError } = await supabase
      .from('campaign_triggers')
      .delete()
      .in('campaign_id', campaignIds)

    if (triggersError) {
      console.error('   ⚠️ Error deleting campaign triggers:', triggersError.message)
    }

    // Delete campaigns
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .in('id', campaignIds)

    if (error) {
      console.error('   ❌ Error deleting campaigns:', error.message)
    } else {
      console.log(`   ✅ Deleted ${campaigns.length} campaigns`)
    }
  } else {
    console.log('   ⏭️ No campaigns to delete')
  }
}

async function cleanupClaims(): Promise<void> {
  console.log('📋 Cleaning up claims...')

  const { data, error } = await supabase
    .from('claims')
    .delete()
    .eq('tenant_id', TENANT_ID)
    .like('claim_number', `CLM-${PREFIX}-%`)
    .select('id')

  if (error) {
    console.error('   ❌ Error deleting claims:', error.message)
  } else {
    console.log(`   ✅ Deleted ${data?.length || 0} claims`)
  }
}

async function cleanupProjects(): Promise<void> {
  console.log('🏠 Cleaning up projects...')

  const { data, error } = await supabase
    .from('projects')
    .delete()
    .eq('tenant_id', TENANT_ID)
    .like('name', `${PREFIX}-%`)
    .select('id')

  if (error) {
    console.error('   ❌ Error deleting projects:', error.message)
  } else {
    console.log(`   ✅ Deleted ${data?.length || 0} projects`)
  }
}

async function cleanupContacts(): Promise<void> {
  console.log('📇 Cleaning up contacts...')

  const { data, error } = await supabase
    .from('contacts')
    .delete()
    .eq('tenant_id', TENANT_ID)
    .like('first_name', `${PREFIX}-%`)
    .select('id')

  if (error) {
    console.error('   ❌ Error deleting contacts:', error.message)
  } else {
    console.log(`   ✅ Deleted ${data?.length || 0} contacts`)
  }
}

async function cleanupTargetingAreas(): Promise<void> {
  console.log('🎯 Cleaning up targeting areas...')

  const { data, error } = await supabase
    .from('storm_targeting_areas')
    .delete()
    .eq('tenant_id', TENANT_ID)
    .like('name', `${PREFIX}-%`)
    .select('id')

  if (error) {
    console.error('   ❌ Error deleting targeting areas:', error.message)
  } else {
    console.log(`   ✅ Deleted ${data?.length || 0} targeting areas`)
  }
}

async function main() {
  try {
    // Delete in reverse order of dependencies
    await cleanupCampaigns()
    await cleanupClaims()
    await cleanupProjects()
    await cleanupContacts()
    await cleanupTargetingAreas()

    console.log('')
    console.log('✨ E2E test data cleanup complete!')
    console.log('')
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
    process.exit(1)
  }
}

main()
