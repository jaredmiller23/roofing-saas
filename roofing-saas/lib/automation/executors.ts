/**
 * Workflow Step Executors
 * Execute different types of workflow actions
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { sendSMS } from '@/lib/twilio/sms'
import { sendEmail } from '@/lib/resend/email'
import { type StepType } from './types'

/**
 * Execute a workflow step based on its type
 */
export async function executeStep(
  stepType: StepType,
  config: Record<string, any>
): Promise<Record<string, any>> {
  logger.info('Executing step', { stepType, config })

  switch (stepType) {
    case 'send_sms':
      return executeSendSMS(config)

    case 'send_email':
      return executeSendEmail(config)

    case 'create_task':
      return executeCreateTask(config)

    case 'update_contact':
      return executeUpdateContact(config)

    case 'update_project':
      return executeUpdateProject(config)

    case 'wait':
      return executeWait(config)

    case 'webhook':
      return executeWebhook(config)

    default:
      throw new Error(`Unknown step type: ${stepType}`)
  }
}

/**
 * Send SMS step
 */
async function executeSendSMS(config: Record<string, any>): Promise<Record<string, any>> {
  try {
    const { to, body, template_id } = config

    if (!to || (!body && !template_id)) {
      throw new Error('Missing required fields: to, body or template_id')
    }

    const result = await sendSMS({
      to,
      body: body || '',
      // TODO: Handle template_id if provided
    })

    return {
      success: true,
      sms_sid: result.sid,
      to: result.to,
      status: result.status,
    }
  } catch (error) {
    logger.error('Failed to send SMS in workflow', { error, config })
    throw error
  }
}

/**
 * Send Email step
 */
async function executeSendEmail(config: Record<string, any>): Promise<Record<string, any>> {
  try {
    const { to, subject, html, text, template_id } = config

    if (!to || !subject || (!html && !text && !template_id)) {
      throw new Error('Missing required fields: to, subject, and content')
    }

    const result = await sendEmail({
      to,
      subject,
      html: html || undefined,
      text: text || undefined,
      // TODO: Handle template_id if provided
    })

    return {
      success: true,
      email_id: result.id,
      to: result.to,
    }
  } catch (error) {
    logger.error('Failed to send email in workflow', { error, config })
    throw error
  }
}

/**
 * Create Task step
 */
async function executeCreateTask(config: Record<string, any>): Promise<Record<string, any>> {
  try {
    const supabase = await createClient()

    const { title, description, assigned_to, due_date_days, priority, project_id } = config

    if (!title) {
      throw new Error('Missing required field: title')
    }

    // Calculate due date if specified
    let dueDate: string | undefined
    if (due_date_days) {
      const date = new Date()
      date.setDate(date.getDate() + due_date_days)
      dueDate = date.toISOString()
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        title,
        description,
        assigned_to,
        due_date: dueDate,
        priority: priority || 'medium',
        project_id,
        status: 'todo',
      })
      .select('id')
      .single()

    if (error || !task) {
      throw new Error(`Failed to create task: ${error?.message}`)
    }

    return {
      success: true,
      task_id: task.id,
    }
  } catch (error) {
    logger.error('Failed to create task in workflow', { error, config })
    throw error
  }
}

/**
 * Update Contact step
 */
async function executeUpdateContact(config: Record<string, any>): Promise<Record<string, any>> {
  try {
    const supabase = await createClient()

    const { contact_id, updates } = config

    if (!contact_id || !updates) {
      throw new Error('Missing required fields: contact_id, updates')
    }

    const { error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', contact_id)

    if (error) {
      throw new Error(`Failed to update contact: ${error.message}`)
    }

    return {
      success: true,
      contact_id,
      updated_fields: Object.keys(updates),
    }
  } catch (error) {
    logger.error('Failed to update contact in workflow', { error, config })
    throw error
  }
}

/**
 * Update Project step
 */
async function executeUpdateProject(config: Record<string, any>): Promise<Record<string, any>> {
  try {
    const supabase = await createClient()

    const { project_id, updates } = config

    if (!project_id || !updates) {
      throw new Error('Missing required fields: project_id, updates')
    }

    const { error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', project_id)

    if (error) {
      throw new Error(`Failed to update project: ${error.message}`)
    }

    return {
      success: true,
      project_id,
      updated_fields: Object.keys(updates),
    }
  } catch (error) {
    logger.error('Failed to update project in workflow', { error, config })
    throw error
  }
}

/**
 * Wait step (delay is handled by engine, this is just for logging)
 */
async function executeWait(config: Record<string, any>): Promise<Record<string, any>> {
  const { delay_minutes } = config

  logger.info('Wait step executing', { delay_minutes })

  return {
    success: true,
    delay_minutes,
  }
}

/**
 * Webhook step
 */
async function executeWebhook(config: Record<string, any>): Promise<Record<string, any>> {
  try {
    const { url, method = 'POST', headers = {}, body } = config

    if (!url) {
      throw new Error('Missing required field: url')
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const responseData = await response.json().catch(() => null)

    return {
      success: response.ok,
      status: response.status,
      response_data: responseData,
    }
  } catch (error) {
    logger.error('Failed to execute webhook in workflow', { error, config })
    throw error
  }
}
