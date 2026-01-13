'use client';

/**
 * Client-side Billing Hooks
 *
 * React hooks for accessing subscription and feature data in client components.
 */

import { useState, useEffect, useCallback } from 'react';
import type { PlanFeatures } from './types';

// =============================================================================
// Types
// =============================================================================

interface SubscriptionData {
  id: string;
  status: string;
  planTier: string;
  planName: string;
  trialDaysRemaining: number | null;
  cancelAtPeriodEnd: boolean;
}

interface FeatureAccessState {
  features: PlanFeatures;
  subscription: SubscriptionData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Default features (all false) for loading/error states
const DEFAULT_FEATURES: PlanFeatures = {
  quickbooksIntegration: false,
  claimsTracking: false,
  stormData: false,
  campaigns: false,
  unlimitedMessaging: false,
  customIntegrations: false,
  dedicatedSupport: false,
};

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to access feature flags based on subscription plan
 *
 * Usage:
 * ```tsx
 * const { features, isLoading } = useFeatureAccess();
 *
 * if (features.claimsTracking) {
 *   // Show claims feature
 * }
 * ```
 */
export function useFeatureAccess(): FeatureAccessState {
  const [features, setFeatures] = useState<PlanFeatures>(DEFAULT_FEATURES);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeatures = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch('/api/billing/subscription');

      if (!res.ok) {
        // For 401, user isn't authenticated - use defaults
        if (res.status === 401) {
          setFeatures(DEFAULT_FEATURES);
          setSubscription(null);
          return;
        }
        throw new Error('Failed to fetch subscription');
      }

      const result = await res.json();

      if (result.success && result.data) {
        // Set features from API response
        if (result.data.features) {
          setFeatures(result.data.features);
        }

        // Set subscription data
        if (result.data.subscription) {
          setSubscription({
            id: result.data.subscription.id,
            status: result.data.subscription.status,
            planTier: result.data.subscription.planTier,
            planName: result.data.subscription.planName,
            trialDaysRemaining: result.data.subscription.trialDaysRemaining,
            cancelAtPeriodEnd: result.data.subscription.cancelAtPeriodEnd,
          });
        }
      }
    } catch (err) {
      // Fail gracefully - default to allowing access to not break the app
      // In production, you might want different behavior
      console.error('Error fetching feature access:', err);
      setError(err instanceof Error ? err.message : 'Failed to load features');
      // Keep default features (all false) on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  return {
    features,
    subscription,
    isLoading,
    error,
    refresh: fetchFeatures,
  };
}

// =============================================================================
// Convenience Hooks
// =============================================================================

/**
 * Check if a specific feature is available
 *
 * Usage:
 * ```tsx
 * const canUseClaims = useHasFeature('claimsTracking');
 * ```
 */
export function useHasFeature(feature: keyof PlanFeatures): boolean {
  const { features, isLoading } = useFeatureAccess();

  // While loading, default to false for safety
  if (isLoading) return false;

  return features[feature];
}

/**
 * Get current plan tier
 *
 * Usage:
 * ```tsx
 * const planTier = usePlanTier(); // 'starter' | 'professional' | 'enterprise' | null
 * ```
 */
export function usePlanTier(): string | null {
  const { subscription } = useFeatureAccess();
  return subscription?.planTier ?? null;
}

/**
 * Check if user is on trial
 *
 * Usage:
 * ```tsx
 * const { isTrialing, daysRemaining } = useTrialStatus();
 * ```
 */
export function useTrialStatus(): { isTrialing: boolean; daysRemaining: number | null } {
  const { subscription } = useFeatureAccess();

  if (!subscription) {
    return { isTrialing: false, daysRemaining: null };
  }

  return {
    isTrialing: subscription.status === 'trialing',
    daysRemaining: subscription.trialDaysRemaining,
  };
}
