/**
 * Campaign Step Execution Engine
 *
 * Processes campaign steps for enrolled contacts
 * Handles email, SMS, tasks, waits, field updates, and more
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import type { Json } from '@/lib/types/database.types'
import { resendClient, isResendConfigured, getFromAddress } from '@/lib/resend/client'
import { sendSMS, replaceTemplateVariables } from '@/lib/twilio/sms'
import { isTwilioConfigured } from '@/lib/twilio/client'
import type {
  CampaignStep,
  CampaignEnrollment,
  StepExecutionContext,
  SendEmailStepConfig,
  SendSmsStepConfig,
  CreateTaskStepConfig,
  UpdateFieldStepConfig,
  ManageTagsStepConfig,
  NotifyStepConfig,
  WebhookStepConfig,
  ConditionalStepConfig,
  ExitCampaignStepConfig,
  ChangeStageStepConfig,
  ExecutionResult,
} from './types'
import { isValidStageTransition, getTransitionError } from '@/lib/pipeline/validation'
import type { PipelineStage } from '@/lib/types/api'

// ============================================================================
// EXECUTION ENGINE
// ============================================================================

/**
 * Process all pending step executions
 * This function should be called by a cron job or scheduled task
 */
export async function processPendingExecutions(): Promise<{
  processed: number
  succeeded: number
  failed: number
}> {
  const supabase = await createClient()

  // Get all pending executions that are due
  const { data: pendingExecutions, error } = await supabase
    .from('campaign_step_executions')
    .select(
      `
      id,
      enrollment_id,
      step_id,
      scheduled_at,
      campaign_enrollments!inner(
        id,
        campaign_id,
        contact_id,
        status
      ),
      campaign_steps!inner(
        id,
        step_type,
        step_config,
        campaign_id
      )
    `
    )
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .eq('campaign_enrollments.status', 'active')

  if (error || !pendingExecutions) {
    logger.error('Error fetching pending executions', { error: error?.message })
    return { processed: 0, succeeded: 0, failed: 0 }
  }

  let succeeded = 0
  let failed = 0

  for (const execution of pendingExecutions) {
    try {
      await executeStep(execution.id)
      succeeded++
    } catch (error) {
      logger.error(`Error executing step ${execution.id}`, { error: error instanceof Error ? error.message : String(error) })
      failed++
    }
  }

  return {
    processed: pendingExecutions.length,
    succeeded,
    failed,
  }
}

/**
 * Execute a single step for an enrollment
 */
export async function executeStep(
  executionId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Get execution details
  const { data: execution, error: fetchError } = await supabase
    .from('campaign_step_executions')
    .select(
      `
      *,
      campaign_enrollments!inner(*),
      campaign_steps!inner(*)
    `
    )
    .eq('id', executionId)
    .single()

  if (fetchError || !execution) {
    return { success: false, error: 'Execution not found' }
  }

  const enrollment = execution.campaign_enrollments as unknown as CampaignEnrollment
  const step = execution.campaign_steps as unknown as CampaignStep

  // Mark execution as running
  await supabase
    .from('campaign_step_executions')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .eq('id', executionId)

  try {
    // Get contact details
    const { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', enrollment.contact_id)
      .single()

    if (!contact) {
      throw new Error('Contact not found')
    }

    // Build execution context
    const context: StepExecutionContext = {
      enrollment,
      step,
      contact: contact as unknown as StepExecutionContext['contact'],
    }

    // Execute step based on type
    let result: ExecutionResult
    switch (step.step_type) {
      case 'send_email':
        result = await executeSendEmail(
          context,
          step.step_config as SendEmailStepConfig
        )
        break
      case 'send_sms':
        result = await executeSendSms(
          context,
          step.step_config as SendSmsStepConfig
        )
        break
      case 'create_task':
        result = await executeCreateTask(
          context,
          step.step_config as CreateTaskStepConfig
        )
        break
      case 'wait':
        result = await executeWait(context)
        break
      case 'update_field':
        result = await executeUpdateField(
          context,
          step.step_config as UpdateFieldStepConfig
        )
        break
      case 'manage_tags':
        result = await executeManageTags(
          context,
          step.step_config as ManageTagsStepConfig
        )
        break
      case 'notify':
        result = await executeNotify(
          context,
          step.step_config as NotifyStepConfig
        )
        break
      case 'webhook':
        result = await executeWebhook(
          context,
          step.step_config as WebhookStepConfig
        )
        break
      case 'conditional':
        result = await executeConditional(
          context,
          step.step_config as ConditionalStepConfig
        )
        break
      case 'exit_campaign':
        result = await executeExitCampaign(
          context,
          step.step_config as ExitCampaignStepConfig
        )
        break
      case 'change_stage':
        result = await executeChangeStage(
          context,
          step.step_config as ChangeStageStepConfig
        )
        break
      default:
        throw new Error(`Unknown step type: ${step.step_type}`)
    }

    // Mark execution as completed
    await supabase
      .from('campaign_step_executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result_data: result as unknown as Json,
      })
      .eq('id', executionId)

    // Update enrollment metrics
    await updateEnrollmentMetrics(enrollment.id, step.step_type)

    // Schedule next step if not an exit
    if (step.step_type !== 'exit_campaign') {
      await scheduleNextStep(enrollment.id, step.campaign_id)
    }

    return { success: true }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'

    // Mark execution as failed
    await supabase
      .from('campaign_step_executions')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq('id', executionId)

    // Update step failure count
    await supabase.rpc('increment', {
      table_name: 'campaign_steps',
      id: step.id,
      column_name: 'total_failed',
    })

    return { success: false, error: errorMessage }
  }
}

// ============================================================================
// STEP EXECUTORS
// ============================================================================

async function executeSendEmail(
  context: StepExecutionContext,
  config: SendEmailStepConfig
): Promise<ExecutionResult> {
  const { contact } = context

  // Validate email exists
  if (!contact.email) {
    throw new Error('Contact has no email address')
  }

  // Check if Resend is configured
  if (!isResendConfigured() || !resendClient) {
    logger.warn('Resend not configured, skipping email send', {
      contact_id: contact.id,
      subject: config.subject,
    })
    return {
      skipped: true,
      reason: 'Email provider not configured',
      sent_at: new Date().toISOString(),
    }
  }

  // Build template variables from contact data
  const firstName = String(contact.first_name || '')
  const lastName = String(contact.last_name || '')
  const fullName = String(contact.full_name || `${firstName} ${lastName}`.trim())

  const variables: Record<string, string> = {
    'contact.first_name': firstName,
    'contact.last_name': lastName,
    'contact.full_name': fullName,
    'contact.email': contact.email || '',
    'contact.phone': contact.phone || '',
    'contact.company': String(contact.company || ''),
    'contact.address': String(contact.address || ''),
    ...((config.personalization as Record<string, string>) || {}),
  }

  // Replace template variables in subject and body
  const subject = replaceTemplateVariables(config.subject || 'No Subject', variables)
  const body = replaceTemplateVariables(config.body || '', variables)

  logger.info('Sending campaign email', {
    to: contact.email,
    subject,
    template_id: config.template_id,
  })

  try {
    const result = await resendClient.emails.send({
      from: getFromAddress(),
      to: contact.email,
      subject,
      html: body,
    })

    return {
      email_id: result.data?.id || `email_${Date.now()}`,
      sent_at: new Date().toISOString(),
      provider: 'resend',
    }
  } catch (error) {
    logger.error('Failed to send campaign email', {
      error: error instanceof Error ? error.message : String(error),
      contact_id: contact.id,
    })
    throw new Error(`Email send failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function executeSendSms(
  context: StepExecutionContext,
  config: SendSmsStepConfig
): Promise<ExecutionResult> {
  const { contact } = context

  // Validate phone exists
  if (!contact.phone) {
    throw new Error('Contact has no phone number')
  }

  // Check if Twilio is configured
  if (!isTwilioConfigured()) {
    logger.warn('Twilio not configured, skipping SMS send', {
      contact_id: contact.id,
      message_preview: config.message?.substring(0, 50),
    })
    return {
      skipped: true,
      reason: 'SMS provider not configured',
      sent_at: new Date().toISOString(),
    }
  }

  // Build template variables from contact data
  const firstName = String(contact.first_name || '')
  const lastName = String(contact.last_name || '')
  const fullName = String(contact.full_name || `${firstName} ${lastName}`.trim())

  const variables: Record<string, string> = {
    'contact.first_name': firstName,
    'contact.last_name': lastName,
    'contact.full_name': fullName,
    'contact.email': contact.email || '',
    'contact.phone': contact.phone,
    'contact.company': String(contact.company || ''),
    'contact.address': String(contact.address || ''),
    ...((config.personalization as Record<string, string>) || {}),
  }

  // Replace template variables in message
  const message = replaceTemplateVariables(config.message || '', variables)

  logger.info('Sending campaign SMS', {
    to: contact.phone,
    message_preview: message.substring(0, 50),
    template_id: config.template_id,
  })

  try {
    // sendSMS throws on error, returns SMSResponse on success
    const result = await sendSMS({
      to: contact.phone,
      body: message,
    })

    return {
      sms_id: result.sid,
      sent_at: new Date().toISOString(),
      provider: 'twilio',
    }
  } catch (error) {
    logger.error('Failed to send campaign SMS', {
      error: error instanceof Error ? error.message : String(error),
      contact_id: contact.id,
    })
    throw new Error(`SMS send failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function executeCreateTask(
  context: StepExecutionContext,
  config: CreateTaskStepConfig
): Promise<ExecutionResult> {
  const supabase = await createClient()

  // Calculate due date
  const dueDate = new Date()
  if (config.due_in_days) {
    dueDate.setDate(dueDate.getDate() + config.due_in_days)
  }

  // Create task
  const { data: task, error } = await supabase
    .from('activities')
    .insert({
      tenant_id: context.enrollment.tenant_id,
      contact_id: context.contact.id,
      type: 'task',
      subtype: config.task_type,
      subject: config.title,
      content: config.description,
      created_by: config.assigned_to,
      scheduled_at: dueDate.toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create task: ${error.message}`)
  }

  return {
    task_id: task.id,
    created_at: new Date().toISOString(),
  }
}

async function executeWait(
  _context: StepExecutionContext
): Promise<ExecutionResult> {
  // Wait step is handled by scheduling logic
  return { waited: true }
}

async function executeUpdateField(
  context: StepExecutionContext,
  config: UpdateFieldStepConfig
): Promise<ExecutionResult> {
  const supabase = await createClient()

  const tableName = config.entity_type === 'contact' ? 'contacts' : 'projects'

  const { error } = await supabase
    .from(tableName)
    .update({ [config.field_name]: config.field_value })
    .eq('id', context.contact.id)

  if (error) {
    throw new Error(`Failed to update field: ${error.message}`)
  }

  return {
    field_updated: config.field_name,
    new_value: config.field_value,
  }
}

async function executeManageTags(
  context: StepExecutionContext,
  config: ManageTagsStepConfig
): Promise<ExecutionResult> {
  const supabase = await createClient()

  const { data: contact } = await supabase
    .from('contacts')
    .select('tags')
    .eq('id', context.contact.id)
    .single()

  if (!contact) {
    throw new Error('Contact not found')
  }

  let currentTags = (contact.tags as string[]) || []

  if (config.action === 'add') {
    currentTags = [...new Set([...currentTags, ...config.tags])]
  } else {
    currentTags = currentTags.filter((tag) => !config.tags.includes(tag))
  }

  const { error } = await supabase
    .from('contacts')
    .update({ tags: currentTags })
    .eq('id', context.contact.id)

  if (error) {
    throw new Error(`Failed to manage tags: ${error.message}`)
  }

  return {
    action: config.action,
    tags: config.tags,
    final_tags: currentTags,
  }
}

async function executeNotify(
  context: StepExecutionContext,
  config: NotifyStepConfig
): Promise<ExecutionResult> {
  const supabase = await createClient()
  const notificationType = config.notification_type || 'email'
  const results: Array<{ userId: string; email: boolean; inApp: boolean }> = []

  logger.info('[Campaign Notify] Starting notification delivery', {
    users: config.notify_users,
    type: notificationType,
    contactId: context.contact.id,
  })

  // Build message with contact context
  const contactName = String(context.contact.full_name ||
    `${context.contact.first_name || ''} ${context.contact.last_name || ''}`.trim() ||
    'A contact')
  const contactEmail = String(context.contact.email || '')
  const contactPhone = String(context.contact.phone || '')
  const message = config.message
    .replace(/\{contact\.name\}/g, contactName)
    .replace(/\{contact\.email\}/g, contactEmail)
    .replace(/\{contact\.phone\}/g, contactPhone)

  for (const userId of config.notify_users) {
    const result = { userId, email: false, inApp: false }

    try {
      // Look up user email
      const { data: tenantUser, error: tuError } = await supabase
        .from('tenant_users')
        .select('user_id')
        .eq('user_id', userId)
        .eq('tenant_id', context.enrollment.tenant_id)
        .single()

      if (tuError || !tenantUser) {
        logger.warn('[Campaign Notify] User not found in tenant', { userId })
        results.push(result)
        continue
      }

      // Get user's email from users table
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('email, raw_user_meta_data')
        .eq('id', userId)
        .single()

      if (userError || !user?.email) {
        logger.warn('[Campaign Notify] User email not found', { userId })
        results.push(result)
        continue
      }

      // Send email notification
      if (notificationType === 'email' || notificationType === 'both') {
        if (isResendConfigured() && resendClient) {
          try {
            const meta = user.raw_user_meta_data as Record<string, unknown> | null
            const userName = (meta?.full_name as string) || 'Team Member'

            await resendClient.emails.send({
              from: getFromAddress(),
              to: user.email,
              subject: `Campaign Notification: ${contactName}`,
              html: `
                <p>Hi ${userName},</p>
                <p>${message.replace(/\n/g, '<br>')}</p>
                <hr>
                <p style="color: #666; font-size: 12px;">
                  This notification was triggered by a campaign step.
                  Contact: ${contactName}
                </p>
              `,
            })
            result.email = true
            logger.info('[Campaign Notify] Email sent', { userId, email: user.email })
          } catch (err) {
            logger.error('[Campaign Notify] Failed to send email', {
              userId,
              error: err instanceof Error ? err.message : String(err),
            })
          }
        } else {
          logger.warn('[Campaign Notify] Email provider not configured, skipping email')
        }
      }

      // In-app notification (store in activities as a notification type)
      if (notificationType === 'in_app' || notificationType === 'both') {
        try {
          await supabase.from('activities').insert({
            tenant_id: context.enrollment.tenant_id,
            contact_id: context.contact.id,
            type: 'notification',
            subject: `Campaign Notification`,
            content: message,
            created_by: userId, // The recipient, so it shows in their activity feed
            created_at: new Date().toISOString(),
          })
          result.inApp = true
          logger.info('[Campaign Notify] In-app notification created', { userId })
        } catch (err) {
          logger.error('[Campaign Notify] Failed to create in-app notification', {
            userId,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }
    } catch (err) {
      logger.error('[Campaign Notify] Error notifying user', {
        userId,
        error: err instanceof Error ? err.message : String(err),
      })
    }

    results.push(result)
  }

  const successCount = results.filter(r => r.email || r.inApp).length

  return {
    notified: successCount > 0,
    users: config.notify_users,
    results,
    successCount,
    failureCount: results.length - successCount,
  }
}

async function executeWebhook(
  context: StepExecutionContext,
  config: WebhookStepConfig
): Promise<ExecutionResult> {
  const response = await fetch(config.url, {
    method: config.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.headers || {}),
    },
    body: JSON.stringify(config.payload || { contact: context.contact }),
  })

  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.statusText}`)
  }

  const responseData = await response.json()

  return {
    webhook_url: config.url,
    status: response.status,
    response: responseData,
  }
}

async function executeConditional(
  context: StepExecutionContext,
  config: ConditionalStepConfig
): Promise<ExecutionResult> {
  const conditionMet = evaluateConditions(config.conditions, context)

  return {
    condition_met: conditionMet,
    next_step: conditionMet
      ? config.true_path_step_id
      : config.false_path_step_id,
  }
}

/**
 * Evaluate a set of condition rules against the contact/enrollment context
 */
function evaluateConditions(
  conditions: import('./types').StepConditions,
  context: StepExecutionContext
): boolean {
  const { rules, logic = 'AND' } = conditions

  if (!rules || rules.length === 0) {
    return true
  }

  if (logic === 'AND') {
    return rules.every(rule => evaluateRule(rule, context))
  }
  return rules.some(rule => evaluateRule(rule, context))
}

/**
 * Evaluate a single condition rule against a contact field value
 */
function evaluateRule(
  rule: import('./types').ConditionRule,
  context: StepExecutionContext
): boolean {
  const contact = context.contact as Record<string, unknown>
  const fieldValue = contact[rule.field]

  switch (rule.operator) {
    case 'equals':
      return fieldValue === rule.value
    case 'not_equals':
      return fieldValue !== rule.value
    case 'greater_than':
      return typeof fieldValue === 'number' && typeof rule.value === 'number' && fieldValue > rule.value
    case 'less_than':
      return typeof fieldValue === 'number' && typeof rule.value === 'number' && fieldValue < rule.value
    case 'contains':
      return typeof fieldValue === 'string' && typeof rule.value === 'string' && fieldValue.toLowerCase().includes(rule.value.toLowerCase())
    case 'not_contains':
      return typeof fieldValue === 'string' && typeof rule.value === 'string' && !fieldValue.toLowerCase().includes(rule.value.toLowerCase())
    case 'is_null':
      return fieldValue === null || fieldValue === undefined
    case 'is_not_null':
      return fieldValue !== null && fieldValue !== undefined
    default:
      logger.warn('Unknown condition operator', { operator: rule.operator })
      return false
  }
}

async function executeExitCampaign(
  context: StepExecutionContext,
  config: ExitCampaignStepConfig
): Promise<ExecutionResult> {
  const supabase = await createClient()

  // Update enrollment status
  await supabase
    .from('campaign_enrollments')
    .update({
      status: 'exited',
      exit_reason: config.exit_reason,
      exited_at: new Date().toISOString(),
    })
    .eq('id', context.enrollment.id)

  // Create task if configured
  if (config.create_task && config.task_config) {
    await executeCreateTask(context, config.task_config)
  }

  return {
    exited: true,
    reason: config.exit_reason,
  }
}

/**
 * Change the pipeline stage of a project
 * This step allows campaigns to automatically move projects through the pipeline
 */
async function executeChangeStage(
  context: StepExecutionContext,
  config: ChangeStageStepConfig
): Promise<ExecutionResult> {
  const supabase = await createClient()

  // Find the most recent active project for this contact
  // Since enrollments don't have a direct project_id, we look up through the contact
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, pipeline_stage, tenant_id, contact_id')
    .eq('contact_id', context.contact.id)
    .eq('tenant_id', context.enrollment.tenant_id)
    .not('pipeline_stage', 'in', '("complete","lost")') // Exclude terminal stages
    .order('created_at', { ascending: false })
    .limit(1)

  if (projectsError) {
    throw new Error(`Failed to find project: ${projectsError.message}`)
  }

  const project = projects?.[0]

  if (!project) {
    throw new Error(`Cannot change stage: No active project found for contact ${context.contact.id}`)
  }

  const projectId = project.id
  const currentStage = project.pipeline_stage as PipelineStage
  const targetStage = config.target_stage

  // Validate transition if enabled (default: true)
  if (config.validate_transition !== false) {
    const isValid = isValidStageTransition(currentStage, targetStage)
    if (!isValid) {
      const errorMessage = getTransitionError(currentStage, targetStage)
      throw new Error(`Invalid stage transition: ${errorMessage}`)
    }
  }

  // Update project stage
  const { error: updateError } = await supabase
    .from('projects')
    .update({
      pipeline_stage: targetStage,
      stage_changed_at: new Date().toISOString(),
    })
    .eq('id', projectId)

  if (updateError) {
    throw new Error(`Failed to update project stage: ${updateError.message}`)
  }

  logger.info('[Campaign] Changed project pipeline stage', {
    projectId,
    fromStage: currentStage,
    toStage: targetStage,
    enrollmentId: context.enrollment.id,
  })

  // Trigger downstream stage change handlers
  // This allows chained automations - when a campaign moves a project to a new stage,
  // other campaigns listening for that stage change will be triggered
  try {
    const { handleStageChange } = await import('./trigger-handler')
    await handleStageChange({
      tenantId: project.tenant_id,
      projectId: projectId,
      contactId: context.contact.id,
      fromStage: currentStage,
      toStage: targetStage,
      changedBy: 'campaign_automation',
      changedAt: new Date().toISOString(),
    })
  } catch (triggerError) {
    // Log but don't fail the step if trigger handling fails
    logger.error('[Campaign] Failed to trigger downstream stage change handlers', {
      error: triggerError instanceof Error ? triggerError.message : String(triggerError),
      projectId,
      targetStage,
    })
  }

  return {
    success: true,
    project_id: projectId,
    previous_stage: currentStage,
    new_stage: targetStage,
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function updateEnrollmentMetrics(
  enrollmentId: string,
  stepType: string
) {
  const supabase = await createClient()

  // Update timestamp
  await supabase
    .from('campaign_enrollments')
    .update({ last_step_executed_at: new Date().toISOString() })
    .eq('id', enrollmentId)

  // Increment steps_completed atomically via RPC
  await supabase.rpc('increment', {
    table_name: 'campaign_enrollments',
    id: enrollmentId,
    column_name: 'steps_completed',
  })

  // Increment type-specific counter
  const counterColumn =
    stepType === 'send_email' ? 'emails_sent' :
    stepType === 'send_sms' ? 'sms_sent' :
    stepType === 'create_task' ? 'tasks_created' : null

  if (counterColumn) {
    await supabase.rpc('increment', {
      table_name: 'campaign_enrollments',
      id: enrollmentId,
      column_name: counterColumn,
    })
  }
}

async function scheduleNextStep(enrollmentId: string, campaignId: string) {
  const supabase = await createClient()

  // Get current enrollment
  const { data: enrollment } = await supabase
    .from('campaign_enrollments')
    .select('current_step_id, current_step_order')
    .eq('id', enrollmentId)
    .single()

  if (!enrollment) return

  // Get next step in sequence
  const { data: nextStep } = await supabase
    .from('campaign_steps')
    .select('*')
    .eq('campaign_id', campaignId)
    .gt('step_order', enrollment.current_step_order || 0)
    .order('step_order', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!nextStep) {
    // No more steps - mark enrollment as completed
    await supabase
      .from('campaign_enrollments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', enrollmentId)
    return
  }

  // Calculate scheduled time based on delay
  const scheduledAt = new Date()
  const delayValue = nextStep.delay_value ?? 0
  switch (nextStep.delay_unit) {
    case 'hours':
      scheduledAt.setHours(scheduledAt.getHours() + delayValue)
      break
    case 'days':
      scheduledAt.setDate(scheduledAt.getDate() + delayValue)
      break
    case 'weeks':
      scheduledAt.setDate(scheduledAt.getDate() + delayValue * 7)
      break
  }

  // Create step execution
  await supabase.from('campaign_step_executions').insert({
    enrollment_id: enrollmentId,
    step_id: nextStep.id,
    status: 'pending',
    scheduled_at: scheduledAt.toISOString(),
  })

  // Update enrollment
  await supabase
    .from('campaign_enrollments')
    .update({
      current_step_id: nextStep.id,
      current_step_order: nextStep.step_order,
      next_step_scheduled_at: scheduledAt.toISOString(),
    })
    .eq('id', enrollmentId)
}
