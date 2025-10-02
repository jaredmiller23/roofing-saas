#!/usr/bin/env tsx
/**
 * List DNS Records for Domain
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })

import { findDnsZone } from '../lib/netlify/dns-manager'

const NETLIFY_API_TOKEN = process.env.NETLIFY_API_TOKEN
const DOMAIN = 'claimclarityai.com'

async function main() {
  if (!NETLIFY_API_TOKEN) {
    throw new Error('NETLIFY_API_TOKEN not set')
  }

  console.log('🔍 Listing DNS records for:', DOMAIN)
  console.log('')

  const zone = await findDnsZone(NETLIFY_API_TOKEN, DOMAIN)

  if (!zone) {
    console.log('❌ DNS zone not found')
    return
  }

  console.log('✅ Zone found:', zone.name)
  console.log('   Zone ID:', zone.id)
  console.log('')

  // Fetch all DNS records
  const response = await fetch(
    `https://api.netlify.com/api/v1/dns_zones/${zone.id}/dns_records`,
    {
      headers: {
        Authorization: `Bearer ${NETLIFY_API_TOKEN}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch DNS records: ${response.statusText}`)
  }

  const records = await response.json()

  console.log(`📋 Found ${records.length} DNS records:\n`)

  // Filter for notifications subdomain
  const notificationRecords = records.filter((r: any) =>
    r.hostname?.includes('notifications') || r.value?.includes('resend')
  )

  if (notificationRecords.length > 0) {
    console.log('🔔 Email-related records (notifications.claimclarityai.com):')
    notificationRecords.forEach((record: any) => {
      console.log(`   ${record.type} ${record.hostname || '@'} → ${record.value.substring(0, 60)}${record.value.length > 60 ? '...' : ''}`)
    })
    console.log('')
  }

  // Show all records
  console.log('📋 All DNS records:')
  records.forEach((record: any) => {
    const hostname = record.hostname || '@'
    const value = record.value.length > 50 ? record.value.substring(0, 50) + '...' : record.value
    console.log(`   ${record.type.padEnd(6)} ${hostname.padEnd(40)} → ${value}`)
  })
}

main().catch(console.error)
