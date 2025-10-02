#!/usr/bin/env tsx
/**
 * Get Required DNS Records from Resend
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })

import { checkDomain } from '../lib/resend/domain-manager'

const DOMAIN_NAME = 'notifications.claimclarityai.com'

async function main() {
  console.log('🔍 Getting required DNS records from Resend...\n')

  const result = await checkDomain(DOMAIN_NAME)

  if (!result.exists || !result.domain) {
    console.log('❌ Domain not found')
    return
  }

  const records = result.domain.records || []

  console.log(`📋 Resend requires ${records.length} DNS records:\n`)

  records.forEach((record, i) => {
    console.log(`${i + 1}. ${record.record} (${record.type})`)
    console.log(`   Name: ${record.name}`)
    console.log(`   Value: ${record.value}`)
    console.log(`   Status: ${record.status}`)
    console.log(`   Priority: ${record.priority || 'N/A'}`)
    console.log('')
  })

  console.log('Expected hostnames in Netlify:')
  records.forEach((record) => {
    // Resend gives us fully qualified names, we need to format for Netlify
    const name = record.name
    console.log(`   ${record.type}: ${name}`)
  })
}

main().catch(console.error)
