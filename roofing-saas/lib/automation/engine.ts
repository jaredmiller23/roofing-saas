/**
 * Workflow Execution Engine
 * Core engine for executing automation workflows
 *
 * Uses persistent scheduling via workflow-scheduler.ts for reliable execution.
 * Steps with delays are scheduled in the database and processed by cron.
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import type { Json } from '@/lib/types/database.types'
import {
  type TriggerType,
  type WorkflowStep,
} from './types'
import { executeStep } from './executors'
import { replaceVariables } from './variables'
import { startWorkflowExecution } from './workflow-scheduler'

/**
 * Trigger a workflow based on an event
 */
export async function triggerWorkflow(
  tenantId: string,
  triggerType: TriggerType,
  triggerData: Record<string, unknown>
): Promise<string[]> {
  try {
    const supabase = await createClient()

    logger.info('Triggering workflows', {
      tenantId,
      triggerType,
      triggerData,
    })

    // Find active workflows for this trigger type
    const { data: workflows, error } = await supabase
      .from('workflows')
      .select('id, name, trigger_config')
      .eq('tenant_id', tenantId)
      .eq('trigger_type', triggerType)
      .eq('is_active', true)
      .eq('is_deleted', false)

    if (error || !workflows || workflows.length === 0) {
      logger.info('No active workflows found for trigger', { triggerType })
      return []
    }

    const executionIds: string[] = []

    // Create execution for each matching workflow
    for (const workflow of workflows) {
      // Check if trigger config matches (if specified)
      if (!matchesTriggerConfig((workflow.trigger_config ?? {}) as Record<string, unknown>, triggerData)) {
        continue
      }

      const { data: execution, error: execError } = await supabase
        .from('workflow_executions')
        .insert({
          workflow_id: workflow.id,
          tenant_id: tenantId,
          trigger_data: triggerData as unknown as Json,
          status: 'pending',
        })
        .select('id')
        .single()

      if (execError || !execution) {
        logger.error('Failed to create workflow execution', {
          error: execError,
          workflowId: workflow.id,
        })
        continue
      }

      executionIds.push(execution.id)

      logger.info('Workflow execution created', {
        executionId: execution.id,
        workflowId: workflow.id,
        workflowName: workflow.name,
      })

      // Start execution via persistent scheduler (schedules first step)
      // This is fire-and-forget - the cron job will process scheduled steps
      startWorkflowExecution(
        execution.id,
        workflow.id,
        triggerData
      ).catch((error) => {
        logger.error('Failed to start workflow execution', {
          error,
          executionId: execution.id,
        })
      })
    }

    return executionIds
  } catch (error) {
    logger.error('Error triggering workflows', { error, triggerType })
    return []
  }
}

/**
 * Check if trigger data matches workflow trigger config
 */
function matchesTriggerConfig(config: Record<string, unknown>, data: Record<string, unknown>): boolean {
  // If no config, always match
  if (!config || Object.keys(config).length === 0) {
    return true
  }

  // Check each config key matches data
  for (const [key, value] of Object.entries(config)) {
    if (data[key] !== value) {
      return false
    }
  }

  return true
}

/**
 * Execute a workflow synchronously (DEPRECATED)
 *
 * @deprecated Use startWorkflowExecution() + cron processing instead.
 * This function uses setTimeout for delays which doesn't survive process restarts.
 * Kept for backwards compatibility only.
 */
export async function executeWorkflow(executionId: string): Promise<void> {
  const supabase = await createClient()

  try {
    // Get execution details
    const { data: execution, error: execError } = await supabase
      .from('workflow_executions')
      .select('*, workflow_id, trigger_data, tenant_id')
      .eq('id', executionId)
      .single()

    if (execError || !execution) {
      throw new Error(`Execution not found: ${executionId}`)
    }

    // Update status to running
    await supabase
      .from('workflow_executions')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .eq('id', executionId)

    // Get workflow steps in order
    const { data: steps, error: stepsError } = await supabase
      .from('workflow_steps')
      .select('*')
      .eq('workflow_id', execution.workflow_id)
      .order('step_order', { ascending: true })

    if (stepsError || !steps || steps.length === 0) {
      throw new Error('No workflow steps found')
    }

    logger.info('Executing workflow', {
      executionId,
      workflowId: execution.workflow_id,
      stepCount: steps.length,
    })

    // Execute each step in order
    for (const step of steps) {
      await executeWorkflowStep(executionId, step as WorkflowStep, execution.trigger_data as Record<string, unknown>)

      // Handle delay if specified
      if (step.delay_minutes && step.delay_minutes > 0) {
        logger.info('Delaying before next step', {
          executionId,
          stepId: step.id,
          delayMinutes: step.delay_minutes,
        })
        // In production, this should use a job queue instead of setTimeout
        await new Promise((resolve) => setTimeout(resolve, (step.delay_minutes ?? 0) * 60 * 1000))
      }
    }

    // Mark execution as completed
    await supabase
      .from('workflow_executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', executionId)

    logger.info('Workflow execution completed', { executionId })
  } catch (error) {
    // Mark execution as failed
    await supabase
      .from('workflow_executions')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: (error as Error).message,
      })
      .eq('id', executionId)

    logger.error('Workflow execution failed', {
      error,
      executionId,
    })

    throw error
  }
}

/**
 * Execute a single workflow step
 */
async function executeWorkflowStep(
  executionId: string,
  step: WorkflowStep,
  triggerData: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient()

  try {
    // Create step execution record
    const { data: stepExecution, error: createError } = await supabase
      .from('workflow_step_executions')
      .insert({
        execution_id: executionId,
        step_id: step.id,
        status: 'pending',
      })
      .select('id')
      .single()

    if (createError || !stepExecution) {
      throw new Error('Failed to create step execution')
    }

    // Update step execution to running
    await supabase
      .from('workflow_step_executions')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .eq('id', stepExecution.id)

    logger.info('Executing workflow step', {
      executionId,
      stepId: step.id,
      stepType: step.step_type,
    })

    // Replace variables in step config
    const processedConfig = replaceVariables(step.step_config, {
      trigger: triggerData,
    })

    // Execute the step
    const result = await executeStep(step.step_type, processedConfig as Record<string, unknown>)

    // Update step execution to completed
    await supabase
      .from('workflow_step_executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result_data: result as unknown as Json,
      })
      .eq('id', stepExecution.id)

    logger.info('Workflow step completed', {
      executionId,
      stepId: step.id,
      stepType: step.step_type,
    })
  } catch (error) {
    // Update step execution to failed
    const { data: stepExecution } = await supabase
      .from('workflow_step_executions')
      .select('id')
      .eq('execution_id', executionId)
      .eq('step_id', step.id)
      .single()

    if (stepExecution) {
      await supabase
        .from('workflow_step_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: (error as Error).message,
        })
        .eq('id', stepExecution.id)
    }

    logger.error('Workflow step failed', {
      error,
      executionId,
      stepId: step.id,
    })

    throw error
  }
}
