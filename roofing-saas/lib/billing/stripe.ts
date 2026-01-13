/**
 * Stripe Client Initialization
 *
 * Server-side Stripe client for API calls.
 * This file should only be imported in server components and API routes.
 */

import Stripe from 'stripe';

// =============================================================================
// Stripe Client
// =============================================================================

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// Note: We don't throw during build time - the error will be thrown at runtime
// when the stripe client is actually used without proper configuration

/**
 * Server-side Stripe client
 *
 * Use this for all Stripe API calls:
 * - Creating checkout sessions
 * - Creating portal sessions
 * - Retrieving subscriptions
 * - Processing webhooks
 */
export const stripe = new Stripe(stripeSecretKey || 'sk_test_placeholder', {
  apiVersion: '2025-12-15.clover',
  typescript: true,
  appInfo: {
    name: 'Job Clarity CRM',
    version: '1.0.0',
    url: 'https://jobclarity.io',
  },
});

// =============================================================================
// Environment Validation
// =============================================================================

/**
 * Check if Stripe is properly configured
 */
export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET
  );
}

/**
 * Get required Stripe configuration
 * Throws if any required values are missing
 */
export function getStripeConfig() {
  const config = {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    prices: {
      starterMonthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
      starterYearly: process.env.STRIPE_PRICE_STARTER_YEARLY,
      professionalMonthly: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY,
      professionalYearly: process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY,
      enterpriseMonthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
      enterpriseYearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY,
    },
  };

  // In development, allow missing values
  if (process.env.NODE_ENV !== 'production') {
    return config;
  }

  // In production, require core values
  if (!config.secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }
  if (!config.publishableKey) {
    throw new Error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
  }
  if (!config.webhookSecret) {
    throw new Error('Missing STRIPE_WEBHOOK_SECRET');
  }

  return config;
}

// =============================================================================
// Helper Types (re-exported from Stripe)
// =============================================================================

export type StripeSubscription = Stripe.Subscription;
export type StripeCustomer = Stripe.Customer;
export type StripeInvoice = Stripe.Invoice;
export type StripeCheckoutSession = Stripe.Checkout.Session;
export type StripeBillingPortalSession = Stripe.BillingPortal.Session;
export type StripeEvent = Stripe.Event;
export type StripePrice = Stripe.Price;
export type StripeProduct = Stripe.Product;
