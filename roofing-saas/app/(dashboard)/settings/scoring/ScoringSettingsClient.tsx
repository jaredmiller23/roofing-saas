'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Save, RotateCcw, Settings, TrendingUp, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { DEFAULT_SCORING_RULES, SCORE_THRESHOLDS } from '@/lib/scoring/scoring-rules'
import type { 
  ScoringRules, 
  PropertyValueRange, 
  RoofAgeMultiplier, 
  SourceWeight 
} from '@/lib/scoring/score-types'

interface ScoringSettingsClientProps {
  user: {
    id: string
    email?: string
    name?: string
  }
}

interface ScoringConfig {
  enabled: boolean
  autoUpdate: boolean
  rules: ScoringRules
}

export function ScoringSettingsClient({ user }: ScoringSettingsClientProps) {
  const [config, setConfig] = useState<ScoringConfig>({
    enabled: true,
    autoUpdate: true,
    rules: DEFAULT_SCORING_RULES,
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load current configuration on mount
  useEffect(() => {
    loadConfiguration()
  }, [])

  const loadConfiguration = async () => {
    setLoading(true)
    try {
      // In a real implementation, this would fetch from API
      // For now, we'll use defaults
      setConfig({
        enabled: true,
        autoUpdate: true,
        rules: DEFAULT_SCORING_RULES,
      })
    } catch (error) {
      console.error('Failed to load scoring configuration:', error)
      toast.error('Failed to load scoring configuration')
    } finally {
      setLoading(false)
    }
  }

  const saveConfiguration = async () => {
    setSaving(true)
    try {
      // In a real implementation, this would save to API
      // For now, we'll just simulate a save
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success('Scoring configuration saved successfully')
    } catch (error) {
      console.error('Failed to save scoring configuration:', error)
      toast.error('Failed to save scoring configuration')
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = () => {
    setConfig({
      enabled: true,
      autoUpdate: true,
      rules: DEFAULT_SCORING_RULES,
    })
    toast.info('Configuration reset to defaults')
  }

  const updatePropertyValueRange = (index: number, field: keyof PropertyValueRange, value: any) => {
    const newRanges = [...config.rules.propertyValueRanges]
    newRanges[index] = { ...newRanges[index], [field]: value }
    setConfig({
      ...config,
      rules: { ...config.rules, propertyValueRanges: newRanges }
    })
  }

  const updateRoofAgeMultiplier = (index: number, field: keyof RoofAgeMultiplier, value: any) => {
    const newMultipliers = [...config.rules.roofAgeMultipliers]
    newMultipliers[index] = { ...newMultipliers[index], [field]: value }
    setConfig({
      ...config,
      rules: { ...config.rules, roofAgeMultipliers: newMultipliers }
    })
  }

  const updateSourceWeight = (index: number, field: keyof SourceWeight, value: any) => {
    const newWeights = [...config.rules.sourceWeights]
    newWeights[index] = { ...newWeights[index], [field]: value }
    setConfig({
      ...config,
      rules: { ...config.rules, sourceWeights: newWeights }
    })
  }

  const updateCategoryWeight = (category: keyof typeof config.rules.categoryWeights, value: number) => {
    setConfig({
      ...config,
      rules: {
        ...config.rules,
        categoryWeights: {
          ...config.rules.categoryWeights,
          [category]: value
        }
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading scoring configuration...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant={config.enabled ? 'default' : 'secondary'}>
            {config.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
          {config.autoUpdate && (
            <Badge variant="outline">
              Auto-Update
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={resetToDefaults}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </Button>
          <Button
            onClick={saveConfiguration}
            disabled={saving}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Main Settings */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="property">Property Values</TabsTrigger>
          <TabsTrigger value="roof">Roof Age</TabsTrigger>
          <TabsTrigger value="sources">Lead Sources</TabsTrigger>
          <TabsTrigger value="categories">Category Weights</TabsTrigger>
          <TabsTrigger value="thresholds">Score Thresholds</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                General Settings
              </CardTitle>
              <CardDescription>
                Configure general lead scoring behavior and automation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Enable Lead Scoring</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically calculate lead scores for all contacts
                  </p>
                </div>
                <Switch
                  checked={config.enabled}
                  onCheckedChange={(enabled) => setConfig({ ...config, enabled })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Auto-Update Scores</Label>
                  <p className="text-sm text-muted-foreground">
                    Recalculate scores when contact information changes
                  </p>
                </div>
                <Switch
                  checked={config.autoUpdate}
                  onCheckedChange={(autoUpdate) => setConfig({ ...config, autoUpdate })}
                />
              </div>

              <Separator />

              <div className="bg-muted/30 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-foreground">Scoring Algorithm</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Lead scores are calculated using multiple factors including property value, 
                      roof age, lead source quality, contact completeness, and engagement level. 
                      Scores range from 0-100 with thresholds for Hot (75+), Warm (50-74), and Cold (0-49) leads.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Property Value Ranges */}
        <TabsContent value="property">
          <Card>
            <CardHeader>
              <CardTitle>Property Value Scoring</CardTitle>
              <CardDescription>
                Configure scoring based on property value ranges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {config.rules.propertyValueRanges.map((range, index) => (
                  <div key={index} className="grid grid-cols-4 gap-4 items-center">
                    <div>
                      <Label>Min Value</Label>
                      <Input
                        type="number"
                        value={range.min}
                        onChange={(e) => updatePropertyValueRange(index, 'min', parseInt(e.target.value))}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label>Max Value</Label>
                      <Input
                        type="number"
                        value={range.max || ''}
                        onChange={(e) => updatePropertyValueRange(index, 'max', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="Unlimited"
                      />
                    </div>
                    <div>
                      <Label>Score</Label>
                      <Input
                        type="number"
                        value={range.score}
                        onChange={(e) => updatePropertyValueRange(index, 'score', parseInt(e.target.value))}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label>Label</Label>
                      <Input
                        value={range.label}
                        onChange={(e) => updatePropertyValueRange(index, 'label', e.target.value)}
                        placeholder="Range label"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roof Age Multipliers */}
        <TabsContent value="roof">
          <Card>
            <CardHeader>
              <CardTitle>Roof Age Multipliers</CardTitle>
              <CardDescription>
                Configure scoring multipliers based on roof age
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {config.rules.roofAgeMultipliers.map((multiplier, index) => (
                  <div key={index} className="grid grid-cols-4 gap-4 items-center">
                    <div>
                      <Label>Min Age (years)</Label>
                      <Input
                        type="number"
                        value={multiplier.minAge}
                        onChange={(e) => updateRoofAgeMultiplier(index, 'minAge', parseInt(e.target.value))}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label>Max Age (years)</Label>
                      <Input
                        type="number"
                        value={multiplier.maxAge || ''}
                        onChange={(e) => updateRoofAgeMultiplier(index, 'maxAge', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="Unlimited"
                      />
                    </div>
                    <div>
                      <Label>Multiplier</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={multiplier.multiplier}
                        onChange={(e) => updateRoofAgeMultiplier(index, 'multiplier', parseFloat(e.target.value))}
                        placeholder="1.0"
                      />
                    </div>
                    <div>
                      <Label>Label</Label>
                      <Input
                        value={multiplier.label}
                        onChange={(e) => updateRoofAgeMultiplier(index, 'label', e.target.value)}
                        placeholder="Age range label"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lead Source Weights */}
        <TabsContent value="sources">
          <Card>
            <CardHeader>
              <CardTitle>Lead Source Weights</CardTitle>
              <CardDescription>
                Configure scoring weights for different lead sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {config.rules.sourceWeights.map((weight, index) => (
                  <div key={index} className="grid grid-cols-3 gap-4 items-center">
                    <div>
                      <Label>Source</Label>
                      <Input
                        value={weight.source}
                        onChange={(e) => updateSourceWeight(index, 'source', e.target.value)}
                        placeholder="source_name"
                      />
                    </div>
                    <div>
                      <Label>Weight</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={weight.weight}
                        onChange={(e) => updateSourceWeight(index, 'weight', parseFloat(e.target.value))}
                        placeholder="1.0"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input
                        value={weight.description}
                        onChange={(e) => updateSourceWeight(index, 'description', e.target.value)}
                        placeholder="Description"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Category Weights */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Category Weights</CardTitle>
              <CardDescription>
                Configure the relative importance of each scoring category (total should equal 1.0)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(config.rules.categoryWeights).map(([category, weight]) => (
                  <div key={category} className="flex items-center justify-between">
                    <div>
                      <Label className="capitalize">{category.replace('_', ' ')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {getCategoryDescription(category)}
                      </p>
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={weight}
                        onChange={(e) => updateCategoryWeight(category as any, parseFloat(e.target.value))}
                      />
                    </div>
                  </div>
                ))}
                
                <Separator />
                
                <div className="flex items-center justify-between font-medium">
                  <span>Total Weight</span>
                  <span className={
                    Math.abs(Object.values(config.rules.categoryWeights).reduce((a, b) => a + b, 0) - 1) > 0.01
                      ? 'text-red-600' 
                      : 'text-green-600'
                  }>
                    {Object.values(config.rules.categoryWeights).reduce((a, b) => a + b, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Score Thresholds */}
        <TabsContent value="thresholds">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Score Thresholds
              </CardTitle>
              <CardDescription>
                Configure score thresholds for Hot, Warm, and Cold lead classifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(SCORE_THRESHOLDS).map(([level, threshold]) => (
                  <div key={level} className="flex items-center justify-between">
                    <div>
                      <Label className="capitalize font-medium">{level} Leads</Label>
                      <p className="text-sm text-muted-foreground">
                        {threshold.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{threshold.min}+</div>
                      <div className="text-xs text-muted-foreground">minimum score</div>
                    </div>
                  </div>
                ))}
                
                <div className="bg-muted/30 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> Score thresholds are currently fixed. 
                    Future versions will allow customization of these values.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function getCategoryDescription(category: string): string {
  const descriptions: Record<string, string> = {
    property: 'Property value, type, and physical characteristics',
    financial: 'Insurance information and financial indicators',
    timing: 'Roof age and urgency factors',
    engagement: 'Response level and sales stage progression',
    demographics: 'Contact completeness and location',
    referral: 'Lead source quality and referral indicators',
  }
  return descriptions[category] || 'Scoring category'
}
