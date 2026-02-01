'use client'

/**
 * ComplianceAlert Component
 *
 * Displays compliance check failures with clear explanations and resolution paths.
 * TCPA compliance is critical - these alerts explain why calls are blocked.
 */

import Link from 'next/link'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  AlertCircle,
  Clock,
  ShieldX,
  UserX,
  FileWarning,
  ExternalLink
} from 'lucide-react'

export type ComplianceReason =
  | 'opt_out'
  | 'dnc'
  | 'time_restriction'
  | 'no_consent'
  | 'invalid_number'

interface ComplianceAlertProps {
  reason: ComplianceReason
  message?: string
  contactId?: string
  contactTimezone?: string
  className?: string
}

const COMPLIANCE_CONFIG: Record<ComplianceReason, {
  title: string
  description: string
  icon: typeof AlertCircle
  variant: 'destructive' | 'warning'
  actionLabel?: string
  actionHref?: (contactId?: string) => string | undefined
}> = {
  opt_out: {
    title: 'Contact has opted out',
    description: 'This contact has requested not to receive calls. Respect their preference.',
    icon: UserX,
    variant: 'destructive',
    actionLabel: 'View Contact Settings',
    actionHref: (contactId) => contactId ? `/contacts/${contactId}` : undefined,
  },
  dnc: {
    title: 'Do Not Call Registry',
    description: 'This number is on the Do Not Call list. Calling is prohibited by law.',
    icon: ShieldX,
    variant: 'destructive',
  },
  time_restriction: {
    title: 'Outside calling hours',
    description: 'TCPA restricts calls to 9am-8pm in the recipient\'s timezone.',
    icon: Clock,
    variant: 'warning',
  },
  no_consent: {
    title: 'Missing consent',
    description: 'Prior Express Written Consent (PEWC) is required before calling. This is a TCPA requirement.',
    icon: FileWarning,
    variant: 'destructive',
    actionLabel: 'Capture Consent',
    actionHref: (contactId) => contactId ? `/contacts/${contactId}?tab=consent` : undefined,
  },
  invalid_number: {
    title: 'Invalid phone number',
    description: 'The phone number format is not valid. Please check and try again.',
    icon: AlertCircle,
    variant: 'warning',
  },
}

export function ComplianceAlert({
  reason,
  message,
  contactId,
  contactTimezone,
  className
}: ComplianceAlertProps) {
  const config = COMPLIANCE_CONFIG[reason]
  const Icon = config.icon
  const actionHref = config.actionHref?.(contactId)

  return (
    <Alert variant={config.variant} className={className}>
      <Icon className="h-5 w-5" />
      <AlertTitle>{config.title}</AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p>{message || config.description}</p>

        {/* Time restriction details */}
        {reason === 'time_restriction' && contactTimezone && (
          <p className="text-sm">
            Contact timezone: <strong>{contactTimezone}</strong>
          </p>
        )}

        {/* Action button */}
        {actionHref && (
          <Button variant="outline" size="sm" asChild>
            <Link href={actionHref}>
              {config.actionLabel}
              <ExternalLink className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
