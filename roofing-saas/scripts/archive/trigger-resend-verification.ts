#!/usr/bin/env tsx
/**
 * Trigger Resend Domain Verification
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })

import { checkDomain, verifyDomain } from '../lib/resend/domain-manager'

const DOMAIN_NAME = 'notifications.claimclarityai.com'

async function main() {
  console.log('🔍 Checking domain...\n')

  const result = await checkDomain(DOMAIN_NAME)

  if (!result.exists || !result.domain) {
    console.log('❌ Domain not found')
    return
  }

  console.log(`✅ Domain found: ${result.domain.id}`)
  console.log(`   Status: ${result.domain.status}\n`)

  if (result.domain.status === 'verified') {
    console.log('🎉 Domain already verified!')
    return
  }

  console.log('🔄 Triggering verification check...')

  await verifyDomain(result.domain.id)

  console.log('✅ Verification triggered!')
  console.log('')
  console.log('ℹ️  Resend will check DNS records and update status.')
  console.log('   This may take a few minutes.')
  console.log('')
  console.log('Run this command again in a few minutes to check status:')
  console.log('   npm run check-email-status')
}

main().catch(console.error)
