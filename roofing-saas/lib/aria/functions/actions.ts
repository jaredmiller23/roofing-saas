/**
 * ARIA Action Functions
 * SMS, Email, Task, Callback scheduling
 */

import { ariaFunctionRegistry } from '../function-registry'
import { canSendSMS } from '@/lib/twilio/compliance'
import { canSendEmail } from '@/lib/resend/compliance'
import { logger } from '@/lib/logger'

// =============================================================================
// Send SMS
// =============================================================================

ariaFunctionRegistry.register({
  name: 'send_sms',
  category: 'actions',
  description: 'Send an SMS text message to a contact',
  riskLevel: 'medium',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'send_sms',
    description: 'Send an SMS text message to a contact',
    parameters: {
      type: 'object',
      properties: {
        phone: {
          type: 'string',
          description: 'Phone number to send SMS to (or use contact from context)',
        },
        message: {
          type: 'string',
          description: 'The message to send',
        },
        contact_id: {
          type: 'string',
          description: 'Contact ID (for compliance checking)',
        },
      },
      required: ['message'],
    },
  },
  execute: async (args, context) => {
    const { phone, message, contact_id } = args as {
      phone?: string
      message: string
      contact_id?: string
    }

    // Get phone from context if not provided
    const targetPhone = phone || context.contact?.phone
    const targetContactId = contact_id || context.contact?.id

    if (!targetPhone) {
      return { success: false, error: 'No phone number provided or available in context' }
    }

    // Check compliance
    if (targetPhone) {
      const canSend = await canSendSMS(targetPhone)
      if (!canSend.allowed) {
        return {
          success: false,
          error: `Cannot send SMS: ${canSend.reason}`,
        }
      }
    }

    // HITL: Return draft for approval instead of sending immediately
    // The UI will show the draft and allow user to approve/edit/reject
    const contactName = context.contact
      ? `${context.contact.first_name} ${context.contact.last_name}`.trim()
      : targetPhone

    return {
      success: true,
      awaitingApproval: true,
      confirmationPrompt: `Ready to send SMS to ${contactName}. Review and approve the message below.`,
      draft: {
        type: 'sms',
        recipient: targetPhone,
        body: message,
        metadata: {
          contact_id: targetContactId,
          contact_name: contactName,
          via: 'aria',
        },
      },
      message: `SMS draft created for ${contactName}. Awaiting approval.`,
    }
  },
})

// =============================================================================
// Send Email
// =============================================================================

ariaFunctionRegistry.register({
  name: 'send_email',
  category: 'actions',
  description: 'Send an email to a contact',
  riskLevel: 'medium',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'send_email',
    description: 'Send an email to a contact',
    parameters: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Email address to send to (or use contact from context)',
        },
        subject: {
          type: 'string',
          description: 'Email subject line',
        },
        body: {
          type: 'string',
          description: 'Email body content (plain text)',
        },
        contact_id: {
          type: 'string',
          description: 'Contact ID (for compliance checking)',
        },
      },
      required: ['subject', 'body'],
    },
  },
  execute: async (args, context) => {
    const { to, subject, body, contact_id } = args as {
      to?: string
      subject: string
      body: string
      contact_id?: string
    }

    // Get email from context if not provided
    const targetEmail = to || context.contact?.email
    const targetContactId = contact_id || context.contact?.id

    if (!targetEmail) {
      return { success: false, error: 'No email address provided or available in context' }
    }

    // Check compliance
    if (targetEmail) {
      const canSend = await canSendEmail(targetEmail)
      if (!canSend.allowed) {
        return {
          success: false,
          error: `Cannot send email: ${canSend.reason}`,
        }
      }
    }

    // HITL: Return draft for approval instead of sending immediately
    // The UI will show the draft and allow user to approve/edit/reject
    const contactName = context.contact
      ? `${context.contact.first_name} ${context.contact.last_name}`.trim()
      : targetEmail

    return {
      success: true,
      awaitingApproval: true,
      confirmationPrompt: `Ready to send email to ${contactName}. Review and approve the message below.`,
      draft: {
        type: 'email',
        recipient: targetEmail,
        subject: subject,
        body: body,
        metadata: {
          contact_id: targetContactId,
          contact_name: contactName,
          html_body: `<p>${body.replace(/\n/g, '<br>')}</p>`,
          via: 'aria',
        },
      },
      message: `Email draft created for ${contactName}. Awaiting approval.`,
    }
  },
})

// =============================================================================
// Create Task
// =============================================================================

ariaFunctionRegistry.register({
  name: 'create_task',
  category: 'actions',
  description: 'Create a follow-up task assigned to a team member',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'create_task',
    description: 'Create a follow-up task assigned to a team member',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Task title/description',
        },
        due_date: {
          type: 'string',
          description: 'Due date (ISO format or relative like "tomorrow", "next week")',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'Task priority',
        },
        contact_id: {
          type: 'string',
          description: 'Related contact ID',
        },
        project_id: {
          type: 'string',
          description: 'Related project ID',
        },
        assigned_to: {
          type: 'string',
          description: 'User ID to assign task to (defaults to current user)',
        },
      },
      required: ['title'],
    },
  },
  execute: async (args, context) => {
    const { title, due_date, priority = 'medium', contact_id, project_id, assigned_to } = args as {
      title: string
      due_date?: string
      priority?: string
      contact_id?: string
      project_id?: string
      assigned_to?: string
    }

    // Parse due date
    let parsedDueDate: Date | null = null
    if (due_date) {
      const lowerDue = due_date.toLowerCase()
      if (lowerDue === 'today') {
        parsedDueDate = new Date()
      } else if (lowerDue === 'tomorrow') {
        parsedDueDate = new Date()
        parsedDueDate.setDate(parsedDueDate.getDate() + 1)
      } else if (lowerDue === 'next week') {
        parsedDueDate = new Date()
        parsedDueDate.setDate(parsedDueDate.getDate() + 7)
      } else {
        parsedDueDate = new Date(due_date)
      }
    }

    try {
      const { data, error } = await context.supabase.from('activities').insert({
        tenant_id: context.tenantId,
        contact_id: contact_id || context.contact?.id,
        project_id: project_id || context.project?.id,
        type: 'task',
        description: title,
        created_by: context.userId,
        assigned_to: assigned_to || context.userId,
        due_date: parsedDueDate?.toISOString(),
        metadata: {
          priority,
          status: 'pending',
          via: 'aria',
        },
      }).select().single()

      if (error) {
        return { success: false, error: error.message }
      }

      return {
        success: true,
        message: `Task created: "${title}"`,
        data,
      }
    } catch (error) {
      logger.error('ARIA create_task error:', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create task',
      }
    }
  },
})

// =============================================================================
// Schedule Callback
// =============================================================================

ariaFunctionRegistry.register({
  name: 'schedule_callback',
  category: 'actions',
  description: 'Schedule a callback request for a customer',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'schedule_callback',
    description: 'Schedule a callback request for a customer',
    parameters: {
      type: 'object',
      properties: {
        phone: {
          type: 'string',
          description: 'Phone number to call back',
        },
        contact_id: {
          type: 'string',
          description: 'Contact ID if known',
        },
        requested_time: {
          type: 'string',
          description: 'When they want to be called back (e.g., "in 10 minutes", "at 2pm", "tomorrow morning")',
        },
        reason: {
          type: 'string',
          description: 'Reason for callback',
        },
      },
      required: ['reason'],
    },
  },
  execute: async (args, context) => {
    const { phone, contact_id, requested_time, reason } = args as {
      phone?: string
      contact_id?: string
      requested_time?: string
      reason: string
    }

    const targetPhone = phone || context.contact?.phone
    const targetContactId = contact_id || context.contact?.id

    if (!targetPhone) {
      return { success: false, error: 'No phone number available for callback' }
    }

    // Parse requested time
    let scheduledTime: Date | null = null
    if (requested_time) {
      const lowerTime = requested_time.toLowerCase()
      if (lowerTime.includes('10 minute')) {
        scheduledTime = new Date(Date.now() + 10 * 60 * 1000)
      } else if (lowerTime.includes('30 minute')) {
        scheduledTime = new Date(Date.now() + 30 * 60 * 1000)
      } else if (lowerTime.includes('1 hour') || lowerTime.includes('an hour')) {
        scheduledTime = new Date(Date.now() + 60 * 60 * 1000)
      } else if (lowerTime.includes('tomorrow')) {
        scheduledTime = new Date()
        scheduledTime.setDate(scheduledTime.getDate() + 1)
        scheduledTime.setHours(9, 0, 0, 0) // Default to 9am
      } else {
        // Try to parse as a date/time
        scheduledTime = new Date(requested_time)
        if (isNaN(scheduledTime.getTime())) {
          scheduledTime = null
        }
      }
    }

    try {
      // Create callback request (will need callback_requests table)
      // For now, create as a task
      const { data, error } = await context.supabase.from('activities').insert({
        tenant_id: context.tenantId,
        contact_id: targetContactId,
        type: 'task',
        description: `Callback requested: ${reason}`,
        created_by: context.userId,
        due_date: scheduledTime?.toISOString() || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        metadata: {
          callback_phone: targetPhone,
          callback_reason: reason,
          callback_requested_time: requested_time,
          status: 'pending',
          via: 'aria',
          priority: 'high',
        },
      }).select().single()

      if (error) {
        return { success: false, error: error.message }
      }

      const timeMessage = scheduledTime
        ? `scheduled for ${scheduledTime.toLocaleString()}`
        : 'scheduled'

      return {
        success: true,
        message: `Callback ${timeMessage} for ${targetPhone}`,
        data,
      }
    } catch (error) {
      logger.error('ARIA schedule_callback error:', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to schedule callback',
      }
    }
  },
})
