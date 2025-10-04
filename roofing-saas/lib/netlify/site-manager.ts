/**
 * Netlify Site Management
 * Handles site, domain, and SSL certificate management via Netlify API
 */

import { logger } from '@/lib/logger'

const NETLIFY_API_BASE = 'https://api.netlify.com/api/v1'

export interface NetlifySite {
  id: string
  name: string
  custom_domain?: string
  url: string
  ssl_url?: string
  admin_url: string
  ssl?: boolean
  force_ssl?: boolean
  domain_aliases?: string[]
  created_at: string
  updated_at: string
  state?: string
}

export interface NetlifySiteDomain {
  id: string
  site_id: string
  hostname: string
  ssl?: boolean
  verified?: boolean
  created_at: string
}

/**
 * Get all sites for the authenticated account
 */
export async function getSites(apiToken: string): Promise<NetlifySite[]> {
  logger.info('Fetching Netlify sites')

  try {
    const response = await fetch(`${NETLIFY_API_BASE}/sites`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to fetch sites: ${response.status} - ${error}`)
    }

    const sites = await response.json()
    logger.info('Sites fetched', { count: sites.length })
    return sites
  } catch (error) {
    logger.error('Failed to fetch sites', { error })
    throw error
  }
}

/**
 * Get a specific site by ID
 */
export async function getSite(apiToken: string, siteId: string): Promise<NetlifySite> {
  logger.info('Fetching Netlify site', { siteId })

  try {
    const response = await fetch(`${NETLIFY_API_BASE}/sites/${siteId}`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to fetch site: ${response.status} - ${error}`)
    }

    const site = await response.json()
    logger.info('Site fetched', { siteId, name: site.name })
    return site
  } catch (error) {
    logger.error('Failed to fetch site', { error, siteId })
    throw error
  }
}

/**
 * Find site by custom domain
 */
export async function findSiteByDomain(
  apiToken: string,
  domain: string
): Promise<NetlifySite | null> {
  const sites = await getSites(apiToken)

  const site = sites.find(
    (s) =>
      s.custom_domain === domain ||
      s.domain_aliases?.includes(domain) ||
      s.url.includes(domain)
  )

  if (!site) {
    logger.warn('Site not found for domain', { domain })
    return null
  }

  logger.info('Site found for domain', { domain, siteId: site.id, name: site.name })
  return site
}

/**
 * Update site configuration
 */
export async function updateSite(
  apiToken: string,
  siteId: string,
  updates: Partial<{
    name: string
    custom_domain: string
    force_ssl: boolean
    domain_aliases: string[]
  }>
): Promise<NetlifySite> {
  logger.info('Updating Netlify site', { siteId, updates })

  try {
    const response = await fetch(`${NETLIFY_API_BASE}/sites/${siteId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to update site: ${response.status} - ${error}`)
    }

    const site = await response.json()
    logger.info('Site updated successfully', { siteId })
    return site
  } catch (error) {
    logger.error('Failed to update site', { error, siteId })
    throw error
  }
}

/**
 * Provision SSL certificate for a site
 */
export async function provisionSSL(apiToken: string, siteId: string): Promise<void> {
  logger.info('Provisioning SSL certificate', { siteId })

  try {
    const response = await fetch(`${NETLIFY_API_BASE}/sites/${siteId}/ssl`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to provision SSL: ${response.status} - ${error}`)
    }

    logger.info('SSL certificate provisioned', { siteId })
  } catch (error) {
    logger.error('Failed to provision SSL', { error, siteId })
    throw error
  }
}

/**
 * Get DNS records and check if they point to Netlify
 */
export async function checkDomainPointing(
  apiToken: string,
  domain: string,
  zoneId: string
): Promise<{
  pointsToNetlify: boolean
  currentRecords: Array<{ type: string; value: string; hostname: string }>
  expectedRecords: Array<{ type: string; value: string; hostname: string }>
  issues: string[]
}> {
  const { getDnsRecords } = await import('./dns-manager')

  logger.info('Checking if domain points to Netlify', { domain })

  const issues: string[] = []
  const currentRecords = await getDnsRecords(apiToken, zoneId)

  // Extract base domain and subdomain
  const parts = domain.split('.')
  const isSubdomain = parts.length > 2
  const subdomain = isSubdomain ? parts.slice(0, -2).join('.') : ''

  // Find relevant DNS records
  const relevantRecords = currentRecords.filter((record) => {
    if (subdomain) {
      return record.hostname === subdomain
    } else {
      return record.hostname === '' || record.hostname === '@'
    }
  })

  // Expected Netlify records
  const expectedRecords = [
    {
      type: 'A',
      value: '75.2.60.5', // Netlify's load balancer IP
      hostname: subdomain || '@',
    },
  ]

  // Check for CNAME pointing to Netlify
  const cnameRecord = relevantRecords.find((r) => r.type === 'CNAME')
  if (cnameRecord && cnameRecord.value.includes('.netlify.app')) {
    return {
      pointsToNetlify: true,
      currentRecords: relevantRecords,
      expectedRecords,
      issues: [],
    }
  }

  // Check for A record pointing to Netlify
  const aRecord = relevantRecords.find((r) => r.type === 'A')
  if (aRecord && aRecord.value === '75.2.60.5') {
    return {
      pointsToNetlify: true,
      currentRecords: relevantRecords,
      expectedRecords,
      issues: [],
    }
  }

  // Domain doesn't point to Netlify
  issues.push('Domain does not have A or CNAME record pointing to Netlify')

  if (aRecord) {
    issues.push(`A record points to ${aRecord.value} instead of 75.2.60.5`)
  }

  if (cnameRecord) {
    issues.push(`CNAME points to ${cnameRecord.value} instead of *.netlify.app`)
  }

  if (!aRecord && !cnameRecord) {
    issues.push('No A or CNAME record found for domain')
  }

  return {
    pointsToNetlify: false,
    currentRecords: relevantRecords,
    expectedRecords,
    issues,
  }
}
