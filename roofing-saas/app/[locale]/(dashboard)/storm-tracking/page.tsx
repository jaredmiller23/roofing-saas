/**
 * Storm Tracking Page
 *
 * Main dashboard for storm intelligence, tracking, and response automation
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StormAlertPanel } from '@/components/storm/StormAlertPanel'
import { StormMap } from '@/components/storm/StormMap'
import { AffectedCustomers } from '@/components/storm/AffectedCustomers'
import { StormResponseMode } from '@/components/storm/StormResponseMode'
import type {
  StormEvent,
  StormAlert,
  AffectedCustomer,
  StormResponseConfig,
} from '@/lib/storm/storm-types'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api/client'
import { CloudLightning, RefreshCw, Loader2 } from 'lucide-react'
import { useFeatureAccess } from '@/lib/billing/hooks'
import { FeatureGate } from '@/components/billing/FeatureGate'

export default function StormTrackingPage() {
  const { features, isLoading: featuresLoading } = useFeatureAccess()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [stormEvents, setStormEvents] = useState<StormEvent[]>([])
  const [alerts, setAlerts] = useState<StormAlert[]>([])
  const [affectedCustomers] = useState<AffectedCustomer[]>([])
  const [responseConfig, setResponseConfig] = useState<StormResponseConfig>({
    mode: 'normal',
    activatedAt: null,
    activatedBy: null,
    stormEventId: null,
    settings: {
      autoNotifications: false,
      autoLeadGeneration: false,
      priorityRouting: false,
      crewPrePositioning: false,
      extendedHours: false,
    },
    metrics: {
      leadsGenerated: 0,
      customersNotified: 0,
      appointmentsScheduled: 0,
      estimatedRevenue: 0,
    },
  })

  // Load user and storm data on mount
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
    }
    fetchUser()
    loadStormData()
  }, [])

  // Feature gate check - must be after all hooks
  if (!featuresLoading && !features.stormData) {
    return (
      <div className="container mx-auto p-6">
        <FeatureGate
          allowed={false}
          featureName="Storm Intel"
          requiredPlan="Professional"
        >
          <div />
        </FeatureGate>
      </div>
    )
  }

  const loadStormData = async () => {
    setLoading(true)
    try {
      // Fetch alerts, predictions, and response mode in parallel
      // Use individual try/catch so one failure doesn't block others
      const [alertsResult, predictionsResult, modeResult] = await Promise.allSettled([
        apiFetch<{ alerts: StormAlert[] }>('/api/storm/alerts'),
        apiFetch<{ predictions: StormEvent[] }>('/api/storm/predictions'),
        apiFetch<{ config: StormResponseConfig }>('/api/storm/response-mode'),
      ])

      // Process alerts
      if (alertsResult.status === 'fulfilled' && alertsResult.value.alerts) {
        setAlerts(alertsResult.value.alerts)
      }

      // Process predictions (storm events)
      if (predictionsResult.status === 'fulfilled' && predictionsResult.value.predictions) {
        setStormEvents(predictionsResult.value.predictions)
      }

      // Process response mode config
      if (modeResult.status === 'fulfilled' && modeResult.value.config) {
        setResponseConfig(modeResult.value.config)
      }

      // Note: Affected customers will be populated when we have storm events
      // For now, they come from the alert data or predictions API
    } catch (error) {
      console.error('Failed to load storm data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadStormData()
    setRefreshing(false)
  }

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const data = await apiFetch<{ acknowledgedBy: string[] }>(`/api/storm/alerts/${alertId}/acknowledge`, {
        method: 'POST',
      })
      // Update local state to reflect acknowledgment
      setAlerts(alerts.map(a =>
        a.id === alertId
          ? { ...a, acknowledgedBy: data.acknowledgedBy }
          : a
      ))
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
    }
  }

  const handleDismissAlert = async (alertId: string) => {
    try {
      await apiFetch(`/api/storm/alerts/${alertId}/dismiss`, {
        method: 'POST',
      })
      // Remove dismissed alert from local state
      setAlerts(alerts.filter(a => a.id !== alertId))
    } catch (error) {
      console.error('Failed to dismiss alert:', error)
    }
  }

  const handleActivateResponse = async (settings: Partial<StormResponseConfig['settings']>) => {
    try {
      const data = await apiFetch<{ config: StormResponseConfig }>('/api/storm/response-mode', {
        method: 'POST',
        body: {
          mode: 'storm_response',
          settings: { ...responseConfig.settings, ...settings },
        },
      })
      if (data.config) {
        setResponseConfig(data.config)
      }
    } catch (error) {
      console.error('Failed to activate response mode:', error)
    }
  }

  const handleDeactivateResponse = async () => {
    try {
      await apiFetch('/api/storm/response-mode', {
        method: 'DELETE',
      })
      // Reset to normal mode
      setResponseConfig({
        mode: 'normal',
        activatedAt: null,
        activatedBy: null,
        stormEventId: null,
        settings: {
          autoNotifications: false,
          autoLeadGeneration: false,
          priorityRouting: false,
          crewPrePositioning: false,
          extendedHours: false,
        },
        metrics: {
          leadsGenerated: 0,
          customersNotified: 0,
          appointmentsScheduled: 0,
          estimatedRevenue: 0,
        },
      })
    } catch (error) {
      console.error('Failed to deactivate response mode:', error)
    }
  }

  const handleContactCustomer = async (customerId: string, method: 'phone' | 'email' | 'sms') => {
    // Contact action - can be expanded later
    console.log('Contacting customer:', customerId, 'via', method)
    // Could open phone dialer, email client, or SMS composer
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CloudLightning className="w-8 h-8" />
            Storm Intelligence
          </h1>
          <p className="text-muted-foreground mt-2">
            Track storms, predict damage, and automate customer outreach
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Refresh Data
        </Button>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="map">Map View</TabsTrigger>
          <TabsTrigger value="customers">Affected Customers</TabsTrigger>
          <TabsTrigger value="response">Response Mode</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Storm Alerts */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Active Alerts</h2>
            <StormAlertPanel
              alerts={alerts}
              currentUserId={currentUserId || ''}
              onAcknowledge={handleAcknowledgeAlert}
              onDismiss={handleDismissAlert}
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Active Storms</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{stormEvents.length}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Currently tracking
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Affected Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{affectedCustomers.length}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {affectedCustomers.filter(c => c.priority === 'urgent' || c.priority === 'high').length} high priority
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estimated Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">
                  ${(affectedCustomers.reduce((sum, c) => sum + c.damagePrediction.estimatedDamage, 0) / 1000).toFixed(0)}K
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Potential opportunity
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Map Preview */}
          {stormEvents.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Storm Map</h2>
              <StormMap
                stormEvents={stormEvents}
                affectedCustomers={affectedCustomers}
              />
            </div>
          )}
        </TabsContent>

        {/* Map Tab */}
        <TabsContent value="map">
          <StormMap
            stormEvents={stormEvents}
            affectedCustomers={affectedCustomers}
            zoom={8}
          />
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers">
          <AffectedCustomers
            customers={affectedCustomers}
            onContact={handleContactCustomer}
          />
        </TabsContent>

        {/* Response Mode Tab */}
        <TabsContent value="response">
          <StormResponseMode
            config={responseConfig}
            onActivate={handleActivateResponse}
            onDeactivate={handleDeactivateResponse}
            onUpdateSettings={(settings) => {
              setResponseConfig({
                ...responseConfig,
                settings: { ...responseConfig.settings, ...settings },
              })
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Empty State */}
      {stormEvents.length === 0 && !loading && (
        <Card className="mt-6">
          <CardContent className="py-12 text-center">
            <CloudLightning className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
            <h3 className="text-xl font-semibold mb-2">No Active Storms</h3>
            <p className="text-muted-foreground mb-4">
              Storm intelligence will automatically track severe weather events in your service area
            </p>
            <Button variant="outline" onClick={handleRefresh}>
              Check for Storms
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
