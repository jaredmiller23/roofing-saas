#!/usr/bin/env tsx

/**
 * Create Test User for Playwright Tests
 *
 * This script creates a test user in Supabase Auth with proper password hashing
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') })

async function createTestUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials')
    console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
    process.exit(1)
  }

  // Create Supabase admin client
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('🔐 Creating test user...')

  // Create user with Supabase Auth Admin API
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'test@roofingsaas.com',
    password: 'TestPassword123!',
    email_confirm: true, // Auto-confirm email
    user_metadata: {
      full_name: 'Test User',
      role: 'tester'
    }
  })

  if (error) {
    console.error('❌ Failed to create test user:', error.message)
    process.exit(1)
  }

  console.log('✅ Test user created successfully!')
  console.log('')
  console.log('📋 User Details:')
  console.log('   Email:', data.user?.email)
  console.log('   User ID:', data.user?.id)
  console.log('   Email Confirmed:', data.user?.email_confirmed_at ? 'Yes ✅' : 'No ❌')
  console.log('   Password: TestPassword123!')
  console.log('')
  console.log('🧪 You can now run Playwright tests:')
  console.log('   npx playwright test --project=setup')
  console.log('')
}

createTestUser().catch(console.error)
