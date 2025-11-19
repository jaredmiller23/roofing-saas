'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Save,
  Play,
  Pause,
  Plus,
  Trash2,
  ChevronRight,
  Mail,
  MessageSquare,
  Clock,
  Edit,
  Loader2,
} from 'lucide-react'
import type {
  Campaign,
  CampaignStep,
  CampaignTrigger,
  StepType,
} from '@/lib/campaigns/types'

export default function CampaignBuilderPage() {
  const router = useRouter()
  const params = useParams()
  const campaignId = params?.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [steps, setSteps] = useState<CampaignStep[]>([])
  const [triggers, setTriggers] = useState<CampaignTrigger[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (campaignId) {
      fetchCampaignData()
    }
  }, [campaignId])

  const fetchCampaignData = async () => {
    setLoading(true)
    try {
      // Fetch campaign details
      const campaignRes = await fetch(`/api/campaigns/${campaignId}`)
      if (!campaignRes.ok) throw new Error('Failed to fetch campaign')
      const campaignData = await campaignRes.json()
      setCampaign(campaignData.campaign)

      // Fetch steps
      const stepsRes = await fetch(`/api/campaigns/${campaignId}/steps`)
      if (!stepsRes.ok) throw new Error('Failed to fetch steps')
      const stepsData = await stepsRes.json()
      setSteps(stepsData.steps || [])
    } catch (error) {
      console.error('Error fetching campaign data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateCampaign = async (updates: Partial<Campaign>) => {
    setSaving(true)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) throw new Error('Failed to update campaign')

      const data = await response.json()
      setCampaign(data.campaign)
    } catch (error) {
      console.error('Error updating campaign:', error)
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!campaign) return

    const newStatus = campaign.status === 'active' ? 'paused' : 'active'
    await handleUpdateCampaign({ status: newStatus })
  }

  const handleAddStep = () => {
    router.push(`/campaigns/${campaignId}/builder/new-step`)
  }

  const handleDeleteStep = async (stepId: string) => {
    if (!confirm('Are you sure you want to delete this step?')) return

    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/steps/${stepId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) throw new Error('Failed to delete step')

      await fetchCampaignData()
    } catch (error) {
      console.error('Error deleting step:', error)
      alert('Failed to delete step')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="container mx-auto p-6">
        <p>Campaign not found</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/campaigns')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{campaign.name}</h1>
            <p className="text-muted-foreground">
              {campaign.description || 'No description'}
            </p>
          </div>
          <Badge
            variant={
              campaign.status === 'active'
                ? 'default'
                : campaign.status === 'draft'
                  ? 'secondary'
                  : 'outline'
            }
          >
            {campaign.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleToggleStatus}>
            {campaign.status === 'active' ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Activate
              </>
            )}
          </Button>
          <Button onClick={() => handleUpdateCampaign(campaign)} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="steps" className="w-full">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="triggers">Triggers</TabsTrigger>
          <TabsTrigger value="steps">Steps</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Settings</CardTitle>
              <CardDescription>
                Configure campaign details and behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  value={campaign.name}
                  onChange={(e) =>
                    setCampaign({ ...campaign, name: e.target.value })
                  }
                  onBlur={() => handleUpdateCampaign({ name: campaign.name })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={campaign.description || ''}
                  onChange={(e) =>
                    setCampaign({ ...campaign, description: e.target.value })
                  }
                  onBlur={() =>
                    handleUpdateCampaign({ description: campaign.description })
                  }
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Campaign Type</Label>
                  <p className="text-sm text-muted-foreground">
                    {campaign.campaign_type}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Enrollment Type</Label>
                  <p className="text-sm text-muted-foreground">
                    {campaign.enrollment_type}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Triggers Tab */}
        <TabsContent value="triggers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Campaign Triggers</CardTitle>
                  <CardDescription>
                    Define when contacts should be enrolled in this campaign
                  </CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Trigger
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {triggers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No triggers configured. Add a trigger to automatically enroll
                  contacts.
                </p>
              ) : (
                <div className="space-y-2">
                  {triggers.map((trigger) => (
                    <div
                      key={trigger.id}
                      className="border rounded-lg p-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">{trigger.trigger_type}</p>
                        <p className="text-sm text-muted-foreground">
                          Priority: {trigger.priority}
                        </p>
                      </div>
                      <Badge variant={trigger.is_active ? 'default' : 'secondary'}>
                        {trigger.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Steps Tab */}
        <TabsContent value="steps" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Campaign Steps</CardTitle>
                  <CardDescription>
                    Build your campaign sequence
                  </CardDescription>
                </div>
                <Button onClick={handleAddStep}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Step
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {steps.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    No steps added yet. Create your first step to get started.
                  </p>
                  <Button onClick={handleAddStep}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Step
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {steps.map((step, index) => (
                    <StepCard
                      key={step.id}
                      step={step}
                      index={index}
                      onDelete={handleDeleteStep}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Enrollments Tab */}
        <TabsContent value="enrollments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Enrollments</CardTitle>
              <CardDescription>
                View and manage contacts enrolled in this campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                Enrollment management coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface StepCardProps {
  step: CampaignStep
  index: number
  onDelete: (stepId: string) => void
}

function StepCard({ step, index, onDelete }: StepCardProps) {
  const getStepIcon = (stepType: StepType) => {
    switch (stepType) {
      case 'send_email':
        return <Mail className="h-4 w-4" />
      case 'send_sms':
        return <MessageSquare className="h-4 w-4" />
      case 'wait':
        return <Clock className="h-4 w-4" />
      default:
        return <Edit className="h-4 w-4" />
    }
  }

  const getStepLabel = (stepType: StepType) => {
    return stepType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
              {index + 1}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              {getStepIcon(step.step_type)}
              <h4 className="font-medium">{getStepLabel(step.step_type)}</h4>
            </div>

            {step.delay_value > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Wait {step.delay_value} {step.delay_unit} after previous step
              </p>
            )}

            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span>Executed: {step.total_executed}</span>
              <span>Succeeded: {step.total_succeeded}</span>
              <span>Failed: {step.total_failed}</span>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(step.id)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
