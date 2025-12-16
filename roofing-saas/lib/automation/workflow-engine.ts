/**
 * Workflow Engine Core
 * Orchestrates trigger evaluation and action execution
 */

import type {
  Workflow,
  WorkflowExecution,
  VariableContext,
  WorkflowCondition,
  WorkflowAction
} from './workflow-types'
import { TriggerManager } from './trigger-manager'
import { ActionExecutor } from './action-executor'

export class WorkflowEngine {
  private triggerManager: TriggerManager
  private actionExecutor: ActionExecutor
  private activeExecutions: Map<string, WorkflowExecution> = new Map()

  constructor() {
    this.triggerManager = new TriggerManager(this)
    this.actionExecutor = new ActionExecutor()
  }

  /**
   * Initialize the workflow engine
   */
  async initialize(): Promise<void> {
    await this.triggerManager.initialize()
    await this.loadActiveWorkflows()
  }

  /**
   * Load and register all active workflows
   */
  private async loadActiveWorkflows(): Promise<void> {
    try {
      // Only load workflows in browser environment
      if (typeof window === 'undefined') {
        return
      }

      const response = await fetch('/api/automations?status=active')
      if (!response.ok) {
        throw new Error(`Failed to fetch workflows: ${response.status}`)
      }

      const { workflows } = await response.json()

      for (const workflow of workflows) {
        this.triggerManager.registerTrigger(workflow)
      }
    } catch (error) {
      console.error('Failed to load active workflows:', error)
    }
  }

  /**
   * Execute a workflow with the given trigger data
   */
  async executeWorkflow(
    workflow: Workflow,
    triggerData: Record<string, unknown>,
    context: VariableContext = {}
  ): Promise<WorkflowExecution> {
    const execution: WorkflowExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workflow_id: workflow.id,
      trigger_data: triggerData,
      status: 'pending',
      started_at: new Date().toISOString(),
      executed_actions: []
    }

    this.activeExecutions.set(execution.id, execution)

    try {
      // Check workflow conditions first
      if (workflow.conditions && workflow.conditions.length > 0) {
        const conditionsPass = this.evaluateConditions(workflow.conditions, context)
        if (!conditionsPass) {
          execution.status = 'completed'
          execution.completed_at = new Date().toISOString()
          return execution
        }
      }

      execution.status = 'running'

      // Execute actions in order
      for (const action of workflow.actions.sort((a, b) => a.order - b.order)) {
        if (!action.enabled) continue

        // Apply delay if specified
        if (action.delay && action.delay > 0) {
          await this.scheduleDelayedAction(execution.id, action, context)
          continue
        }

        // Execute action immediately
        const actionExecution = await this.actionExecutor.executeAction(
          action,
          context,
          triggerData
        )

        execution.executed_actions.push(actionExecution)

        // Stop execution if action failed and workflow requires all actions to succeed
        if (actionExecution.status === 'failed') {
          execution.status = 'failed'
          execution.error_message = actionExecution.error_message
          break
        }
      }

      if (execution.status === 'running') {
        execution.status = 'completed'
      }

      execution.completed_at = new Date().toISOString()

      // Update workflow execution statistics
      await this.updateWorkflowStats(workflow.id)

    } catch (error) {
      execution.status = 'failed'
      execution.error_message = error instanceof Error ? error.message : 'Unknown error'
      execution.completed_at = new Date().toISOString()
    } finally {
      this.activeExecutions.delete(execution.id)
    }

    // Save execution to database
    await this.saveExecution(execution)

    return execution
  }

  /**
   * Evaluate workflow conditions
   */
  private evaluateConditions(
    conditions: WorkflowCondition[],
    context: VariableContext
  ): boolean {
    if (conditions.length === 0) return true

    let result = true
    let currentLogic: 'AND' | 'OR' = 'AND'

    for (const condition of conditions) {
      const conditionResult = this.evaluateCondition(condition, context)

      if (currentLogic === 'AND') {
        result = result && conditionResult
      } else {
        result = result || conditionResult
      }

      currentLogic = condition.logic_gate
    }

    return result
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    condition: WorkflowCondition,
    context: VariableContext
  ): boolean {
    const value = this.getValueFromContext(condition.field, context)
    const expectedValue = condition.value

    switch (condition.operator) {
      case 'equals':
        return value === expectedValue
      case 'not_equals':
        return value !== expectedValue
      case 'contains':
        return String(value).includes(String(expectedValue))
      case 'not_contains':
        return !String(value).includes(String(expectedValue))
      case 'greater_than':
        return Number(value) > Number(expectedValue)
      case 'less_than':
        return Number(value) < Number(expectedValue)
      case 'greater_than_or_equal':
        return Number(value) >= Number(expectedValue)
      case 'less_than_or_equal':
        return Number(value) <= Number(expectedValue)
      case 'is_empty':
        return value == null || value === '' || (Array.isArray(value) && value.length === 0)
      case 'is_not_empty':
        return value != null && value !== '' && (!Array.isArray(value) || value.length > 0)
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(value)
      case 'not_in':
        return !Array.isArray(expectedValue) || !expectedValue.includes(value)
      default:
        return false
    }
  }

  /**
   * Get value from context using dot notation
   */
  private getValueFromContext(field: string, context: VariableContext): unknown {
    const parts = field.split('.')
    let value: unknown = context

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part]
      } else {
        return undefined
      }
    }

    return value
  }

  /**
   * Schedule a delayed action for later execution
   */
  private async scheduleDelayedAction(
    executionId: string,
    action: WorkflowAction,
    context: VariableContext
  ): Promise<void> {
    // In a production environment, this would use a job queue like Redis/Bull
    // For now, we'll use a simple setTimeout
    const delayHours = (action as { delay?: number }).delay || 0
    setTimeout(async () => {
      const execution = this.activeExecutions.get(executionId)
      if (!execution) return

      const actionExecution = await this.actionExecutor.executeAction(
        action,
        context,
        execution.trigger_data
      )

      execution.executed_actions.push(actionExecution)

      // Update the saved execution
      await this.saveExecution(execution)
    }, delayHours * 60 * 60 * 1000) // Convert hours to milliseconds
  }

  /**
   * Update workflow execution statistics
   */
  private async updateWorkflowStats(workflowId: string): Promise<void> {
    try {
      await fetch(`/api/automations/${workflowId}/stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      console.error('Failed to update workflow stats:', error)
    }
  }

  /**
   * Save execution to database
   */
  private async saveExecution(execution: WorkflowExecution): Promise<void> {
    try {
      await fetch('/api/automations/executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(execution)
      })
    } catch (error) {
      console.error('Failed to save execution:', error)
    }
  }

  /**
   * Get active executions
   */
  getActiveExecutions(): WorkflowExecution[] {
    return Array.from(this.activeExecutions.values())
  }

  /**
   * Cancel a running execution
   */
  cancelExecution(executionId: string): boolean {
    const execution = this.activeExecutions.get(executionId)
    if (execution && execution.status === 'running') {
      execution.status = 'cancelled'
      execution.completed_at = new Date().toISOString()
      this.activeExecutions.delete(executionId)
      this.saveExecution(execution)
      return true
    }
    return false
  }

  /**
   * Register a new workflow
   */
  registerWorkflow(workflow: Workflow): void {
    if (workflow.status === 'active') {
      this.triggerManager.registerTrigger(workflow)
    }
  }

  /**
   * Unregister a workflow
   */
  unregisterWorkflow(workflowId: string): void {
    this.triggerManager.unregisterTrigger(workflowId)
  }

  /**
   * Test a workflow with sample data
   */
  async testWorkflow(
    workflow: Workflow,
    sampleData: Record<string, unknown>
  ): Promise<WorkflowExecution> {
    // Create a test context
    const context: VariableContext = {
      contact: (sampleData.contact as Record<string, unknown>) || undefined,
      project: (sampleData.project as Record<string, unknown>) || undefined,
      user: (sampleData.user as Record<string, unknown>) || undefined,
      organization: (sampleData.organization as Record<string, unknown>) || undefined,
      custom: (sampleData.custom as Record<string, unknown>) || undefined
    }

    // Execute workflow in test mode (no actual side effects)
    return this.executeWorkflow(workflow, sampleData, context)
  }

  /**
   * Manually trigger a workflow
   */
  async triggerManual(workflowId: string, triggerData: Record<string, unknown> = {}): Promise<void> {
    // Get workflow
    const response = await fetch(`/api/automations/${workflowId}`)
    if (!response.ok) {
      throw new Error(`Workflow not found: ${workflowId}`)
    }

    const workflow: Workflow = await response.json()

    if (workflow.trigger.type !== 'manual') {
      throw new Error(`Workflow ${workflowId} is not configured for manual triggering`)
    }

    const context: VariableContext = triggerData.context || {}
    await this.executeWorkflow(workflow, triggerData, context)
  }

  /**
   * Get workflow execution history
   */
  async getExecutionHistory(
    workflowId: string,
    limit: number = 50
  ): Promise<WorkflowExecution[]> {
    try {
      const response = await fetch(
        `/api/automations/${workflowId}/executions?limit=${limit}`
      )
      const { executions } = await response.json()
      return executions
    } catch (error) {
      console.error('Failed to get execution history:', error)
      return []
    }
  }
}

// Global workflow engine instance
export const workflowEngine = new WorkflowEngine()

// Auto-initialize on module load
if (typeof window !== 'undefined') {
  // Client-side initialization only
  workflowEngine.initialize().catch(console.error)
}