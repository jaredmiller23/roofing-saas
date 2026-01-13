/**
 * ARIA Approval Queue API
 * Manages SMS/Email approval queue for HITL (Human-in-the-Loop) workflow
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { getUserTenantId } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

interface _QueueItem {
  id: string
  phone_number: string
  contact_id: string | null
  inbound_message: string
  suggested_response: string
  category: string
  status: string
  reviewed_by: string | null
  reviewed_at: string | null
  final_response: string | null
  metadata: {
    contact_name?: string
    generated_at?: string
  }
  created_at: string
  expires_at: string
  contact?: {
    id: string
    first_name: string
    last_name: string
  }
}

/**
 * GET /api/aria/queue
 * List pending approval items
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    // Build query
    let query = supabase
      .from('sms_approval_queue')
      .select(`
        id,
        phone_number,
        contact_id,
        inbound_message,
        suggested_response,
        category,
        status,
        reviewed_by,
        reviewed_at,
        final_response,
        metadata,
        created_at,
        expires_at
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Filter by status
    if (status === 'pending') {
      query = query.eq('status', 'pending')
    } else if (status === 'reviewed') {
      query = query.in('status', ['approved', 'modified', 'rejected'])
    } else if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: items, error } = await query

    if (error) {
      logger.error('Error fetching approval queue', { error })
      return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 })
    }

    // Fetch contact names for items with contact_id
    const contactIds = (items || [])
      .filter((i: { contact_id: string | null }) => i.contact_id)
      .map((i: { contact_id: string | null }) => i.contact_id as string)
    let contactsMap: Record<string, { first_name: string; last_name: string }> = {}

    if (contactIds.length > 0) {
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, first_name, last_name')
        .in('id', contactIds)

      if (contacts) {
        contactsMap = Object.fromEntries(
          contacts.map((c: { id: string; first_name: string; last_name: string }) => [
            c.id,
            { first_name: c.first_name, last_name: c.last_name },
          ])
        )
      }
    }

    // Enrich items with contact info
    const enrichedItems = (items || []).map((item: { contact_id: string | null }) => ({
      ...item,
      contact: item.contact_id ? contactsMap[item.contact_id] : null,
    }))

    // Get counts for UI
    const { count: pendingCount } = await supabase
      .from('sms_approval_queue')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')

    return NextResponse.json({
      items: enrichedItems,
      pendingCount: pendingCount || 0,
    })

  } catch (error) {
    logger.error('Approval queue GET error', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/aria/queue
 * Approve, modify, or reject an item
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 })
    }

    const body = await request.json()
    const { id, action, finalResponse, rejectionReason } = body

    if (!id || !action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 })
    }

    if (!['approve', 'modify', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Fetch the queue item
    const { data: item, error: fetchError } = await supabase
      .from('sms_approval_queue')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    if (item.status !== 'pending') {
      return NextResponse.json({ error: 'Item already reviewed' }, { status: 400 })
    }

    // Determine the status and final response
    let newStatus: string
    let responseToSend: string | null = null

    if (action === 'approve') {
      newStatus = 'approved'
      responseToSend = item.suggested_response
    } else if (action === 'modify') {
      if (!finalResponse) {
        return NextResponse.json({ error: 'Modified response required' }, { status: 400 })
      }
      newStatus = 'modified'
      responseToSend = finalResponse
    } else {
      newStatus = 'rejected'
      responseToSend = null
    }

    // Update the queue item
    const { error: updateError } = await supabase
      .from('sms_approval_queue')
      .update({
        status: newStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        final_response: responseToSend,
        metadata: {
          ...item.metadata,
          rejection_reason: action === 'reject' ? rejectionReason : undefined,
        },
      })
      .eq('id', id)

    if (updateError) {
      logger.error('Error updating queue item', { error: updateError })
      return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
    }

    // If approved or modified, send the SMS
    if (responseToSend) {
      try {
        const smsResponse = await fetch(new URL('/api/sms/send', request.url).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: item.phone_number,
            body: responseToSend,
            contactId: item.contact_id,
          }),
        })

        if (!smsResponse.ok) {
          const errorData = await smsResponse.json().catch(() => ({ message: 'SMS send failed' }))
          logger.error('SMS send failed after approval', { error: errorData })
          // Don't fail the approval, but log the error
        } else {
          logger.info('SMS sent after approval', {
            queueId: id,
            to: item.phone_number,
          })
        }
      } catch (smsError) {
        logger.error('SMS send error after approval', { error: smsError })
      }
    }

    // Log the activity
    if (item.contact_id) {
      await supabase.from('activities').insert({
        tenant_id: tenantId,
        contact_id: item.contact_id,
        type: 'sms',
        subject: action === 'reject' ? 'ARIA SMS Draft Rejected' : 'ARIA SMS Sent',
        content: action === 'reject'
          ? `Draft rejected: ${rejectionReason || 'No reason provided'}`
          : responseToSend,
        direction: action === 'reject' ? undefined : 'outbound',
        created_by: user.id,
        metadata: {
          aria_generated: true,
          original_inbound: item.inbound_message,
          queue_id: id,
          action,
        },
      })
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      messageSent: !!responseToSend,
    })

  } catch (error) {
    logger.error('Approval queue PATCH error', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
