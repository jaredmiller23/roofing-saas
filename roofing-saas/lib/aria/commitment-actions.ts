/**
 * ARIA Commitment Actions
 *
 * Creates tasks and sends notifications when ARIA makes commitments
 * to customers (callbacks, follow-ups, quotes, etc.)
 */

import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { sendEmail } from '@/lib/resend/email'
import { sendSMS } from '@/lib/twilio/sms'
import {
  type DetectedCommitment,
  type CommitmentType,
  getCommitmentDescription,
  getCommitmentTaskTitle,
} from './commitment-detector'

// =============================================================================
// Types
// =============================================================================

export interface CreateCommitmentTaskParams {
  tenantId: string
  contactId?: string
  contactName?: string
  phone: string
  commitment: DetectedCommitment
  originalMessage: string
  ariaResponse: string
}

export interface CreateCommitmentTaskResult {
  success: boolean
  taskId?: string
  error?: string
}

export interface NotifyTeamParams {
  tenantId: string
  taskId: string
  commitment: DetectedCommitment
  contactName?: string
  phone: string
  assigneeId?: string
}

// =============================================================================
// Task Creation
// =============================================================================

/**
 * Create a task when ARIA makes a commitment
 */
export async function createCommitmentTask(
  params: CreateCommitmentTaskParams
): Promise<CreateCommitmentTaskResult> {
  const {
    tenantId,
    contactId,
    contactName,
    phone,
    commitment,
    originalMessage,
    ariaResponse,
  } = params

  try {
    const supabase = await createAdminClient()

    // Find assignee for this tenant
    const assigneeId = await findDefaultAssignee(tenantId)

    // Build task description with context
    const description = buildTaskDescription({
      contactName,
      phone,
      commitment,
      originalMessage,
      ariaResponse,
    })

    // Map urgency to priority
    const priorityMap: Record<string, string> = {
      high: 'high',
      medium: 'medium',
      low: 'low',
    }

    // Create the task
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        tenant_id: tenantId,
        title: getCommitmentTaskTitle(commitment.type, contactName),
        description,
        status: 'todo',
        priority: priorityMap[commitment.urgency] || 'medium',
        due_date: commitment.suggestedDueDate.toISOString().split('T')[0],
        contact_id: contactId || null,
        assigned_to: assigneeId || null,
        tags: ['aria-commitment', commitment.type],
        reminder_enabled: true,
        reminder_date: commitment.suggestedDueDate.toISOString(),
        labels: {
          source: 'aria-sms',
          commitment_type: commitment.type,
          phone: phone,
        },
      })
      .select('id')
      .single()

    if (error) {
      logger.error('Failed to create commitment task', { error, tenantId })
      return { success: false, error: error.message }
    }

    logger.info('Commitment task created', {
      taskId: task.id,
      type: commitment.type,
      contactName,
      assigneeId,
    })

    // Notify the team
    if (assigneeId) {
      await notifyTeamOfCommitment({
        tenantId,
        taskId: task.id,
        commitment,
        contactName,
        phone,
        assigneeId,
      })
    }

    return { success: true, taskId: task.id }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Error creating commitment task', { error: errorMessage, tenantId })
    return { success: false, error: errorMessage }
  }
}

// =============================================================================
// Team Notification
// =============================================================================

/**
 * Notify team member about an ARIA commitment
 */
export async function notifyTeamOfCommitment(
  params: NotifyTeamParams
): Promise<void> {
  const { tenantId, taskId, commitment, contactName, phone, assigneeId } = params

  if (!assigneeId) {
    logger.warn('No assignee to notify about commitment', { taskId })
    return
  }

  try {
    const supabase = await createAdminClient()

    // Get assignee details from public.users (has id, email, raw_user_meta_data)
    const { data: assignee, error: userError } = await supabase
      .from('users')
      .select('id, email, raw_user_meta_data')
      .eq('id', assigneeId)
      .single()

    if (userError || !assignee) {
      logger.warn('Assignee not found for notification', { assigneeId, error: userError })
      return
    }

    // Extract name from raw_user_meta_data
    const userMeta = assignee.raw_user_meta_data as { full_name?: string; phone?: string } | null
    const assigneeName = userMeta?.full_name?.split(' ')[0] || 'Team Member'
    const assigneePhone = userMeta?.phone || null

    // Get notification preferences
    const { data: prefs } = await supabase
      .from('user_notification_preferences')
      .select('email_task_assigned, sms_task_assigned')
      .eq('user_id', assigneeId)
      .single()

    const shouldEmailNotify = prefs?.email_task_assigned !== false
    const shouldSMSNotify = prefs?.sms_task_assigned === true

    const customerName = contactName || 'A customer'
    const commitmentDesc = getCommitmentDescription(commitment.type)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://roofing-saas.vercel.app'
    const taskUrl = `${appUrl}/tasks?id=${taskId}`

    // Send email notification
    if (shouldEmailNotify && assignee.email) {
      try {
        await sendEmail({
          to: assignee.email,
          subject: `ARIA Commitment: ${commitmentDesc}`,
          html: buildEmailNotification({
            assigneeName,
            customerName,
            phone,
            commitmentDesc,
            commitmentType: commitment.type,
            urgency: commitment.urgency,
            dueDate: commitment.suggestedDueDate,
            taskUrl,
          }),
        })

        logger.info('Commitment email notification sent', {
          to: assignee.email,
          taskId,
        })
      } catch (emailError) {
        logger.error('Failed to send commitment email', { error: emailError })
      }
    }

    // Send SMS notification (if enabled and phone available)
    if (shouldSMSNotify && assigneePhone) {
      try {
        await sendSMS({
          to: assigneePhone,
          body: buildSMSNotification({
            customerName,
            commitmentDesc,
            dueDate: commitment.suggestedDueDate,
          }),
        })

        logger.info('Commitment SMS notification sent', {
          to: assigneePhone,
          taskId,
        })
      } catch (smsError) {
        logger.error('Failed to send commitment SMS', { error: smsError })
      }
    }
  } catch (error) {
    logger.error('Error notifying team of commitment', { error, taskId })
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Find the default assignee for a tenant
 * Uses tenant_users table for tenant/role mapping
 */
async function findDefaultAssignee(tenantId: string): Promise<string | null> {
  try {
    const supabase = await createAdminClient()

    // 1. Check tenant_settings for default_lead_assignee
    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('default_lead_assignee')
      .eq('tenant_id', tenantId)
      .single()

    if (settings?.default_lead_assignee) {
      return settings.default_lead_assignee
    }

    // 2. Find first owner or admin from tenant_users
    const { data: adminUser } = await supabase
      .from('tenant_users')
      .select('user_id')
      .eq('tenant_id', tenantId)
      .in('role', ['owner', 'admin'])
      .eq('status', 'active')
      .limit(1)
      .single()

    if (adminUser?.user_id) {
      return adminUser.user_id
    }

    // 3. Find any active user in tenant
    const { data: anyUser } = await supabase
      .from('tenant_users')
      .select('user_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .limit(1)
      .single()

    return anyUser?.user_id || null
  } catch (error) {
    logger.warn('Error finding default assignee', { error, tenantId })
    return null
  }
}

/**
 * Build task description with full context
 */
function buildTaskDescription(params: {
  contactName?: string
  phone: string
  commitment: DetectedCommitment
  originalMessage: string
  ariaResponse: string
}): string {
  const { contactName, phone, commitment, originalMessage, ariaResponse } = params

  return `## ARIA Commitment Auto-Generated Task

**Customer:** ${contactName || 'Unknown'} (${phone})
**Commitment Type:** ${getCommitmentDescription(commitment.type)}
**Urgency:** ${commitment.urgency.toUpperCase()}
**Due:** ${commitment.suggestedDueDate.toLocaleDateString()}

---

### Customer's Original Message
> ${originalMessage}

### ARIA's Response (contained commitment)
> ${ariaResponse}

${commitment.matchedPattern ? `### Detected Pattern\n\`${commitment.matchedPattern}\`` : ''}

---
*This task was automatically created because ARIA made a commitment to the customer.*
`
}

/**
 * Build HTML email notification
 */
function buildEmailNotification(params: {
  assigneeName: string
  customerName: string
  phone: string
  commitmentDesc: string
  commitmentType: CommitmentType
  urgency: string
  dueDate: Date
  taskUrl: string
}): string {
  const {
    assigneeName,
    customerName,
    phone,
    commitmentDesc,
    urgency,
    dueDate,
    taskUrl,
  } = params

  const urgencyColors: Record<string, string> = {
    high: '#dc2626',
    medium: '#f59e0b',
    low: '#3b82f6',
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #FF8243; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .urgency { display: inline-block; padding: 4px 12px; border-radius: 4px; color: white; font-weight: 600; font-size: 12px; }
    .button { display: inline-block; background: #FF8243; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px; }
    .footer { padding: 16px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">ARIA Commitment Alert</h2>
    </div>
    <div class="content">
      <p>Hi ${assigneeName},</p>

      <p>ARIA made a commitment to a customer that requires your attention:</p>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Customer:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${customerName}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Phone:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><a href="tel:${phone}">${phone}</a></td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Commitment:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${commitmentDesc}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Urgency:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
            <span class="urgency" style="background: ${urgencyColors[urgency] || '#6b7280'};">${urgency.toUpperCase()}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px;"><strong>Due:</strong></td>
          <td style="padding: 8px;">${dueDate.toLocaleDateString()} by ${dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
        </tr>
      </table>

      <a href="${taskUrl}" class="button">View Task</a>
    </div>
    <div class="footer">
      <p>This is an automated notification from ARIA, your AI assistant.</p>
    </div>
  </div>
</body>
</html>
`
}

/**
 * Build SMS notification text
 */
function buildSMSNotification(params: {
  customerName: string
  commitmentDesc: string
  dueDate: Date
}): string {
  const { customerName, commitmentDesc, dueDate } = params

  return `ARIA Alert: ${commitmentDesc} for ${customerName}. Due: ${dueDate.toLocaleDateString()}. Check your tasks.`
}
