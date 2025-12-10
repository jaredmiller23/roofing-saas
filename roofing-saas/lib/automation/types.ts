/**
 * Automation Types
 * Type definitions for workflow automation system
 */

// Trigger types
export type TriggerType =
  | 'contact_created'
  | 'contact_updated'
  | 'project_created'
  | 'project_status_changed'
  | 'pipeline_stage_changed' // Specific trigger for pipeline stage transitions
  | 'project_won'            // Triggered when project moves to 'won' stage
  | 'job_completed'          // Triggered when a job is marked complete
  | 'call_missed'
  | 'call_completed'
  | 'email_opened'
  | 'email_clicked'
  | 'sms_received'
  | 'form_submitted'

// Step types
export type StepType =
  | 'send_sms'
  | 'send_email'
  | 'create_task'
  | 'update_contact'
  | 'update_project'
  | 'wait'
  | 'conditional'
  | 'webhook'

// Workflow status
export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

// Step status
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

// Workflow definition
export interface Workflow {
  id: string
  tenant_id: string
  name: string
  description?: string
  trigger_type: TriggerType
  trigger_config: Record<string, unknown>
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
  is_deleted: boolean
}

// Workflow step definition
export interface WorkflowStep {
  id: string
  workflow_id: string
  step_order: number
  step_type: StepType
  step_config: Record<string, unknown>
  delay_minutes: number
  created_at: string
  updated_at: string
}

// Workflow execution
export interface WorkflowExecution {
  id: string
  workflow_id: string
  tenant_id: string
  trigger_data: Record<string, unknown>
  status: WorkflowStatus
  current_step_id?: string
  started_at?: string
  completed_at?: string
  error_message?: string
  created_at: string
  updated_at: string
}

// Step execution
export interface WorkflowStepExecution {
  id: string
  execution_id: string
  step_id: string
  status: StepStatus
  started_at?: string
  completed_at?: string
  result_data?: Record<string, unknown>
  error_message?: string
  created_at: string
}

// Step configuration types
export interface SendSMSConfig {
  to: string // Can use variables like {{contact.phone}}
  body: string // Can use variables like {{contact.first_name}}
  template_id?: string
}

export interface SendEmailConfig {
  to: string // Can use variables like {{contact.email}}
  subject: string
  html?: string
  text?: string
  template_id?: string
}

export interface CreateTaskConfig {
  title: string
  description?: string
  assigned_to?: string // User ID or variable like {{project.user_id}}
  due_date_days?: number // Days from now
  priority?: 'low' | 'medium' | 'high'
}

export interface UpdateContactConfig {
  contact_id: string // Variable like {{trigger.contact_id}}
  updates: Record<string, unknown>
}

export interface UpdateProjectConfig {
  project_id: string // Variable like {{trigger.project_id}}
  updates: Record<string, unknown>
}

export interface WaitConfig {
  delay_minutes: number
}

export interface ConditionalConfig {
  condition: string // e.g., "{{contact.status}} === 'hot'"
  then_step_id?: string
  else_step_id?: string
}

export interface WebhookConfig {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH'
  headers?: Record<string, string>
  body?: Record<string, unknown>
}
