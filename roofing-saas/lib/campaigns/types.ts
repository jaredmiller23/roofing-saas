/**
 * Type definitions for Campaigns System (Proline-style Marketing Automation)
 *
 * Multi-step drip campaigns, event-based triggers, automated follow-up sequences
 * Based on comprehensive research completed 2025-11-18
 */

// ============================================================================
// ENUM TYPES
// ============================================================================

export type CampaignType =
  | 'drip' // Time-based email/SMS sequences
  | 'event' // Triggered by specific events
  | 'reengagement' // Re-engage inactive contacts
  | 'retention' // Keep active customers engaged
  | 'nurture' // Long-term relationship building

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'archived'

export type TriggerType =
  | 'stage_change' // Contact/project stage changes
  | 'time_based' // Scheduled (relative to date field)
  | 'event' // Activity/custom event occurs
  | 'manual' // Manually enroll

export type StepType =
  | 'send_email' // Send email from template
  | 'send_sms' // Send SMS from template
  | 'create_task' // Create task for user
  | 'wait' // Delay before next step
  | 'update_field' // Update contact/project field
  | 'manage_tags' // Add/remove tags
  | 'notify' // Send notification to user
  | 'webhook' // Call external webhook
  | 'conditional' // Branch based on conditions
  | 'exit_campaign' // Exit enrollment
  | 'change_stage' // Change project pipeline stage

export type EnrollmentStatus =
  | 'active' // Currently in campaign
  | 'completed' // Finished all steps
  | 'exited' // Exited early
  | 'paused' // Temporarily paused
  | 'failed' // Error occurred

export type EnrollmentSource =
  | 'automatic_trigger' // Auto-enrolled by trigger
  | 'manual_admin' // Manually enrolled by admin
  | 'api' // Enrolled via API
  | 'bulk_import' // Bulk import/upload

export type ExecutionStatus =
  | 'pending' // Scheduled, not started
  | 'running' // Currently executing
  | 'completed' // Successfully completed
  | 'failed' // Execution failed
  | 'skipped' // Skipped due to conditions

export type DelayUnit = 'hours' | 'days' | 'weeks'

export type GoalType = 'appointments' | 'deals' | 'reviews' | 'engagement'

export type ExitReason =
  | 'completed'
  | 'goal_achieved'
  | 'unsubscribed'
  | 'stage_changed'
  | 'manual_remove'
  | 'error'

export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'all_time'

// ============================================================================
// CONFIGURATION TYPES (JSONB Fields)
// ============================================================================

export interface BusinessHours {
  start: number // 9 for 9am
  end: number // 17 for 5pm
  days: string[] // ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  timezone?: string // e.g., 'America/New_York'
}

// Trigger Configs (vary by trigger_type)
export interface StageChangeTriggerConfig {
  entity_type: 'contact' | 'project'
  from_stage?: string | null // null = any stage
  to_stage: string
  conditions?: Record<string, unknown>
}

export interface TimeBasedTriggerConfig {
  schedule_type: 'relative' | 'absolute'
  relative_to?: string // Field name (e.g., 'created_at', 'last_contact_date')
  delay_value?: number
  delay_unit?: DelayUnit
  absolute_date?: string // ISO date
}

export interface EventTriggerConfig {
  event_name: string // 'activity_created', 'document_signed', etc.
  event_filters?: Record<string, unknown>
}

export type TriggerConfig =
  | StageChangeTriggerConfig
  | TimeBasedTriggerConfig
  | EventTriggerConfig
  | { manual: true }

// Step Configs (vary by step_type)
export interface SendEmailStepConfig {
  template_id?: string | null
  subject?: string
  body?: string
  personalization?: Record<string, string>
  track_opens?: boolean
  track_clicks?: boolean
  attachments?: string[]
}

export interface SendSmsStepConfig {
  template_id?: string | null
  message?: string
  personalization?: Record<string, string>
  track_replies?: boolean
}

export interface CreateTaskStepConfig {
  title: string
  description?: string
  task_type: string
  priority?: string
  assigned_to?: string // User ID
  due_in_days?: number
}

export interface WaitStepConfig {
  delay_value: number
  delay_unit: DelayUnit
  wait_until?: string // ISO datetime
}

export interface UpdateFieldStepConfig {
  entity_type: 'contact' | 'project'
  field_name: string
  field_value: unknown
}

export interface ManageTagsStepConfig {
  action: 'add' | 'remove'
  tags: string[]
}

export interface NotifyStepConfig {
  notify_users: string[] // User IDs
  message: string
  notification_type?: 'email' | 'in_app' | 'both'
}

export interface WebhookStepConfig {
  url: string
  method?: 'POST' | 'PUT' | 'PATCH'
  headers?: Record<string, string>
  payload?: Record<string, unknown>
}

export interface ConditionalStepConfig {
  conditions: StepConditions
  true_path_step_id?: string
  false_path_step_id?: string
}

export interface ExitCampaignStepConfig {
  exit_reason: string
  create_task?: boolean
  task_config?: CreateTaskStepConfig
}

export interface ChangeStageStepConfig {
  target_stage: import('@/lib/types/api').PipelineStage
  validate_transition?: boolean // default true - validate stage transition is allowed
  skip_perfect_packet?: boolean // default false - skip Perfect Packet validation for won→production
}

export type StepConfig =
  | SendEmailStepConfig
  | SendSmsStepConfig
  | CreateTaskStepConfig
  | WaitStepConfig
  | UpdateFieldStepConfig
  | ManageTagsStepConfig
  | NotifyStepConfig
  | WebhookStepConfig
  | ConditionalStepConfig
  | ExitCampaignStepConfig
  | ChangeStageStepConfig

// Conditions
export interface ConditionRule {
  field: string
  operator:
    | 'equals'
    | 'not_equals'
    | 'greater_than'
    | 'less_than'
    | 'contains'
    | 'not_contains'
    | 'is_null'
    | 'is_not_null'
  value?: unknown
}

export interface StepConditions {
  rules: ConditionRule[]
  logic?: 'AND' | 'OR'
}

export type EnrollmentConditions = Record<string, ConditionRule>
export type ExclusionConditions = Record<string, unknown>

// Execution Results
export interface EmailExecutionResult {
  email_id: string
  sent_at: string
  provider?: 'resend' | 'sendgrid'
}

export interface SmsExecutionResult {
  sms_id: string
  sms_sid?: string // Twilio SID
  sent_at: string
  provider?: 'twilio'
}

export interface TaskExecutionResult {
  task_id: string
  created_at: string
}

export type ExecutionResult =
  | EmailExecutionResult
  | SmsExecutionResult
  | TaskExecutionResult
  | Record<string, unknown>

// ============================================================================
// CORE DATABASE TYPES
// ============================================================================

export interface Campaign {
  id: string
  tenant_id: string

  // Campaign info
  name: string
  description?: string | null
  campaign_type: CampaignType

  // Status
  status: CampaignStatus

  // Goals
  goal_type?: GoalType | null
  goal_target?: number | null

  // Settings
  allow_re_enrollment: boolean
  re_enrollment_delay_days?: number | null
  respect_business_hours: boolean
  business_hours?: BusinessHours | null

  // Enrollment
  enrollment_type: 'automatic' | 'manual'
  max_enrollments?: number | null

  // Performance (cached)
  total_enrolled: number
  total_completed: number
  total_revenue: number

  // Metadata
  created_by?: string | null
  created_at: string
  updated_at: string
  is_deleted: boolean
}

export interface CampaignTrigger {
  id: string
  campaign_id: string

  // Trigger definition
  trigger_type: TriggerType
  trigger_config: TriggerConfig

  // Conditions
  enrollment_conditions?: EnrollmentConditions | null
  exclusion_conditions?: ExclusionConditions | null

  priority: number
  is_active: boolean

  created_at: string
}

export interface CampaignStep {
  id: string
  campaign_id: string
  parent_step_id?: string | null

  // Execution order
  step_order: number

  // Step definition
  step_type: StepType
  step_config: StepConfig

  // Timing
  delay_value: number
  delay_unit: DelayUnit

  // Conditional branching
  conditions?: StepConditions | null
  true_path_step_id?: string | null
  false_path_step_id?: string | null

  // Performance tracking
  total_executed: number
  total_succeeded: number
  total_failed: number

  created_at: string
  updated_at: string
}

export interface CampaignEnrollment {
  id: string
  campaign_id: string
  tenant_id: string

  // Who's enrolled
  contact_id: string

  // Enrollment details
  enrollment_source?: EnrollmentSource | null
  enrolled_by?: string | null
  enrolled_at: string

  // Current status
  status: EnrollmentStatus
  current_step_id?: string | null
  current_step_order?: number | null

  // Exit details
  exit_reason?: ExitReason | null
  exited_at?: string | null

  // Performance metrics
  steps_completed: number
  emails_sent: number
  emails_opened: number
  emails_clicked: number
  sms_sent: number
  sms_replied: number
  tasks_created: number

  // Goal tracking
  goal_achieved: boolean
  goal_achieved_at?: string | null
  revenue_attributed?: number | null

  // Timing
  last_step_executed_at?: string | null
  next_step_scheduled_at?: string | null
  completed_at?: string | null
}

export interface CampaignStepExecution {
  id: string
  enrollment_id: string
  step_id: string

  // Execution details
  status: ExecutionStatus

  // Timing
  scheduled_at?: string | null
  started_at?: string | null
  completed_at?: string | null

  // Result
  result_data?: ExecutionResult | null
  error_message?: string | null

  // Tracking (for emails/SMS)
  opened_at?: string | null
  clicked_at?: string | null
  replied_at?: string | null

  created_at: string
}

export interface CampaignAnalytics {
  id: string
  campaign_id: string
  tenant_id: string

  // Time period
  snapshot_date: string // Date string
  period_type: PeriodType

  // Enrollment metrics
  total_enrolled: number
  new_enrollments: number
  active_enrollments: number
  completed_enrollments: number

  // Engagement metrics
  emails_sent: number
  emails_opened: number
  emails_clicked: number
  email_open_rate?: number | null
  email_click_rate?: number | null

  sms_sent: number
  sms_replied: number
  sms_reply_rate?: number | null

  tasks_created: number
  tasks_completed: number

  // Goal metrics
  goals_achieved: number
  goal_achievement_rate?: number | null

  // Revenue
  revenue_attributed: number
  average_deal_size?: number | null

  created_at: string
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

// GET /api/campaigns
export interface GetCampaignsRequest {
  status?: CampaignStatus
  campaign_type?: CampaignType
  include_deleted?: boolean
}

export interface GetCampaignsResponse {
  campaigns: Campaign[]
  total: number
}

// POST /api/campaigns
export interface CreateCampaignRequest {
  name: string
  description?: string
  campaign_type: CampaignType
  goal_type?: GoalType
  goal_target?: number
  allow_re_enrollment?: boolean
  re_enrollment_delay_days?: number
  respect_business_hours?: boolean
  business_hours?: BusinessHours
  enrollment_type?: 'automatic' | 'manual'
  max_enrollments?: number
}

export interface CreateCampaignResponse {
  campaign: Campaign
}

// PATCH /api/campaigns/:id
export interface UpdateCampaignRequest {
  name?: string
  description?: string
  status?: CampaignStatus
  goal_type?: GoalType
  goal_target?: number
  allow_re_enrollment?: boolean
  re_enrollment_delay_days?: number
  respect_business_hours?: boolean
  business_hours?: BusinessHours
  enrollment_type?: 'automatic' | 'manual'
  max_enrollments?: number
}

export interface UpdateCampaignResponse {
  campaign: Campaign
}

// GET /api/campaigns/:id/triggers
export interface GetCampaignTriggersResponse {
  triggers: CampaignTrigger[]
  total: number
}

// POST /api/campaigns/:id/triggers
export interface CreateCampaignTriggerRequest {
  trigger_type: TriggerType
  trigger_config: TriggerConfig
  enrollment_conditions?: EnrollmentConditions
  exclusion_conditions?: ExclusionConditions
  priority?: number
}

export interface CreateCampaignTriggerResponse {
  trigger: CampaignTrigger
}

// GET /api/campaigns/:id/steps
export interface GetCampaignStepsResponse {
  steps: CampaignStep[]
  total: number
}

// POST /api/campaigns/:id/steps
export interface CreateCampaignStepRequest {
  parent_step_id?: string
  step_order: number
  step_type: StepType
  step_config: StepConfig
  delay_value?: number
  delay_unit?: DelayUnit
  conditions?: StepConditions
  true_path_step_id?: string
  false_path_step_id?: string
}

export interface CreateCampaignStepResponse {
  step: CampaignStep
}

// PATCH /api/campaigns/:campaignId/steps/:stepId
export interface UpdateCampaignStepRequest {
  step_order?: number
  step_type?: StepType
  step_config?: StepConfig
  delay_value?: number
  delay_unit?: DelayUnit
  conditions?: StepConditions
  true_path_step_id?: string
  false_path_step_id?: string
}

export interface UpdateCampaignStepResponse {
  step: CampaignStep
}

// POST /api/campaigns/:id/enrollments
export interface EnrollContactRequest {
  contact_id: string
  enrollment_source?: EnrollmentSource
}

export interface EnrollContactResponse {
  enrollment: CampaignEnrollment
}

// GET /api/campaigns/:id/enrollments
export interface GetCampaignEnrollmentsRequest {
  status?: EnrollmentStatus
  contact_id?: string
  limit?: number
  offset?: number
}

export interface GetCampaignEnrollmentsResponse {
  enrollments: CampaignEnrollment[]
  total: number
}

// PATCH /api/enrollments/:id
export interface UpdateEnrollmentRequest {
  status?: EnrollmentStatus
  exit_reason?: ExitReason
  goal_achieved?: boolean
  revenue_attributed?: number
}

export interface UpdateEnrollmentResponse {
  enrollment: CampaignEnrollment
}

// GET /api/campaigns/:id/analytics
export interface GetCampaignAnalyticsRequest {
  period_type?: PeriodType
  start_date?: string
  end_date?: string
}

export interface GetCampaignAnalyticsResponse {
  analytics: CampaignAnalytics[]
  total: number
}

// GET /api/campaigns/:id/executions
export interface GetStepExecutionsRequest {
  enrollment_id?: string
  step_id?: string
  status?: ExecutionStatus
  limit?: number
  offset?: number
}

export interface GetStepExecutionsResponse {
  executions: CampaignStepExecution[]
  total: number
}

// ============================================================================
// UI COMPONENT TYPES
// ============================================================================

/**
 * Props for campaign builder component (visual editor)
 */
export interface CampaignBuilderProps {
  campaign_id?: string // If editing existing campaign
  onSave: (campaign: Campaign) => void
  onCancel: () => void
  mode?: 'create' | 'edit'
}

/**
 * Props for campaign flow canvas (drag-drop step builder)
 */
export interface CampaignFlowCanvasProps {
  campaign_id: string
  steps: CampaignStep[]
  onStepAdd: (step: CreateCampaignStepRequest) => void
  onStepUpdate: (stepId: string, updates: UpdateCampaignStepRequest) => void
  onStepDelete: (stepId: string) => void
  onStepReorder: (stepId: string, newOrder: number) => void
  readonly?: boolean
}

/**
 * Props for step configuration panel
 */
export interface StepConfigPanelProps {
  step_type: StepType
  config: StepConfig
  onChange: (config: StepConfig) => void
  onValidate?: (config: StepConfig) => boolean
}

/**
 * Props for trigger configuration panel
 */
export interface TriggerConfigPanelProps {
  trigger_type: TriggerType
  config: TriggerConfig
  onChange: (config: TriggerConfig) => void
  enrollment_conditions?: EnrollmentConditions
  exclusion_conditions?: ExclusionConditions
  onConditionsChange?: (
    enrollment: EnrollmentConditions,
    exclusion: ExclusionConditions
  ) => void
}

/**
 * Props for campaign enrollments list
 */
export interface EnrollmentListProps {
  campaign_id: string
  status_filter?: EnrollmentStatus
  show_metrics?: boolean
  allow_manual_enroll?: boolean
  onEnroll?: (contactId: string) => void
  onUnenroll?: (enrollmentId: string) => void
}

/**
 * Props for campaign analytics dashboard
 */
export interface CampaignAnalyticsProps {
  campaign_id: string
  period_type?: PeriodType
  date_range?: { start: string; end: string }
  show_charts?: boolean
  show_funnel?: boolean
  show_revenue?: boolean
}

/**
 * Props for campaign card component
 */
export interface CampaignCardProps {
  campaign: Campaign
  onClick?: (campaignId: string) => void
  onEdit?: (campaignId: string) => void
  onDuplicate?: (campaignId: string) => void
  onArchive?: (campaignId: string) => void
  showMetrics?: boolean
}

/**
 * Props for campaign status badge
 */
export interface CampaignStatusBadgeProps {
  status: CampaignStatus
  size?: 'sm' | 'md' | 'lg'
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Helper type for campaign validation
 */
export interface CampaignValidationResult {
  is_valid: boolean
  errors?: string[]
  warnings?: string[]
}

/**
 * Helper type for step execution context
 */
export interface StepExecutionContext {
  enrollment: CampaignEnrollment
  step: CampaignStep
  contact: {
    id: string
    email?: string
    phone?: string
    [key: string]: unknown
  }
  previous_step_result?: ExecutionResult
}

/**
 * Helper type for trigger evaluation
 */
export interface TriggerEvaluationResult {
  should_enroll: boolean
  reason?: string
  conditions_met: boolean
  exclusions_met: boolean
}

/**
 * Grouped campaigns by type
 */
export interface GroupedCampaigns {
  [campaign_type: string]: Campaign[]
}

/**
 * Campaign performance summary
 */
export interface CampaignPerformanceSummary {
  campaign_id: string
  campaign_name: string
  total_enrolled: number
  total_completed: number
  completion_rate: number
  avg_email_open_rate: number
  avg_email_click_rate: number
  avg_sms_reply_rate: number
  total_revenue: number
  avg_revenue_per_enrollment: number
  goal_achievement_rate: number
}
