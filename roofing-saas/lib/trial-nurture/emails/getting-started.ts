/**
 * Getting Started Email Template (Day 2)
 * Behavioral — content varies based on what the user has done
 */

import { createEmailHTML } from '@/lib/resend/email'
import type { GettingStartedVariant } from '../types'

export interface GettingStartedEmailParams {
  recipientName: string
  appUrl: string
  variant: GettingStartedVariant
}

const VARIANT_CONTENT: Record<GettingStartedVariant, {
  heading: string
  body: string
  ctaText: string
  ctaPath: string
}> = {
  no_onboarding: {
    heading: 'Your setup takes just 2 minutes',
    body: `
      <p style="color: #333; margin-bottom: 16px;">
        We noticed you haven&apos;t completed your account setup yet. The guided wizard
        walks you through the essentials &mdash; most people finish in under 2 minutes.
      </p>
      <p style="color: #333; margin-bottom: 16px;">
        Once you&apos;re set up, you&apos;ll be able to manage contacts, track jobs, and
        run your pipeline like the pros.
      </p>
    `,
    ctaText: 'Complete Setup',
    ctaPath: '/onboarding',
  },
  no_contacts: {
    heading: 'Add your first contact in 30 seconds',
    body: `
      <p style="color: #333; margin-bottom: 16px;">
        The fastest way to see JobClarity in action is to add a contact. It takes
        30 seconds and unlocks everything else &mdash; projects, estimates, and pipeline tracking.
      </p>
      <p style="color: #333; margin-bottom: 16px;">
        Start with a homeowner, an adjuster, or even yourself as a test contact.
      </p>
    `,
    ctaText: 'Add a Contact',
    ctaPath: '/contacts',
  },
  no_projects: {
    heading: 'Ready to track your first job?',
    body: `
      <p style="color: #333; margin-bottom: 16px;">
        You&apos;ve added contacts &mdash; nice work! The next step is creating a project.
        Projects tie everything together: contacts, estimates, documents, and your pipeline stage.
      </p>
      <p style="color: #333; margin-bottom: 16px;">
        Create one for a real job or a test project to see how it all flows.
      </p>
    `,
    ctaText: 'Create a Project',
    ctaPath: '/projects',
  },
  active_user: {
    heading: 'You&apos;re off to a great start',
    body: `
      <p style="color: #333; margin-bottom: 16px;">
        You&apos;ve already set up contacts and projects &mdash; you&apos;re ahead of most
        new users. Here are a few features worth exploring next:
      </p>
      <ul style="color: #333; margin-bottom: 24px; padding-left: 24px;">
        <li><strong>Estimates</strong> &mdash; Create professional quotes and send them to customers</li>
        <li><strong>Pipeline Board</strong> &mdash; Drag jobs through your sales stages</li>
        <li><strong>Territory Map</strong> &mdash; Track neighborhoods and door knocks</li>
      </ul>
    `,
    ctaText: 'Explore Features',
    ctaPath: '/dashboard',
  },
}

export function createGettingStartedEmail(params: GettingStartedEmailParams): string {
  const { recipientName, appUrl, variant } = params
  const content = VARIANT_CONTENT[variant]

  const body = `
    <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 24px;">
      ${content.heading}
    </h1>

    <p style="color: #333; margin-bottom: 16px;">
      Hi ${recipientName},
    </p>

    ${content.body}

    <div style="margin: 32px 0; text-align: center;">
      <a href="${appUrl}${content.ctaPath}" style="background-color: #FF8243; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        ${content.ctaText}
      </a>
    </div>

    <p style="color: #666; font-size: 14px; margin-top: 32px;">
      Need help getting started? Reply to this email and we&apos;ll walk you through it.
    </p>
  `

  return createEmailHTML(body, content.heading)
}

export function getGettingStartedSubject(recipientName: string): string {
  return `${recipientName}, your next step in JobClarity`
}
