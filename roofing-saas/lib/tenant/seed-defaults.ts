/**
 * Seed Default Tenant Data
 *
 * Provides a ready-to-use CRM experience for new tenants by inserting
 * default pipeline stages, SMS templates, and email templates.
 *
 * All inserts are idempotent — safe to re-run without duplicating data.
 * Uses the admin/service-role Supabase client (bypasses RLS) since this
 * runs during provisioning before the user has RLS access.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

// ============================================================================
// Pipeline Stages (inserted into `pipeline_stages` table)
// ============================================================================

interface DefaultPipelineStage {
  name: string
  stage_key: string
  color: string
  stage_order: number
  stage_type: 'active' | 'won' | 'lost'
  win_probability: number
  description: string
  is_active: boolean
  is_default: boolean
}

const DEFAULT_PIPELINE_STAGES: DefaultPipelineStage[] = [
  {
    name: 'New Lead',
    stage_key: 'prospect',
    color: '#6B7280',
    stage_order: 0,
    stage_type: 'active',
    win_probability: 10,
    description: 'Initial contact, not yet qualified',
    is_active: true,
    is_default: true,
  },
  {
    name: 'Contact Made',
    stage_key: 'qualified',
    color: '#3B82F6',
    stage_order: 1,
    stage_type: 'active',
    win_probability: 25,
    description: 'Qualified lead with genuine interest',
    is_active: true,
    is_default: false,
  },
  {
    name: 'Appointment Set',
    stage_key: 'quote_sent',
    color: '#8B5CF6',
    stage_order: 2,
    stage_type: 'active',
    win_probability: 40,
    description: 'Quote or estimate has been sent',
    is_active: true,
    is_default: false,
  },
  {
    name: 'Inspection Complete',
    stage_key: 'negotiation',
    color: '#F97316',
    stage_order: 3,
    stage_type: 'active',
    win_probability: 60,
    description: 'Inspection done, addressing concerns',
    is_active: true,
    is_default: false,
  },
  {
    name: 'Estimate Sent',
    stage_key: 'won',
    color: '#22C55E',
    stage_order: 4,
    stage_type: 'won',
    win_probability: 100,
    description: 'Deal won, contract signed',
    is_active: true,
    is_default: false,
  },
  {
    name: 'Negotiation',
    stage_key: 'production',
    color: '#06B6D4',
    stage_order: 5,
    stage_type: 'active',
    win_probability: 100,
    description: 'Job in progress',
    is_active: true,
    is_default: false,
  },
  {
    name: 'Won',
    stage_key: 'complete',
    color: '#059669',
    stage_order: 6,
    stage_type: 'won',
    win_probability: 100,
    description: 'Project completed',
    is_active: true,
    is_default: false,
  },
  {
    name: 'Lost',
    stage_key: 'lost',
    color: '#EF4444',
    stage_order: 7,
    stage_type: 'lost',
    win_probability: 0,
    description: 'Opportunity lost',
    is_active: true,
    is_default: false,
  },
]

// ============================================================================
// SMS Templates
// ============================================================================

interface DefaultSMSTemplate {
  name: string
  description: string
  message: string
  category: string
  available_variables: string[]
  is_active: boolean
  is_default: boolean
}

const DEFAULT_SMS_TEMPLATES: DefaultSMSTemplate[] = [
  {
    name: 'Appointment Reminder',
    description: 'Remind customers of upcoming appointments',
    message:
      'Hi {{first_name}}, this is {{company_name}}. Just a reminder about your appointment tomorrow. See you then! Reply STOP to opt out.',
    category: 'reminder',
    available_variables: [
      'first_name',
      'last_name',
      'company_name',
      'appointment_time',
      'appointment_date',
    ],
    is_active: true,
    is_default: true,
  },
  {
    name: 'Estimate Follow-Up',
    description: 'Follow up after sending an estimate',
    message:
      'Hi {{first_name}}, this is {{company_name}}. We sent your estimate recently. Have any questions? Feel free to call us! Reply STOP to opt out.',
    category: 'follow_up',
    available_variables: [
      'first_name',
      'last_name',
      'company_name',
      'company_phone',
    ],
    is_active: true,
    is_default: false,
  },
  {
    name: 'Review Request',
    description: 'Ask satisfied customers for a Google review',
    message:
      'Hi {{first_name}}, thank you for choosing {{company_name}}! If you were happy with our work, would you leave us a quick review? {{review_link}} It really helps! Reply STOP to opt out.',
    category: 'follow_up',
    available_variables: ['first_name', 'company_name', 'review_link'],
    is_active: true,
    is_default: false,
  },
]

// ============================================================================
// Email Templates
// ============================================================================

interface DefaultEmailTemplate {
  name: string
  description: string
  subject: string
  body: string
  category: string
  available_variables: string[]
  is_active: boolean
  is_default: boolean
}

const DEFAULT_EMAIL_TEMPLATES: DefaultEmailTemplate[] = [
  {
    name: 'Welcome Email',
    description: 'Welcome new customers after initial contact',
    subject: 'Welcome to {{company_name}}',
    body: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { padding: 20px; background: #f9fafb; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to {{company_name}}</h1>
    </div>
    <div class="content">
      <p>Hi {{first_name}},</p>
      <p>Thank you for reaching out to {{company_name}}! We appreciate your interest and look forward to helping you with your roofing needs.</p>
      <p>Here is what happens next:</p>
      <ol>
        <li>One of our specialists will contact you within 24 hours</li>
        <li>We will schedule a free inspection at your convenience</li>
        <li>You will receive a detailed report and estimate</li>
      </ol>
      <p>If you have any questions in the meantime, please call us at {{company_phone}}.</p>
      <p>Best regards,<br>The {{company_name}} Team</p>
    </div>
    <div class="footer">
      <p>{{company_name}} | {{company_phone}}</p>
    </div>
  </div>
</body>
</html>`,
    category: 'welcome',
    available_variables: [
      'first_name',
      'last_name',
      'company_name',
      'company_phone',
      'company_email',
    ],
    is_active: true,
    is_default: true,
  },
  {
    name: 'Estimate Delivery',
    description: 'Send along with an estimate or proposal',
    subject: 'Your Estimate from {{company_name}}',
    body: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { padding: 20px; background: #f9fafb; }
    .estimate-box { background: white; border: 1px solid #e5e7eb; padding: 15px; margin: 15px 0; border-radius: 8px; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your Estimate is Ready</h1>
    </div>
    <div class="content">
      <p>Hi {{first_name}},</p>
      <p>Thank you for the opportunity to inspect your property. Based on our inspection, we have prepared the attached estimate for your review.</p>
      <div class="estimate-box">
        <p>Please review the attached estimate at your convenience. We are happy to walk through any questions you may have.</p>
      </div>
      <p>Ready to move forward? Just reply to this email or call us at {{company_phone}}.</p>
      <p>Best regards,<br>The {{company_name}} Team</p>
    </div>
    <div class="footer">
      <p>{{company_name}} | {{company_phone}}</p>
    </div>
  </div>
</body>
</html>`,
    category: 'estimate',
    available_variables: [
      'first_name',
      'last_name',
      'company_name',
      'company_phone',
      'property_address',
    ],
    is_active: true,
    is_default: false,
  },
  {
    name: 'Project Complete',
    description: 'Thank customers when their project is finished',
    subject: 'Your Project is Complete!',
    body: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { padding: 20px; background: #f9fafb; }
    .cta-button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Project Complete!</h1>
    </div>
    <div class="content">
      <p>Hi {{first_name}},</p>
      <p>Great news! Your roofing project has been completed. We hope you are pleased with the results.</p>
      <p>Your warranty documentation is attached. Please keep it for your records.</p>
      <p>We would love to hear about your experience! If you have a moment, please consider leaving us a review.</p>
      <p>Thank you for choosing {{company_name}}. We are here if you ever need us!</p>
      <p>Best regards,<br>The {{company_name}} Team</p>
    </div>
    <div class="footer">
      <p>{{company_name}} | {{company_phone}}</p>
    </div>
  </div>
</body>
</html>`,
    category: 'completion',
    available_variables: [
      'first_name',
      'last_name',
      'company_name',
      'company_phone',
      'property_address',
      'completion_date',
    ],
    is_active: true,
    is_default: false,
  },
]

// ============================================================================
// Main Seeding Function
// ============================================================================

/**
 * Seeds default data for a newly created tenant.
 *
 * Inserts pipeline stages, SMS templates, and email templates so the
 * new tenant lands on a functional CRM instead of an empty shell.
 *
 * All inserts are idempotent — checks for existing data before inserting
 * to avoid duplicates if called more than once.
 *
 * @param supabase - Admin/service-role Supabase client (bypasses RLS)
 * @param tenantId - The UUID of the newly created tenant
 */
export async function seedDefaultTenantData(
  supabase: SupabaseClient,
  tenantId: string
): Promise<void> {
  const now = new Date().toISOString()

  // --- Pipeline Stages ---
  await seedPipelineStages(supabase, tenantId, now)

  // --- SMS Templates ---
  await seedSMSTemplates(supabase, tenantId, now)

  // --- Email Templates ---
  await seedEmailTemplates(supabase, tenantId, now)

  // --- Default Substatus Configs ---
  await seedSubstatusConfigs(supabase, tenantId, now)

  logger.info('Seeded default tenant data', { tenantId })
}

// ============================================================================
// Individual Seeders
// ============================================================================

async function seedPipelineStages(
  supabase: SupabaseClient,
  tenantId: string,
  now: string
): Promise<void> {
  // Check if tenant already has pipeline stages
  const { count } = await supabase
    .from('pipeline_stages')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  if (count && count > 0) {
    logger.info('Pipeline stages already exist, skipping', { tenantId, count })
    return
  }

  const rows = DEFAULT_PIPELINE_STAGES.map((stage) => ({
    tenant_id: tenantId,
    name: stage.name,
    stage_key: stage.stage_key,
    color: stage.color,
    stage_order: stage.stage_order,
    stage_type: stage.stage_type,
    win_probability: stage.win_probability,
    description: stage.description,
    is_active: stage.is_active,
    is_default: stage.is_default,
    created_at: now,
    updated_at: now,
  }))

  const { error } = await supabase.from('pipeline_stages').insert(rows)

  if (error) {
    logger.error('Failed to seed pipeline stages', { tenantId, error })
    throw error
  }
}

async function seedSMSTemplates(
  supabase: SupabaseClient,
  tenantId: string,
  now: string
): Promise<void> {
  // Check if tenant already has SMS templates
  const { count } = await supabase
    .from('sms_templates')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('is_deleted', false)

  if (count && count > 0) {
    logger.info('SMS templates already exist, skipping', { tenantId, count })
    return
  }

  const rows = DEFAULT_SMS_TEMPLATES.map((template) => ({
    tenant_id: tenantId,
    name: template.name,
    description: template.description,
    message: template.message,
    category: template.category,
    available_variables: template.available_variables,
    is_active: template.is_active,
    is_default: template.is_default,
    is_deleted: false,
    created_at: now,
    updated_at: now,
  }))

  const { error } = await supabase.from('sms_templates').insert(rows)

  if (error) {
    logger.error('Failed to seed SMS templates', { tenantId, error })
    throw error
  }
}

async function seedEmailTemplates(
  supabase: SupabaseClient,
  tenantId: string,
  now: string
): Promise<void> {
  // Check if tenant already has email templates
  const { count } = await supabase
    .from('email_templates')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('is_deleted', false)

  if (count && count > 0) {
    logger.info('Email templates already exist, skipping', { tenantId, count })
    return
  }

  const rows = DEFAULT_EMAIL_TEMPLATES.map((template) => ({
    tenant_id: tenantId,
    name: template.name,
    description: template.description,
    subject: template.subject,
    body: template.body,
    category: template.category,
    available_variables: template.available_variables,
    is_active: template.is_active,
    is_default: template.is_default,
    is_deleted: false,
    created_at: now,
    updated_at: now,
  }))

  const { error } = await supabase.from('email_templates').insert(rows)

  if (error) {
    logger.error('Failed to seed email templates', { tenantId, error })
    throw error
  }
}

async function seedSubstatusConfigs(
  supabase: SupabaseClient,
  tenantId: string,
  now: string
): Promise<void> {
  // Check if tenant already has substatus configs
  const { count } = await supabase
    .from('status_substatus_configs')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('is_deleted', false)

  if (count && count > 0) {
    logger.info('Substatus configs already exist, skipping', {
      tenantId,
      count,
    })
    return
  }

  // Contact stage substatuses (entity_type: 'contacts', status_field_name: 'stage')
  const contactSubstatuses = [
    {
      status_value: 'new',
      substatus_value: 'uncontacted',
      substatus_label: 'Uncontacted',
      substatus_description:
        'Lead just entered system, no contact attempt yet',
      color: 'gray',
      display_order: 1,
      is_default: true,
    },
    {
      status_value: 'new',
      substatus_value: 'attempting_contact',
      substatus_label: 'Attempting Contact',
      substatus_description: 'Actively trying to reach lead',
      color: 'blue',
      display_order: 2,
      is_default: false,
    },
    {
      status_value: 'contacted',
      substatus_value: 'call_scheduled',
      substatus_label: 'Call Scheduled',
      substatus_description: 'Initial contact made, call scheduled',
      color: 'cyan',
      display_order: 1,
      is_default: false,
    },
    {
      status_value: 'contacted',
      substatus_value: 'follow_up_needed',
      substatus_label: 'Follow-Up Needed',
      substatus_description: 'Contacted but needs additional follow-up',
      color: 'yellow',
      display_order: 2,
      is_default: false,
    },
    {
      status_value: 'qualified',
      substatus_value: 'budget_approved',
      substatus_label: 'Budget Approved',
      substatus_description: 'Lead has confirmed budget for project',
      color: 'green',
      display_order: 1,
      is_default: false,
    },
    {
      status_value: 'proposal',
      substatus_value: 'estimate_sent',
      substatus_label: 'Estimate Sent',
      substatus_description: 'Proposal/estimate has been sent to lead',
      color: 'blue',
      display_order: 1,
      is_default: false,
    },
    {
      status_value: 'proposal',
      substatus_value: 'negotiating',
      substatus_label: 'Negotiating',
      substatus_description: 'In active negotiation on pricing or terms',
      color: 'yellow',
      display_order: 2,
      is_default: false,
    },
  ]

  // Project status substatuses (entity_type: 'projects', status_field_name: 'status')
  const projectSubstatuses = [
    {
      status_value: 'estimate',
      substatus_value: 'site_visit_pending',
      substatus_label: 'Site Visit Pending',
      substatus_description: 'Need to schedule site visit for estimate',
      color: 'blue',
      display_order: 1,
      is_default: true,
    },
    {
      status_value: 'estimate',
      substatus_value: 'measurements_taken',
      substatus_label: 'Measurements Taken',
      substatus_description: 'Site measured, calculating estimate',
      color: 'cyan',
      display_order: 2,
      is_default: false,
    },
    {
      status_value: 'approved',
      substatus_value: 'contract_signed',
      substatus_label: 'Contract Signed',
      substatus_description: 'Customer has signed contract',
      color: 'green',
      display_order: 1,
      is_default: false,
    },
    {
      status_value: 'approved',
      substatus_value: 'deposit_received',
      substatus_label: 'Deposit Received',
      substatus_description: 'Initial deposit payment received',
      color: 'emerald',
      display_order: 2,
      is_default: false,
    },
    {
      status_value: 'in_progress',
      substatus_value: 'tear_off',
      substatus_label: 'Tear Off',
      substatus_description: 'Removing old roofing material',
      color: 'orange',
      display_order: 1,
      is_default: false,
    },
    {
      status_value: 'in_progress',
      substatus_value: 'installation',
      substatus_label: 'Installation',
      substatus_description: 'Installing new roofing',
      color: 'blue',
      display_order: 2,
      is_default: false,
    },
    {
      status_value: 'completed',
      substatus_value: 'final_payment_received',
      substatus_label: 'Final Payment Received',
      substatus_description: 'All payments collected',
      color: 'green',
      display_order: 1,
      is_default: false,
    },
  ]

  const rows = [
    ...contactSubstatuses.map((s) => ({
      tenant_id: tenantId,
      entity_type: 'contacts' as const,
      status_field_name: 'stage',
      status_value: s.status_value,
      substatus_value: s.substatus_value,
      substatus_label: s.substatus_label,
      substatus_description: s.substatus_description,
      color: s.color,
      display_order: s.display_order,
      is_default: s.is_default,
      is_active: true,
      is_deleted: false,
      is_terminal: false,
      created_at: now,
      updated_at: now,
    })),
    ...projectSubstatuses.map((s) => ({
      tenant_id: tenantId,
      entity_type: 'projects' as const,
      status_field_name: 'status',
      status_value: s.status_value,
      substatus_value: s.substatus_value,
      substatus_label: s.substatus_label,
      substatus_description: s.substatus_description,
      color: s.color,
      display_order: s.display_order,
      is_default: s.is_default,
      is_active: true,
      is_deleted: false,
      is_terminal: false,
      created_at: now,
      updated_at: now,
    })),
  ]

  const { error } = await supabase
    .from('status_substatus_configs')
    .insert(rows)

  if (error) {
    logger.error('Failed to seed substatus configs', { tenantId, error })
    throw error
  }
}
