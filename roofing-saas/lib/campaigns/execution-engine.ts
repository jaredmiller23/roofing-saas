/**
 * Campaign Step Execution Engine
 *
 * Processes campaign steps for enrolled contacts
 * Handles email, SMS, tasks, waits, field updates, and more
 */

import { createClient } from '@/lib/supabase/server'
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
  ExecutionResult,
} from './types'

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
    console.error('Error fetching pending executions:', error)
    return { processed: 0, succeeded: 0, failed: 0 }
  }

  let succeeded = 0
  let failed = 0

  for (const execution of pendingExecutions) {
    try {
      await executeStep(execution.id)
      succeeded++
    } catch (error) {
      console.error(`Error executing step ${execution.id}:`, error)
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
      contact,
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
      default:
        throw new Error(`Unknown step type: ${step.step_type}`)
    }

    // Mark execution as completed
    await supabase
      .from('campaign_step_executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result_data: result,
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
  // TODO: Integrate with Resend/SendGrid
  // For now, return mock result
  console.log('Sending email:', {
    to: context.contact.email,
    subject: config.subject,
    template_id: config.template_id,
  })

  return {
    email_id: `email_${Date.now()}`,
    sent_at: new Date().toISOString(),
    provider: 'resend',
  }
}

async function executeSendSms(
  context: StepExecutionContext,
  config: SendSmsStepConfig
): Promise<ExecutionResult> {
  // TODO: Integrate with Twilio
  // For now, return mock result
  console.log('Sending SMS:', {
    to: context.contact.phone,
    message: config.message,
    template_id: config.template_id,
  })

  return {
    sms_id: `sms_${Date.now()}`,
    sent_at: new Date().toISOString(),
    provider: 'twilio',
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
      activity_type: 'task',
      activity_subtype: config.task_type,
      subject: config.title,
      description: config.description,
      priority: config.priority,
      assigned_to: config.assigned_to,
      due_date: dueDate.toISOString(),
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
  // TODO: Implement notification system
  console.log('Notifying users:', {
    users: config.notify_users,
    message: config.message,
  })

  return {
    notified: true,
    users: config.notify_users,
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
  // TODO: Implement condition evaluation
  // For now, return mock result
  const conditionMet = true

  return {
    condition_met: conditionMet,
    next_step: conditionMet
      ? config.true_path_step_id
      : config.false_path_step_id,
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function updateEnrollmentMetrics(
  enrollmentId: string,
  stepType: string
) {
  const supabase = await createClient()

  const updates: Record<string, unknown> = {
    steps_completed: supabase.rpc('increment', {
      column: 'steps_completed',
    }),
    last_step_executed_at: new Date().toISOString(),
  }

  if (stepType === 'send_email') {
    updates.emails_sent = supabase.rpc('increment', { column: 'emails_sent' })
  } else if (stepType === 'send_sms') {
    updates.sms_sent = supabase.rpc('increment', { column: 'sms_sent' })
  } else if (stepType === 'create_task') {
    updates.tasks_created = supabase.rpc('increment', {
      column: 'tasks_created',
    })
  }

  await supabase
    .from('campaign_enrollments')
    .update(updates)
    .eq('id', enrollmentId)
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
  switch (nextStep.delay_unit) {
    case 'hours':
      scheduledAt.setHours(scheduledAt.getHours() + nextStep.delay_value)
      break
    case 'days':
      scheduledAt.setDate(scheduledAt.getDate() + nextStep.delay_value)
      break
    case 'weeks':
      scheduledAt.setDate(scheduledAt.getDate() + nextStep.delay_value * 7)
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
