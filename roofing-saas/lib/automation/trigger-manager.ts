/**
 * Trigger Manager
 * Handles event detection and workflow triggering
 */

import type {
  Workflow,
  WorkflowTrigger,
  TriggerType,
  TriggerConfig,
  ContactCreatedConfig,
  StageChangedConfig,
  FieldChangedConfig,
  TimeElapsedConfig,
  ScheduledConfig,
  VariableContext
} from './workflow-types'
import type { WorkflowEngine } from './workflow-engine'

export class TriggerManager {
  private engine: WorkflowEngine
  private registeredWorkflows: Map<string, Workflow> = new Map()
  private scheduledTriggers: Map<string, NodeJS.Timeout> = new Map()
  private eventListeners: Map<TriggerType, Set<string>> = new Map()

  constructor(engine: WorkflowEngine) {
    this.engine = engine
  }

  /**
   * Initialize the trigger manager
   */
  async initialize(): Promise<void> {
    // Set up global event listeners
    this.setupEventListeners()

    // Set up scheduled triggers
    await this.setupScheduledTriggers()

    console.log('Trigger Manager initialized')
  }

  /**
   * Register a workflow trigger
   */
  registerTrigger(workflow: Workflow): void {
    this.registeredWorkflows.set(workflow.id, workflow)

    const triggerType = workflow.trigger.type
    if (!this.eventListeners.has(triggerType)) {
      this.eventListeners.set(triggerType, new Set())
    }
    this.eventListeners.get(triggerType)!.add(workflow.id)

    // Set up scheduled triggers for time-based workflows
    if (triggerType === 'scheduled') {
      this.setupScheduledTrigger(workflow)
    } else if (triggerType === 'time_elapsed') {
      this.setupTimeElapsedTrigger(workflow)
    }

    console.log(`Registered trigger for workflow: ${workflow.name}`)
  }

  /**
   * Unregister a workflow trigger
   */
  unregisterTrigger(workflowId: string): void {
    const workflow = this.registeredWorkflows.get(workflowId)
    if (!workflow) return

    this.registeredWorkflows.delete(workflowId)

    const triggerType = workflow.trigger.type
    const listeners = this.eventListeners.get(triggerType)
    if (listeners) {
      listeners.delete(workflowId)
      if (listeners.size === 0) {
        this.eventListeners.delete(triggerType)
      }
    }

    // Clean up scheduled triggers
    const scheduledTrigger = this.scheduledTriggers.get(workflowId)
    if (scheduledTrigger) {
      clearTimeout(scheduledTrigger)
      this.scheduledTriggers.delete(workflowId)
    }

    console.log(`Unregistered trigger for workflow: ${workflowId}`)
  }

  /**
   * Handle contact created event
   */
  async handleContactCreated(contactData: any): Promise<void> {
    const workflows = this.getWorkflowsForTrigger('contact_created')

    for (const workflow of workflows) {
      const config = workflow.trigger.config as ContactCreatedConfig

      if (this.matchesContactCreatedConfig(contactData, config)) {
        const context: VariableContext = {
          contact: contactData,
          user: { id: contactData.created_by }
        }

        await this.engine.executeWorkflow(workflow, { contact: contactData }, context)
      }
    }
  }

  /**
   * Handle contact updated event
   */
  async handleContactUpdated(contactData: any, previousData: any): Promise<void> {
    // Check for stage changes
    if (contactData.stage !== previousData.stage) {
      await this.handleStageChanged(contactData, previousData.stage, contactData.stage)
    }

    // Check for field changes
    await this.handleFieldChanges(contactData, previousData)

    // Handle general contact updated events
    const workflows = this.getWorkflowsForTrigger('contact_updated')
    for (const workflow of workflows) {
      const context: VariableContext = {
        contact: contactData,
        previous_contact: previousData
      }

      await this.engine.executeWorkflow(
        workflow,
        { contact: contactData, previous: previousData },
        context
      )
    }
  }

  /**
   * Handle stage changed event
   */
  private async handleStageChanged(
    contactData: any,
    fromStage: string,
    toStage: string
  ): Promise<void> {
    const workflows = this.getWorkflowsForTrigger('stage_changed')

    for (const workflow of workflows) {
      const config = workflow.trigger.config as StageChangedConfig

      if (this.matchesStageChangedConfig(contactData, fromStage, toStage, config)) {
        const context: VariableContext = {
          contact: contactData,
          stage_change: { from: fromStage, to: toStage }
        }

        await this.engine.executeWorkflow(
          workflow,
          { contact: contactData, stage_change: { from: fromStage, to: toStage } },
          context
        )
      }
    }
  }

  /**
   * Handle field changes
   */
  private async handleFieldChanges(contactData: any, previousData: any): Promise<void> {
    const workflows = this.getWorkflowsForTrigger('field_changed')

    for (const workflow of workflows) {
      const config = workflow.trigger.config as FieldChangedConfig
      const field = config.field

      const currentValue = contactData[field]
      const previousValue = previousData[field]

      if (this.matchesFieldChangeConfig(previousValue, currentValue, config)) {
        const context: VariableContext = {
          contact: contactData,
          field_change: {
            field: field,
            from: previousValue,
            to: currentValue
          }
        }

        await this.engine.executeWorkflow(
          workflow,
          {
            contact: contactData,
            field_change: { field, from: previousValue, to: currentValue }
          },
          context
        )
      }
    }
  }

  /**
   * Handle form submitted event
   */
  async handleFormSubmitted(formData: any): Promise<void> {
    const workflows = this.getWorkflowsForTrigger('form_submitted')

    for (const workflow of workflows) {
      const context: VariableContext = {
        form: formData,
        contact: formData.contact
      }

      await this.engine.executeWorkflow(workflow, { form: formData }, context)
    }
  }

  /**
   * Handle project created event
   */
  async handleProjectCreated(projectData: any): Promise<void> {
    const workflows = this.getWorkflowsForTrigger('project_created')

    for (const workflow of workflows) {
      const context: VariableContext = {
        project: projectData,
        contact: projectData.contact
      }

      await this.engine.executeWorkflow(workflow, { project: projectData }, context)
    }
  }

  /**
   * Manually trigger a workflow
   */
  async triggerManual(workflowId: string, triggerData: any = {}): Promise<void> {
    const workflow = this.registeredWorkflows.get(workflowId)
    if (!workflow || workflow.trigger.type !== 'manual') {
      throw new Error(`Manual workflow not found: ${workflowId}`)
    }

    const context: VariableContext = triggerData.context || {}
    await this.engine.executeWorkflow(workflow, triggerData, context)
  }

  /**
   * Set up global event listeners
   */
  private setupEventListeners(): void {
    // In a real application, these would be connected to your event system
    // For now, we'll provide methods that can be called by other parts of the application
    console.log('Event listeners set up for workflow triggers')
  }

  /**
   * Set up scheduled triggers
   */
  private async setupScheduledTriggers(): Promise<void> {
    const workflows = this.getWorkflowsForTrigger('scheduled')

    for (const workflow of workflows) {
      this.setupScheduledTrigger(workflow)
    }
  }

  /**
   * Set up a single scheduled trigger
   */
  private setupScheduledTrigger(workflow: Workflow): void {
    const config = workflow.trigger.config as ScheduledConfig
    let interval: number

    switch (config.schedule) {
      case 'daily':
        interval = 24 * 60 * 60 * 1000 // 24 hours
        break
      case 'weekly':
        interval = 7 * 24 * 60 * 60 * 1000 // 7 days
        break
      case 'monthly':
        interval = 30 * 24 * 60 * 60 * 1000 // 30 days (approximate)
        break
      default:
        return // cron expressions not implemented in this demo
    }

    const timer = setInterval(async () => {
      const context: VariableContext = {
        schedule: { type: config.schedule, time: new Date().toISOString() }
      }

      await this.engine.executeWorkflow(
        workflow,
        { scheduled_time: new Date().toISOString() },
        context
      )
    }, interval)

    this.scheduledTriggers.set(workflow.id, timer)
  }

  /**
   * Set up time elapsed trigger checking
   */
  private setupTimeElapsedTrigger(workflow: Workflow): void {
    const config = workflow.trigger.config as TimeElapsedConfig

    // Check every hour for time elapsed conditions
    const timer = setInterval(async () => {
      await this.checkTimeElapsedConditions(workflow, config)
    }, 60 * 60 * 1000) // Check every hour

    this.scheduledTriggers.set(workflow.id, timer)
  }

  /**
   * Check time elapsed conditions
   */
  private async checkTimeElapsedConditions(
    workflow: Workflow,
    config: TimeElapsedConfig
  ): Promise<void> {
    try {
      // In a real implementation, this would query the database for records
      // that match the time elapsed criteria
      const response = await fetch('/api/contacts/time-elapsed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: config.duration,
          field: config.field,
          custom_field: config.custom_field,
          contact_stage: config.contact_stage
        })
      })

      const { contacts } = await response.json()

      for (const contact of contacts) {
        const context: VariableContext = {
          contact: contact,
          time_elapsed: {
            duration: config.duration,
            field: config.field
          }
        }

        await this.engine.executeWorkflow(
          workflow,
          { contact, time_elapsed: config },
          context
        )
      }
    } catch (error) {
      console.error('Error checking time elapsed conditions:', error)
    }
  }

  /**
   * Get workflows for a specific trigger type
   */
  private getWorkflowsForTrigger(triggerType: TriggerType): Workflow[] {
    const workflowIds = this.eventListeners.get(triggerType) || new Set()
    return Array.from(workflowIds)
      .map(id => this.registeredWorkflows.get(id))
      .filter((workflow): workflow is Workflow => workflow !== undefined)
      .filter(workflow => workflow.trigger.enabled && workflow.status === 'active')
  }

  /**
   * Check if contact matches contact created config
   */
  private matchesContactCreatedConfig(
    contactData: any,
    config: ContactCreatedConfig
  ): boolean {
    if (config.contact_type && !config.contact_type.includes(contactData.type)) {
      return false
    }

    if (config.contact_category && !config.contact_category.includes(contactData.contact_category)) {
      return false
    }

    if (config.source && !config.source.includes(contactData.source)) {
      return false
    }

    if (config.assigned_to && !config.assigned_to.includes(contactData.assigned_to)) {
      return false
    }

    return true
  }

  /**
   * Check if stage change matches config
   */
  private matchesStageChangedConfig(
    contactData: any,
    fromStage: string,
    toStage: string,
    config: StageChangedConfig
  ): boolean {
    if (config.from_stage && !config.from_stage.includes(fromStage as any)) {
      return false
    }

    if (config.to_stage && !config.to_stage.includes(toStage as any)) {
      return false
    }

    if (config.contact_type && !config.contact_type.includes(contactData.type)) {
      return false
    }

    return true
  }

  /**
   * Check if field change matches config
   */
  private matchesFieldChangeConfig(
    previousValue: any,
    currentValue: any,
    config: FieldChangedConfig
  ): boolean {
    if (previousValue === currentValue) {
      return false // No actual change
    }

    if (config.from_value !== undefined && previousValue !== config.from_value) {
      return false
    }

    if (config.to_value !== undefined) {
      const operator = config.operator || 'equals'

      switch (operator) {
        case 'equals':
          return currentValue === config.to_value
        case 'not_equals':
          return currentValue !== config.to_value
        case 'contains':
          return String(currentValue).includes(String(config.to_value))
        case 'greater_than':
          return Number(currentValue) > Number(config.to_value)
        case 'less_than':
          return Number(currentValue) < Number(config.to_value)
        default:
          return false
      }
    }

    return true
  }
}