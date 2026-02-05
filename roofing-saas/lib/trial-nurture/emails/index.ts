/**
 * Trial Nurture Email Templates
 *
 * Centralized exports for all trial nurture email templates.
 */

export {
  createWelcomeEmail,
  getWelcomeSubject,
  type WelcomeEmailParams,
} from './welcome'

export {
  createGettingStartedEmail,
  getGettingStartedSubject,
  type GettingStartedEmailParams,
} from './getting-started'

export {
  createFeatureSpotlightEmail,
  getFeatureSpotlightSubject,
  getFeaturesForPriorities,
  type FeatureSpotlightEmailParams,
} from './feature-spotlight'

export {
  createSocialProofEmail,
  getSocialProofSubject,
  type SocialProofEmailParams,
} from './social-proof'

export {
  createFinalReminderEmail,
  getFinalReminderSubject,
  type FinalReminderEmailParams,
} from './final-reminder'
