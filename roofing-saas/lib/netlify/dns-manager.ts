/**
 * Netlify DNS Management
 * Handles DNS zone and record management via Netlify API
 */

import { logger } from '@/lib/logger'

const NETLIFY_API_BASE = 'https://api.netlify.com/api/v1'

export interface NetlifyDnsRecord {
  id?: string
  hostname: string
  type: string
  value: string
  ttl?: number
  priority?: number
  flag?: number
  tag?: string
}

export interface NetlifyDnsZone {
  id: string
  name: string
  records?: NetlifyDnsRecord[]
}

/**
 * Get all DNS zones for the authenticated account
 */
export async function getDnsZones(apiToken: string): Promise<NetlifyDnsZone[]> {
  logger.info('Fetching DNS zones from Netlify')

  try {
    const response = await fetch(`${NETLIFY_API_BASE}/dns_zones`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to fetch DNS zones: ${response.status} - ${error}`)
    }

    const zones = await response.json()
    logger.info('DNS zones fetched', { count: zones.length })
    return zones
  } catch (error) {
    logger.error('Failed to fetch DNS zones', { error })
    throw error
  }
}

/**
 * Find DNS zone by domain name
 */
export async function findDnsZone(
  apiToken: string,
  domainName: string
): Promise<NetlifyDnsZone | null> {
  const zones = await getDnsZones(apiToken)

  // Extract base domain from subdomain (e.g., notifications.claimclarityai.com -> claimclarityai.com)
  const parts = domainName.split('.')
  const baseDomain = parts.slice(-2).join('.')

  const zone = zones.find((z) => z.name === baseDomain)

  if (!zone) {
    logger.warn('DNS zone not found', { domainName, baseDomain })
    return null
  }

  logger.info('DNS zone found', { zoneId: zone.id, zoneName: zone.name })
  return zone
}

/**
 * Get DNS records for a zone
 */
export async function getDnsRecords(
  apiToken: string,
  zoneId: string
): Promise<NetlifyDnsRecord[]> {
  logger.info('Fetching DNS records', { zoneId })

  try {
    const response = await fetch(`${NETLIFY_API_BASE}/dns_zones/${zoneId}/dns_records`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to fetch DNS records: ${response.status} - ${error}`)
    }

    const records = await response.json()
    logger.info('DNS records fetched', { count: records.length })
    return records
  } catch (error) {
    logger.error('Failed to fetch DNS records', { error, zoneId })
    throw error
  }
}

/**
 * Create a DNS record
 */
export async function createDnsRecord(
  apiToken: string,
  zoneId: string,
  record: Omit<NetlifyDnsRecord, 'id'>
): Promise<NetlifyDnsRecord> {
  logger.info('Creating DNS record', { zoneId, type: record.type, hostname: record.hostname })

  try {
    const response = await fetch(`${NETLIFY_API_BASE}/dns_zones/${zoneId}/dns_records`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(record),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to create DNS record: ${response.status} - ${error}`)
    }

    const createdRecord = await response.json()
    logger.info('DNS record created', {
      recordId: createdRecord.id,
      type: record.type,
      hostname: record.hostname,
    })
    return createdRecord
  } catch (error) {
    logger.error('Failed to create DNS record', { error, record })
    throw error
  }
}

/**
 * Delete a DNS record
 */
export async function deleteDnsRecord(
  apiToken: string,
  zoneId: string,
  recordId: string
): Promise<void> {
  logger.info('Deleting DNS record', { zoneId, recordId })

  try {
    const response = await fetch(
      `${NETLIFY_API_BASE}/dns_zones/${zoneId}/dns_records/${recordId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to delete DNS record: ${response.status} - ${error}`)
    }

    logger.info('DNS record deleted', { recordId })
  } catch (error) {
    logger.error('Failed to delete DNS record', { error, recordId })
    throw error
  }
}

/**
 * Check if a DNS record already exists
 */
export async function recordExists(
  apiToken: string,
  zoneId: string,
  hostname: string,
  type: string
): Promise<NetlifyDnsRecord | null> {
  const records = await getDnsRecords(apiToken, zoneId)
  const existing = records.find((r) => r.hostname === hostname && r.type === type)
  return existing || null
}

/**
 * Add or update a DNS record (idempotent)
 */
export async function upsertDnsRecord(
  apiToken: string,
  zoneId: string,
  record: Omit<NetlifyDnsRecord, 'id'>
): Promise<NetlifyDnsRecord> {
  const existing = await recordExists(apiToken, zoneId, record.hostname, record.type)

  if (existing) {
    // Check if value is the same
    if (existing.value === record.value) {
      logger.info('DNS record already exists with same value', {
        hostname: record.hostname,
        type: record.type,
      })
      return existing
    }

    // Delete old record and create new one
    logger.info('Updating DNS record (delete + create)', {
      hostname: record.hostname,
      type: record.type,
    })
    await deleteDnsRecord(apiToken, zoneId, existing.id!)
  }

  return createDnsRecord(apiToken, zoneId, record)
}

/**
 * Add multiple DNS records
 */
export async function addMultipleDnsRecords(
  apiToken: string,
  zoneId: string,
  records: Array<Omit<NetlifyDnsRecord, 'id'>>
): Promise<NetlifyDnsRecord[]> {
  logger.info('Adding multiple DNS records', { count: records.length })

  const results: NetlifyDnsRecord[] = []

  for (const record of records) {
    try {
      const created = await upsertDnsRecord(apiToken, zoneId, record)
      results.push(created)
    } catch (error) {
      logger.error('Failed to add DNS record, continuing...', { error, record })
    }
  }

  logger.info('Finished adding DNS records', {
    total: records.length,
    successful: results.length,
  })

  return results
}

/**
 * Convert Resend DNS record format to Netlify format
 */
export function convertResendToNetlifyRecord(
  resendRecord: {
    type: string
    name: string
    value: string
    ttl?: number
    priority?: number
  },
  baseDomain: string
): Omit<NetlifyDnsRecord, 'id'> {
  // Resend gives full hostname, Netlify needs it relative to zone
  // e.g., if zone is "claimclarityai.com" and name is "notifications.claimclarityai.com"
  // we need just "notifications"

  let hostname = resendRecord.name

  // If the name ends with the base domain, extract the subdomain part
  if (hostname.endsWith(`.${baseDomain}`)) {
    hostname = hostname.substring(0, hostname.length - baseDomain.length - 1)
  } else if (hostname === baseDomain) {
    hostname = '' // Root domain
  }

  return {
    hostname,
    type: resendRecord.type,
    value: resendRecord.value,
    ttl: resendRecord.ttl || 3600,
    priority: resendRecord.priority,
  }
}
