import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { NextRequest } from 'next/server'
import {
  mapZodError,
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { hashPhoneNumber } from '@/lib/compliance'
import { formatPhoneNumber, isValidPhoneNumber } from '@/lib/twilio/voice'
import { z } from 'zod'

const importSchema = z.object({
  source: z.enum(['federal', 'state_tn', 'internal']),
  numbers: z
    .array(z.string())
    .min(1, 'At least one phone number is required')
    .max(10000, 'Maximum 10,000 numbers per import'),
  reason: z.string().optional(),
})

/**
 * POST /api/compliance/dnc/import
 * Import phone numbers into DNC registry
 * Body: { source: 'federal' | 'state_tn' | 'internal', numbers: string[], reason?: string }
 */
export const POST = withAuth(async (request: NextRequest, { userId, tenantId }) => {
  const startTime = Date.now()

  try {
    logger.apiRequest('POST', '/api/compliance/dnc/import', {
      tenantId,
      userId,
    })

    const body = await request.json()

    // Validate input
    const validatedData = importSchema.safeParse(body)
    if (!validatedData.success) {
      throw mapZodError(validatedData.error)
    }

    const { source, numbers, reason } = validatedData.data

    const supabase = await createClient()

    // Process each phone number
    const results = {
      total: numbers.length,
      new: 0,
      updated: 0,
      invalid: 0,
      errors: [] as Array<{ number: string; error: string }>,
    }

    for (const phoneNumber of numbers) {
      try {
        // Format and validate
        const formattedPhone = formatPhoneNumber(phoneNumber)
        if (!isValidPhoneNumber(formattedPhone)) {
          results.invalid++
          results.errors.push({
            number: phoneNumber,
            error: 'Invalid phone number format',
          })
          continue
        }

        const phone_hash = hashPhoneNumber(formattedPhone)

        // Extract area code
        const areaCode = formattedPhone.replace(/^\+1(\d{3}).*$/, '$1')

        // Check if already exists
        const { data: existing } = await supabase
          .from('dnc_registry')
          .select('id, is_active')
          .eq('tenant_id', tenantId)
          .eq('phone_number', phone_hash)
          .eq('source', source)
          .maybeSingle()

        if (existing) {
          if (!existing.is_active) {
            // Restore inactive entry
            const { error: updateError } = await supabase
              .from('dnc_registry')
              .update({
                is_active: true,
                listed_date: new Date().toISOString().split('T')[0],
                metadata: reason ? { reason } : null,
              })
              .eq('id', existing.id)

            if (updateError) {
              results.errors.push({
                number: formattedPhone,
                error: updateError.message,
              })
            } else {
              results.updated++
            }
          } else {
            // Already exists and active - count as updated
            results.updated++
          }
        } else {
          // Insert new entry
          const { error: insertError } = await supabase.from('dnc_registry').insert({
            tenant_id: tenantId,
            phone_number: formattedPhone,
            phone_hash,
            source,
            area_code: areaCode.length === 3 ? areaCode : null,
            listed_date: new Date().toISOString().split('T')[0],
            metadata: reason ? { reason } : null,
          })

          if (insertError) {
            // Check for unique constraint violation
            if (insertError.code === '23505') {
              results.updated++
            } else {
              results.errors.push({
                number: formattedPhone,
                error: insertError.message,
              })
            }
          } else {
            results.new++
          }
        }
      } catch (error) {
        results.errors.push({
          number: phoneNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Log import to dnc_imports table
    const { error: importLogError } = await supabase.from('dnc_imports').insert({
      tenant_id: tenantId,
      file_name: source,
      records_total: results.total,
      records_imported: results.new,
      records_failed: results.invalid + results.errors.length,
      imported_by: userId,
    })

    if (importLogError) {
      logger.error('Error logging DNC import', { error: importLogError })
    }

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/compliance/dnc/import', 200, duration)

    return successResponse({
      message: 'DNC import completed',
      results: {
        total: results.total,
        new: results.new,
        updated: results.updated,
        invalid: results.invalid,
        errors: results.errors,
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('DNC import error', { error, duration })
    return errorResponse(error as Error)
  }
})
