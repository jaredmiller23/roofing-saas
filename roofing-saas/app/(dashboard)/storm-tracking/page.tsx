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
import { CloudLightning, RefreshCw, Loader2 } from 'lucide-react'

export default function StormTrackingPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stormEvents, setStormEvents] = useState<StormEvent[]>([])
  const [alerts, setAlerts] = useState<StormAlert[]>([])
  const [affectedCustomers, setAffectedCustomers] = useState<AffectedCustomer[]>([])
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

  // Load storm data on mount
  useEffect(() => {
    loadStormData()
  }, [])

  const loadStormData = async () => {
    setLoading(true)
    try {
      // In a real implementation, these would be actual API calls
      // For now, we'll use demo data

      // TODO: Replace with actual API calls:
      // const predictionRes = await fetch('/api/storm/predictions')
      // const alertsRes = await fetch('/api/storm/alerts')
      // const customersRes = await fetch('/api/storm/affected-customers')

      // Demo data
      setStormEvents([])
      setAlerts([])
      setAffectedCustomers([])
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
    // TODO: Implement alert acknowledgment API call
    console.log('Acknowledging alert:', alertId)
  }

  const handleDismissAlert = async (alertId: string) => {
    // TODO: Implement alert dismissal API call
    setAlerts(alerts.filter(a => a.id !== alertId))
  }

  const handleActivateResponse = async (settings: Partial<StormResponseConfig['settings']>) => {
    // TODO: Implement response mode activation API call
    setResponseConfig({
      ...responseConfig,
      mode: 'storm_response',
      activatedAt: new Date().toISOString(),
      activatedBy: 'current-user-id', // Replace with actual user ID
      settings: {
        ...responseConfig.settings,
        ...settings,
      },
    })
  }

  const handleDeactivateResponse = async () => {
    // TODO: Implement response mode deactivation API call
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
  }

  const handleContactCustomer = async (customerId: string, method: 'phone' | 'email' | 'sms') => {
    // TODO: Implement customer contact action
    console.log('Contacting customer:', customerId, 'via', method)
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
              currentUserId="current-user-id" // Replace with actual user ID
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
