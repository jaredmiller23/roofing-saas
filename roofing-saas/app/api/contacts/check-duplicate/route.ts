import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  AuthenticationError,
  AuthorizationError,
  mapSupabaseError,
  mapZodError,
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import type { Contact } from '@/lib/types/contact'

// Schema for duplicate check request
const checkDuplicateSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  address_street: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  address_zip: z.string().optional(),
})

type DuplicateMatch = {
  contact: Contact
  match_reason: string[]
  confidence: 'high' | 'medium' | 'low'
}

type DuplicateCheckResponse = {
  has_duplicates: boolean
  matches: DuplicateMatch[]
}

/**
 * Normalize phone number for comparison
 * Removes all non-digit characters
 */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

/**
 * Check if two addresses are potentially the same
 */
function addressMatch(
  addr1: { street?: string; city?: string; state?: string; zip?: string },
  addr2: { street?: string; city?: string; state?: string; zip?: string }
): boolean {
  // Must have at least street and city or zip to compare
  if ((!addr1.street || !addr1.city) && !addr1.zip) return false
  if ((!addr2.street || !addr2.city) && !addr2.zip) return false

  // Check ZIP first (strongest address indicator)
  if (addr1.zip && addr2.zip && addr1.zip === addr2.zip) {
    return true
  }

  // Check street and city combination
  if (addr1.street && addr1.city && addr2.street && addr2.city) {
    const street1 = addr1.street.toLowerCase().trim()
    const city1 = addr1.city.toLowerCase().trim()
    const street2 = addr2.street.toLowerCase().trim()
    const city2 = addr2.city.toLowerCase().trim()

    return street1 === street2 && city1 === city2
  }

  return false
}

/**
 * POST /api/contacts/check-duplicate
 * Check for potential duplicate contacts
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('User not authenticated')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User is not associated with a tenant')
    }

    logger.apiRequest('POST', '/api/contacts/check-duplicate', { tenantId, userId: user.id })

    const body = await request.json()

    // Validate input
    const validatedData = checkDuplicateSchema.safeParse(body)
    if (!validatedData.success) {
      throw mapZodError(validatedData.error)
    }

    const data = validatedData.data
    const supabase = await createClient()

    // Build array to store all potential matches
    const potentialMatches: DuplicateMatch[] = []

    // 1. Check for exact email match (if email provided)
    if (data.email) {
      const { data: emailMatches, error: emailError } = await supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_deleted', false)
        .ilike('email', data.email)

      if (emailError) {
        throw mapSupabaseError(emailError)
      }

      if (emailMatches && emailMatches.length > 0) {
        emailMatches.forEach(contact => {
          potentialMatches.push({
            contact: contact as unknown as Contact,
            match_reason: ['Email address'],
            confidence: 'high'
          })
        })
      }
    }

    // 2. Check for phone number match (if phone provided)
    if (data.phone) {
      const normalizedPhone = normalizePhone(data.phone)

      // Get all contacts with phone numbers for comparison
      const { data: allContacts, error: phoneError } = await supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_deleted', false)
        .or(`phone.neq.null,mobile_phone.neq.null`)

      if (phoneError) {
        throw mapSupabaseError(phoneError)
      }

      if (allContacts && allContacts.length > 0) {
        allContacts.forEach(contact => {
          const phoneMatch = contact.phone && normalizePhone(contact.phone) === normalizedPhone
          const mobileMatch = contact.mobile_phone && normalizePhone(contact.mobile_phone) === normalizedPhone

          if (phoneMatch || mobileMatch) {
            // Check if this contact is already in matches (from email)
            const existingMatch = potentialMatches.find(match => match.contact.id === contact.id)
            if (existingMatch) {
              // Add phone to existing match reasons
              existingMatch.match_reason.push(phoneMatch ? 'Phone number' : 'Mobile phone number')
              existingMatch.confidence = 'high' // Email + Phone = high confidence
            } else {
              potentialMatches.push({
                contact: contact as unknown as Contact,
                match_reason: [phoneMatch ? 'Phone number' : 'Mobile phone number'],
                confidence: 'high'
              })
            }
          }
        })
      }
    }

    // 3. Check for name + address combination match
    if (data.first_name && data.last_name && (data.address_street || data.address_zip)) {
      const firstName = data.first_name.toLowerCase().trim()
      const lastName = data.last_name.toLowerCase().trim()

      const { data: nameMatches, error: nameError } = await supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_deleted', false)
        .ilike('first_name', firstName)
        .ilike('last_name', lastName)

      if (nameError) {
        throw mapSupabaseError(nameError)
      }

      if (nameMatches && nameMatches.length > 0) {
        nameMatches.forEach(contact => {
          // Check if addresses match
          const addressMatches = addressMatch(
            {
              street: data.address_street,
              city: data.address_city,
              state: data.address_state,
              zip: data.address_zip,
            },
            {
              street: contact.address_street || undefined,
              city: contact.address_city || undefined,
              state: contact.address_state || undefined,
              zip: contact.address_zip || undefined,
            }
          )

          if (addressMatches) {
            // Check if this contact is already in matches
            const existingMatch = potentialMatches.find(match => match.contact.id === contact.id)
            if (existingMatch) {
              // Add name+address to existing match reasons
              existingMatch.match_reason.push('Name and address')
              // Keep existing confidence or upgrade to high
              if (existingMatch.confidence !== 'high') {
                existingMatch.confidence = 'medium'
              }
            } else {
              potentialMatches.push({
                contact: contact as unknown as Contact,
                match_reason: ['Name and address'],
                confidence: 'medium'
              })
            }
          }
        })
      }
    }

    // Sort matches by confidence (high first) and then by creation date (newest first)
    potentialMatches.sort((a, b) => {
      const confidenceOrder = { high: 3, medium: 2, low: 1 }
      const confidenceDiff = confidenceOrder[b.confidence] - confidenceOrder[a.confidence]

      if (confidenceDiff !== 0) {
        return confidenceDiff
      }

      // If same confidence, sort by creation date (newest first)
      return new Date(b.contact.created_at).getTime() - new Date(a.contact.created_at).getTime()
    })

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/contacts/check-duplicate', 200, duration)

    const response: DuplicateCheckResponse = {
      has_duplicates: potentialMatches.length > 0,
      matches: potentialMatches
    }

    return successResponse(response)

  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Check duplicate error', { error, duration })
    return errorResponse(error as Error)
  }
}