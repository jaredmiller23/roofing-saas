'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  Plus,
  Trash2,
  CheckCircle,
  DollarSign,
  Users,
  Target,
  Clock,
  BarChart3,
  Activity
} from 'lucide-react'
import { KpiFormDialog } from './dialogs/KpiFormDialog'
import type { KpiDefinitionDB } from '@/lib/gamification/types'

export function KpisTab() {
  const [kpis, setKpis] = useState<KpiDefinitionDB[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingKpi, setEditingKpi] = useState<KpiDefinitionDB | null>(null)

  const fetchKpis = useCallback(async () => {
    try {
      const response = await fetch('/api/gamification/kpis')
      if (response.ok) {
        const result = await response.json()
        setKpis(result.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch KPIs:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKpis()
  }, [fetchKpis])

  const toggleKpi = async (kpiId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/gamification/kpis/${kpiId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive })
      })
      if (response.ok) {
        setKpis(prev => prev.map(k =>
          k.id === kpiId ? { ...k, is_active: isActive } : k
        ))
      }
    } catch (error) {
      console.error('Failed to toggle KPI:', error)
    }
  }

  const deleteKpi = async (kpiId: string, isSystem: boolean) => {
    if (isSystem) {
      alert('System KPIs cannot be deleted. You can only deactivate them.')
      return
    }

    if (!confirm('Are you sure you want to delete this KPI?')) return

    try {
      const response = await fetch(`/api/gamification/kpis/${kpiId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setKpis(prev => prev.filter(k => k.id !== kpiId))
      }
    } catch (error) {
      console.error('Failed to delete KPI:', error)
    }
  }

  const handleSaveKpi = async () => {
    await fetchKpis()
    setDialogOpen(false)
    setEditingKpi(null)
  }

  // Separate system and custom KPIs
  const systemKpis = kpis.filter(k => k.is_system)
  const customKpis = kpis.filter(k => !k.is_system)

  const getKpiIcon = (name: string) => {
    if (name.toLowerCase().includes('conversion') || name.toLowerCase().includes('rate')) return Target
    if (name.toLowerCase().includes('value') || name.toLowerCase().includes('revenue')) return DollarSign
    if (name.toLowerCase().includes('cycle') || name.toLowerCase().includes('time')) return Clock
    if (name.toLowerCase().includes('activity') || name.toLowerCase().includes('volume')) return Activity
    if (name.toLowerCase().includes('pipeline')) return BarChart3
    return Users
  }

  const getFormatLabel = (format: string) => {
    const labels: Record<string, string> = {
      number: 'Number',
      percentage: 'Percentage',
      currency: 'Currency',
      duration: 'Duration'
    }
    return labels[format] || format
  }

  return (
    <div className="space-y-6">
      {/* Pre-built Roofing KPIs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pre-built Roofing KPIs</CardTitle>
          <CardDescription>
            Industry-standard metrics automatically calculated daily
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading KPIs...</div>
          ) : systemKpis.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p>No system KPIs found</p>
              <p className="text-sm mt-1">Run database seed to add pre-built KPIs</p>
            </div>
          ) : (
            <div className="space-y-3">
              {systemKpis.map(kpi => {
                const Icon = getKpiIcon(kpi.name)

                return (
                  <div
                    key={kpi.id}
                    className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-card">
                        <Icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">{kpi.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {getFormatLabel(kpi.format_type)}
                          </Badge>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {kpi.frequency}
                          </Badge>
                          <Badge variant="default" className="text-xs">
                            System
                          </Badge>
                          {kpi.is_active ? (
                            <span className="text-xs text-green-600">Active</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Inactive</span>
                          )}
                        </div>
                        {kpi.description && (
                          <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={kpi.is_active}
                      onCheckedChange={(checked: boolean) => toggleKpi(kpi.id, checked)}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom KPI Button */}
      <Card>
        <CardContent className="pt-6">
          <Button
            onClick={() => {
              setEditingKpi(null)
              setDialogOpen(true)
            }}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Custom KPI
          </Button>
        </CardContent>
      </Card>

      {/* Custom KPIs */}
      {customKpis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Custom KPIs</CardTitle>
            <CardDescription>
              {customKpis.length} custom metric{customKpis.length !== 1 ? 's' : ''} configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {customKpis.map(kpi => {
                const Icon = getKpiIcon(kpi.name)

                return (
                  <div
                    key={kpi.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={kpi.is_active}
                        onCheckedChange={(checked: boolean) => toggleKpi(kpi.id, checked)}
                      />
                      <div className="p-2 rounded-lg bg-card">
                        <Icon className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">{kpi.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {getFormatLabel(kpi.format_type)}
                          </Badge>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {kpi.frequency}
                          </Badge>
                          {kpi.is_active ? (
                            <span className="text-xs text-green-600">Active</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Inactive</span>
                          )}
                        </div>
                        {kpi.description && (
                          <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => deleteKpi(kpi.id, kpi.is_system)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* How KPIs Work */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How KPIs Work</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h4 className="font-medium">Define Metric</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a metric to track (SQL query, formula, or aggregation)
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <h4 className="font-medium">Auto Calculate</h4>
              <p className="text-sm text-muted-foreground mt-1">
                System calculates values daily, weekly, or monthly
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">3</span>
              </div>
              <h4 className="font-medium">Track Progress</h4>
              <p className="text-sm text-muted-foreground mt-1">
                View trends and compare against targets
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <KpiFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        kpi={editingKpi}
        onSave={handleSaveKpi}
      />
    </div>
  )
}
