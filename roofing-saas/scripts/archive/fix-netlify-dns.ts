#!/usr/bin/env tsx
/**
 * Netlify DNS Fix Script
 *
 * Adds the required A record to point domain to Netlify
 */

// Load environment variables
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })

import { findDnsZone, createDnsRecord, getDnsRecords } from '../lib/netlify/dns-manager'

const NETLIFY_API_TOKEN = process.env.NETLIFY_API_TOKEN!
const DOMAIN = 'claimclarityai.com'
const NETLIFY_IP = '75.2.60.5'

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function main() {
  try {
    log('🔧 Fixing Netlify DNS Configuration', 'bright')
    log(`Domain: ${DOMAIN}`, 'blue')
    console.log('')

    // Find DNS zone
    log('🔍 Finding DNS zone...', 'blue')
    const zone = await findDnsZone(NETLIFY_API_TOKEN, DOMAIN)

    if (!zone) {
      throw new Error(`DNS zone not found for ${DOMAIN}`)
    }

    log(`✅ Found zone: ${zone.name} (ID: ${zone.id})`, 'green')
    console.log('')

    // Check existing records
    log('📋 Checking existing DNS records...', 'blue')
    const records = await getDnsRecords(NETLIFY_API_TOKEN, zone.id)
    const rootRecords = records.filter((r) => r.hostname === '' || r.hostname === '@')

    if (rootRecords.length > 0) {
      log('Current root domain records:', 'yellow')
      rootRecords.forEach((r) => {
        log(`   ${r.type} ${r.hostname || '@'} → ${r.value}`, 'yellow')
      })
    } else {
      log('No root domain records found', 'yellow')
    }

    // Check if A record already exists
    const aRecord = rootRecords.find((r) => r.type === 'A')

    if (aRecord && aRecord.value === NETLIFY_IP) {
      log('', 'reset')
      log('✅ A record already points to Netlify!', 'green')
      log(`   ${aRecord.type} @ → ${aRecord.value}`, 'green')
      log('', 'reset')
      log('💡 DNS is correct. SSL issue might be:', 'blue')
      log('   1. DNS propagation delay (wait 10-15 minutes)', 'blue')
      log('   2. SSL not provisioned yet (check Netlify dashboard)', 'blue')
      log('   3. Domain verification pending', 'blue')
      return
    }

    // Add A record
    log('', 'reset')
    log('➕ Adding A record to point to Netlify...', 'blue')

    await createDnsRecord(NETLIFY_API_TOKEN, zone.id, {
      type: 'A',
      hostname: '', // Root domain
      value: NETLIFY_IP,
      ttl: 3600,
    })

    log('✅ A record added successfully!', 'green')
    log(`   A @ → ${NETLIFY_IP}`, 'green')
    console.log('')

    log('🎉 DNS Configuration Fixed!', 'bright')
    console.log('')
    log('📋 Next Steps:', 'blue')
    log('   1. Wait 5-10 minutes for DNS propagation', 'blue')
    log('   2. Check propagation: https://dnschecker.org', 'blue')
    log('   3. Netlify will auto-provision SSL once DNS propagates', 'blue')
    log('   4. Check status in Netlify dashboard: Domain Management', 'blue')
    console.log('')
    log('🔗 Helpful Links:', 'blue')
    log('   • Netlify Site: https://app.netlify.com/sites/claimclarityai', 'blue')
    log('   • DNS Checker: https://dnschecker.org/#A/claimclarityai.com', 'blue')

  } catch (error) {
    log('', 'reset')
    log('❌ Failed to fix DNS', 'red')
    log(`Error: ${error}`, 'red')
    console.error(error)
    process.exit(1)
  }
}

main()
