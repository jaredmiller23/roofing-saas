/**
 * Campaign Templates for Roofing SaaS
 *
 * Pre-built campaign sequences for common roofing business workflows
 */

import type {
  CampaignType,
  GoalType,
  StepType,
  TriggerType,
  SendEmailStepConfig,
  SendSmsStepConfig,
  CreateTaskStepConfig,
  WaitStepConfig,
} from './types'

export interface CampaignTemplateStep {
  step_order: number
  step_type: StepType
  step_config: Record<string, unknown>
  delay_value: number
  delay_unit: 'hours' | 'days' | 'weeks'
}

export interface CampaignTemplate {
  id: string
  name: string
  description: string
  category: 'lead_nurture' | 'follow_up' | 'retention' | 'review' | 'reengagement'
  campaign_type: CampaignType
  goal_type?: GoalType
  goal_target?: number
  icon: string
  estimated_duration: string
  steps: CampaignTemplateStep[]
  trigger_config?: {
    trigger_type: TriggerType
    config: Record<string, unknown>
  }
  tags: string[]
}

// ============================================================================
// TEMPLATE DEFINITIONS
// ============================================================================

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  // 1. New Lead Welcome Series
  {
    id: 'new-lead-welcome',
    name: 'New Lead Welcome Series',
    description: 'Automated 7-day email sequence to welcome and nurture new leads from initial contact to appointment',
    category: 'lead_nurture',
    campaign_type: 'drip',
    goal_type: 'appointments',
    goal_target: 50,
    icon: 'Mail',
    estimated_duration: '7 days',
    tags: ['email', 'lead-nurture', 'automation'],
    trigger_config: {
      trigger_type: 'stage_change',
      config: {
        entity_type: 'contact',
        to_stage: 'new',
      },
    },
    steps: [
      {
        step_order: 1,
        step_type: 'send_email',
        step_config: {
          subject: 'Welcome! Your Roofing Estimate Request Received',
          body: `Hi {{first_name}},

Thank you for reaching out to us about your roofing project! We're excited to help you with {{project_type}}.

We've received your request and one of our roofing specialists will contact you within 24 hours to schedule a free inspection and estimate.

In the meantime, here's what you can expect:
✓ Free, no-obligation roof inspection
✓ Detailed estimate with multiple options
✓ Expert recommendations for your specific needs
✓ Flexible financing options available

We look forward to serving you!

Best regards,
{{company_name}}
{{user_name}}
{{user_phone}}`,
          track_opens: true,
          track_clicks: true,
        } as any,
        delay_value: 0,
        delay_unit: 'hours',
      },
      {
        step_order: 2,
        step_type: 'create_task',
        step_config: {
          title: 'Follow up with new lead: {{contact_name}}',
          description: 'Contact new lead to schedule roof inspection',
          task_type: 'call',
          priority: 'high',
          due_in_days: 1,
        } as any,
        delay_value: 2,
        delay_unit: 'hours',
      },
      {
        step_order: 3,
        step_type: 'wait',
        step_config: {} as any,
        delay_value: 3,
        delay_unit: 'days',
      },
      {
        step_order: 4,
        step_type: 'send_email',
        step_config: {
          subject: 'Quick Question About Your Roofing Project',
          body: `Hi {{first_name}},

I wanted to check in about your roofing project. Have you had a chance to think about when would work for a free inspection?

We have some availability this week:
• Tuesday afternoon
• Thursday morning
• Friday afternoon

Just reply to this email or give me a call at {{user_phone}} and we'll get you scheduled.

Looking forward to helping you!

{{user_name}}`,
          track_opens: true,
        } as any,
        delay_value: 0,
        delay_unit: 'hours',
      },
      {
        step_order: 5,
        step_type: 'wait',
        step_config: {} as any,
        delay_value: 3,
        delay_unit: 'days',
      },
      {
        step_order: 6,
        step_type: 'send_email',
        step_config: {
          subject: 'Why {{company_name}} is the Right Choice',
          body: `Hi {{first_name}},

I know choosing a roofing contractor is a big decision. Here's why our customers trust us:

⭐ A+ BBB Rating with 500+ 5-star reviews
⭐ 25+ years serving homeowners in {{city}}
⭐ Manufacturer-certified installers
⭐ Lifetime workmanship warranty
⭐ Financing options available

Ready to get started? Book your free inspection here: {{booking_link}}

Or call/text me directly: {{user_phone}}

{{user_name}}`,
          track_opens: true,
          track_clicks: true,
        } as any,
        delay_value: 0,
        delay_unit: 'hours',
      },
    ],
  },

  // 2. Estimate Follow-up Sequence
  {
    id: 'estimate-follow-up',
    name: 'Estimate Follow-up Sequence',
    description: 'Mixed email and SMS sequence to convert estimates into signed contracts (3 touches over 10 days)',
    category: 'follow_up',
    campaign_type: 'event',
    goal_type: 'deals',
    goal_target: 25,
    icon: 'FileText',
    estimated_duration: '10 days',
    tags: ['sms', 'email', 'conversion', 'estimate'],
    trigger_config: {
      trigger_type: 'event',
      config: {
        event_name: 'activity_created',
        event_filters: {
          activity_type: 'document',
          activity_subtype: 'estimate_sent',
        },
      },
    },
    steps: [
      {
        step_order: 1,
        step_type: 'send_email',
        step_config: {
          subject: 'Your Roof Estimate from {{company_name}}',
          body: `Hi {{first_name}},

Thanks for meeting with me! As promised, I've attached your detailed roof estimate.

**Your Investment:**
Total Project Cost: \${{estimate_amount}}
Monthly Payment Option: \${{monthly_payment}}/month*

**What's Included:**
✓ {{shingle_type}} shingles ({{warranty_years}}-year warranty)
✓ Full tear-off and disposal
✓ New underlayment and ice/water barrier
✓ Ridge vent installation
✓ Lifetime workmanship warranty

**Next Steps:**
Ready to move forward? Reply to this email or call me at {{user_phone}}.

I've also reserved a spot on our schedule for {{start_date}} - but it won't hold forever!

Best,
{{user_name}}

*Subject to credit approval`,
          track_opens: true,
          track_clicks: true,
        } as any,
        delay_value: 0,
        delay_unit: 'hours',
      },
      {
        step_order: 2,
        step_type: 'wait',
        step_config: {} as any,
        delay_value: 3,
        delay_unit: 'days',
      },
      {
        step_order: 3,
        step_type: 'send_sms',
        step_config: {
          message: `Hi {{first_name}}, {{user_name}} here from {{company_name}}. Just checking - did you get a chance to review the estimate I sent? Any questions? Call/text me: {{user_phone}}`,
          track_replies: true,
        } as any,
        delay_value: 0,
        delay_unit: 'hours',
      },
      {
        step_order: 4,
        step_type: 'wait',
        step_config: {} as any,
        delay_value: 4,
        delay_unit: 'days',
      },
      {
        step_order: 5,
        step_type: 'send_email',
        step_config: {
          subject: 'Special Financing Offer - Ends {{expiry_date}}',
          body: `Hi {{first_name}},

I wanted to reach out one more time about your roof project.

**LIMITED TIME OFFER:**
We can offer you 0% financing for 12 months on approved credit - but this offer expires {{expiry_date}}.

Plus, if you sign this week:
• Free gutter cleaning ($300 value)
• Upgraded ridge cap shingles (no charge)
• Priority scheduling

Your reserved start date is {{start_date}}. After that, we'll need to release it to other customers.

Ready to lock this in? Call me: {{user_phone}}

{{user_name}}`,
          track_opens: true,
        } as any,
        delay_value: 0,
        delay_unit: 'hours',
      },
      {
        step_order: 6,
        step_type: 'create_task',
        step_config: {
          title: 'Final follow-up call: {{contact_name}} estimate',
          description: 'Make final attempt to close estimate. Mark as lost if no response.',
          task_type: 'call',
          priority: 'high',
          due_in_days: 3,
        } as any,
        delay_value: 3,
        delay_unit: 'days',
      },
    ],
  },

  // 3. Post-Inspection Follow-up
  {
    id: 'post-inspection',
    name: 'Post-Inspection Follow-up',
    description: 'Quick 48-hour sequence after roof inspection to deliver findings and schedule estimate review',
    category: 'follow_up',
    campaign_type: 'event',
    goal_type: 'appointments',
    icon: 'ClipboardCheck',
    estimated_duration: '2 days',
    tags: ['inspection', 'email', 'quick-turnaround'],
    trigger_config: {
      trigger_type: 'event',
      config: {
        event_name: 'activity_created',
        event_filters: {
          activity_type: 'meeting',
          activity_subtype: 'roof_inspection',
        },
      },
    },
    steps: [
      {
        step_order: 1,
        step_type: 'send_email',
        step_config: {
          subject: 'Your Roof Inspection Report - Action Required',
          body: `Hi {{first_name}},

Thank you for allowing me to inspect your roof today!

**Inspection Findings:**
{{inspection_summary}}

**Recommended Actions:**
{{recommended_actions}}

**Photos:**
I've attached photos showing the areas of concern.

**Next Steps:**
I'm preparing a detailed estimate for you. Let's schedule a 15-minute call to review:
• Your options (repair vs. replacement)
• Cost breakdown
• Financing available
• Timeline

When works for you?
• Tomorrow at {{time_slot_1}}
• {{day_2}} at {{time_slot_2}}

Or book directly: {{calendar_link}}

{{user_name}}
{{user_phone}}`,
          track_opens: true,
          track_clicks: true,
        } as any,
        delay_value: 2,
        delay_unit: 'hours',
      },
      {
        step_order: 2,
        step_type: 'wait',
        step_config: {} as any,
        delay_value: 1,
        delay_unit: 'days',
      },
      {
        step_order: 3,
        step_type: 'send_sms',
        step_config: {
          message: `{{first_name}}, I sent your roof inspection report yesterday. Did you have a chance to review it? Happy to answer any questions! - {{user_name}} {{user_phone}}`,
          track_replies: true,
        } as any,
        delay_value: 0,
        delay_unit: 'hours',
      },
    ],
  },

  // 4. Win-back Inactive Leads
  {
    id: 'winback-inactive',
    name: 'Win-back Inactive Leads',
    description: 'Re-engagement campaign for leads who went cold 3+ months ago',
    category: 'reengagement',
    campaign_type: 'reengagement',
    goal_type: 'appointments',
    icon: 'RefreshCw',
    estimated_duration: '14 days',
    tags: ['reengagement', 'dormant', 'email'],
    steps: [
      {
        step_order: 1,
        step_type: 'send_email',
        step_config: {
          subject: 'Still thinking about that new roof?',
          body: `Hi {{first_name}},

We spoke {{months_ago}} months ago about your roofing project. I wanted to check in - are you still considering getting your roof done?

A lot has changed since we last talked:
• Material costs have stabilized
• We have better financing options now
• More availability for scheduling
• New energy-efficient options available

Would you like me to update your original estimate with current pricing?

No pressure - just wanted to make sure you had the latest information!

{{user_name}}
{{user_phone}}`,
          track_opens: true,
        } as any,
        delay_value: 0,
        delay_unit: 'hours',
      },
      {
        step_order: 2,
        step_type: 'wait',
        step_config: {} as any,
        delay_value: 7,
        delay_unit: 'days',
      },
      {
        step_order: 3,
        step_type: 'send_email',
        step_config: {
          subject: 'Special offer for returning customers',
          body: `Hi {{first_name}},

I know life gets busy - trust me, I get it!

Since you've reached out to us before, I wanted to extend a special offer:

**RETURNING CUSTOMER DISCOUNT**
$500 off any full roof replacement

Plus:
• Free drone roof inspection
• Priority scheduling
• Extended warranty options

This offer expires {{expiry_date}}.

Interested in getting a fresh look at your roof? Let me know!

{{user_name}}`,
          track_opens: true,
        } as any,
        delay_value: 0,
        delay_unit: 'hours',
      },
    ],
  },

  // 5. Customer Review Request
  {
    id: 'review-request',
    name: 'Customer Review Request',
    description: 'Post-project sequence to collect 5-star reviews and referrals',
    category: 'review',
    campaign_type: 'event',
    goal_type: 'reviews',
    goal_target: 100,
    icon: 'Star',
    estimated_duration: '10 days',
    tags: ['reviews', 'referrals', 'post-project'],
    trigger_config: {
      trigger_type: 'stage_change',
      config: {
        entity_type: 'project',
        to_stage: 'completed',
      },
    },
    steps: [
      {
        step_order: 1,
        step_type: 'send_email',
        step_config: {
          subject: 'Thank you from {{company_name}}!',
          body: `Hi {{first_name}},

Thank you for choosing {{company_name}} for your roofing project!

It was a pleasure working with you, and we hope you're thrilled with your new roof.

**Quick Survey:**
How did we do? It would mean the world if you could take 30 seconds to share your experience:

⭐⭐⭐⭐⭐ Leave us a review: {{review_link}}

Your feedback helps other homeowners make confident decisions about their roofing needs.

And as a thank you, we're entering all reviewers into a monthly drawing for a $100 Home Depot gift card!

Thank you again,
{{user_name}}`,
          track_opens: true,
          track_clicks: true,
        } as any,
        delay_value: 2,
        delay_unit: 'days',
      },
      {
        step_order: 2,
        step_type: 'wait',
        step_config: {} as any,
        delay_value: 5,
        delay_unit: 'days',
      },
      {
        step_order: 3,
        step_type: 'send_sms',
        step_config: {
          message: `Hi {{first_name}}! Hope you're loving the new roof! If you're happy with our work, would you mind leaving us a quick review? {{review_link}} Thanks! - {{user_name}}`,
          track_replies: true,
        } as any,
        delay_value: 0,
        delay_unit: 'hours',
      },
      {
        step_order: 4,
        step_type: 'wait',
        step_config: {} as any,
        delay_value: 3,
        delay_unit: 'days',
      },
      {
        step_order: 5,
        step_type: 'send_email',
        step_config: {
          subject: 'Know anyone who needs a new roof?',
          body: `Hi {{first_name}},

Thanks again for trusting us with your roof!

We grow our business through word-of-mouth, and we'd love to help your friends and neighbors too.

**REFERRAL BONUS:**
For every referral that turns into a signed project:
• You get $250 cash
• They get $250 off their project
• Win-win!

Know anyone who mentioned they need roof work? Just reply with their name and number, and I'll take it from there.

Thanks for spreading the word!

{{user_name}}`,
          track_opens: true,
        } as any,
        delay_value: 0,
        delay_unit: 'hours',
      },
    ],
  },

  // 6. Storm Damage Outreach
  {
    id: 'storm-damage',
    name: 'Storm Damage Outreach',
    description: 'Urgent follow-up sequence for leads in areas affected by recent storms',
    category: 'follow_up',
    campaign_type: 'event',
    goal_type: 'appointments',
    icon: 'CloudRain',
    estimated_duration: '7 days',
    tags: ['storm', 'urgent', 'insurance', 'email-sms'],
    steps: [
      {
        step_order: 1,
        step_type: 'send_email',
        step_config: {
          subject: 'Free Storm Damage Inspection - {{city}} Storm {{storm_date}}',
          body: `Hi {{first_name}},

I wanted to reach out after the recent storm in {{city}} on {{storm_date}}.

**We're offering FREE storm damage inspections** to all homeowners in your area.

Even if your roof looks fine from the ground, storm damage can be hidden:
• Lifted/missing shingles
• Hail damage (granule loss)
• Damaged flashing
• Compromised seals

**Why act now?**
✓ Insurance claims must be filed within 1 year
✓ Small damage gets worse over time
✓ We work directly with your insurance
✓ Zero out-of-pocket in most cases

**Available This Week:**
We have inspection slots available:
• {{day_1}} at {{time_1}}
• {{day_2}} at {{time_2}}
• {{day_3}} at {{time_3}}

Book here: {{calendar_link}}
Or call/text: {{user_phone}}

{{user_name}}
Licensed & Insured`,
          track_opens: true,
          track_clicks: true,
        } as any,
        delay_value: 0,
        delay_unit: 'hours',
      },
      {
        step_order: 2,
        step_type: 'wait',
        step_config: {} as any,
        delay_value: 2,
        delay_unit: 'days',
      },
      {
        step_order: 3,
        step_type: 'send_sms',
        step_config: {
          message: `{{first_name}}, {{user_name}} with {{company_name}}. Have you had your roof checked after the {{storm_date}} storm? We're doing free inspections this week. Insurance may cover 100%. Call/text: {{user_phone}}`,
          track_replies: true,
        } as any,
        delay_value: 0,
        delay_unit: 'hours',
      },
      {
        step_order: 4,
        step_type: 'wait',
        step_config: {} as any,
        delay_value: 3,
        delay_unit: 'days',
      },
      {
        step_order: 5,
        step_type: 'send_email',
        step_config: {
          subject: 'Your neighbors are getting new roofs (insurance paid)',
          body: `Hi {{first_name}},

Quick update - we've already inspected {{neighbor_count}} homes in your neighborhood since the {{storm_date}} storm.

**The result?**
Over {{approval_percentage}}% qualified for full roof replacement through their insurance - at zero out-of-pocket cost!

Your home was built around the same time as your neighbors, which means you likely have similar damage.

**Time is running out:**
• Insurance deadline: {{deadline_date}}
• Our schedule is filling up fast
• Prices may increase next quarter

Don't leave money on the table. Let us do a free inspection and handle the insurance paperwork for you.

Book now: {{calendar_link}}
Call/text: {{user_phone}}

{{user_name}}`,
          track_opens: true,
          track_clicks: true,
        } as any,
        delay_value: 0,
        delay_unit: 'hours',
      },
      {
        step_order: 6,
        step_type: 'create_task',
        step_config: {
          title: 'Final storm outreach: {{contact_name}}',
          description: 'Last attempt for storm damage inspection. Archive if no response.',
          task_type: 'call',
          priority: 'medium',
          due_in_days: 2,
        } as any,
        delay_value: 2,
        delay_unit: 'days',
      },
    ],
  },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all templates
 */
export function getAllTemplates(): CampaignTemplate[] {
  return CAMPAIGN_TEMPLATES
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): CampaignTemplate | undefined {
  return CAMPAIGN_TEMPLATES.find((t) => t.id === id)
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: CampaignTemplate['category']
): CampaignTemplate[] {
  return CAMPAIGN_TEMPLATES.filter((t) => t.category === category)
}

/**
 * Get templates by campaign type
 */
export function getTemplatesByCampaignType(
  campaignType: CampaignType
): CampaignTemplate[] {
  return CAMPAIGN_TEMPLATES.filter((t) => t.campaign_type === campaignType)
}

/**
 * Replace template variables with actual values
 */
export function replaceTemplateVariables(
  text: string,
  variables: Record<string, string>
): string {
  let result = text
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g')
    result = result.replace(regex, value)
  }
  return result
}
