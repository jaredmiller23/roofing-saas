'use client';

/**
 * PlanSelector
 *
 * Grid of plan options for selection during upgrade.
 */

import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/billing/plans';
import type { PlanTier } from '@/lib/billing/types';

interface Plan {
  id: PlanTier;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  featureList: string[];
  featured: boolean;
}

interface PlanSelectorProps {
  plans: Plan[];
  currentPlanTier: PlanTier | null;
  billingInterval: 'month' | 'year';
  onIntervalChange: (interval: 'month' | 'year') => void;
  onSelectPlan: (planTier: PlanTier) => void;
  loading?: boolean;
}

export function PlanSelector({
  plans,
  currentPlanTier,
  billingInterval,
  onIntervalChange,
  onSelectPlan,
  loading,
}: PlanSelectorProps) {
  return (
    <div className="space-y-6">
      {/* Billing interval toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-lg bg-muted p-1">
          <button
            onClick={() => onIntervalChange('month')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              billingInterval === 'month'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => onIntervalChange('year')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              billingInterval === 'year'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Yearly
            <Badge variant="secondary" className="ml-2 text-xs">
              Save 2 months
            </Badge>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const price =
            billingInterval === 'month' ? plan.priceMonthly : plan.priceYearly;
          const isCurrent = currentPlanTier === plan.id;
          const isDowngrade =
            currentPlanTier &&
            getPlanOrder(plan.id) < getPlanOrder(currentPlanTier);

          return (
            <Card
              key={plan.id}
              className={cn(
                'relative',
                plan.featured && 'border-primary shadow-md'
              )}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {isCurrent && (
                    <Badge variant="outline">Current</Badge>
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Price */}
                <div>
                  <span className="text-3xl font-bold">
                    {formatPrice(price)}
                  </span>
                  <span className="text-muted-foreground">
                    /{billingInterval === 'month' ? 'mo' : 'yr'}
                  </span>
                </div>

                {/* Features */}
                <ul className="space-y-2">
                  {plan.featureList.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action button */}
                <Button
                  className="w-full"
                  variant={plan.featured ? 'default' : 'outline'}
                  onClick={() => onSelectPlan(plan.id)}
                  disabled={loading || isCurrent}
                >
                  {isCurrent
                    ? 'Current Plan'
                    : isDowngrade
                      ? 'Downgrade'
                      : 'Select Plan'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function getPlanOrder(tier: PlanTier): number {
  const order: Record<PlanTier, number> = {
    starter: 1,
    professional: 2,
    enterprise: 3,
  };
  return order[tier];
}
