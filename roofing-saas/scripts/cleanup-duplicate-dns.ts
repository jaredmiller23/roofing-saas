#!/usr/bin/env tsx
/**
 * Clean Up Duplicate DNS Records
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })

import { findDnsZone } from '../lib/netlify/dns-manager'

const NETLIFY_API_TOKEN = process.env.NETLIFY_API_TOKEN
const DOMAIN = 'claimclarityai.com'

interface DnsRecord {
  id: string
  hostname: string
  type: string
  value: string
  ttl?: number
  priority?: number
}

async function main() {
  if (!NETLIFY_API_TOKEN) {
    throw new Error('NETLIFY_API_TOKEN not set')
  }

  console.log('🔍 Finding duplicate DNS records...\n')

  const zone = await findDnsZone(NETLIFY_API_TOKEN, DOMAIN)
  if (!zone) {
    throw new Error('DNS zone not found')
  }

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

  const allRecords: DnsRecord[] = await response.json()

  // Focus on email-related records
  const emailRecords = allRecords.filter((r) =>
    r.hostname?.includes('notifications') || r.hostname?.includes('resend')
  )

  console.log(`📋 Found ${emailRecords.length} email-related DNS records\n`)

  // Group by unique signature
  const grouped = new Map<string, DnsRecord[]>()

  emailRecords.forEach((record) => {
    const signature = `${record.type}:${record.hostname}:${record.value}`
    if (!grouped.has(signature)) {
      grouped.set(signature, [])
    }
    grouped.get(signature)!.push(record)
  })

  console.log('Grouped records:')
  let duplicatesFound = 0

  for (const [signature, records] of grouped.entries()) {
    const [type, hostname, value] = signature.split(':')
    console.log(`\n${type} ${hostname}`)
    console.log(`  Value: ${value.substring(0, 60)}${value.length > 60 ? '...' : ''}`)
    console.log(`  Count: ${records.length}`)

    if (records.length > 1) {
      duplicatesFound += records.length - 1
      console.log(`  ⚠️  ${records.length - 1} duplicate(s) found!`)
      console.log(`  IDs to delete: ${records.slice(1).map(r => r.id).join(', ')}`)
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`  Total email records: ${emailRecords.length}`)
  console.log(`  Unique records: ${grouped.size}`)
  console.log(`  Duplicates to delete: ${duplicatesFound}`)

  if (duplicatesFound === 0) {
    console.log('\n✅ No duplicates found!')
    return
  }

  // Delete duplicates
  console.log(`\n🗑️  Deleting ${duplicatesFound} duplicate records...`)

  let deletedCount = 0

  for (const [signature, records] of grouped.entries()) {
    if (records.length > 1) {
      // Keep first, delete rest
      for (let i = 1; i < records.length; i++) {
        const recordToDelete = records[i]

        console.log(`  Deleting: ${recordToDelete.type} ${recordToDelete.hostname} (${recordToDelete.id})`)

        const deleteResponse = await fetch(
          `https://api.netlify.com/api/v1/dns_zones/${zone.id}/dns_records/${recordToDelete.id}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${NETLIFY_API_TOKEN}`,
            },
          }
        )

        if (!deleteResponse.ok) {
          console.log(`  ❌ Failed: ${deleteResponse.statusText}`)
        } else {
          console.log(`  ✅ Deleted`)
          deletedCount++
        }

        // Rate limiting: wait 100ms between deletes
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }

  console.log(`\n✅ Cleanup complete! Deleted ${deletedCount} duplicate records.`)
}

main().catch(console.error)
