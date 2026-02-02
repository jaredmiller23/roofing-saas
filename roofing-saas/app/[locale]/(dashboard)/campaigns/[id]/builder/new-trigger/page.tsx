'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Loader2,
  ArrowRightLeft,
  Clock,
  Zap,
  MousePointer,
  Tag,
} from 'lucide-react'
import type {
  TriggerType,
  CreateCampaignTriggerRequest,
  StageChangeTriggerConfig,
  TimeBasedTriggerConfig,
  EventTriggerConfig,
  DelayUnit,
} from '@/lib/campaigns/types'
import { apiFetch } from '@/lib/api/client'

const triggerTypes: { value: TriggerType; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'stage_change', label: 'Stage Change', description: 'When contact/project moves to a stage', icon: ArrowRightLeft },
  { value: 'time_based', label: 'Time Based', description: 'After a certain time relative to a date', icon: Clock },
  { value: 'event', label: 'Event Triggered', description: 'When a specific event occurs', icon: Zap },
  { value: 'manual', label: 'Manual', description: 'Manually enroll contacts', icon: MousePointer },
]

const eventTypes = [
  { value: 'activity_created', label: 'Activity Created' },
  { value: 'document_signed', label: 'Document Signed' },
  { value: 'form_submitted', label: 'Form Submitted' },
  { value: 'tag_added', label: 'Tag Added' },
  { value: 'email_opened', label: 'Email Opened' },
  { value: 'email_clicked', label: 'Email Clicked' },
]

const pipelineStages = [
  { value: 'new', label: 'New Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal Sent' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
]

export default function NewTriggerPage() {
  const router = useRouter()
  const params = useParams()
  const campaignId = params?.id as string

  const [selectedType, setSelectedType] = useState<TriggerType | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Stage change config
  const [entityType, setEntityType] = useState<'contact' | 'project'>('contact')
  const [fromStage, setFromStage] = useState<string>('')
  const [toStage, setToStage] = useState<string>('')

  // Time based config
  const [relativeTo, setRelativeTo] = useState('created_at')
  const [delayValue, setDelayValue] = useState(1)
  const [delayUnit, setDelayUnit] = useState<DelayUnit>('days')

  // Event config
  const [eventName, setEventName] = useState('')

  const handleCreate = async () => {
    if (!selectedType) return

    setSaving(true)
    setError(null)

    try {
      let triggerConfig: CreateCampaignTriggerRequest['trigger_config']

      switch (selectedType) {
        case 'stage_change':
          triggerConfig = {
            entity_type: entityType,
            from_stage: fromStage || null,
            to_stage: toStage,
          } as StageChangeTriggerConfig
          break
        case 'time_based':
          triggerConfig = {
            schedule_type: 'relative',
            relative_to: relativeTo,
            delay_value: delayValue,
            delay_unit: delayUnit,
          } as TimeBasedTriggerConfig
          break
        case 'event':
          triggerConfig = {
            event_name: eventName,
          } as EventTriggerConfig
          break
        case 'manual':
        default:
          triggerConfig = { manual: true }
      }

      const payload: CreateCampaignTriggerRequest = {
        trigger_type: selectedType,
        trigger_config: triggerConfig,
        priority: 1,
      }

      await apiFetch(`/api/campaigns/${campaignId}/triggers`, {
        method: 'POST',
        body: payload,
      })

      router.push(`/campaigns/${campaignId}/builder`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trigger')
    } finally {
      setSaving(false)
    }
  }

  const renderConfigForm = () => {
    switch (selectedType) {
      case 'stage_change':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Entity Type</Label>
              <Select value={entityType} onValueChange={(v) => setEntityType(v as 'contact' | 'project')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contact">Contact</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>From Stage (optional)</Label>
              <Select value={fromStage} onValueChange={setFromStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Any stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any Stage</SelectItem>
                  {pipelineStages.map(stage => (
                    <SelectItem key={stage.value} value={stage.value}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>To Stage *</Label>
              <Select value={toStage} onValueChange={setToStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target stage" />
                </SelectTrigger>
                <SelectContent>
                  {pipelineStages.map(stage => (
                    <SelectItem key={stage.value} value={stage.value}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      case 'time_based':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Relative To</Label>
              <Select value={relativeTo} onValueChange={setRelativeTo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Date Created</SelectItem>
                  <SelectItem value="last_contact_date">Last Contact Date</SelectItem>
                  <SelectItem value="last_activity_date">Last Activity Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-3">
              <div className="space-y-2">
                <Label>After</Label>
                <Input
                  type="number"
                  min={1}
                  value={delayValue}
                  onChange={(e) => setDelayValue(parseInt(e.target.value) || 1)}
                  className="w-24"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={delayUnit} onValueChange={(v) => setDelayUnit(v as DelayUnit)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="weeks">Weeks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )

      case 'event':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Event Type</Label>
              <Select value={eventName} onValueChange={setEventName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map(event => (
                    <SelectItem key={event.value} value={event.value}>
                      {event.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      case 'manual':
        return (
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Contacts will be enrolled manually by team members.
              No automatic enrollment will occur.
            </p>
          </div>
        )

      default:
        return null
    }
  }

  const isValid = () => {
    switch (selectedType) {
      case 'stage_change':
        return !!toStage
      case 'time_based':
        return delayValue > 0
      case 'event':
        return !!eventName
      case 'manual':
        return true
      default:
        return false
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Add Campaign Trigger</h1>
          <p className="text-muted-foreground">
            Define when contacts should be enrolled
          </p>
        </div>
      </div>

      {/* Trigger Type Selection */}
      {!selectedType ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {triggerTypes.map((type) => {
            const Icon = type.icon
            return (
              <Card
                key={type.value}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setSelectedType(type.value)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{type.label}</CardTitle>
                      <CardDescription className="text-sm">
                        {type.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(() => {
                  const type = triggerTypes.find(t => t.value === selectedType)
                  const Icon = type?.icon || Tag
                  return (
                    <>
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>{type?.label}</CardTitle>
                        <CardDescription>{type?.description}</CardDescription>
                      </div>
                    </>
                  )
                })()}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedType(null)}>
                Change Type
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Trigger-specific Config */}
            <div className="space-y-4">
              <h3 className="font-medium">Configuration</h3>
              {renderConfigForm()}
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={saving || !isValid()}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Trigger'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
