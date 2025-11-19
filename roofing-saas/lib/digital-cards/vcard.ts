// =============================================
// Digital Cards - vCard Generation Utility
// =============================================
// Purpose: Generate vCard (.vcf) files from business card data
// Spec: vCard 4.0 (RFC 6350)
// Author: Claude Code
// Date: 2025-11-18
// =============================================

import type { VCardData, DigitalBusinessCard, PublicCardData } from './types'

// =============================================
// Helper Functions
// =============================================

/**
 * Escape special characters for vCard format
 */
function escapeVCard(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n')
}

/**
 * Format vCard line with proper folding (max 75 characters per line)
 */
function formatVCardLine(line: string): string {
  if (line.length <= 75) return line

  const lines: string[] = []
  let remaining = line

  // First line can be 75 characters
  lines.push(remaining.substring(0, 75))
  remaining = remaining.substring(75)

  // Continuation lines start with space and can be 74 characters
  while (remaining.length > 0) {
    lines.push(' ' + remaining.substring(0, 74))
    remaining = remaining.substring(74)
  }

  return lines.join('\r\n')
}

/**
 * Add a vCard property with proper formatting
 */
function addVCardProperty(
  property: string,
  value: string | null | undefined,
  params: string = ''
): string {
  if (!value) return ''

  const escapedValue = escapeVCard(value)
  const line = params ? `${property};${params}:${escapedValue}` : `${property}:${escapedValue}`

  return formatVCardLine(line) + '\r\n'
}

// =============================================
// Main vCard Generation Function
// =============================================

/**
 * Generate vCard content from business card data
 */
export function generateVCard(data: VCardData): string {
  let vcard = 'BEGIN:VCARD\r\n'
  vcard += 'VERSION:4.0\r\n'

  // Full Name (required)
  vcard += addVCardProperty('FN', data.fullName)

  // Structured Name (FamilyName;GivenName;AdditionalNames;Prefixes;Suffixes)
  const nameParts = [data.lastName || '', data.firstName || '', '', '', '']
  vcard += `N:${nameParts.map(escapeVCard).join(';')}\r\n`

  // Title/Job Role
  if (data.title) {
    vcard += addVCardProperty('TITLE', data.title)
  }

  // Organization
  if (data.organization) {
    vcard += addVCardProperty('ORG', data.organization)
  }

  // Email
  if (data.email) {
    vcard += addVCardProperty('EMAIL', data.email, 'TYPE=work')
  }

  // Phone
  if (data.phone) {
    // Remove non-numeric characters for better compatibility
    const cleanPhone = data.phone.replace(/[^\d+]/g, '')
    vcard += addVCardProperty('TEL', cleanPhone, 'TYPE=work,voice')
  }

  // Website/URL
  if (data.website) {
    vcard += addVCardProperty('URL', data.website, 'TYPE=work')
  }

  // Address (structured: POBox;ExtendedAddress;Street;City;State;PostalCode;Country)
  if (data.address) {
    const addressParts = ['', '', escapeVCard(data.address), '', '', '', '']
    vcard += `ADR;TYPE=work:${addressParts.join(';')}\r\n`
  }

  // Photo (URL)
  if (data.photo) {
    vcard += addVCardProperty('PHOTO', data.photo, 'MEDIATYPE=image/jpeg')
  }

  // Note
  if (data.note) {
    vcard += addVCardProperty('NOTE', data.note)
  }

  // Social Media profiles (using X- prefix for custom fields)
  if (data.socialProfiles?.linkedin) {
    vcard += addVCardProperty('X-SOCIALPROFILE', data.socialProfiles.linkedin, 'TYPE=linkedin')
  }

  if (data.socialProfiles?.facebook) {
    vcard += addVCardProperty('X-SOCIALPROFILE', data.socialProfiles.facebook, 'TYPE=facebook')
  }

  if (data.socialProfiles?.instagram) {
    vcard += addVCardProperty('X-SOCIALPROFILE', data.socialProfiles.instagram, 'TYPE=instagram')
  }

  if (data.socialProfiles?.twitter) {
    vcard += addVCardProperty('X-SOCIALPROFILE', data.socialProfiles.twitter, 'TYPE=twitter')
  }

  // Timestamp
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  vcard += `REV:${now}\r\n`

  vcard += 'END:VCARD\r\n'

  return vcard
}

/**
 * Generate vCard from DigitalBusinessCard object
 */
export function generateVCardFromBusinessCard(card: DigitalBusinessCard | PublicCardData): string {
  const nameParts = card.full_name.split(' ')
  const firstName = nameParts[0] || ''
  const lastName = nameParts.slice(1).join(' ') || ''

  const vCardData: VCardData = {
    firstName,
    lastName,
    fullName: card.full_name,
    title: card.job_title || undefined,
    organization: card.company_name || undefined,
    email: card.email || undefined,
    phone: card.phone || undefined,
    website: card.company_website || undefined,
    address: card.company_address || undefined,
    photo: card.profile_photo_url || undefined,
    note: card.bio || undefined,
    socialProfiles: {
      linkedin: card.linkedin_url || undefined,
      facebook: card.facebook_url || undefined,
      instagram: card.instagram_url || undefined,
      twitter: card.twitter_url || undefined,
    },
  }

  return generateVCard(vCardData)
}

/**
 * Create a downloadable vCard file blob
 */
export function createVCardBlob(vCardContent: string): Blob {
  return new Blob([vCardContent], { type: 'text/vcard;charset=utf-8' })
}

/**
 * Trigger vCard download in browser
 */
export function downloadVCard(card: DigitalBusinessCard | PublicCardData, filename?: string): void {
  const vCardContent = generateVCardFromBusinessCard(card)
  const blob = createVCardBlob(vCardContent)

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename || `${card.full_name.replace(/\s+/g, '_')}.vcf`

  document.body.appendChild(link)
  link.click()

  // Cleanup
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Generate vCard data URL (for QR codes, etc.)
 */
export function generateVCardDataURL(card: DigitalBusinessCard | PublicCardData): string {
  const vCardContent = generateVCardFromBusinessCard(card)
  const blob = createVCardBlob(vCardContent)

  return URL.createObjectURL(blob)
}

// =============================================
// Server-side vCard Generation (for API routes)
// =============================================

/**
 * Generate vCard Response for API routes
 */
export function createVCardResponse(card: DigitalBusinessCard | PublicCardData): Response {
  const vCardContent = generateVCardFromBusinessCard(card)
  const filename = `${card.full_name.replace(/\s+/g, '_')}.vcf`

  return new Response(vCardContent, {
    headers: {
      'Content-Type': 'text/vcard;charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
