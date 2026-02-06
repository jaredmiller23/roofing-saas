import { createClient } from '@/lib/supabase/server'
import { withAuthParams } from '@/lib/auth/with-auth'
import { ValidationError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/**
 * GET /api/messages/[contactId]
 * Get all SMS messages for a specific contact
 *
 * Features:
 * - Returns all SMS messages in chronological order
 * - Automatically marks inbound messages as read
 * - Tenant-isolated (only shows messages for user's org)
 */
export const GET = withAuthParams(async (request, { userId, tenantId }, { params }) => {
  const startTime = Date.now()

  try {
    const { contactId } = await params

    // Validate contactId is a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(contactId)) {
      throw ValidationError('Invalid contact ID format')
    }

    logger.apiRequest('GET', `/api/messages/${contactId}`, { tenantId, userId, contactId })

    const supabase = await createClient()

    // Fetch all SMS messages for this contact
    const { data: messages, error: fetchError } = await supabase
      .from('activities')
      .select('id, content, direction, created_at, from_address, to_address, read_at')
      .eq('tenant_id', tenantId)
      .eq('contact_id', contactId)
      .eq('type', 'sms')
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    if (fetchError) {
      logger.error('Failed to fetch messages', { error: fetchError, contactId, tenantId })
      throw new Error(`Failed to fetch messages: ${fetchError.message}`)
    }

    // Mark all unread inbound messages as read
    const { error: updateError } = await supabase
      .from('activities')
      .update({
        read_at: new Date().toISOString(),
        read_by: userId,
      })
      .eq('tenant_id', tenantId)
      .eq('contact_id', contactId)
      .eq('type', 'sms')
      .eq('direction', 'inbound')
      .is('read_at', null)

    if (updateError) {
      // Log but don't fail the request if marking as read fails
      logger.warn('Failed to mark messages as read', {
        error: updateError,
        contactId,
        tenantId,
      })
    }

    const duration = Date.now() - startTime
    logger.apiResponse('GET', `/api/messages/${contactId}`, 200, duration)
    logger.info('Messages loaded', { messageCount: messages?.length || 0, contactId })

    return successResponse(messages || [])
  } catch (error) {
    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/messages/[contactId]', 500, duration)
    logger.error('Failed to load messages', { error: (error as Error).message })
    return errorResponse(error as Error)
  }
})
