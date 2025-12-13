/**
 * Notification Preferences Type Definitions
 *
 * Defines types for user notification settings across email, SMS, and push channels
 */

export interface NotificationPreferences {
  id: string
  tenant_id: string
  user_id: string

  // Email notifications
  email_new_lead: boolean
  email_project_update: boolean
  email_task_assigned: boolean
  email_message_received: boolean
  email_document_signed: boolean
  email_daily_digest: boolean
  email_weekly_report: boolean

  // SMS notifications
  sms_new_lead: boolean
  sms_project_update: boolean
  sms_task_assigned: boolean
  sms_message_received: boolean
  sms_urgent_only: boolean

  // Push notifications (PWA)
  push_enabled: boolean
  push_new_lead: boolean
  push_project_update: boolean
  push_task_assigned: boolean

  // Quiet hours
  quiet_hours_enabled: boolean
  quiet_hours_start: string // Time format "HH:MM"
  quiet_hours_end: string   // Time format "HH:MM"

  created_at: string
  updated_at: string
}

export interface UpdateNotificationPreferencesInput {
  // Email notifications
  email_new_lead?: boolean
  email_project_update?: boolean
  email_task_assigned?: boolean
  email_message_received?: boolean
  email_document_signed?: boolean
  email_daily_digest?: boolean
  email_weekly_report?: boolean

  // SMS notifications
  sms_new_lead?: boolean
  sms_project_update?: boolean
  sms_task_assigned?: boolean
  sms_message_received?: boolean
  sms_urgent_only?: boolean

  // Push notifications
  push_enabled?: boolean
  push_new_lead?: boolean
  push_project_update?: boolean
  push_task_assigned?: boolean

  // Quiet hours
  quiet_hours_enabled?: boolean
  quiet_hours_start?: string
  quiet_hours_end?: string
}

/**
 * Default notification preferences for new users
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<
  NotificationPreferences,
  'id' | 'tenant_id' | 'user_id' | 'created_at' | 'updated_at'
> = {
  // Email - most enabled by default
  email_new_lead: true,
  email_project_update: true,
  email_task_assigned: true,
  email_message_received: true,
  email_document_signed: true,
  email_daily_digest: false,
  email_weekly_report: true,

  // SMS - only critical ones by default
  sms_new_lead: false,
  sms_project_update: false,
  sms_task_assigned: true,
  sms_message_received: true,
  sms_urgent_only: true,

  // Push - enabled by default
  push_enabled: true,
  push_new_lead: true,
  push_project_update: true,
  push_task_assigned: true,

  // Quiet hours - disabled by default
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00',
}

/**
 * Notification category groups for UI organization
 */
export const NOTIFICATION_CATEGORIES = [
  {
    id: 'email',
    label: 'Email Notifications',
    description: 'Receive notifications via email',
    icon: 'Mail',
    settings: [
      { key: 'email_new_lead', label: 'New Lead', description: 'When a new lead is added' },
      { key: 'email_project_update', label: 'Project Updates', description: 'When a project status changes' },
      { key: 'email_task_assigned', label: 'Task Assigned', description: 'When a task is assigned to you' },
      { key: 'email_message_received', label: 'Messages', description: 'When you receive a message' },
      { key: 'email_document_signed', label: 'Documents Signed', description: 'When a document is signed' },
      { key: 'email_daily_digest', label: 'Daily Digest', description: 'Daily summary of activity' },
      { key: 'email_weekly_report', label: 'Weekly Report', description: 'Weekly performance summary' },
    ],
  },
  {
    id: 'sms',
    label: 'SMS Notifications',
    description: 'Receive text message alerts',
    icon: 'MessageSquare',
    settings: [
      { key: 'sms_new_lead', label: 'New Lead', description: 'When a new lead is added' },
      { key: 'sms_project_update', label: 'Project Updates', description: 'When a project status changes' },
      { key: 'sms_task_assigned', label: 'Task Assigned', description: 'When a task is assigned to you' },
      { key: 'sms_message_received', label: 'Messages', description: 'When you receive a message' },
      { key: 'sms_urgent_only', label: 'Urgent Only', description: 'Only send SMS for urgent matters' },
    ],
  },
  {
    id: 'push',
    label: 'Push Notifications',
    description: 'Browser and mobile push alerts',
    icon: 'Bell',
    settings: [
      { key: 'push_enabled', label: 'Enable Push', description: 'Allow push notifications' },
      { key: 'push_new_lead', label: 'New Lead', description: 'When a new lead is added' },
      { key: 'push_project_update', label: 'Project Updates', description: 'When a project status changes' },
      { key: 'push_task_assigned', label: 'Task Assigned', description: 'When a task is assigned to you' },
    ],
  },
] as const

export type NotificationCategoryId = 'email' | 'sms' | 'push'
export type NotificationSettingKey = keyof UpdateNotificationPreferencesInput
