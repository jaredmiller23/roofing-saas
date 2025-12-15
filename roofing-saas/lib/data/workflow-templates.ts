/**
 * Pre-built workflow templates for common business scenarios
 */

import type { WorkflowTemplate } from '@/lib/automation/workflow-types'

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: 'new-lead-nurture',
    name: 'New Lead Nurturing Sequence',
    description: 'A comprehensive 7-day email sequence for new leads with follow-up tasks and stage management',
    category: 'lead_nurturing',
    tags: ['email', 'lead', 'nurturing', 'follow-up'],
    trigger: {
      id: 'trigger_new_lead',
      type: 'contact_created',
      config: {
        type: 'contact_created',
        contact_type: ['lead'],
        contact_category: ['homeowner']
      },
      enabled: true
    },
    actions: [
      {
        id: 'action_welcome_email',
        type: 'send_email',
        config: {
          type: 'send_email',
          to: '{{contact.email}}',
          subject: 'Welcome {{contact.first_name}}! Let\'s discuss your roofing needs',
          body: `Hi {{contact.first_name}},

Thank you for your interest in our roofing services! We're excited to help you with your project.

Here's what happens next:
- We'll review your information and project details
- A roofing specialist will contact you within 24 hours
- We'll schedule a convenient time for a free inspection

In the meantime, feel free to browse our portfolio of completed projects at [website].

Best regards,
The Roofing Team

P.S. Have questions? Reply to this email or call us at (555) 123-4567`
        },
        enabled: true,
        order: 0
      },
      {
        id: 'action_assign_lead',
        type: 'assign_user',
        config: {
          type: 'assign_user',
          user_id: '{{user.sales_manager_id}}'
        },
        delay: 1,
        enabled: true,
        order: 1
      },
      {
        id: 'action_follow_up_task',
        type: 'create_task',
        config: {
          type: 'create_task',
          title: 'Call new lead: {{contact.first_name}} {{contact.last_name}}',
          description: 'Initial contact call to discuss roofing needs and schedule inspection.\n\nContact details:\n- Phone: {{contact.phone}}\n- Email: {{contact.email}}\n- Property type: {{contact.property_type}}\n- Source: {{contact.source}}',
          due_date: '+1 day',
          priority: 'high',
          assigned_to: '{{contact.assigned_to}}',
          contact_id: '{{contact.id}}'
        },
        delay: 2,
        enabled: true,
        order: 2
      },
      {
        id: 'action_follow_up_email_day3',
        type: 'send_email',
        config: {
          type: 'send_email',
          to: '{{contact.email}}',
          subject: 'Quick question about your roofing project',
          body: `Hi {{contact.first_name}},

I wanted to follow up on your roofing inquiry. Have you had a chance to think about your project timeline?

Common questions we get at this stage:
- What's the typical timeline for a roofing project?
- How do I know if I need a repair or full replacement?
- What roofing materials work best in our climate?

I'd love to answer any questions you might have. Simply reply to this email or give us a call.

Also, did you know we offer free inspections? We can assess your roof's condition and provide recommendations at no cost.

Looking forward to hearing from you!

Best regards,
[Your Name]`
        },
        delay: 72,
        enabled: true,
        order: 3
      },
      {
        id: 'action_add_nurture_tag',
        type: 'add_tag',
        config: {
          type: 'add_tag',
          tags: ['nurture-sequence', 'new-lead-2024']
        },
        delay: 1,
        enabled: true,
        order: 4
      },
      {
        id: 'action_follow_up_email_day7',
        type: 'send_email',
        config: {
          type: 'send_email',
          to: '{{contact.email}}',
          subject: 'Last chance: Free roofing inspection',
          body: `Hi {{contact.first_name}},

This is my final follow-up regarding your roofing project inquiry.

I don't want you to miss out on our free inspection offer. Here's what you'll get:
✓ Professional assessment of your roof's condition
✓ Detailed report with photos
✓ Honest recommendations (repair vs. replacement)
✓ No obligation estimate

Winter is approaching, and it's the perfect time to prepare your roof for the season ahead.

If you're still interested, please reply to this email or call us at (555) 123-4567.

If timing isn't right, no worries! Feel free to reach out whenever you're ready.

Best regards,
[Your Name]

P.S. Ask about our financing options - we work with all budgets!`
        },
        delay: 168,
        enabled: true,
        order: 5
      }
    ],
    conditions: [
      {
        id: 'condition_has_email',
        field: 'contact.email',
        operator: 'is_not_empty',
        value: null,
        logic_gate: 'AND'
      }
    ]
  },

  {
    id: 'project-completion-survey',
    name: 'Project Completion Survey & Follow-up',
    description: 'Automatically send satisfaction survey and request reviews when project is completed',
    category: 'customer_onboarding',
    tags: ['project', 'survey', 'reviews', 'completion'],
    trigger: {
      id: 'trigger_project_completed',
      type: 'project_status_changed',
      config: {
        type: 'project_status_changed',
        to_status: ['completed']
      },
      enabled: true
    },
    actions: [
      {
        id: 'action_completion_email',
        type: 'send_email',
        config: {
          type: 'send_email',
          to: '{{contact.email}}',
          subject: 'Your roofing project is complete! 🎉',
          body: `Hi {{contact.first_name}},

Congratulations! Your roofing project has been completed.

We hope you're thrilled with the results. Our team worked hard to deliver quality workmanship that will protect your home for years to come.

Project Summary:
- Project: {{project.name}}
- Completed: {{project.completion_date}}
- Warranty: {{project.warranty_details}}

What's next:
- Final walkthrough photos are attached
- Your warranty information is included
- We'll check in with you in 30 days

Thank you for choosing us for your roofing needs!

Best regards,
The Team`
        },
        enabled: true,
        order: 0
      },
      {
        id: 'action_satisfaction_survey',
        type: 'send_email',
        config: {
          type: 'send_email',
          to: '{{contact.email}}',
          subject: 'How did we do? Quick 2-minute survey',
          body: `Hi {{contact.first_name}},

We'd love to hear about your experience with our team!

Could you take just 2 minutes to share your feedback? Your input helps us improve and serves future customers.

[Survey Link: https://survey.example.com/{{project.id}}]

Questions we're asking:
- How would you rate our communication?
- Was the project completed on time?
- Would you recommend us to friends?

As a thank you, we'll send you a $25 gift card to your favorite local restaurant.

Thank you for your time!

Best regards,
Customer Success Team`
        },
        delay: 24,
        enabled: true,
        order: 1
      },
      {
        id: 'action_review_request',
        type: 'send_email',
        config: {
          type: 'send_email',
          to: '{{contact.email}}',
          subject: 'Would you mind sharing your experience online?',
          body: `Hi {{contact.first_name}},

I hope you're enjoying your new roof!

If you're happy with our work, would you mind taking a moment to share your experience online? Reviews help other homeowners find us and make confident decisions about their roofing needs.

Here are quick links to leave a review:
- Google: [Google Review Link]
- Facebook: [Facebook Review Link]
- Better Business Bureau: [BBB Review Link]

Don't worry if you're not sure what to write - even a simple "Great job!" with a star rating is incredibly helpful.

Thank you for your time and for choosing us!

Best regards,
[Your Name]

P.S. If anything isn't perfect with your roof, please let me know immediately so we can make it right.`
        },
        delay: 168,
        enabled: true,
        order: 2
      },
      {
        id: 'action_change_to_customer',
        type: 'change_stage',
        config: {
          type: 'change_stage',
          stage: 'won',
          substatus: 'project-completed'
        },
        enabled: true,
        order: 3
      },
      {
        id: 'action_add_customer_tags',
        type: 'add_tag',
        config: {
          type: 'add_tag',
          tags: ['completed-project', 'satisfied-customer', 'review-requested']
        },
        delay: 1,
        enabled: true,
        order: 4
      }
    ]
  },

  {
    id: 'stale-deal-reminder',
    name: 'Stale Deal Reminder System',
    description: 'Automatically remind team to follow up on deals that haven\'t been updated in 7 days',
    category: 'follow_up',
    tags: ['deals', 'reminder', 'follow-up', 'pipeline'],
    trigger: {
      id: 'trigger_stale_deal',
      type: 'time_elapsed',
      config: {
        type: 'time_elapsed',
        duration: 168, // 7 days in hours
        field: 'updated_at',
        contact_stage: ['contacted', 'qualified', 'proposal', 'negotiation']
      },
      enabled: true
    },
    actions: [
      {
        id: 'action_internal_reminder',
        type: 'send_email',
        config: {
          type: 'send_email',
          to: '{{contact.assigned_to}}@company.com',
          subject: '⚠️ Stale deal alert: {{contact.first_name}} {{contact.last_name}}',
          body: `Hi there,

This is a friendly reminder that one of your deals hasn't been updated in 7 days:

Contact: {{contact.first_name}} {{contact.last_name}}
Stage: {{contact.stage}}
Last Update: {{contact.updated_at}}
Property: {{contact.property_type}}
Estimated Value: $\{\{contact.property_value\}\}

Recommended actions:
1. Call the contact to check in
2. Send a follow-up email
3. Update the deal status
4. Schedule a follow-up task

Don't let this lead go cold! A quick touchpoint can make all the difference.

[View Contact in CRM: /contacts/{{contact.id}}]

Keep up the great work!
Your CRM Assistant`
        },
        enabled: true,
        order: 0
      },
      {
        id: 'action_follow_up_task',
        type: 'create_task',
        config: {
          type: 'create_task',
          title: 'Follow up with stale deal: {{contact.first_name}} {{contact.last_name}}',
          description: 'This contact hasn\'t been updated in 7 days. Please follow up to maintain engagement.\n\nSuggested actions:\n- Make a phone call\n- Send a check-in email\n- Schedule a meeting\n- Update deal status\n\nLast activity: {{contact.updated_at}}',
          due_date: '+1 day',
          priority: 'high',
          assigned_to: '{{contact.assigned_to}}',
          contact_id: '{{contact.id}}'
        },
        enabled: true,
        order: 1
      },
      {
        id: 'action_priority_boost',
        type: 'update_field',
        config: {
          type: 'update_field',
          field: 'priority',
          value: 'high',
          operator: 'set'
        },
        enabled: true,
        order: 2
      },
      {
        id: 'action_add_stale_tag',
        type: 'add_tag',
        config: {
          type: 'add_tag',
          tags: ['stale-deal', 'needs-follow-up']
        },
        enabled: true,
        order: 3
      }
    ],
    conditions: [
      {
        id: 'condition_has_assigned_user',
        field: 'contact.assigned_to',
        operator: 'is_not_empty',
        value: null,
        logic_gate: 'AND'
      }
    ]
  },

  {
    id: 'invoice-reminder-sequence',
    name: 'Invoice Payment Reminder Sequence',
    description: 'Automated payment reminder sequence for overdue invoices with escalation',
    category: 'notifications',
    tags: ['invoices', 'payments', 'reminders', 'collections'],
    trigger: {
      id: 'trigger_invoice_overdue',
      type: 'scheduled',
      config: {
        type: 'scheduled',
        schedule: 'daily',
        time: '09:00'
      },
      enabled: true
    },
    actions: [
      {
        id: 'action_gentle_reminder',
        type: 'send_email',
        config: {
          type: 'send_email',
          to: '{{contact.email}}',
          subject: 'Friendly payment reminder - Invoice {{invoice.number}}',
          body: `Hi {{contact.first_name}},

I hope you're enjoying your new roof!

This is a friendly reminder that we haven't received payment for invoice {{invoice.number}} yet.

Invoice Details:
- Amount: $\{\{invoice.amount\}\}
- Due Date: {{invoice.due_date}}
- Project: {{project.name}}

You can pay online at: [Payment Portal Link]

Or send payment to:
[Company Address]

If you've already sent payment, please disregard this message. If you have any questions about your invoice, feel free to reach out.

Thank you for your business!

Best regards,
Accounts Receivable Team`
        },
        enabled: true,
        order: 0
      },
      {
        id: 'action_second_reminder',
        type: 'send_email',
        config: {
          type: 'send_email',
          to: '{{contact.email}}',
          subject: 'Second notice: Payment overdue - Invoice {{invoice.number}}',
          body: `Hi {{contact.first_name}},

We still haven't received payment for invoice {{invoice.number}}, which is now {{invoice.days_overdue}} days overdue.

Invoice Details:
- Amount: $\{\{invoice.amount\}\}
- Original Due Date: {{invoice.due_date}}
- Days Overdue: {{invoice.days_overdue}}

Please remit payment immediately to avoid any service interruptions or additional fees.

Payment Options:
- Online: [Payment Portal Link]
- Phone: Call (555) 123-4567
- Mail: [Company Address]

If you're experiencing financial difficulties, please contact us to discuss payment arrangements.

We appreciate your prompt attention to this matter.

Sincerely,
Accounts Receivable Team`
        },
        delay: 168, // 7 days after first reminder
        enabled: true,
        order: 1
      },
      {
        id: 'action_final_notice',
        type: 'send_email',
        config: {
          type: 'send_email',
          to: '{{contact.email}}',
          subject: 'FINAL NOTICE: Payment required - Invoice {{invoice.number}}',
          body: `FINAL NOTICE

{{contact.first_name}} {{contact.last_name}}

Your account is seriously past due. Immediate payment is required for invoice {{invoice.number}}.

AMOUNT DUE: $\{\{invoice.amount\}\}
DAYS OVERDUE: {{invoice.days_overdue}}

If payment is not received within 48 hours, we will be forced to:
- Turn your account over to collections
- Report to credit agencies
- Pursue legal action

This is your final opportunity to resolve this matter directly with us.

IMMEDIATE PAYMENT REQUIRED
- Online: [Payment Portal]
- Phone: (555) 123-4567
- Overnight mail: [Address]

Contact our office immediately at (555) 123-4567 if you wish to discuss payment arrangements.

Sincerely,
Collections Department`
        },
        delay: 336, // 14 days after second reminder (21 days total)
        enabled: true,
        order: 2
      },
      {
        id: 'action_create_collection_task',
        type: 'create_task',
        config: {
          type: 'create_task',
          title: 'Collection action needed: {{contact.first_name}} {{contact.last_name}}',
          description: 'Invoice {{invoice.number}} is {{invoice.days_overdue}} days overdue. Final notice has been sent. Consider collection agency or legal action.\n\nAmount: $\{\{invoice.amount\}\}\nContact: {{contact.phone}}',
          due_date: '+2 days',
          priority: 'urgent',
          assigned_to: '{{user.collections_manager_id}}',
          contact_id: '{{contact.id}}'
        },
        delay: 384, // 16 days after second reminder
        enabled: true,
        order: 3
      }
    ]
  },

  {
    id: 're-engagement-campaign',
    name: 'Customer Re-engagement Campaign',
    description: 'Re-engage past customers for additional services, referrals, and seasonal maintenance',
    category: 'lead_nurturing',
    tags: ['re-engagement', 'past-customers', 'referrals', 'maintenance'],
    trigger: {
      id: 'trigger_annual_reengagement',
      type: 'scheduled',
      config: {
        type: 'scheduled',
        schedule: 'monthly',
        time: '10:00'
      },
      enabled: true
    },
    actions: [
      {
        id: 'action_reengagement_email',
        type: 'send_email',
        config: {
          type: 'send_email',
          to: '{{contact.email}}',
          subject: 'How\'s your roof holding up, {{contact.first_name}}?',
          body: `Hi {{contact.first_name}},

It's been {{customer.years_since_project}} year(s) since we completed your roofing project, and I wanted to check in!

How has your roof been performing? We hope it's kept you dry and comfortable through all seasons.

As a valued past customer, we'd like to offer:

🔧 FREE Annual Roof Inspection ($200 value)
   - Check for any wear or damage
   - Clean gutters and downspouts
   - Provide maintenance recommendations

💰 20% Off Additional Services
   - Gutter repairs or replacement
   - Skylight installation
   - Attic ventilation improvements
   - Siding repairs

👥 Referral Rewards Program
   - Earn $500 for each friend you refer
   - They get 10% off their project
   - No limit on referral earnings!

Schedule your free inspection: [Booking Link]

Questions? Just reply to this email or call (555) 123-4567.

Thanks for being a great customer!

Best regards,
[Your Name]

P.S. Did you know storm damage might be covered by insurance even if you don't see obvious damage? Our inspection can help identify potential claims.`
        },
        enabled: true,
        order: 0
      },
      {
        id: 'action_follow_up_call_task',
        type: 'create_task',
        config: {
          type: 'create_task',
          title: 'Re-engagement call: {{contact.first_name}} {{contact.last_name}}',
          description: 'Follow up on re-engagement email sent to past customer.\n\nTalk about:\n- How their roof is performing\n- Free inspection offer\n- Additional services needed\n- Referral opportunities\n\nProject completed: {{project.completion_date}}',
          due_date: '+3 days',
          priority: 'normal',
          assigned_to: '{{user.sales_manager_id}}',
          contact_id: '{{contact.id}}'
        },
        delay: 72,
        enabled: true,
        order: 1
      },
      {
        id: 'action_add_reengagement_tag',
        type: 'add_tag',
        config: {
          type: 'add_tag',
          tags: ['re-engagement-2024', 'past-customer-outreach']
        },
        enabled: true,
        order: 2
      }
    ],
    conditions: [
      {
        id: 'condition_is_past_customer',
        field: 'contact.type',
        operator: 'equals',
        value: 'customer',
        logic_gate: 'AND'
      },
      {
        id: 'condition_project_completed',
        field: 'contact.stage',
        operator: 'equals',
        value: 'won',
        logic_gate: 'AND'
      }
    ]
  }
]

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): WorkflowTemplate[] {
  return workflowTemplates.filter(template => template.category === category)
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return workflowTemplates.find(template => template.id === id)
}

/**
 * Search templates
 */
export function searchTemplates(query: string): WorkflowTemplate[] {
  const searchLower = query.toLowerCase()
  return workflowTemplates.filter(template =>
    template.name.toLowerCase().includes(searchLower) ||
    template.description.toLowerCase().includes(searchLower) ||
    template.tags.some(tag => tag.toLowerCase().includes(searchLower))
  )
}

/**
 * Get all template categories
 */
export function getTemplateCategories(): string[] {
  const categories = new Set(workflowTemplates.map(t => t.category))
  return Array.from(categories)
}