'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Trash2,
  Edit,
  ChevronDown,
  Mail,
  MessageSquare,
  CheckSquare,
  Settings,
  GitBranch,
  UserPlus,
  Tag as TagIcon,
  Globe,
  Clock,
  GripVertical
} from 'lucide-react'
import type {
  WorkflowAction,
  SendEmailConfig,
  SendSMSConfig,
  CreateTaskConfig,
  UpdateFieldConfig,
  ChangeStageConfig,
  AssignUserConfig,
  AddTagConfig,
  RemoveTagConfig,
  WebhookConfig,
  WaitConfig,
  ContactStage
} from '@/lib/automation/workflow-types'

interface ActionNodeProps {
  action: WorkflowAction
  isEditing: boolean
  onChange: (action: WorkflowAction) => void
  onEdit: (action: WorkflowAction) => void
  onDelete: (actionId: string) => void
  onToggle: (actionId: string) => void
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  send_email: <Mail className="h-4 w-4" />,
  send_sms: <MessageSquare className="h-4 w-4" />,
  create_task: <CheckSquare className="h-4 w-4" />,
  update_field: <Settings className="h-4 w-4" />,
  change_stage: <GitBranch className="h-4 w-4" />,
  assign_user: <UserPlus className="h-4 w-4" />,
  add_tag: <TagIcon className="h-4 w-4" />,
  remove_tag: <TagIcon className="h-4 w-4" />,
  webhook: <Globe className="h-4 w-4" />,
  wait: <Clock className="h-4 w-4" />
}

const CONTACT_STAGES: ContactStage[] = [
  'new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'
]

const CONTACT_FIELDS = [
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'stage', label: 'Stage' },
  { value: 'priority', label: 'Priority' },
  { value: 'lead_score', label: 'Lead Score' },
  { value: 'property_type', label: 'Property Type' },
  { value: 'insurance_carrier', label: 'Insurance Carrier' }
]

export function ActionNode({
  action,
  isEditing,
  onChange,
  onEdit,
  onDelete,
  onToggle
}: ActionNodeProps) {
  const [expanded, setExpanded] = useState(isEditing)

  const updateConfig = (updates: Partial<WorkflowAction['config']>) => {
    onChange({
      ...action,
      config: { ...action.config, ...updates }
    })
  }

  const getActionLabel = () => {
    switch (action.type) {
      case 'send_email':
        return 'Send Email'
      case 'send_sms':
        return 'Send SMS'
      case 'create_task':
        return 'Create Task'
      case 'update_field':
        return 'Update Field'
      case 'change_stage':
        return 'Change Stage'
      case 'assign_user':
        return 'Assign User'
      case 'add_tag':
        return 'Add Tag'
      case 'remove_tag':
        return 'Remove Tag'
      case 'webhook':
        return 'Webhook'
      case 'wait':
        return 'Wait'
      default:
        return 'Unknown Action'
    }
  }

  const getActionSummary = () => {
    const config = action.config
    switch (action.type) {
      case 'send_email':
        return (config as SendEmailConfig).subject || 'No subject'
      case 'send_sms':
        return (config as SendSMSConfig).message?.substring(0, 30) + '...' || 'No message'
      case 'create_task':
        return (config as CreateTaskConfig).title || 'No title'
      case 'update_field':
        const updateConfig = config as UpdateFieldConfig
        return `${updateConfig.field} = ${updateConfig.value}`
      case 'change_stage':
        return `Stage → ${(config as ChangeStageConfig).stage}`
      case 'wait':
        return `Wait ${(config as WaitConfig).duration} hours`
      default:
        return ''
    }
  }

  const renderConfig = () => {
    if (!isEditing) return null

    switch (action.type) {
      case 'send_email':
        return <SendEmailConfigComponent config={action.config as SendEmailConfig} onChange={updateConfig} />
      case 'send_sms':
        return <SendSMSConfigComponent config={action.config as SendSMSConfig} onChange={updateConfig} />
      case 'create_task':
        return <CreateTaskConfigComponent config={action.config as CreateTaskConfig} onChange={updateConfig} />
      case 'update_field':
        return <UpdateFieldConfigComponent config={action.config as UpdateFieldConfig} onChange={updateConfig} />
      case 'change_stage':
        return <ChangeStageConfigComponent config={action.config as ChangeStageConfig} onChange={updateConfig} />
      case 'assign_user':
        return <AssignUserConfigComponent config={action.config as AssignUserConfig} onChange={updateConfig} />
      case 'add_tag':
        return <AddTagConfigComponent config={action.config as AddTagConfig} onChange={updateConfig} />
      case 'remove_tag':
        return <RemoveTagConfigComponent config={action.config as RemoveTagConfig} onChange={updateConfig} />
      case 'webhook':
        return <WebhookConfigComponent config={action.config as WebhookConfig} onChange={updateConfig} />
      case 'wait':
        return <WaitConfigComponent config={action.config as WaitConfig} onChange={updateConfig} />
      default:
        return <div className="text-sm text-muted-foreground">No configuration needed</div>
    }
  }

  return (
    <Card className={`border-l-4 ${action.enabled ? 'border-l-green-500' : 'border-l-gray-400'} ${isEditing ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            {ACTION_ICONS[action.type]}
            <div>
              <div className="font-medium text-sm">{getActionLabel()}</div>
              <div className="text-xs text-muted-foreground">{getActionSummary()}</div>
            </div>
            {action.delay && action.delay > 0 && (
              <Badge variant="secondary" className="text-xs">
                +{action.delay}h
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Switch
              checked={action.enabled}
              onCheckedChange={() => onToggle(action.id)}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onEdit(action)
                setExpanded(!expanded)
              }}
            >
              {isEditing ? <ChevronDown className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(action.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isEditing && (
          <div className="mt-3 pt-3 border-t space-y-3">
            <div>
              <Label className="text-xs">Delay (hours)</Label>
              <Input
                type="number"
                placeholder="0"
                value={action.delay || ''}
                onChange={(e) => onChange({
                  ...action,
                  delay: parseInt(e.target.value) || undefined
                })}
              />
              <div className="text-xs text-muted-foreground mt-1">
                Wait this many hours before executing this action
              </div>
            </div>
            {renderConfig()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SendEmailConfigComponent({
  config,
  onChange
}: {
  config: SendEmailConfig
  onChange: (updates: Partial<SendEmailConfig>) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">To</Label>
        <Input
          placeholder="{{contact.email}}"
          value={config.to || ''}
          onChange={(e) => onChange({ to: e.target.value })}
        />
      </div>
      <div>
        <Label className="text-xs">Subject</Label>
        <Input
          placeholder="Hello {{contact.first_name}}!"
          value={config.subject || ''}
          onChange={(e) => onChange({ subject: e.target.value })}
        />
      </div>
      <div>
        <Label className="text-xs">Message</Label>
        <Textarea
          placeholder="Hi {{contact.first_name}}, thanks for your interest..."
          value={config.body || ''}
          onChange={(e) => onChange({ body: e.target.value })}
          rows={3}
        />
      </div>
    </div>
  )
}

function SendSMSConfigComponent({
  config,
  onChange
}: {
  config: SendSMSConfig
  onChange: (updates: Partial<SendSMSConfig>) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">To</Label>
        <Input
          placeholder="{{contact.phone}}"
          value={config.to || ''}
          onChange={(e) => onChange({ to: e.target.value })}
        />
      </div>
      <div>
        <Label className="text-xs">Message</Label>
        <Textarea
          placeholder="Hi {{contact.first_name}}, we wanted to follow up..."
          value={config.message || ''}
          onChange={(e) => onChange({ message: e.target.value })}
          rows={2}
        />
      </div>
    </div>
  )
}

function CreateTaskConfigComponent({
  config,
  onChange
}: {
  config: CreateTaskConfig
  onChange: (updates: Partial<CreateTaskConfig>) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Title</Label>
        <Input
          placeholder="Follow up with {{contact.first_name}}"
          value={config.title || ''}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </div>
      <div>
        <Label className="text-xs">Description</Label>
        <Textarea
          placeholder="Contact details and next steps..."
          value={config.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={2}
        />
      </div>
      <div>
        <Label className="text-xs">Due Date</Label>
        <Input
          placeholder="+3 days"
          value={config.due_date || ''}
          onChange={(e) => onChange({ due_date: e.target.value })}
        />
        <div className="text-xs text-muted-foreground mt-1">
          Use +3 days, +1 week, or specific date
        </div>
      </div>
      <div>
        <Label className="text-xs">Priority</Label>
        <Select
          value={config.priority || 'normal'}
          onValueChange={(value) => onChange({ priority: value as CreateTaskConfig['priority'] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function UpdateFieldConfigComponent({
  config,
  onChange
}: {
  config: UpdateFieldConfig
  onChange: (updates: Partial<UpdateFieldConfig>) => void
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
        <Label className="text-xs">Operation</Label>
        <Select
          value={config.operator || 'set'}
          onValueChange={(value) => onChange({ operator: value as UpdateFieldConfig['operator'] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="set">Set</SelectItem>
            <SelectItem value="add">Add (numeric)</SelectItem>
            <SelectItem value="subtract">Subtract (numeric)</SelectItem>
            <SelectItem value="append">Append (text)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Value</Label>
        <Input
          placeholder="New value"
          value={typeof config.value === 'string' || typeof config.value === 'number' ? config.value : ''}
          onChange={(e) => onChange({ value: e.target.value })}
        />
      </div>
    </div>
  )
}

function ChangeStageConfigComponent({
  config,
  onChange
}: {
  config: ChangeStageConfig
  onChange: (updates: Partial<ChangeStageConfig>) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Stage</Label>
        <Select
          value={config.stage || ''}
          onValueChange={(value) => onChange({ stage: value as ContactStage })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select stage" />
          </SelectTrigger>
          <SelectContent>
            {CONTACT_STAGES.map(stage => (
              <SelectItem key={stage} value={stage}>{stage}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Substatus (optional)</Label>
        <Input
          placeholder="Follow-up required"
          value={config.substatus || ''}
          onChange={(e) => onChange({ substatus: e.target.value })}
        />
      </div>
    </div>
  )
}

function AssignUserConfigComponent({
  config,
  onChange
}: {
  config: AssignUserConfig
  onChange: (updates: Partial<AssignUserConfig>) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">User ID</Label>
        <Input
          placeholder="user_123 or {{user.id}}"
          value={config.user_id || ''}
          onChange={(e) => onChange({ user_id: e.target.value })}
        />
        <div className="text-xs text-muted-foreground mt-1">
          Enter user ID or use variable like user.id
        </div>
      </div>
    </div>
  )
}

function AddTagConfigComponent({
  config,
  onChange
}: {
  config: AddTagConfig
  onChange: (updates: Partial<AddTagConfig>) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Tags</Label>
        <Input
          placeholder="hot-lead, follow-up"
          value={config.tags?.join(', ') || ''}
          onChange={(e) => onChange({ tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
        />
        <div className="text-xs text-muted-foreground mt-1">
          Comma-separated tags to add
        </div>
      </div>
    </div>
  )
}

function RemoveTagConfigComponent({
  config,
  onChange
}: {
  config: RemoveTagConfig
  onChange: (updates: Partial<RemoveTagConfig>) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Tags</Label>
        <Input
          placeholder="cold-lead, unqualified"
          value={config.tags?.join(', ') || ''}
          onChange={(e) => onChange({ tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
        />
        <div className="text-xs text-muted-foreground mt-1">
          Comma-separated tags to remove
        </div>
      </div>
    </div>
  )
}

function WebhookConfigComponent({
  config,
  onChange
}: {
  config: WebhookConfig
  onChange: (updates: Partial<WebhookConfig>) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">URL</Label>
        <Input
          placeholder="https://api.example.com/webhook"
          value={config.url || ''}
          onChange={(e) => onChange({ url: e.target.value })}
        />
      </div>
      <div>
        <Label className="text-xs">Method</Label>
        <Select
          value={config.method || 'POST'}
          onValueChange={(value) => onChange({ method: value as WebhookConfig['method'] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function WaitConfigComponent({
  config,
  onChange
}: {
  config: WaitConfig
  onChange: (updates: Partial<WaitConfig>) => void
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
        <div className="text-xs text-muted-foreground mt-1">
          Wait this many hours before continuing
        </div>
      </div>
    </div>
  )
}