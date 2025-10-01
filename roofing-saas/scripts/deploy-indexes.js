const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = 'https://wfifizczqvogbcqamnmw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmaWZpemN6cXZvZ2JjcWFtbm13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODEwMzA5MywiZXhwIjoyMDczNjc5MDkzfQ.jaUuBTAhXsHGOQQaYdserOO3otcmIDLNCD4-ccqpXdM'

const supabase = createClient(supabaseUrl, supabaseKey)

async function deployIndexes() {
  console.log('📊 Deploying performance indexes...\n')

  const sql = fs.readFileSync(
    path.join(__dirname, '../supabase/migrations/20251001_add_performance_indexes.sql'),
    'utf8'
  )

  console.log('Please run this SQL in Supabase SQL Editor:\n')
  console.log('https://supabase.com/dashboard/project/wfifizczqvogbcqamnmw/sql/new\n')
  console.log('---\n')
  console.log(sql)
  console.log('\n---\n')
  console.log('This will add indexes for:')
  console.log('  ✓ Tenant-based queries')
  console.log('  ✓ User lookups')
  console.log('  ✓ Contact/Project/Activity queries')
  console.log('  ✓ QuickBooks integration')
  console.log('  ✓ Soft delete optimization')
}

deployIndexes().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
