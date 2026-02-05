'use client';

/**
 * TrialBanner
 *
 * Shows trial status banner at the top of the dashboard.
 * Displays days remaining and prompts to subscribe.
 */

import { useState } from 'react';
import { Link } from '@/lib/i18n/navigation';
import { X, Clock, CreditCard, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GracePeriodInfo {
  endsAt: string | null;
  daysRemaining: number | null;
}

interface TrialBannerProps {
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | string;
  daysRemaining: number | null;
  cancelAtPeriodEnd?: boolean;
  gracePeriod?: GracePeriodInfo | null;
}

export function TrialBanner({
  status,
  daysRemaining,
  cancelAtPeriodEnd,
  gracePeriod,
}: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Don't show for active subscriptions (unless canceling)
  if (status === 'active' && !cancelAtPeriodEnd) {
    return null;
  }

  // Allow dismiss for less urgent messages
  if (dismissed && status === 'trialing' && daysRemaining && daysRemaining > 7) {
    return null;
  }

  // Determine banner style and content based on status
  const getBannerContent = () => {
    if (status === 'trialing') {
      if (!daysRemaining || daysRemaining <= 0) {
        return {
          icon: AlertTriangle,
          bgColor: 'bg-destructive/10 border-destructive/20',
          textColor: 'text-destructive',
          message: 'Your trial has ended. Subscribe to continue using all features.',
          actionText: 'Subscribe Now',
          urgent: true,
        };
      }

      if (daysRemaining <= 3) {
        return {
          icon: AlertTriangle,
          bgColor: 'bg-orange-500/10 border-orange-500/20',
          textColor: 'text-orange-500',
          message: `Your trial ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. Subscribe now to keep all features.`,
          actionText: 'Subscribe Now',
          urgent: true,
        };
      }

      if (daysRemaining <= 7) {
        return {
          icon: Clock,
          bgColor: 'bg-yellow-500/10 border-yellow-500/20',
          textColor: 'text-yellow-500',
          message: `${daysRemaining} days left in your trial. Ready to subscribe?`,
          actionText: 'View Plans',
          urgent: false,
        };
      }

      return {
        icon: Clock,
        bgColor: 'bg-primary/10 border-primary/20',
        textColor: 'text-primary',
        message: `You're on a free trial. ${daysRemaining} days remaining.`,
        actionText: 'View Plans',
        urgent: false,
      };
    }

    // Grace period: trial ended but user has X days to upgrade
    if (gracePeriod && gracePeriod.daysRemaining !== null) {
      const days = gracePeriod.daysRemaining;

      if (days <= 2) {
        return {
          icon: AlertTriangle,
          bgColor: 'bg-destructive/10 border-destructive/20',
          textColor: 'text-destructive',
          message: days <= 0
            ? 'Your grace period has expired. Upgrade now to restore Professional features.'
            : `Your access expires in ${days} day${days === 1 ? '' : 's'}. Upgrade to keep your features.`,
          actionText: 'Upgrade Now',
          urgent: true,
        };
      }

      if (days <= 5) {
        return {
          icon: AlertTriangle,
          bgColor: 'bg-orange-500/10 border-orange-500/20',
          textColor: 'text-orange-500',
          message: `You have ${days} days left to upgrade before losing Professional features.`,
          actionText: 'Upgrade Now',
          urgent: true,
        };
      }

      return {
        icon: Clock,
        bgColor: 'bg-yellow-500/10 border-yellow-500/20',
        textColor: 'text-yellow-500',
        message: `Your trial has ended. You have ${days} days to upgrade before features are restricted.`,
        actionText: 'Upgrade Now',
        urgent: false,
      };
    }

    if (status === 'past_due') {
      return {
        icon: AlertTriangle,
        bgColor: 'bg-destructive/10 border-destructive/20',
        textColor: 'text-destructive',
        message: 'Payment failed. Please update your payment method to avoid service interruption.',
        actionText: 'Update Payment',
        urgent: true,
      };
    }

    if (status === 'canceled' || cancelAtPeriodEnd) {
      return {
        icon: AlertTriangle,
        bgColor: 'bg-muted border-border',
        textColor: 'text-muted-foreground',
        message: 'Your subscription is set to cancel at the end of the billing period.',
        actionText: 'Reactivate',
        urgent: false,
      };
    }

    return null;
  };

  const content = getBannerContent();
  if (!content) return null;

  const { icon: Icon, bgColor, textColor, message, actionText, urgent } = content;

  return (
    <div
      className={`relative flex items-center justify-between gap-4 px-4 py-3 border rounded-lg ${bgColor}`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${textColor}`} />
        <p className={`text-sm font-medium ${textColor}`}>{message}</p>
      </div>

      <div className="flex items-center gap-2">
        <Link href="/settings?tab=billing">
          <Button
            size="sm"
            variant={urgent ? 'default' : 'outline'}
            className="gap-2"
          >
            <CreditCard className="h-4 w-4" />
            {actionText}
          </Button>
        </Link>

        {!urgent && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDismissed(true)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        )}
      </div>
    </div>
  );
}
