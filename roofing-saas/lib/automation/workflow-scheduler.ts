/**
 * Workflow Scheduler
 *
 * Handles persistent scheduling of workflow step executions.
 * Uses database-backed scheduling instead of setTimeout for reliability.
 *
 * Pattern: Same as campaign execution engine - cron polls for due steps.
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import type { Json } from '@/lib/types/database.types'
import type { WorkflowStep } from './types'
import { executeStep } from './executors'
import { replaceVariables } from './variables'

// Type for pending execution with joined data
interface PendingWorkflowStepExecution {
  id: string
  execution_id: string
  step_id: string
  scheduled_at: string | null
  trigger_data: Json | null
  workflow_executions: {
    id: string
    workflow_id: string
    tenant_id: string
    status: string
  }
  workflow_steps: {
    id: string
    step_type: string
    step_config: Json
    step_order: number
    delay_minutes: number | null
    workflow_id: string
  }
}

/**
 * Process all pending workflow step executions that are due
 * Called by cron job every minute
 */
export async function processPendingWorkflowExecutions(): Promise<{
  processed: number
  succeeded: number
  failed: number
}> {
  const supabase = await createClient()

  // Get all pending step executions that are due
  // Note: Uses joins via foreign keys (execution_id -> workflow_executions, step_id -> workflow_steps)
  const { data: rawData, error } = await supabase
    .from('workflow_step_executions')
    .select(
      `
      id,
      execution_id,
      step_id,
      scheduled_at,
      trigger_data,
      workflow_executions!execution_id(
        id,
        workflow_id,
        tenant_id,
        status
      ),
      workflow_steps!step_id(
        id,
        step_type,
        step_config,
        step_order,
        delay_minutes,
        workflow_id
      )
    `
    )
    .eq('status', 'pending')
    .not('scheduled_at', 'is', null)
    .lte('scheduled_at', new Date().toISOString())

  if (error || !rawData) {
    logger.error('[Workflow Scheduler] Error fetching pending executions', {
      error: error?.message,
    })
    return { processed: 0, succeeded: 0, failed: 0 }
  }

  // Cast and filter to only running workflow executions
  const pendingExecutions = (rawData as unknown as PendingWorkflowStepExecution[])
    .filter(exec => exec.workflow_executions?.status === 'running')

  let succeeded = 0
  let failed = 0

  for (const execution of pendingExecutions) {
    try {
      await processScheduledStep(execution)
      succeeded++
    } catch (error) {
      logger.error(`[Workflow Scheduler] Error processing step ${execution.id}`, {
        error: error instanceof Error ? error.message : String(error),
      })
      failed++
    }
  }

  if (pendingExecutions.length > 0) {
    logger.info('[Workflow Scheduler] Processing complete', {
      processed: pendingExecutions.length,
      succeeded,
      failed,
    })
  }

  return {
    processed: pendingExecutions.length,
    succeeded,
    failed,
  }
}

/**
 * Process a single scheduled step execution
 */
async function processScheduledStep(
  execution: PendingWorkflowStepExecution
): Promise<void> {
  const supabase = await createClient()
  const step = execution.workflow_steps as unknown as WorkflowStep
  const triggerData = (execution.trigger_data ?? {}) as Record<string, unknown>

  // Mark step as running
  await supabase
    .from('workflow_step_executions')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .eq('id', execution.id)

  try {
    logger.info('[Workflow Scheduler] Executing scheduled step', {
      executionId: execution.execution_id,
      stepId: step.id,
      stepType: step.step_type,
    })

    // Replace variables in step config
    const processedConfig = replaceVariables(step.step_config, {
      trigger: triggerData,
    })

    // Execute the step
    const result = await executeStep(
      step.step_type,
      processedConfig as Record<string, unknown>
    )

    // Mark step as completed
    await supabase
      .from('workflow_step_executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result_data: result as unknown as Json,
      })
      .eq('id', execution.id)

    logger.info('[Workflow Scheduler] Step completed', {
      executionId: execution.execution_id,
      stepId: step.id,
    })

    // Schedule next step
    await scheduleNextWorkflowStep(
      execution.execution_id,
      execution.workflow_executions.workflow_id,
      step.step_order,
      triggerData
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Mark step as failed
    await supabase
      .from('workflow_step_executions')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq('id', execution.id)

    // Mark the entire workflow execution as failed
    await supabase
      .from('workflow_executions')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: `Step failed: ${errorMessage}`,
      })
      .eq('id', execution.execution_id)

    throw error
  }
}

/**
 * Schedule the next step in the workflow
 */
async function scheduleNextWorkflowStep(
  executionId: string,
  workflowId: string,
  currentStepOrder: number,
  triggerData: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient()

  // Get next step in sequence
  const { data: nextStep } = await supabase
    .from('workflow_steps')
    .select('*')
    .eq('workflow_id', workflowId)
    .gt('step_order', currentStepOrder)
    .order('step_order', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!nextStep) {
    // No more steps - mark workflow execution as completed
    await supabase
      .from('workflow_executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', executionId)

    logger.info('[Workflow Scheduler] Workflow completed', { executionId })
    return
  }

  // Calculate scheduled time based on delay
  const scheduledAt = new Date()
  if (nextStep.delay_minutes && nextStep.delay_minutes > 0) {
    scheduledAt.setMinutes(scheduledAt.getMinutes() + nextStep.delay_minutes)
  }

  // Create step execution with scheduled time
  await supabase.from('workflow_step_executions').insert({
    execution_id: executionId,
    step_id: nextStep.id,
    status: 'pending',
    scheduled_at: scheduledAt.toISOString(),
    trigger_data: triggerData as unknown as Json,
  })

  logger.info('[Workflow Scheduler] Next step scheduled', {
    executionId,
    stepId: nextStep.id,
    scheduledAt: scheduledAt.toISOString(),
    delayMinutes: nextStep.delay_minutes,
  })
}

/**
 * Start a workflow execution by scheduling the first step
 * Called when a workflow is triggered
 */
export async function startWorkflowExecution(
  executionId: string,
  workflowId: string,
  triggerData: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient()

  // Get first step
  const { data: firstStep } = await supabase
    .from('workflow_steps')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('step_order', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!firstStep) {
    // No steps - mark as completed immediately
    await supabase
      .from('workflow_executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', executionId)
    return
  }

  // Schedule first step for immediate execution
  await supabase.from('workflow_step_executions').insert({
    execution_id: executionId,
    step_id: firstStep.id,
    status: 'pending',
    scheduled_at: new Date().toISOString(), // Execute immediately
    trigger_data: triggerData as unknown as Json,
  })

  // Update execution to running
  await supabase
    .from('workflow_executions')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .eq('id', executionId)

  logger.info('[Workflow Scheduler] Workflow execution started', {
    executionId,
    workflowId,
    firstStepId: firstStep.id,
  })
}
