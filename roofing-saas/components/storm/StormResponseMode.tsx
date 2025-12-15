/**
 * Storm Response Mode Component
 *
 * Control panel for activating/deactivating storm response mode with settings
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type { StormResponseConfig, ResponseMode } from '@/lib/storm/storm-types'
import {
  CloudLightning,
  Bell,
  Users,
  TrendingUp,
  Clock,
  Truck,
  ZapIcon
} from 'lucide-react'

interface StormResponseModeProps {
  config: StormResponseConfig
  onActivate?: (settings: Partial<StormResponseConfig['settings']>) => void
  onDeactivate?: () => void
  onUpdateSettings?: (settings: Partial<StormResponseConfig['settings']>) => void
}

export function StormResponseMode({
  config,
  onActivate,
  onDeactivate,
  onUpdateSettings,
}: StormResponseModeProps) {
  const [settings, setSettings] = useState(config.settings)
  const isActive = config.mode !== 'normal'

  const handleToggle = () => {
    if (isActive) {
      onDeactivate?.()
    } else {
      onActivate?.(settings)
    }
  }

  const handleSettingChange = (key: keyof typeof settings, value: boolean) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    if (isActive) {
      onUpdateSettings?.({ [key]: value })
    }
  }

  return (
    <div className="space-y-4">
      {/* Mode Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CloudLightning className="w-5 h-5" />
                Storm Response Mode
              </CardTitle>
              <CardDescription>
                Activate automated workflows and priority routing for storm events
              </CardDescription>
            </div>
            <ModeBadge mode={config.mode} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Activation Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <div>
                <div className="font-semibold">
                  {isActive ? 'Response Mode Active' : 'Response Mode Inactive'}
                </div>
                {isActive && config.activatedAt && (
                  <div className="text-sm text-muted-foreground">
                    Activated {new Date(config.activatedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
            <Button
              onClick={handleToggle}
              variant={isActive ? 'destructive' : 'default'}
              size="lg"
            >
              <ZapIcon className="w-4 h-4 mr-2" />
              {isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </div>

          {/* Metrics (when active) */}
          {isActive && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                icon={<Users className="w-4 h-4" />}
                label="Leads Generated"
                value={config.metrics.leadsGenerated}
              />
              <MetricCard
                icon={<Bell className="w-4 h-4" />}
                label="Customers Notified"
                value={config.metrics.customersNotified}
              />
              <MetricCard
                icon={<Clock className="w-4 h-4" />}
                label="Appointments"
                value={config.metrics.appointmentsScheduled}
              />
              <MetricCard
                icon={<TrendingUp className="w-4 h-4" />}
                label="Est. Revenue"
                value={`$${(config.metrics.estimatedRevenue / 1000).toFixed(0)}K`}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Automation Settings</CardTitle>
          <CardDescription>
            Configure which automations run during storm response mode
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SettingToggle
            icon={<Bell className="w-4 h-4" />}
            label="Auto Notifications"
            description="Automatically send notifications to affected customers"
            checked={settings.autoNotifications}
            onCheckedChange={(checked) => handleSettingChange('autoNotifications', checked)}
            disabled={!isActive}
          />
          
          <SettingToggle
            icon={<Users className="w-4 h-4" />}
            label="Auto Lead Generation"
            description="Automatically create leads for affected properties"
            checked={settings.autoLeadGeneration}
            onCheckedChange={(checked) => handleSettingChange('autoLeadGeneration', checked)}
            disabled={!isActive}
          />
          
          <SettingToggle
            icon={<TrendingUp className="w-4 h-4" />}
            label="Priority Routing"
            description="Route high-priority leads to top sales reps"
            checked={settings.priorityRouting}
            onCheckedChange={(checked) => handleSettingChange('priorityRouting', checked)}
            disabled={!isActive}
          />
          
          <SettingToggle
            icon={<Truck className="w-4 h-4" />}
            label="Crew Pre-Positioning"
            description="Send crew positioning recommendations"
            checked={settings.crewPrePositioning}
            onCheckedChange={(checked) => handleSettingChange('crewPrePositioning', checked)}
            disabled={!isActive}
          />
          
          <SettingToggle
            icon={<Clock className="w-4 h-4" />}
            label="Extended Hours"
            description="Enable extended business hours for storm response"
            checked={settings.extendedHours}
            onCheckedChange={(checked) => handleSettingChange('extendedHours', checked)}
            disabled={!isActive}
          />
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Mode Badge Component
 */
function ModeBadge({ mode }: { mode: ResponseMode }) {
  const configs: Record<ResponseMode, { label: string; className: string }> = {
    normal: { label: 'Normal', className: 'bg-gray-500' },
    storm_watch: { label: 'Storm Watch', className: 'bg-yellow-500' },
    storm_response: { label: 'Storm Response', className: 'bg-orange-500 animate-pulse' },
    emergency: { label: 'EMERGENCY', className: 'bg-red-500 animate-pulse' },
  }

  const config = configs[mode]

  return (
    <Badge className={`${config.className} text-foreground`}>
      {config.label}
    </Badge>
  )
}

/**
 * Metric Card Component
 */
interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
}

function MetricCard({ icon, label, value }: MetricCardProps) {
  return (
    <div className="flex flex-col gap-1 p-3 bg-muted rounded-lg">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  )
}

/**
 * Setting Toggle Component
 */
interface SettingToggleProps {
  icon: React.ReactNode
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}

function SettingToggle({
  icon,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: SettingToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4 p-3 border rounded-lg">
      <div className="flex items-start gap-3">
        <div className="mt-1 text-muted-foreground">{icon}</div>
        <div>
          <Label htmlFor={label} className="font-medium">
            {label}
          </Label>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch
        id={label}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  )
}
