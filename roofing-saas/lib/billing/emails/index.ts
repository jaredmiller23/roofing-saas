/**
 * Billing Email Templates
 *
 * Centralized exports for all billing-related email templates
 */

export {
  createTrialEndingEmail,
  getTrialEndingSubject,
  type TrialEndingEmailParams,
} from './trial-ending'

export {
  createTrialEndedEmail,
  getTrialEndedSubject,
  type TrialEndedEmailParams,
} from './trial-ended'

export {
  createPaymentFailedEmail,
  getPaymentFailedSubject,
  type PaymentFailedEmailParams,
} from './payment-failed'

export {
  createGracePeriodEndingEmail,
  getGracePeriodEndingSubject,
  type GracePeriodEndingEmailParams,
} from './grace-period-ending'

export {
  createDowngradedEmail,
  getDowngradedSubject,
  type DowngradedEmailParams,
} from './downgraded'
