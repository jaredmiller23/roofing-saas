'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Trash2, ChevronDown, ChevronRight, Zap } from 'lucide-react'
import type {
  WorkflowTrigger,
  ContactCreatedConfig,
  StageChangedConfig,
  FieldChangedConfig,
  TimeElapsedConfig,
  ScheduledConfig,
  ContactStage,
  ContactType,
  ContactCategory
} from '@/lib/automation/workflow-types'

interface TriggerNodeProps {
  trigger: WorkflowTrigger
  onChange: (trigger: WorkflowTrigger) => void
  onDelete: () => void
  isExpanded?: boolean
}

const CONTACT_STAGES: ContactStage[] = [
  'new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'
]

const CONTACT_TYPES: ContactType[] = ['lead', 'prospect', 'customer']

const CONTACT_CATEGORIES: ContactCategory[] = [
  'homeowner', 'adjuster', 'sub_contractor', 'real_estate_agent',
  'developer', 'property_manager', 'local_business', 'other'
]

const CONTACT_FIELDS = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'stage', label: 'Stage' },
  { value: 'priority', label: 'Priority' },
  { value: 'assigned_to', label: 'Assigned To' },
  { value: 'property_type', label: 'Property Type' },
  { value: 'lead_score', label: 'Lead Score' }
]

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' }
]

export function TriggerNode({ trigger, onChange, onDelete, isExpanded = false }: TriggerNodeProps) {
  const [expanded, setExpanded] = useState(isExpanded)

  const updateConfig = (updates: Partial<any>) => {
    onChange({
      ...trigger,
      config: { ...trigger.config, ...updates }
    })
  }

  const getTriggerLabel = () => {
    switch (trigger.type) {
      case 'contact_created':
        return 'Contact Created'
      case 'stage_changed':
        return 'Stage Changed'
      case 'field_changed':
        return 'Field Changed'
      case 'time_elapsed':
        return 'Time Elapsed'
      case 'scheduled':
        return 'Scheduled'
      case 'form_submitted':
        return 'Form Submitted'
      case 'project_created':
        return 'Project Created'
      case 'manual':
        return 'Manual Trigger'
      default:
        return 'Unknown Trigger'
    }
  }

  const renderConfig = () => {
    switch (trigger.type) {
      case 'contact_created':
        return <ContactCreatedConfig config={trigger.config as ContactCreatedConfig} onChange={updateConfig} />
      case 'stage_changed':
        return <StageChangedConfig config={trigger.config as StageChangedConfig} onChange={updateConfig} />
      case 'field_changed':
        return <FieldChangedConfig config={trigger.config as FieldChangedConfig} onChange={updateConfig} />
      case 'time_elapsed':
        return <TimeElapsedConfig config={trigger.config as TimeElapsedConfig} onChange={updateConfig} />
      case 'scheduled':
        return <ScheduledConfigComponent config={trigger.config as ScheduledConfig} onChange={updateConfig} />
      default:
        return <div className="text-sm text-muted-foreground">No configuration needed</div>
    }
  }

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-500" />
            <span className="font-medium text-sm">{getTriggerLabel()}</span>
            <Badge variant="outline" className="text-xs">
              {trigger.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Status:</Label>
              <Select
                value={trigger.enabled ? 'enabled' : 'disabled'}
                onValueChange={(value) => onChange({
                  ...trigger,
                  enabled: value === 'enabled'
                })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {renderConfig()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ContactCreatedConfig({
  config,
  onChange
}: {
  config: ContactCreatedConfig
  onChange: (updates: Partial<ContactCreatedConfig>) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Contact Type (optional)</Label>
        <Select
          value={config.contact_type?.[0] || ''}
          onValueChange={(value) => onChange({ contact_type: value ? [value as ContactType] : undefined })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Any type</SelectItem>
            {CONTACT_TYPES.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Contact Category (optional)</Label>
        <Select
          value={config.contact_category?.[0] || ''}
          onValueChange={(value) => onChange({ contact_category: value ? [value as ContactCategory] : undefined })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Any category</SelectItem>
            {CONTACT_CATEGORIES.map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Source (optional)</Label>
        <Input
          placeholder="e.g., website, referral"
          value={config.source?.[0] || ''}
          onChange={(e) => onChange({ source: e.target.value ? [e.target.value] : undefined })}
        />
      </div>
    </div>
  )
}

function StageChangedConfig({
  config,
  onChange
}: {
  config: StageChangedConfig
  onChange: (updates: Partial<StageChangedConfig>) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">From Stage (optional)</Label>
        <Select
          value={config.from_stage?.[0] || ''}
          onValueChange={(value) => onChange({ from_stage: value ? [value as ContactStage] : undefined })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Any stage</SelectItem>
            {CONTACT_STAGES.map(stage => (
              <SelectItem key={stage} value={stage}>{stage}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">To Stage (optional)</Label>
        <Select
          value={config.to_stage?.[0] || ''}
          onValueChange={(value) => onChange({ to_stage: value ? [value as ContactStage] : undefined })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Any stage</SelectItem>
            {CONTACT_STAGES.map(stage => (
              <SelectItem key={stage} value={stage}>{stage}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function FieldChangedConfig({
  config,
  onChange
}: {
  config: FieldChangedConfig
  onChange: (updates: Partial<FieldChangedConfig>) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Field</Label>
        <Select
          value={config.field || ''}
          onValueChange={(value) => onChange({ field: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select field" />
          </SelectTrigger>
          <SelectContent>
            {CONTACT_FIELDS.map(field => (
              <SelectItem key={field.value} value={field.value}>{field.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Condition</Label>
        <Select
          value={config.operator || 'equals'}
          onValueChange={(value) => onChange({ operator: value as any })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPERATORS.map(op => (
              <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Value</Label>
        <Input
          placeholder="Enter value to watch for"
          value={config.to_value || ''}
          onChange={(e) => onChange({ to_value: e.target.value })}
        />
      </div>
    </div>
  )
}

function TimeElapsedConfig({
  config,
  onChange
}: {
  config: TimeElapsedConfig
  onChange: (updates: Partial<TimeElapsedConfig>) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Duration (hours)</Label>
        <Input
          type="number"
          placeholder="24"
          value={config.duration || ''}
          onChange={(e) => onChange({ duration: parseInt(e.target.value) || 0 })}
        />
      </div>

      <div>
        <Label className="text-xs">Reference Field</Label>
        <Select
          value={config.field || 'created_at'}
          onValueChange={(value) => onChange({ field: value as any })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Created Date</SelectItem>
            <SelectItem value="updated_at">Last Updated</SelectItem>
            <SelectItem value="custom">Custom Field</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.field === 'custom' && (
        <div>
          <Label className="text-xs">Custom Field</Label>
          <Input
            placeholder="Enter custom field name"
            value={config.custom_field || ''}
            onChange={(e) => onChange({ custom_field: e.target.value })}
          />
        </div>
      )}
    </div>
  )
}

function ScheduledConfigComponent({
  config,
  onChange
}: {
  config: ScheduledConfig
  onChange: (updates: Partial<ScheduledConfig>) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Schedule</Label>
        <Select
          value={config.schedule || 'daily'}
          onValueChange={(value) => onChange({ schedule: value as any })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.schedule === 'weekly' && (
        <div>
          <Label className="text-xs">Day of Week</Label>
          <Select
            value={config.day_of_week?.toString() || ''}
            onValueChange={(value) => onChange({ day_of_week: parseInt(value) })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select day" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Sunday</SelectItem>
              <SelectItem value="1">Monday</SelectItem>
              <SelectItem value="2">Tuesday</SelectItem>
              <SelectItem value="3">Wednesday</SelectItem>
              <SelectItem value="4">Thursday</SelectItem>
              <SelectItem value="5">Friday</SelectItem>
              <SelectItem value="6">Saturday</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label className="text-xs">Time</Label>
        <Input
          type="time"
          value={config.time || '09:00'}
          onChange={(e) => onChange({ time: e.target.value })}
        />
      </div>
    </div>
  )
}