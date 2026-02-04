'use client';

/**
 * FeatureGate
 *
 * Wrapper component that shows upgrade prompt for gated features.
 */

import { ReactNode } from 'react';
import { Link } from '@/lib/i18n/navigation';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface FeatureGateProps {
  /** Whether the feature is available */
  allowed: boolean;
  /** The name of the feature (for display) */
  featureName?: string;
  /** The plan required for this feature */
  requiredPlan?: string;
  /** Content to show when feature is available */
  children: ReactNode;
  /** Custom fallback content (overrides default) */
  fallback?: ReactNode;
}

export function FeatureGate({
  allowed,
  featureName,
  requiredPlan,
  children,
  fallback,
}: FeatureGateProps) {
  if (allowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-3 mb-4">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold mb-2">
          {featureName || 'Feature'} Not Available
        </h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          {requiredPlan
            ? `This feature requires the ${requiredPlan} plan or higher.`
            : 'Upgrade your plan to unlock this feature.'}
        </p>
        <Link href="/settings?tab=billing">
          <Button size="sm">Upgrade Plan</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

/**
 * FeatureGateInline
 *
 * Inline version that just disables/hides content.
 */
interface FeatureGateInlineProps {
  allowed: boolean;
  children: ReactNode;
  /** Show disabled version instead of hiding */
  showDisabled?: boolean;
}

export function FeatureGateInline({
  allowed,
  children,
  showDisabled,
}: FeatureGateInlineProps) {
  if (allowed) {
    return <>{children}</>;
  }

  if (showDisabled) {
    return (
      <div className="opacity-50 pointer-events-none" title="Feature not available on your plan">
        {children}
      </div>
    );
  }

  return null;
}
