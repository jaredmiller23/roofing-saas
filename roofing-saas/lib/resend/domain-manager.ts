/**
 * Resend Domain Management
 * Handles domain verification and DNS record retrieval via Resend API
 */

import { resendClient } from './client'
import { logger } from '@/lib/logger'
import { Resend } from 'resend'

export interface DomainRecord {
  record: string // SPF, DKIM, etc.
  name: string
  type: string // TXT, CNAME, MX
  value: string
  status: string
  ttl?: string
  priority?: number
}

export interface ResendDomain {
  id: string
  name: string
  status: 'not_started' | 'pending' | 'verified' | 'failed' | 'temporary_failure'
  created_at: string
  region: string
  records: DomainRecord[]
}

export interface DomainCheckResult {
  exists: boolean
  domain?: ResendDomain
  requiresSetup: boolean
  missingRecords?: DomainRecord[]
}

/**
 * Check if a domain exists in Resend and its verification status
 */
export async function checkDomain(domainName: string): Promise<DomainCheckResult> {
  // Check for API key directly in case client wasn't initialized yet
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not set in environment')
  }

  // Reinitialize client if needed
  const client = resendClient || new Resend(process.env.RESEND_API_KEY)

  logger.info('Checking domain in Resend', { domainName })

  try {
    // List all domains to find ours
    const { data: domains, error } = await client.domains.list()

    if (error) {
      throw new Error(`Failed to list domains: ${error.message}`)
    }

    const domain = domains?.data?.find((d: any) => d.name === domainName)

    if (!domain) {
      logger.info('Domain not found in Resend', { domainName })
      return {
        exists: false,
        requiresSetup: true,
      }
    }

    // Get detailed domain info
    const { data: domainDetails, error: detailsError } = await client.domains.get(domain.id)

    if (detailsError) {
      throw new Error(`Failed to get domain details: ${detailsError.message}`)
    }

    const isVerified = domainDetails.status === 'verified'
    const missingRecords = domainDetails.records?.filter(
      (r: DomainRecord) => r.status !== 'verified'
    ) || []

    logger.info('Domain found in Resend', {
      domainName,
      status: domainDetails.status,
      verified: isVerified,
      missingRecords: missingRecords.length,
    })

    return {
      exists: true,
      domain: domainDetails,
      requiresSetup: !isVerified,
      missingRecords: missingRecords.length > 0 ? missingRecords : undefined,
    }
  } catch (error) {
    logger.error('Failed to check domain', { error, domainName })
    throw error
  }
}

/**
 * Add a domain to Resend
 */
export async function addDomain(domainName: string, region: 'us-east-1' | 'eu-west-1' | 'sa-east-1' = 'us-east-1'): Promise<ResendDomain> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not set in environment')
  }

  const client = resendClient || new Resend(process.env.RESEND_API_KEY)

  logger.info('Adding domain to Resend', { domainName, region })

  try {
    const { data, error } = await client.domains.create({
      name: domainName,
      region,
    })

    if (error) {
      throw new Error(`Failed to add domain: ${error.message}`)
    }

    logger.info('Domain added successfully', {
      domainName,
      id: data.id,
      status: data.status,
    })

    return data as ResendDomain
  } catch (error) {
    logger.error('Failed to add domain', { error, domainName })
    throw error
  }
}

/**
 * Get DNS records required for domain verification
 */
export async function getRequiredDnsRecords(domainName: string): Promise<DomainRecord[]> {
  const result = await checkDomain(domainName)

  if (!result.exists) {
    throw new Error(`Domain ${domainName} not found in Resend. Add it first.`)
  }

  if (!result.domain) {
    throw new Error('Domain data not available')
  }

  return result.domain.records || []
}

/**
 * Verify domain (trigger DNS check)
 */
export async function verifyDomain(domainId: string): Promise<{ success: boolean }> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not set in environment')
  }

  const client = resendClient || new Resend(process.env.RESEND_API_KEY)

  logger.info('Triggering domain verification', { domainId })

  try {
    const { data, error } = await client.domains.verify(domainId)

    if (error) {
      throw new Error(`Failed to verify domain: ${error.message}`)
    }

    logger.info('Domain verification triggered', {
      domainId,
      data,
    })

    return { success: true }
  } catch (error) {
    logger.error('Failed to verify domain', { error, domainId })
    throw error
  }
}

/**
 * Format DNS records for display
 */
export function formatDnsRecordsForNetlify(records: DomainRecord[]): Array<{
  type: string
  name: string
  value: string
  ttl: number
  priority?: number
}> {
  return records.map((record) => ({
    type: record.type,
    name: record.name,
    value: record.value,
    ttl: record.ttl ? parseInt(record.ttl) : 3600,
    priority: record.priority,
  }))
}

/**
 * Get domain status summary for admin display
 */
export async function getDomainStatusSummary(domainName: string) {
  const result = await checkDomain(domainName)

  return {
    domainName,
    configured: result.exists,
    verified: result.exists && result.domain?.status === 'verified',
    status: result.domain?.status || 'not_configured',
    recordsCount: result.domain?.records?.length || 0,
    verifiedRecordsCount:
      result.domain?.records?.filter((r) => r.status === 'verified').length || 0,
    pendingRecordsCount:
      result.domain?.records?.filter((r) => r.status !== 'verified').length || 0,
    records: result.domain?.records || [],
  }
}
