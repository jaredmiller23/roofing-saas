/**
 * Tour Definitions
 *
 * Centralized tour step definitions for the guided tour system.
 * Each tour is identified by a unique tourId and contains ordered steps
 * that highlight specific UI elements with explanatory tooltips.
 */

export interface TourStep {
  /** CSS selector for the target element to highlight */
  target: string
  /** Short title displayed in the tooltip header */
  title: string
  /** Descriptive content explaining the highlighted feature */
  content: string
  /** Tooltip placement relative to the target element */
  placement: 'top' | 'bottom' | 'left' | 'right'
}

export interface TourDefinition {
  tourId: string
  steps: TourStep[]
}

/**
 * Dashboard Tour
 *
 * Introduces new users to the main dashboard layout, key metrics,
 * pipeline overview, activity feed, navigation, and setup checklist.
 */
export const dashboardTour: TourDefinition = {
  tourId: 'dashboard-intro',
  steps: [
    {
      target: '[data-tour="dashboard-metrics"]',
      title: 'Your Dashboard',
      content:
        'This is your command center. See key metrics like revenue, pipeline value, door knocks, and conversion rate at a glance.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="dashboard-pipeline"]',
      title: 'Your Pipeline',
      content:
        'Track every project from lead to completion. Monitor team performance and leaderboard rankings here.',
      placement: 'top',
    },
    {
      target: '[data-tour="dashboard-activity"]',
      title: 'Recent Activity',
      content:
        'Stay on top of what is happening. Sales, new contacts, status changes, and team achievements show up here in real time.',
      placement: 'top',
    },
    {
      target: '[data-tour="sidebar-nav"]',
      title: 'Navigation',
      content:
        'Access contacts, projects, estimates, tasks, and more from the sidebar. Everything you need is one click away.',
      placement: 'right',
    },
    {
      target: '[data-tour="setup-checklist"]',
      title: 'Getting Started',
      content:
        'Follow this checklist to set up your account. Complete each step to get the most out of Job Clarity.',
      placement: 'bottom',
    },
  ],
}

/**
 * First Contact Tour
 *
 * Guides users through adding their first contact.
 * Steps target elements on the contacts page.
 */
export const firstContactTour: TourDefinition = {
  tourId: 'first-contact',
  steps: [
    {
      target: '[data-tour="add-contact-btn"]',
      title: 'Add Your First Contact',
      content:
        'Click here to add a new lead or customer. Contacts are the foundation of your CRM.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="contact-form"]',
      title: 'Fill in the Details',
      content:
        'Enter the contact information. Required fields are marked with an asterisk. You can always edit these later.',
      placement: 'right',
    },
    {
      target: '[data-tour="contact-save-btn"]',
      title: 'Save and Done',
      content:
        'Save the contact and you are all set. You can create projects and send estimates from any contact later.',
      placement: 'top',
    },
  ],
}

/**
 * First Estimate Tour
 *
 * Walks users through the estimate creation and sending flow.
 * Steps target elements on the estimates/proposals page.
 */
export const firstEstimateTour: TourDefinition = {
  tourId: 'first-estimate',
  steps: [
    {
      target: '[data-tour="quote-options-tab"]',
      title: 'Estimates',
      content:
        'Create Good, Better, and Best options for your clients. Multiple options increase your close rate.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="create-option-btn"]',
      title: 'Create an Option',
      content:
        'Add line items with materials and labor costs. Each option gives your client a clear choice.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="send-estimate-btn"]',
      title: 'Send to Client',
      content:
        'Your client will receive a professional estimate they can view and accept online. No more paper chasing.',
      placement: 'left',
    },
    {
      target: '[data-tour="proposal-status"]',
      title: 'Track Status',
      content:
        'See when clients view, accept, or decline your estimates. Follow up at the right time.',
      placement: 'bottom',
    },
  ],
}

/**
 * All available tours, indexed by tourId for easy lookup.
 */
export const ALL_TOURS: Record<string, TourDefinition> = {
  [dashboardTour.tourId]: dashboardTour,
  [firstContactTour.tourId]: firstContactTour,
  [firstEstimateTour.tourId]: firstEstimateTour,
}
