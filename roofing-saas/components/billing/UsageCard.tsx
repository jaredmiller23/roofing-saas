'use client';

/**
 * UsageCard
 *
 * Displays usage meters for users, SMS, and emails.
 */

import { Users, MessageSquare, Mail } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface UsageItem {
  current: number;
  limit: number;
  unlimited: boolean;
}

interface UsageCardProps {
  users: UsageItem;
  sms: UsageItem;
  emails: UsageItem;
}

export function UsageCard({ users, sms, emails }: UsageCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Usage This Month</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <UsageMeter
          icon={Users}
          label="Team Members"
          current={users.current}
          limit={users.limit}
          unlimited={users.unlimited}
        />
        <UsageMeter
          icon={MessageSquare}
          label="SMS Messages"
          current={sms.current}
          limit={sms.limit}
          unlimited={sms.unlimited}
        />
        <UsageMeter
          icon={Mail}
          label="Emails"
          current={emails.current}
          limit={emails.limit}
          unlimited={emails.unlimited}
        />
      </CardContent>
    </Card>
  );
}

interface UsageMeterProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  current: number;
  limit: number;
  unlimited: boolean;
}

function UsageMeter({
  icon: Icon,
  label,
  current,
  limit,
  unlimited,
}: UsageMeterProps) {
  const percentage = unlimited ? 0 : Math.min((current / limit) * 100, 100);
  const isNearLimit = !unlimited && percentage >= 80;
  const isAtLimit = !unlimited && percentage >= 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span
          className={`text-sm ${
            isAtLimit
              ? 'text-destructive font-medium'
              : isNearLimit
                ? 'text-orange-500'
                : 'text-muted-foreground'
          }`}
        >
          {unlimited ? (
            <span className="text-primary">Unlimited</span>
          ) : (
            <>
              {current.toLocaleString()} / {limit.toLocaleString()}
            </>
          )}
        </span>
      </div>
      {!unlimited && (
        <Progress
          value={percentage}
          className={`h-2 ${
            isAtLimit
              ? '[&>div]:bg-destructive'
              : isNearLimit
                ? '[&>div]:bg-orange-500'
                : ''
          }`}
        />
      )}
    </div>
  );
}
