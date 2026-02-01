#!/usr/bin/env npx tsx
/**
 * Seed Communication Templates
 *
 * Creates default SMS and email templates for tenants.
 * These are fully editable starter templates, not system-locked.
 *
 * Usage:
 *   npx tsx scripts/seed-communication-templates.ts
 *
 * Or with specific tenant:
 *   TENANT_ID=xxx npx tsx scripts/seed-communication-templates.ts
 *
 * Environment:
 *   SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key for admin access
 *   TENANT_ID - (optional) Specific tenant to seed, otherwise seeds all
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  console.error('Set environment variables or run with:')
  console.error('  SUPABASE_URL=https://api.jobclarity.io SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/seed-communication-templates.ts')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// ============================================================================
// SMS Templates
// ============================================================================

interface SMSTemplate {
  name: string
  description: string
  message: string
  category: string
  available_variables: string[]
  is_active: boolean
  is_default: boolean
}

const SMS_TEMPLATES: SMSTemplate[] = [
  {
    name: 'Appointment Reminder',
    description: 'Remind customers of upcoming appointments',
    message: 'Hi {{first_name}}, this is {{company_name}}. Just a reminder about your appointment tomorrow at {{appointment_time}}. Reply STOP to opt out.',
    category: 'reminder',
    available_variables: ['first_name', 'last_name', 'company_name', 'appointment_time', 'appointment_date', 'address'],
    is_active: true,
    is_default: true,
  },
  {
    name: 'Follow-Up After Inspection',
    description: 'Follow up with customers after a roof inspection',
    message: 'Hi {{first_name}}, thanks for having us out today! We found {{damage_summary}}. Ready to discuss next steps? Call us at {{company_phone}} or reply to this message. Reply STOP to opt out.',
    category: 'follow_up',
    available_variables: ['first_name', 'last_name', 'company_name', 'company_phone', 'damage_summary'],
    is_active: true,
    is_default: false,
  },
  {
    name: 'Review Request',
    description: 'Ask satisfied customers for a Google review',
    message: 'Hi {{first_name}}, thank you for choosing {{company_name}}! If you were happy with our work, would you leave us a quick review? {{review_link}} It really helps! Reply STOP to opt out.',
    category: 'follow_up',
    available_variables: ['first_name', 'company_name', 'review_link'],
    is_active: true,
    is_default: false,
  },
  {
    name: 'Project Status Update',
    description: 'Update customers on project progress',
    message: 'Hi {{first_name}}, your {{project_type}} project is {{status}}. {{status_details}} Questions? Call {{company_phone}}. Reply STOP to opt out.',
    category: 'update',
    available_variables: ['first_name', 'project_type', 'status', 'status_details', 'company_phone'],
    is_active: true,
    is_default: false,
  },
  {
    name: 'Crew Arrival Notice',
    description: 'Let customers know the crew is on the way',
    message: 'Hi {{first_name}}, our crew is heading your way and should arrive around {{arrival_time}}. Please ensure the driveway is accessible. See you soon! Reply STOP to opt out.',
    category: 'notification',
    available_variables: ['first_name', 'arrival_time', 'crew_lead_name'],
    is_active: true,
    is_default: false,
  },
]

// ============================================================================
// Email Templates
// ============================================================================

interface EmailTemplate {
  name: string
  description: string
  subject: string
  body: string
  category: string
  available_variables: string[]
  is_active: boolean
  is_default: boolean
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    name: 'Welcome Email',
    description: 'Welcome new customers after initial contact',
    subject: 'Welcome to {{company_name}} - Your Roofing Partner',
    body: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
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

      <p>Thank you for reaching out to {{company_name}}! We're excited to help you with your roofing needs.</p>

      <p>Here's what happens next:</p>
      <ol>
        <li>One of our specialists will contact you within 24 hours</li>
        <li>We'll schedule a free inspection at your convenience</li>
        <li>You'll receive a detailed report and estimate</li>
      </ol>

      <p>If you have any questions in the meantime, don't hesitate to call us at {{company_phone}}.</p>

      <p>Best regards,<br>The {{company_name}} Team</p>
    </div>
    <div class="footer">
      <p>{{company_name}} | {{company_address}}</p>
      <p>{{company_phone}} | {{company_email}}</p>
    </div>
  </div>
</body>
</html>`,
    category: 'welcome',
    available_variables: ['first_name', 'last_name', 'company_name', 'company_phone', 'company_email', 'company_address'],
    is_active: true,
    is_default: true,
  },
  {
    name: 'Estimate Follow-Up',
    description: 'Follow up after sending an estimate',
    subject: 'Your Roof Estimate from {{company_name}}',
    body: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
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

      <p>Thank you for the opportunity to inspect your roof at {{property_address}}. Based on our inspection, we've prepared the following estimate:</p>

      <div class="estimate-box">
        <h3>Project: {{project_type}}</h3>
        <p><strong>Estimated Cost:</strong> {{estimate_amount}}</p>
        <p><strong>Estimated Duration:</strong> {{estimated_duration}}</p>
      </div>

      <p>This estimate includes all materials, labor, and cleanup. We stand behind our work with a {{warranty_period}} warranty.</p>

      <p>Ready to move forward? Just reply to this email or call us at {{company_phone}}.</p>

      <p>Best regards,<br>{{sales_rep_name}}<br>{{company_name}}</p>
    </div>
    <div class="footer">
      <p>{{company_name}} | {{company_phone}}</p>
    </div>
  </div>
</body>
</html>`,
    category: 'estimate',
    available_variables: ['first_name', 'property_address', 'project_type', 'estimate_amount', 'estimated_duration', 'warranty_period', 'sales_rep_name', 'company_name', 'company_phone'],
    is_active: true,
    is_default: false,
  },
  {
    name: 'Project Update',
    description: 'Keep customers informed about project progress',
    subject: 'Project Update: {{project_name}}',
    body: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .status-badge { display: inline-block; background: #10b981; color: white; padding: 5px 15px; border-radius: 20px; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Project Update</h1>
    </div>
    <div class="content">
      <p>Hi {{first_name}},</p>

      <p>Here's an update on your roofing project:</p>

      <p><strong>Project:</strong> {{project_name}}</p>
      <p><strong>Status:</strong> <span class="status-badge">{{project_status}}</span></p>

      <p>{{update_message}}</p>

      <p>If you have any questions, please don't hesitate to reach out.</p>

      <p>Best regards,<br>{{project_manager_name}}<br>{{company_name}}</p>
    </div>
    <div class="footer">
      <p>{{company_name}} | {{company_phone}}</p>
    </div>
  </div>
</body>
</html>`,
    category: 'update',
    available_variables: ['first_name', 'project_name', 'project_status', 'update_message', 'project_manager_name', 'company_name', 'company_phone'],
    is_active: true,
    is_default: false,
  },
  {
    name: 'Project Completion',
    description: 'Celebrate project completion and request feedback',
    subject: 'Your Roof Project is Complete! 🎉',
    body: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; text-align: center; }
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

      <p>Great news! Your roofing project at {{property_address}} has been completed.</p>

      <p>Here's a summary:</p>
      <ul>
        <li><strong>Project:</strong> {{project_type}}</li>
        <li><strong>Completed:</strong> {{completion_date}}</li>
        <li><strong>Warranty:</strong> {{warranty_period}}</li>
      </ul>

      <p>Your warranty documentation has been attached to this email. Please keep it for your records.</p>

      <p>We'd love to hear about your experience! If you have a moment, please leave us a review:</p>

      <p><a href="{{review_link}}" class="cta-button">Leave a Review</a></p>

      <p>Thank you for choosing {{company_name}}. We're here if you ever need us!</p>

      <p>Best regards,<br>The {{company_name}} Team</p>
    </div>
    <div class="footer">
      <p>{{company_name}} | {{company_phone}}</p>
    </div>
  </div>
</body>
</html>`,
    category: 'completion',
    available_variables: ['first_name', 'property_address', 'project_type', 'completion_date', 'warranty_period', 'review_link', 'company_name', 'company_phone'],
    is_active: true,
    is_default: false,
  },
]

// ============================================================================
// Seeding Logic
// ============================================================================

async function getTenants(): Promise<{ id: string; name: string }[]> {
  const specificTenantId = process.env.TENANT_ID

  if (specificTenantId) {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', specificTenantId)
      .single()

    if (error || !data) {
      console.error('Tenant not found:', specificTenantId)
      process.exit(1)
    }

    return [data]
  }

  // Get all active tenants
  const { data, error } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching tenants:', error)
    process.exit(1)
  }

  return data || []
}

async function seedSMSTemplates(tenantId: string, tenantName: string): Promise<number> {
  let seeded = 0

  for (const template of SMS_TEMPLATES) {
    // Check if template with same name already exists
    const { data: existing } = await supabase
      .from('sms_templates')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('name', template.name)
      .single()

    if (existing) {
      console.log(`  ⏭️  SMS template "${template.name}" already exists, skipping`)
      continue
    }

    const { error } = await supabase
      .from('sms_templates')
      .insert({
        tenant_id: tenantId,
        name: template.name,
        description: template.description,
        message: template.message,
        category: template.category,
        available_variables: template.available_variables,
        is_active: template.is_active,
        is_default: template.is_default,
      })

    if (error) {
      console.error(`  ❌ Failed to seed SMS template "${template.name}":`, error.message)
    } else {
      console.log(`  ✅ SMS template: ${template.name}`)
      seeded++
    }
  }

  return seeded
}

async function seedEmailTemplates(tenantId: string, tenantName: string): Promise<number> {
  let seeded = 0

  for (const template of EMAIL_TEMPLATES) {
    // Check if template with same name already exists
    const { data: existing } = await supabase
      .from('email_templates')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('name', template.name)
      .single()

    if (existing) {
      console.log(`  ⏭️  Email template "${template.name}" already exists, skipping`)
      continue
    }

    const { error } = await supabase
      .from('email_templates')
      .insert({
        tenant_id: tenantId,
        name: template.name,
        description: template.description,
        subject: template.subject,
        body: template.body,
        category: template.category,
        available_variables: template.available_variables,
        is_active: template.is_active,
        is_default: template.is_default,
      })

    if (error) {
      console.error(`  ❌ Failed to seed email template "${template.name}":`, error.message)
    } else {
      console.log(`  ✅ Email template: ${template.name}`)
      seeded++
    }
  }

  return seeded
}

async function main() {
  console.log('🌱 Seeding Communication Templates\n')

  const tenants = await getTenants()
  console.log(`Found ${tenants.length} tenant(s) to seed\n`)

  let totalSms = 0
  let totalEmail = 0

  for (const tenant of tenants) {
    console.log(`📧 Seeding templates for: ${tenant.name} (${tenant.id})`)

    const smsCount = await seedSMSTemplates(tenant.id, tenant.name)
    const emailCount = await seedEmailTemplates(tenant.id, tenant.name)

    totalSms += smsCount
    totalEmail += emailCount

    console.log('')
  }

  console.log('✨ Seeding complete!')
  console.log(`   SMS templates created: ${totalSms}`)
  console.log(`   Email templates created: ${totalEmail}`)
  console.log('\nNote: Templates are fully editable by tenant users.')
}

main().catch(console.error)
