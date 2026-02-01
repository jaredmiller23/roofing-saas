#!/usr/bin/env npx tsx
/**
 * Seed E2E Test Data
 *
 * Creates baseline test data in the SANDBOX tenant for E2E tests.
 * All data uses "E2E-" prefix for easy identification and cleanup.
 *
 * CRITICAL: Uses sandbox tenant 478d279b-5b8a-4040-a805-75d595d59702
 * NEVER seed to production tenant!
 *
 * Usage:
 *   npx tsx scripts/seed-test-data.ts
 *
 * Or add to package.json:
 *   "seed:test": "npx tsx scripts/seed-test-data.ts"
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

// Test user - claude-test@roofingsaas.com
const TEST_USER_ID = '5dc43384-1509-4da8-a795-71060988140a'

// E2E prefix for all test data
const PREFIX = 'E2E'

console.log('🌱 Seeding E2E test data...')
console.log(`   Tenant: ${TENANT_ID} (Clarity AI Development - SANDBOX)`)
console.log(`   User: ${TEST_USER_ID} (claude-test@roofingsaas.com)`)
console.log('')

async function seedContacts(): Promise<string[]> {
  console.log('📇 Creating test contacts...')

  const contacts = [
    {
      tenant_id: TENANT_ID,
      first_name: `${PREFIX}-Lead`,
      last_name: 'Contact',
      email: `${PREFIX.toLowerCase()}-lead@example.com`,
      phone: '555-0001',
      stage: 'lead',
      source: 'e2e_test',
      contact_category: 'homeowner',
      address_street: '123 Test Lane',
      address_city: 'Nashville',
      address_state: 'TN',
      address_zip: '37201',
      // created_by omitted - not required and FK constraint may fail
    },
    {
      tenant_id: TENANT_ID,
      first_name: `${PREFIX}-Qualified`,
      last_name: 'Contact',
      email: `${PREFIX.toLowerCase()}-qualified@example.com`,
      phone: '555-0002',
      stage: 'qualified',
      source: 'e2e_test',
      contact_category: 'homeowner',
      address_street: '456 Demo Ave',
      address_city: 'Knoxville',
      address_state: 'TN',
      address_zip: '37902',
      // created_by omitted - not required and FK constraint may fail
    },
    {
      tenant_id: TENANT_ID,
      first_name: `${PREFIX}-Customer`,
      last_name: 'Contact',
      email: `${PREFIX.toLowerCase()}-customer@example.com`,
      phone: '555-0003',
      stage: 'customer',
      source: 'e2e_test',
      contact_category: 'homeowner',
      address_street: '789 Sample Rd',
      address_city: 'Chattanooga',
      address_state: 'TN',
      address_zip: '37402',
      // created_by omitted - not required and FK constraint may fail
    },
    {
      tenant_id: TENANT_ID,
      first_name: `${PREFIX}-Lost`,
      last_name: 'Contact',
      email: `${PREFIX.toLowerCase()}-lost@example.com`,
      phone: '555-0004',
      stage: 'lost',
      source: 'e2e_test',
      contact_category: 'homeowner',
      // created_by omitted - not required and FK constraint may fail
    },
    {
      tenant_id: TENANT_ID,
      first_name: `${PREFIX}-FileTest`,
      last_name: 'Contact',
      email: `${PREFIX.toLowerCase()}-filetest@example.com`,
      phone: '555-0005',
      stage: 'lead',
      source: 'e2e_test',
      contact_category: 'homeowner',
      notes: 'Contact for project-files.spec.ts testing',
      // created_by omitted - not required and FK constraint may fail
    },
  ]

  // Check if E2E contacts already exist
  const { data: existing } = await supabase
    .from('contacts')
    .select('id, first_name')
    .eq('tenant_id', TENANT_ID)
    .like('first_name', `${PREFIX}-%`)

  if (existing && existing.length > 0) {
    console.log(`   ⏭️ Found ${existing.length} existing E2E contacts, skipping creation`)
    return existing.map(c => c.id)
  }

  const { data, error } = await supabase
    .from('contacts')
    .insert(contacts)
    .select('id')

  if (error) {
    console.error('   ❌ Error creating contacts:', error.message)
    return []
  }

  console.log(`   ✅ Created ${data?.length || 0} contacts`)
  return data?.map(c => c.id) || []
}

async function seedProjects(contactIds: string[]): Promise<string[]> {
  if (contactIds.length === 0) {
    console.log('⏭️  Skipping projects (no contacts)')
    return []
  }

  console.log('🏠 Creating test projects...')

  const projects = [
    {
      tenant_id: TENANT_ID,
      name: `${PREFIX}-Active-Project`,
      contact_id: contactIds[0],
      status: 'active',
      pipeline_stage: 'prospect' as const,
      description: '123 Test Lane, Nashville, TN 37201',
    },
    {
      tenant_id: TENANT_ID,
      name: `${PREFIX}-Completed-Project`,
      contact_id: contactIds[1],
      status: 'completed',
      pipeline_stage: 'complete' as const,
      description: '456 Demo Ave, Knoxville, TN 37902',
    },
    {
      tenant_id: TENANT_ID,
      name: `${PREFIX}-Claim-Project`,
      contact_id: contactIds[2],
      status: 'active',
      pipeline_stage: 'production' as const,
      description: '789 Sample Rd, Chattanooga, TN 37402',
    },
  ]

  // Check if E2E projects already exist
  const { data: existing } = await supabase
    .from('projects')
    .select('id, name')
    .eq('tenant_id', TENANT_ID)
    .like('name', `${PREFIX}-%`)

  if (existing && existing.length > 0) {
    console.log(`   ⏭️ Found ${existing.length} existing E2E projects, skipping creation`)
    return existing.map(p => p.id)
  }

  const { data, error } = await supabase
    .from('projects')
    .insert(projects)
    .select('id')

  if (error) {
    console.error('   ❌ Error creating projects:', error.message)
    return []
  }

  console.log(`   ✅ Created ${data?.length || 0} projects`)
  return data?.map(p => p.id) || []
}

async function seedClaims(projectIds: string[], contactIds: string[]): Promise<void> {
  if (projectIds.length === 0 || contactIds.length === 0) {
    console.log('⏭️  Skipping claims (no projects or contacts)')
    return
  }

  console.log('📋 Creating test claims...')

  const claims = [
    {
      tenant_id: TENANT_ID,
      claim_number: `CLM-${PREFIX}-001`,
      status: 'new',
      project_id: projectIds[2] || projectIds[0],
      contact_id: contactIds[2] || contactIds[0],
      policy_number: `POL-${PREFIX}-001`,
      insurance_carrier: 'State Farm',
      date_of_loss: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      estimated_damage: 15000,
      deductible: 1000,
      // created_by omitted - not required and FK constraint may fail
    },
    {
      tenant_id: TENANT_ID,
      claim_number: `CLM-${PREFIX}-002`,
      status: 'in_progress',
      project_id: projectIds[2] || projectIds[0],
      contact_id: contactIds[2] || contactIds[0],
      policy_number: `POL-${PREFIX}-002`,
      insurance_carrier: 'Allstate',
      date_of_loss: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      estimated_damage: 22000,
      deductible: 2500,
      // created_by omitted - not required and FK constraint may fail
    },
    {
      tenant_id: TENANT_ID,
      claim_number: `CLM-${PREFIX}-003`,
      status: 'approved',
      project_id: projectIds[1] || projectIds[0],
      contact_id: contactIds[1] || contactIds[0],
      policy_number: `POL-${PREFIX}-003`,
      insurance_carrier: 'Liberty Mutual',
      date_of_loss: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      estimated_damage: 18000,
      approved_amount: 16500,
      deductible: 1500,
      decision_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      // created_by omitted - not required and FK constraint may fail
    },
    {
      tenant_id: TENANT_ID,
      claim_number: `CLM-${PREFIX}-004`,
      status: 'denied',
      project_id: projectIds[0],
      contact_id: contactIds[0],
      policy_number: `POL-${PREFIX}-004`,
      insurance_carrier: 'USAA',
      date_of_loss: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      estimated_damage: 8000,
      approved_amount: 0,
      deductible: 1000,
      decision_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: 'Denied due to pre-existing damage',
      // created_by omitted - not required and FK constraint may fail
    },
    {
      tenant_id: TENANT_ID,
      claim_number: `CLM-${PREFIX}-005`,
      status: 'inspection_scheduled',
      project_id: projectIds[0],
      contact_id: contactIds[0],
      policy_number: `POL-${PREFIX}-005`,
      insurance_carrier: 'Farmers',
      date_of_loss: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      estimated_damage: 12000,
      deductible: 1000,
      inspection_scheduled_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      // created_by omitted - not required and FK constraint may fail
    },
  ]

  // Check if E2E claims already exist
  const { data: existing } = await supabase
    .from('claims')
    .select('id')
    .eq('tenant_id', TENANT_ID)
    .like('claim_number', `CLM-${PREFIX}-%`)

  if (existing && existing.length > 0) {
    console.log(`   ⏭️ Found ${existing.length} existing E2E claims, skipping creation`)
    return
  }

  const { data, error } = await supabase
    .from('claims')
    .insert(claims)
    .select('id')

  if (error) {
    console.error('   ❌ Error creating claims:', error.message)
    return
  }

  console.log(`   ✅ Created ${data?.length || 0} claims`)
}

async function seedCampaigns(): Promise<void> {
  console.log('📧 Creating test campaigns...')

  const campaigns = [
    {
      tenant_id: TENANT_ID,
      name: `${PREFIX}-Drip-Campaign`,
      description: 'E2E test drip campaign with 3 steps',
      campaign_type: 'drip',
      status: 'draft',
      enrollment_type: 'automatic',
      allow_re_enrollment: false,
      respect_business_hours: true,
      // created_by omitted - not required and FK constraint may fail
    },
    {
      tenant_id: TENANT_ID,
      name: `${PREFIX}-Event-Campaign`,
      description: 'E2E test event-based campaign with trigger',
      campaign_type: 'event',
      status: 'draft',
      enrollment_type: 'automatic',
      allow_re_enrollment: true,
      respect_business_hours: false,
      // created_by omitted - not required and FK constraint may fail
    },
  ]

  // Check if E2E campaigns already exist
  const { data: existing } = await supabase
    .from('campaigns')
    .select('id, name')
    .eq('tenant_id', TENANT_ID)
    .like('name', `${PREFIX}-%`)

  if (existing && existing.length > 0) {
    console.log(`   ⏭️ Found ${existing.length} existing E2E campaigns, skipping creation`)
    return
  }

  // Insert campaigns
  const { data: campaignData, error: campaignError } = await supabase
    .from('campaigns')
    .insert(campaigns)
    .select('id, name')

  if (campaignError) {
    console.error('   ❌ Error creating campaigns:', campaignError.message)
    return
  }

  console.log(`   ✅ Created ${campaignData?.length || 0} campaigns`)

  // Create steps for drip campaign
  const dripCampaign = campaignData?.find(c => c.name.includes('Drip'))
  if (dripCampaign) {
    const steps = [
      {
        campaign_id: dripCampaign.id,
        step_order: 0,
        step_type: 'send_email',
        step_config: {
          subject: 'Welcome to our service',
          template_id: null,
          body: 'Thank you for your interest!',
        },
        delay_value: 0,
        delay_unit: 'hours',
      },
      {
        campaign_id: dripCampaign.id,
        step_order: 1,
        step_type: 'wait',
        step_config: {},
        delay_value: 3,
        delay_unit: 'days',
      },
      {
        campaign_id: dripCampaign.id,
        step_order: 2,
        step_type: 'send_sms',
        step_config: {
          message: 'Just checking in - any questions about your roof?',
        },
        delay_value: 0,
        delay_unit: 'hours',
      },
    ]

    const { error: stepsError } = await supabase
      .from('campaign_steps')
      .insert(steps)

    if (stepsError) {
      console.error('   ❌ Error creating campaign steps:', stepsError.message)
    } else {
      console.log('   ✅ Created 3 steps for drip campaign')
    }
  }

  // Create trigger for event campaign
  const eventCampaign = campaignData?.find(c => c.name.includes('Event'))
  if (eventCampaign) {
    const triggers = [
      {
        campaign_id: eventCampaign.id,
        trigger_type: 'stage_change',
        trigger_config: {
          from_stage: 'lead',
          to_stage: 'qualified',
        },
        priority: 0,
        is_active: true,
      },
    ]

    const { error: triggersError } = await supabase
      .from('campaign_triggers')
      .insert(triggers)

    if (triggersError) {
      console.error('   ❌ Error creating campaign triggers:', triggersError.message)
    } else {
      console.log('   ✅ Created 1 trigger for event campaign')
    }
  }
}

async function seedTargetingAreas(): Promise<void> {
  console.log('🎯 Creating test targeting areas...')

  const areas = [
    {
      tenant_id: TENANT_ID,
      name: `${PREFIX}-Storm-Area`,
      description: 'E2E test targeting area for storm lead testing',
      status: 'extracted', // Valid: draft, extracting, extracted, enriching, enriched, importing, imported, error
      address_count: 10,
      area_sq_miles: 5.2,
      estimated_properties: 250,
    },
  ]

  // Check if E2E targeting areas already exist
  const { data: existing } = await supabase
    .from('storm_targeting_areas')
    .select('id, name')
    .eq('tenant_id', TENANT_ID)
    .like('name', `${PREFIX}-%`)

  if (existing && existing.length > 0) {
    console.log(`   ⏭️ Found ${existing.length} existing E2E targeting areas, skipping creation`)
    return
  }

  const { data, error } = await supabase
    .from('storm_targeting_areas')
    .insert(areas)
    .select('id')

  if (error) {
    console.error('   ❌ Error creating targeting areas:', error.message)
    return
  }

  console.log(`   ✅ Created ${data?.length || 0} targeting areas`)
}

async function main() {
  try {
    // Seed in order of dependencies
    const contactIds = await seedContacts()
    const projectIds = await seedProjects(contactIds)
    await seedClaims(projectIds, contactIds)
    await seedCampaigns()
    await seedTargetingAreas()

    console.log('')
    console.log('✨ E2E test data seeding complete!')
    console.log('')
    console.log('Next steps:')
    console.log('  1. Run E2E tests: npm run test:e2e')
    console.log('  2. Clean up: npx tsx scripts/cleanup-test-data.ts')
    console.log('')
  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  }
}

main()
