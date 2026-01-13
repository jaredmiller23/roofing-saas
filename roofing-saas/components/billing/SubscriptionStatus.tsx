'use client';

/**
 * SubscriptionStatus
 *
 * Shows current subscription plan and status.
 */

import { Calendar, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/billing/plans';

interface SubscriptionStatusProps {
  planName: string;
  planTier: string;
  status: string;
  priceCents: number;
  billingInterval: 'month' | 'year';
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialDaysRemaining: number | null;
  onManageClick: () => void;
  onUpgradeClick: () => void;
}

export function SubscriptionStatus({
  planName,
  planTier,
  status,
  priceCents,
  billingInterval,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  trialDaysRemaining,
  onManageClick,
  onUpgradeClick,
}: SubscriptionStatusProps) {
  const statusBadge = getStatusBadge(status, cancelAtPeriodEnd);
  const isTrialing = status === 'trialing';
  const showUpgrade = planTier !== 'enterprise';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Current Plan</CardTitle>
        <Badge variant={statusBadge.variant as 'default' | 'secondary' | 'destructive' | 'outline'}>
          {statusBadge.label}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Plan info */}
          <div>
            <h3 className="text-2xl font-bold">{planName}</h3>
            {isTrialing ? (
              <p className="text-muted-foreground">
                {trialDaysRemaining && trialDaysRemaining > 0
                  ? `${trialDaysRemaining} days remaining in trial`
                  : 'Trial ended'}
              </p>
            ) : (
              <p className="text-muted-foreground">
                {formatPrice(priceCents, billingInterval)}
              </p>
            )}
          </div>

          {/* Next billing date */}
          {currentPeriodEnd && !cancelAtPeriodEnd && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {isTrialing ? 'Trial ends' : 'Next billing date'}:{' '}
                {new Date(currentPeriodEnd).toLocaleDateString()}
              </span>
            </div>
          )}

          {/* Cancellation notice */}
          {cancelAtPeriodEnd && currentPeriodEnd && (
            <div className="flex items-center gap-2 text-sm text-orange-500">
              <AlertTriangle className="h-4 w-4" />
              <span>
                Cancels on {new Date(currentPeriodEnd).toLocaleDateString()}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {showUpgrade && (
              <Button onClick={onUpgradeClick}>
                {isTrialing ? 'Subscribe Now' : 'Upgrade Plan'}
              </Button>
            )}
            {!isTrialing && (
              <Button variant="outline" onClick={onManageClick}>
                Manage Subscription
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getStatusBadge(
  status: string,
  cancelAtPeriodEnd: boolean
): { label: string; variant: string } {
  if (cancelAtPeriodEnd) {
    return { label: 'Canceling', variant: 'secondary' };
  }

  switch (status) {
    case 'trialing':
      return { label: 'Free Trial', variant: 'default' };
    case 'active':
      return { label: 'Active', variant: 'default' };
    case 'past_due':
      return { label: 'Past Due', variant: 'destructive' };
    case 'canceled':
      return { label: 'Canceled', variant: 'secondary' };
    case 'unpaid':
      return { label: 'Unpaid', variant: 'destructive' };
    default:
      return { label: status, variant: 'outline' };
  }
}
