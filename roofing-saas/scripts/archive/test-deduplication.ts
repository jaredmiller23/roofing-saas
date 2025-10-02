/**
 * Test Deduplication Script
 *
 * Creates test data and imports it twice to verify no duplicates are created.
 * Run this BEFORE importing real Proline data to verify the system works.
 *
 * Usage:
 *   npx tsx scripts/test-deduplication.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000000'

// Test data
const testProjects = [
  {
    proline_id: 'TEST_1759354835784x738374090799908400',
    tenant_id: TEST_TENANT_ID,
    project_number: 'TEST-001',
    name: 'Test Project Alpha',
    status: 'lead',
    custom_fields: {
      proline_pipeline: 'SALES INSURANCE',
      proline_stage: 'NEW LEADS',
    },
  },
  {
    proline_id: 'TEST_1759355012345x987654321098765432',
    tenant_id: TEST_TENANT_ID,
    project_number: 'TEST-002',
    name: 'Test Project Beta',
    status: 'won',
    custom_fields: {
      proline_pipeline: 'PRODUCTION',
      proline_stage: 'SCHEDULED',
    },
  },
]

async function runTest() {
  console.log('🧪 Testing Deduplication System\n')
  console.log('=' .repeat(60))

  // Step 1: Clean up any existing test data
  console.log('\n🧹 Cleaning up old test data...')
  const { error: cleanupError } = await supabase
    .from('projects')
    .delete()
    .like('proline_id', 'TEST_%')

  if (cleanupError) {
    console.error('Error cleaning up:', cleanupError)
  } else {
    console.log('✅ Test data cleaned')
  }

  // Step 2: Count initial projects
  const { count: initialCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })

  console.log(`\n📊 Initial project count: ${initialCount}`)

  // Step 3: First import (should create 2 projects)
  console.log('\n🆕 First import (should CREATE 2 projects)...')

  for (const project of testProjects) {
    const { error } = await supabase.from('projects').insert(project)

    if (error) {
      console.error(`❌ Error creating ${project.name}:`, error.message)
    } else {
      console.log(`✅ Created: ${project.name}`)
    }
  }

  const { count: afterFirstImport } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })

  console.log(`📊 After first import: ${afterFirstImport} projects (+${afterFirstImport! - initialCount!})`)

  // Step 4: Second import (should update, not create duplicates)
  console.log('\n🔄 Second import (should UPDATE, not duplicate)...')

  for (const project of testProjects) {
    // Modify data slightly
    const updatedProject = {
      ...project,
      name: project.name + ' (Updated)',
      updated_at: new Date().toISOString(),
    }

    // Check if exists
    const { data: existing } = await supabase
      .from('projects')
      .select('id')
      .eq('proline_id', project.proline_id)
      .maybeSingle()

    if (existing) {
      // UPDATE
      const { error } = await supabase
        .from('projects')
        .update(updatedProject)
        .eq('proline_id', project.proline_id)

      if (error) {
        console.error(`❌ Error updating ${project.name}:`, error.message)
      } else {
        console.log(`✅ Updated: ${project.name}`)
      }
    } else {
      // This shouldn't happen!
      console.error(`⚠️  Project not found for update: ${project.name}`)
    }
  }

  const { count: afterSecondImport } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })

  console.log(`📊 After second import: ${afterSecondImport} projects (+${afterSecondImport! - afterFirstImport!})`)

  // Step 5: Verify no duplicates
  console.log('\n🔍 Checking for duplicates...')

  const { data: duplicates } = await supabase
    .rpc('check_duplicate_proline_ids', {}, { count: 'exact' })
    .select('*')

  // Alternatively, use SQL query
  const { data: manualCheck } = await supabase
    .from('projects')
    .select('proline_id')
    .like('proline_id', 'TEST_%')

  const prolineIds = manualCheck?.map((p) => p.proline_id)
  const uniqueIds = new Set(prolineIds)

  console.log(`   Found ${prolineIds?.length} test projects`)
  console.log(`   Unique proline_ids: ${uniqueIds.size}`)

  // Step 6: Results
  console.log('\n' + '='.repeat(60))
  console.log('📊 TEST RESULTS')
  console.log('='.repeat(60))

  const projectsAdded = afterFirstImport! - initialCount!
  const projectsAddedInSecond = afterSecondImport! - afterFirstImport!

  if (projectsAdded === 2 && projectsAddedInSecond === 0 && prolineIds?.length === uniqueIds.size) {
    console.log('✅ SUCCESS: Deduplication is working correctly!')
    console.log('   - First import created 2 projects ✅')
    console.log('   - Second import created 0 duplicates ✅')
    console.log('   - All proline_ids are unique ✅')
  } else {
    console.log('❌ FAILURE: Deduplication is NOT working correctly!')
    console.log(`   - First import: Expected +2, got +${projectsAdded}`)
    console.log(`   - Second import: Expected +0, got +${projectsAddedInSecond}`)
    console.log(`   - Duplicates found: ${(prolineIds?.length || 0) - uniqueIds.size}`)
  }

  console.log('='.repeat(60))

  // Step 7: Cleanup
  console.log('\n🧹 Cleaning up test data...')
  await supabase.from('projects').delete().like('proline_id', 'TEST_%')
  console.log('✅ Test data removed')

  console.log('\n✨ Test complete!')
}

// Run test
runTest()
  .then(() => {
    console.log('\n✅ Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
