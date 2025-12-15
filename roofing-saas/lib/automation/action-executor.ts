/**
 * Action Executor
 * Executes workflow actions with proper error handling and logging
 */

import type {
  WorkflowAction,
  ActionExecution,
  VariableContext,
  SendEmailConfig,
  SendSMSConfig,
  CreateTaskConfig,
  UpdateFieldConfig,
  ChangeStageConfig,
  AssignUserConfig,
  AddTagConfig,
  RemoveTagConfig,
  WebhookConfig,
  WaitConfig,
  CreateProjectConfig
} from './workflow-types'

export class ActionExecutor {
  /**
   * Execute a workflow action
   */
  async executeAction(
    action: WorkflowAction,
    context: VariableContext,
    triggerData: Record<string, unknown>
  ): Promise<ActionExecution> {
    const execution: ActionExecution = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action_id: action.id,
      status: 'pending',
      started_at: new Date().toISOString()
    }

    try {
      execution.status = 'running'

      let result: unknown
      switch (action.type) {
        case 'send_email':
          result = await this.executeSendEmail(action.config as SendEmailConfig, context)
          break
        case 'send_sms':
          result = await this.executeSendSMS(action.config as SendSMSConfig, context)
          break
        case 'create_task':
          result = await this.executeCreateTask(action.config as CreateTaskConfig, context)
          break
        case 'update_field':
          result = await this.executeUpdateField(action.config as UpdateFieldConfig, context, triggerData)
          break
        case 'change_stage':
          result = await this.executeChangeStage(action.config as ChangeStageConfig, context)
          break
        case 'assign_user':
          result = await this.executeAssignUser(action.config as AssignUserConfig, context)
          break
        case 'add_tag':
          result = await this.executeAddTag(action.config as AddTagConfig, context)
          break
        case 'remove_tag':
          result = await this.executeRemoveTag(action.config as RemoveTagConfig, context)
          break
        case 'webhook':
          result = await this.executeWebhook(action.config as WebhookConfig, context, triggerData)
          break
        case 'wait':
          result = await this.executeWait(action.config as WaitConfig)
          break
        case 'create_project':
          result = await this.executeCreateProject(action.config as CreateProjectConfig, context)
          break
        default:
          throw new Error(`Unknown action type: ${action.type}`)
      }

      execution.status = 'completed'
      execution.output = result
    } catch (error) {
      execution.status = 'failed'
      execution.error_message = error instanceof Error ? error.message : 'Unknown error'
    } finally {
      execution.completed_at = new Date().toISOString()
    }

    return execution
  }

  /**
   * Execute send email action
   */
  private async executeSendEmail(
    config: SendEmailConfig,
    context: VariableContext
  ): Promise<unknown> {
    const to = this.interpolateTemplate(config.to, context)
    const subject = this.interpolateTemplate(config.subject, context)
    const body = this.interpolateTemplate(config.body, context)

    const emailData = {
      to,
      subject,
      body,
      from_name: config.from_name,
      from_email: config.from_email,
      template_id: config.template_id
    }

    const response = await fetch('/api/notifications/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailData)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to send email: ${error}`)
    }

    return await response.json()
  }

  /**
   * Execute send SMS action
   */
  private async executeSendSMS(
    config: SendSMSConfig,
    context: VariableContext
  ): Promise<unknown> {
    const to = this.interpolateTemplate(config.to, context)
    const message = this.interpolateTemplate(config.message, context)

    const smsData = {
      to,
      message,
      template_id: config.template_id
    }

    const response = await fetch('/api/notifications/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(smsData)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to send SMS: ${error}`)
    }

    return await response.json()
  }

  /**
   * Execute create task action
   */
  private async executeCreateTask(
    config: CreateTaskConfig,
    context: VariableContext
  ): Promise<unknown> {
    const title = this.interpolateTemplate(config.title, context)
    const description = config.description ? this.interpolateTemplate(config.description, context) : undefined
    const assignedTo = config.assigned_to ? this.interpolateTemplate(config.assigned_to, context) : undefined
    const contactId = config.contact_id ? this.interpolateTemplate(config.contact_id, context) : undefined

    const taskData = {
      title,
      description,
      due_date: this.parseDueDate(config.due_date),
      assigned_to: assignedTo,
      priority: config.priority || 'normal',
      contact_id: contactId
    }

    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to create task: ${error}`)
    }

    return await response.json()
  }

  /**
   * Execute update field action
   */
  private async executeUpdateField(
    config: UpdateFieldConfig,
    context: VariableContext,
    triggerData: Record<string, unknown>
  ): Promise<unknown> {
    const contact = context.contact as Record<string, unknown> | undefined
    const triggerContact = triggerData.contact as Record<string, unknown> | undefined
    const contactId = contact?.id || triggerContact?.id
    if (!contactId) {
      throw new Error('No contact ID found for field update')
    }

    let value = config.value
    if (typeof value === 'string') {
      value = this.interpolateTemplate(value, context)
    }

    // Handle different operators
    if (config.operator === 'add' || config.operator === 'subtract') {
      // For numeric operations, get current value first
      const response = await fetch(`/api/contacts/${contactId}`)
      const contact = await response.json()
      const currentValue = Number(contact[config.field]) || 0

      if (config.operator === 'add') {
        value = currentValue + Number(value)
      } else if (config.operator === 'subtract') {
        value = currentValue - Number(value)
      }
    } else if (config.operator === 'append') {
      // For string append operations
      const response = await fetch(`/api/contacts/${contactId}`)
      const contact = await response.json()
      const currentValue = String(contact[config.field] || '')
      value = currentValue + String(value)
    }

    const updateData = {
      [config.field]: value
    }

    const response = await fetch(`/api/contacts/${contactId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to update field: ${error}`)
    }

    return await response.json()
  }

  /**
   * Execute change stage action
   */
  private async executeChangeStage(
    config: ChangeStageConfig,
    context: VariableContext
  ): Promise<unknown> {
    const contactId = context.contact?.id
    if (!contactId) {
      throw new Error('No contact ID found for stage change')
    }

    const updateData = {
      stage: config.stage,
      substatus: config.substatus
    }

    const response = await fetch(`/api/contacts/${contactId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to change stage: ${error}`)
    }

    return await response.json()
  }

  /**
   * Execute assign user action
   */
  private async executeAssignUser(
    config: AssignUserConfig,
    context: VariableContext
  ): Promise<unknown> {
    const contactId = context.contact?.id
    if (!contactId) {
      throw new Error('No contact ID found for user assignment')
    }

    const userId = this.interpolateTemplate(config.user_id, context)

    const updateData = {
      assigned_to: userId
    }

    const response = await fetch(`/api/contacts/${contactId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to assign user: ${error}`)
    }

    return await response.json()
  }

  /**
   * Execute add tag action
   */
  private async executeAddTag(
    config: AddTagConfig,
    context: VariableContext
  ): Promise<unknown> {
    const contactId = context.contact?.id
    if (!contactId) {
      throw new Error('No contact ID found for adding tags')
    }

    // Get current tags first
    const response = await fetch(`/api/contacts/${contactId}`)
    if (!response.ok) {
      throw new Error('Failed to get contact for tag update')
    }

    const contact = await response.json()
    const currentTags = contact.tags || []
    const newTags = [...new Set([...currentTags, ...config.tags])]

    const updateData = {
      tags: newTags
    }

    const updateResponse = await fetch(`/api/contacts/${contactId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    })

    if (!updateResponse.ok) {
      const error = await updateResponse.text()
      throw new Error(`Failed to add tags: ${error}`)
    }

    return await updateResponse.json()
  }

  /**
   * Execute remove tag action
   */
  private async executeRemoveTag(
    config: RemoveTagConfig,
    context: VariableContext
  ): Promise<unknown> {
    const contactId = context.contact?.id
    if (!contactId) {
      throw new Error('No contact ID found for removing tags')
    }

    // Get current tags first
    const response = await fetch(`/api/contacts/${contactId}`)
    if (!response.ok) {
      throw new Error('Failed to get contact for tag update')
    }

    const contact = await response.json()
    const currentTags = contact.tags || []
    const newTags = currentTags.filter((tag: string) => !config.tags.includes(tag))

    const updateData = {
      tags: newTags
    }

    const updateResponse = await fetch(`/api/contacts/${contactId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    })

    if (!updateResponse.ok) {
      const error = await updateResponse.text()
      throw new Error(`Failed to remove tags: ${error}`)
    }

    return await updateResponse.json()
  }

  /**
   * Execute webhook action
   */
  private async executeWebhook(
    config: WebhookConfig,
    context: VariableContext,
    triggerData: Record<string, unknown>
  ): Promise<unknown> {
    const url = this.interpolateTemplate(config.url, context)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers
    }

    // Handle authentication
    if (config.auth) {
      switch (config.auth.type) {
        case 'bearer':
          if (config.auth.token) {
            headers['Authorization'] = `Bearer ${config.auth.token}`
          }
          break
        case 'basic':
          if (config.auth.username && config.auth.password) {
            const credentials = Buffer.from(`${config.auth.username}:${config.auth.password}`).toString('base64')
            headers['Authorization'] = `Basic ${credentials}`
          }
          break
        case 'api_key':
          if (config.auth.api_key && config.auth.api_key_header) {
            headers[config.auth.api_key_header] = config.auth.api_key
          }
          break
      }
    }

    let body: string | undefined
    if (config.method !== 'GET' && config.payload) {
      const interpolatedPayload = this.interpolateObject(config.payload, context, triggerData)
      body = JSON.stringify(interpolatedPayload)
    }

    const response = await fetch(url, {
      method: config.method,
      headers,
      body
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Webhook failed with status ${response.status}: ${error}`)
    }

    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      return await response.json()
    } else {
      return await response.text()
    }
  }

  /**
   * Execute wait action
   */
  private async executeWait(config: WaitConfig): Promise<unknown> {
    const durationMs = config.duration * 60 * 60 * 1000 // Convert hours to milliseconds

    await new Promise(resolve => setTimeout(resolve, durationMs))

    return { waited_duration: config.duration }
  }

  /**
   * Execute create project action
   */
  private async executeCreateProject(
    config: CreateProjectConfig,
    context: VariableContext
  ): Promise<unknown> {
    const name = this.interpolateTemplate(config.name, context)
    const description = config.description ? this.interpolateTemplate(config.description, context) : undefined
    const assignedTo = config.assigned_to ? this.interpolateTemplate(config.assigned_to, context) : undefined
    const contactId = config.contact_id ? this.interpolateTemplate(config.contact_id, context) : undefined

    const projectData = {
      name,
      description,
      template_id: config.template_id,
      assigned_to: assignedTo,
      contact_id: contactId
    }

    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to create project: ${error}`)
    }

    return await response.json()
  }

  /**
   * Interpolate template variables in a string
   */
  private interpolateTemplate(template: string, context: VariableContext): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.getValueByPath(context, path.trim())
      return value !== undefined ? String(value) : match
    })
  }

  /**
   * Interpolate template variables in an object
   */
  private interpolateObject(
    obj: Record<string, unknown>,
    context: VariableContext,
    triggerData: Record<string, unknown>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    const fullContext = { ...context, trigger: triggerData }

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = this.interpolateTemplate(value, fullContext)
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.interpolateObject(value as Record<string, unknown>, fullContext, triggerData)
      } else {
        result[key] = value
      }
    }

    return result
  }

  /**
   * Get value by dot notation path
   */
  private getValueByPath(obj: unknown, path: string): unknown {
    const parts = path.split('.')
    let value: unknown = obj

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
   * Parse due date string (relative or absolute)
   */
  private parseDueDate(dueDateStr?: string): string | undefined {
    if (!dueDateStr) return undefined

    if (dueDateStr.startsWith('+')) {
      // Relative date like "+3 days"
      const match = dueDateStr.match(/^\+(\d+)\s*(day|days|hour|hours|week|weeks)/)
      if (match) {
        const amount = parseInt(match[1])
        const unit = match[2]
        const now = new Date()

        switch (unit) {
          case 'hour':
          case 'hours':
            now.setHours(now.getHours() + amount)
            break
          case 'day':
          case 'days':
            now.setDate(now.getDate() + amount)
            break
          case 'week':
          case 'weeks':
            now.setDate(now.getDate() + (amount * 7))
            break
        }

        return now.toISOString()
      }
    }

    // Absolute date - try to parse as ISO string
    try {
      return new Date(dueDateStr).toISOString()
    } catch {
      return undefined
    }
  }
}