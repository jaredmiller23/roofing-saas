'use client';

/**
 * BillingSettings
 *
 * Main billing settings component for the Settings page.
 * Shows subscription status, usage, and upgrade options.
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import { SubscriptionStatus } from './SubscriptionStatus';
import { UsageCard } from './UsageCard';
import { PlanSelector } from './PlanSelector';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getAllPlans } from '@/lib/billing/plans';
import type { PlanTier, BillingInterval } from '@/lib/billing/types';

interface SubscriptionData {
  subscription: {
    id: string;
    status: string;
    planTier: PlanTier;
    planName: string;
    priceCents: number;
    billingInterval: BillingInterval;
    trialStartedAt: string | null;
    trialEndsAt: string | null;
    trialDaysRemaining: number | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    canceledAt: string | null;
  } | null;
  usage: {
    users: { current: number; limit: number; unlimited: boolean };
    sms: { current: number; limit: number; unlimited: boolean };
    emails: { current: number; limit: number; unlimited: boolean };
  };
  features: Record<string, boolean>;
}

export function BillingSettings() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('month');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Fetch subscription data
  const fetchSubscription = useCallback(async () => {
    try {
      setError(null);
      const data = await apiFetch<SubscriptionData>('/api/billing/subscription');
      setData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const handleManageClick = async () => {
    try {
      setError(null);
      const data = await apiFetch<{ portalUrl: string }>('/api/billing/portal', {
        method: 'POST',
        body: {
          returnUrl: window.location.href,
        },
      });

      if (data.portalUrl) {
        window.location.href = data.portalUrl;
      } else {
        setError('Failed to open billing portal');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open billing portal');
    }
  };

  const handleSelectPlan = async (planTier: PlanTier) => {
    setCheckoutLoading(true);
    setError(null);

    try {
      const data = await apiFetch<{ checkoutUrl: string }>('/api/billing/checkout', {
        method: 'POST',
        body: {
          planTier,
          billingInterval,
          successUrl: `${window.location.origin}/settings?tab=billing&checkout=success`,
          cancelUrl: `${window.location.origin}/settings?tab=billing&checkout=canceled`,
        },
      });

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setError('Failed to create checkout session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create checkout session');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const subscription = data?.subscription;
  const usage = data?.usage || {
    users: { current: 0, limit: 0, unlimited: false },
    sms: { current: 0, limit: 0, unlimited: false },
    emails: { current: 0, limit: 0, unlimited: false },
  };

  // Get plans for selector
  const plans = getAllPlans();

  return (
    <div className="space-y-6">
      {/* Error alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Subscription status */}
      {subscription ? (
        <SubscriptionStatus
          planName={subscription.planName}
          planTier={subscription.planTier}
          status={subscription.status}
          priceCents={subscription.priceCents}
          billingInterval={subscription.billingInterval}
          currentPeriodEnd={subscription.currentPeriodEnd}
          cancelAtPeriodEnd={subscription.cancelAtPeriodEnd}
          trialDaysRemaining={subscription.trialDaysRemaining}
          onManageClick={handleManageClick}
          onUpgradeClick={() => setUpgradeOpen(true)}
        />
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">No subscription found</p>
          <Button onClick={() => setUpgradeOpen(true)}>Choose a Plan</Button>
        </div>
      )}

      {/* Usage stats */}
      <UsageCard users={usage.users} sms={usage.sms} emails={usage.emails} />

      {/* Upgrade dialog */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose Your Plan</DialogTitle>
          </DialogHeader>
          <PlanSelector
            plans={plans}
            currentPlanTier={subscription?.planTier || null}
            billingInterval={billingInterval}
            onIntervalChange={setBillingInterval}
            onSelectPlan={handleSelectPlan}
            loading={checkoutLoading}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
