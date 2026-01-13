'use client';

/**
 * TrialBannerWrapper
 *
 * Client component that fetches subscription data and renders TrialBanner.
 * Handles loading/error states gracefully - fails silently to not block the app.
 */

import { useEffect, useState } from 'react';
import { TrialBanner } from '@/components/billing/TrialBanner';

interface SubscriptionData {
  subscription: {
    status: string;
    trialDaysRemaining: number | null;
    cancelAtPeriodEnd: boolean;
  } | null;
}

export function TrialBannerWrapper() {
  const [data, setData] = useState<SubscriptionData | null>(null);

  useEffect(() => {
    // Fetch subscription data on mount
    fetch('/api/billing/subscription')
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((result) => {
        if (result?.success && result.data) {
          setData(result.data);
        }
      })
      .catch(() => {
        // Fail silently - don't block the app if billing fetch fails
      });
  }, []);

  // Don't render anything until we have subscription data
  if (!data?.subscription) {
    return null;
  }

  const { status, trialDaysRemaining, cancelAtPeriodEnd } = data.subscription;

  return (
    <div className="mx-4 mt-4">
      <TrialBanner
        status={status}
        daysRemaining={trialDaysRemaining}
        cancelAtPeriodEnd={cancelAtPeriodEnd}
      />
    </div>
  );
}
