/**
 * Feature Spotlight Email Template (Day 5)
 * Highlights features based on onboarding priorities
 */

import { createEmailHTML } from '@/lib/resend/email'
import type { FeatureHighlight } from '../types'
import type { OnboardingPriority } from '@/lib/onboarding/types'

export interface FeatureSpotlightEmailParams {
  recipientName: string
  appUrl: string
  features: FeatureHighlight[]
  daysRemaining: number
}

/** Maps onboarding priorities to feature highlights */
const FEATURE_CATALOG: Record<OnboardingPriority, FeatureHighlight> = {
  contact_management: {
    title: 'Contact Management',
    description: 'Track every homeowner, adjuster, and referral partner in one place. Filter by status, tag contacts, and see their full history at a glance.',
    icon: '👥',
    link: '/contacts',
  },
  sales_pipeline: {
    title: 'Sales Pipeline',
    description: 'Drag-and-drop Kanban board to move jobs through your sales stages. Customize stages, set sub-statuses, and never lose track of a deal.',
    icon: '📊',
    link: '/pipeline',
  },
  estimates_invoices: {
    title: 'Estimates & Invoices',
    description: 'Create professional quotes with line items, multiple options, and one-click sending. Customers can view and approve online.',
    icon: '📄',
    link: '/estimates',
  },
  team_management: {
    title: 'Team Management',
    description: 'Assign crew members to jobs, track field worker activity, and manage permissions. Everyone sees exactly what they need.',
    icon: '👷',
    link: '/settings?tab=team',
  },
  territory_mapping: {
    title: 'Territory Mapping',
    description: 'Map neighborhoods, drop pins for door knocks, and see canvassing coverage in real time. Track who knocked where and when.',
    icon: '🗺️',
    link: '/territories',
  },
}

/** Default features if no priorities were selected */
const DEFAULT_FEATURES: OnboardingPriority[] = [
  'contact_management',
  'sales_pipeline',
  'estimates_invoices',
]

export function getFeaturesForPriorities(priorities: OnboardingPriority[]): FeatureHighlight[] {
  const keys = priorities.length > 0 ? priorities.slice(0, 3) : DEFAULT_FEATURES
  return keys.map((key) => FEATURE_CATALOG[key])
}

export function createFeatureSpotlightEmail(params: FeatureSpotlightEmailParams): string {
  const { recipientName, appUrl, features, daysRemaining } = params

  const featureCards = features
    .map(
      (feature) => `
      <tr>
        <td style="padding: 16px; background-color: #FFF8F5; border-bottom: 1px solid #FFE8DD;">
          <div style="font-size: 24px; margin-bottom: 4px;">${feature.icon}</div>
          <strong style="color: #1a1a1a; font-size: 16px;">${feature.title}</strong>
          <p style="color: #555; margin: 4px 0 8px; font-size: 14px;">
            ${feature.description}
          </p>
          <a href="${appUrl}${feature.link}" style="color: #FF8243; font-size: 14px; font-weight: 600; text-decoration: none;">
            Try it now &rarr;
          </a>
        </td>
      </tr>
    `
    )
    .join('')

  const body = `
    <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 24px;">
      The features roofing pros use most
    </h1>

    <p style="color: #333; margin-bottom: 16px;">
      Hi ${recipientName},
    </p>

    <p style="color: #333; margin-bottom: 24px;">
      You have <strong>${daysRemaining} days</strong> left in your trial. Here are the features
      that roofing companies get the most value from:
    </p>

    <table style="width: 100%; border-collapse: collapse; margin: 24px 0; border-radius: 8px; overflow: hidden;">
      ${featureCards}
    </table>

    <div style="margin: 32px 0; text-align: center;">
      <a href="${appUrl}/dashboard" style="background-color: #FF8243; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        Explore Your Dashboard
      </a>
    </div>

    <p style="color: #666; font-size: 14px; margin-top: 32px;">
      Want a walkthrough? Reply and we&apos;ll set up a quick call.
    </p>
  `

  return createEmailHTML(body, 'Features Roofing Pros Love')
}

export function getFeatureSpotlightSubject(): string {
  return 'The features roofing pros use most'
}
