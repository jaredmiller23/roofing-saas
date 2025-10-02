#!/usr/bin/env tsx
/**
 * Quick Email Domain Status Check
 * Just checks current verification status without making changes
 */

// Load environment variables
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })

import { checkDomain } from '../lib/resend/domain-manager'

const DOMAIN_NAME = 'notifications.claimclarityai.com'

async function main() {
  try {
    console.log('🔍 Checking email domain status...\n')

    const result = await checkDomain(DOMAIN_NAME)

    if (!result.exists) {
      console.log('❌ Domain not found in Resend')
      console.log('   Run: npm run setup-email-domain')
      return
    }

    console.log('✅ Domain exists in Resend')
    console.log(`   ID: ${result.domain?.id}`)
    console.log(`   Status: ${result.domain?.status}`)
    console.log(`   Region: ${result.domain?.region}`)
    console.log('')

    if (result.domain?.status === 'verified') {
      console.log('🎉 Domain is VERIFIED and ready to send emails!')
      return
    }

    const records = result.domain?.records || []
    console.log(`📋 DNS Records (${records.length} total):`)
    records.forEach((record, i) => {
      const statusIcon = record.status === 'verified' ? '✅' : '⏳'
      console.log(`   ${i + 1}. ${statusIcon} ${record.record} (${record.type}) - ${record.status}`)
    })

    const verifiedCount = records.filter(r => r.status === 'verified').length
    console.log('')
    console.log(`Progress: ${verifiedCount}/${records.length} records verified`)

    if (verifiedCount < records.length) {
      console.log('⏳ Waiting for DNS propagation...')
      console.log('   This typically takes 10-20 minutes')
      console.log('   Resend will auto-verify within 72 hours')
    }
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()
