/**
 * Storm Alert Panel Component
 *
 * Displays active storm alerts with action items and acknowledgment
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { StormAlert, AlertPriority } from '@/lib/storm/storm-types'
import { 
  AlertTriangle, 
  CloudLightning, 
  CheckCircle, 
  X,
  MapPin,
  Clock
} from 'lucide-react'

interface StormAlertPanelProps {
  alerts: StormAlert[]
  currentUserId: string
  onAcknowledge?: (alertId: string) => void
  onDismiss?: (alertId: string) => void
}

export function StormAlertPanel({
  alerts,
  currentUserId,
  onAcknowledge,
  onDismiss,
}: StormAlertPanelProps) {
  const [processingId, setProcessingId] = useState<string | null>(null)

  const activeAlerts = alerts.filter(a => !a.dismissed)
  
  if (activeAlerts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <CloudLightning className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No active storm alerts</p>
        </CardContent>
      </Card>
    )
  }

  const handleAcknowledge = async (alertId: string) => {
    setProcessingId(alertId)
    try {
      await onAcknowledge?.(alertId)
    } finally {
      setProcessingId(null)
    }
  }

  const handleDismiss = async (alertId: string) => {
    setProcessingId(alertId)
    try {
      await onDismiss?.(alertId)
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {activeAlerts.map((alert) => (
        <StormAlertCard
          key={alert.id}
          alert={alert}
          currentUserId={currentUserId}
          isProcessing={processingId === alert.id}
          onAcknowledge={() => handleAcknowledge(alert.id)}
          onDismiss={() => handleDismiss(alert.id)}
        />
      ))}
    </div>
  )
}

/**
 * Individual Storm Alert Card
 */
interface StormAlertCardProps {
  alert: StormAlert
  currentUserId: string
  isProcessing: boolean
  onAcknowledge: () => void
  onDismiss: () => void
}

function StormAlertCard({
  alert,
  currentUserId,
  isProcessing,
  onAcknowledge,
  onDismiss,
}: StormAlertCardProps) {
  const isAcknowledged = alert.acknowledgedBy.includes(currentUserId)
  const priorityConfig = getPriorityConfig(alert.priority)

  return (
    <Alert className={`border-l-4 ${priorityConfig.borderColor}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${priorityConfig.textColor}`} />
            <h3 className="font-semibold">
              {alert.stormEvent.event_type.replace('_', ' ').toUpperCase()}
            </h3>
            <PriorityBadge priority={alert.priority} />
          </div>

          {/* Message */}
          <AlertDescription className="text-base">
            {alert.message}
          </AlertDescription>

          {/* Location & Time */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>
                {alert.stormEvent.city}, {alert.stormEvent.state}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>
                {new Date(alert.createdAt).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Action Items */}
          {alert.actionItems.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Action Items:</h4>
              <ul className="space-y-1">
                {alert.actionItems.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-muted-foreground">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Acknowledgment Status */}
          {isAcknowledged && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span>You acknowledged this alert</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {!isAcknowledged && (
            <Button
              size="sm"
              variant="default"
              onClick={onAcknowledge}
              disabled={isProcessing}
            >
              Acknowledge
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            disabled={isProcessing}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Alert>
  )
}

/**
 * Priority Badge Component
 */
function PriorityBadge({ priority }: { priority: AlertPriority }) {
  const config: Record<AlertPriority, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
    low: { label: 'Low', variant: 'secondary' },
    medium: { label: 'Medium', variant: 'default' },
    high: { label: 'High', variant: 'destructive' },
    critical: { label: 'CRITICAL', variant: 'destructive' },
  }

  const { label, variant } = config[priority]

  return <Badge variant={variant}>{label}</Badge>
}

/**
 * Get priority-specific styling
 */
function getPriorityConfig(priority: AlertPriority) {
  const configs: Record<AlertPriority, { borderColor: string; textColor: string }> = {
    low: {
      borderColor: 'border-l-blue-500',
      textColor: 'text-blue-600',
    },
    medium: {
      borderColor: 'border-l-yellow-500',
      textColor: 'text-yellow-600',
    },
    high: {
      borderColor: 'border-l-orange-500',
      textColor: 'text-orange-600',
    },
    critical: {
      borderColor: 'border-l-red-500',
      textColor: 'text-red-600',
    },
  }

  return configs[priority]
}
