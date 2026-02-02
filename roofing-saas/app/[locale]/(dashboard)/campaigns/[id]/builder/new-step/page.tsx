'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  Clock,
  CheckSquare,
  Tag,
  Bell,
  Globe,
  GitBranch,
  LogOut,
  Loader2,
  FileEdit,
} from 'lucide-react'
import type {
  StepType,
  DelayUnit,
  CreateCampaignStepRequest,
  SendEmailStepConfig,
  SendSmsStepConfig,
  CreateTaskStepConfig,
  ManageTagsStepConfig,
  NotifyStepConfig,
} from '@/lib/campaigns/types'
import { apiFetch } from '@/lib/api/client'

const stepTypes: { value: StepType; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'send_email', label: 'Send Email', description: 'Send an email to the contact', icon: Mail },
  { value: 'send_sms', label: 'Send SMS', description: 'Send a text message', icon: MessageSquare },
  { value: 'wait', label: 'Wait', description: 'Add a delay before next step', icon: Clock },
  { value: 'create_task', label: 'Create Task', description: 'Create a task for the team', icon: CheckSquare },
  { value: 'update_field', label: 'Update Field', description: 'Update contact/project field', icon: FileEdit },
  { value: 'manage_tags', label: 'Manage Tags', description: 'Add or remove tags', icon: Tag },
  { value: 'notify', label: 'Send Notification', description: 'Notify team members', icon: Bell },
  { value: 'webhook', label: 'Webhook', description: 'Call external API', icon: Globe },
  { value: 'conditional', label: 'Conditional', description: 'Branch based on conditions', icon: GitBranch },
  { value: 'exit_campaign', label: 'Exit Campaign', description: 'End enrollment', icon: LogOut },
]

export default function NewStepPage() {
  const router = useRouter()
  const params = useParams()
  const campaignId = params?.id as string

  const [selectedType, setSelectedType] = useState<StepType | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Delay settings (common to all steps)
  const [delayValue, setDelayValue] = useState(0)
  const [delayUnit, setDelayUnit] = useState<DelayUnit>('days')

  // Email config
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')

  // SMS config
  const [smsMessage, setSmsMessage] = useState('')

  // Task config
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskPriority, setTaskPriority] = useState('medium')

  // Tags config
  const [tagAction, setTagAction] = useState<'add' | 'remove'>('add')
  const [tags, setTags] = useState('')

  // Notification config
  const [notifyMessage, setNotifyMessage] = useState('')

  const handleCreate = async () => {
    if (!selectedType) return

    setSaving(true)
    setError(null)

    try {
      // Build step config based on type
      let stepConfig: CreateCampaignStepRequest['step_config'] = {}

      switch (selectedType) {
        case 'send_email':
          stepConfig = {
            subject: emailSubject,
            body: emailBody,
            track_opens: true,
            track_clicks: true,
          } as SendEmailStepConfig
          break
        case 'send_sms':
          stepConfig = {
            message: smsMessage,
            track_replies: true,
          } as SendSmsStepConfig
          break
        case 'wait':
          stepConfig = {
            delay_value: delayValue || 1,
            delay_unit: delayUnit,
          }
          break
        case 'create_task':
          stepConfig = {
            title: taskTitle,
            description: taskDescription,
            task_type: 'follow_up',
            priority: taskPriority,
          } as CreateTaskStepConfig
          break
        case 'manage_tags':
          stepConfig = {
            action: tagAction,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          } as ManageTagsStepConfig
          break
        case 'notify':
          stepConfig = {
            message: notifyMessage,
            notification_type: 'in_app',
            notify_users: [],
          } as NotifyStepConfig
          break
        default:
          stepConfig = {}
      }

      const payload: CreateCampaignStepRequest = {
        step_order: 999, // Will be auto-ordered on server
        step_type: selectedType,
        step_config: stepConfig,
        delay_value: delayValue,
        delay_unit: delayUnit,
      }

      await apiFetch(`/api/campaigns/${campaignId}/steps`, {
        method: 'POST',
        body: payload,
      })

      router.push(`/campaigns/${campaignId}/builder`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create step')
    } finally {
      setSaving(false)
    }
  }

  const renderConfigForm = () => {
    switch (selectedType) {
      case 'send_email':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject Line</Label>
              <Input
                id="email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Enter email subject..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-body">Email Body</Label>
              <Textarea
                id="email-body"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Enter email content..."
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Use {'{{first_name}}'}, {'{{company}}'} for personalization
              </p>
            </div>
          </div>
        )

      case 'send_sms':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sms-message">Message</Label>
              <Textarea
                id="sms-message"
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                placeholder="Enter SMS message..."
                rows={4}
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground">
                {smsMessage.length}/160 characters
              </p>
            </div>
          </div>
        )

      case 'wait':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure how long to wait before the next step
            </p>
          </div>
        )

      case 'create_task':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Task Title</Label>
              <Input
                id="task-title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Follow up with contact..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Task details..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-priority">Priority</Label>
              <Select value={taskPriority} onValueChange={setTaskPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      case 'manage_tags':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={tagAction} onValueChange={(v) => setTagAction(v as 'add' | 'remove')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add Tags</SelectItem>
                  <SelectItem value="remove">Remove Tags</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="hot-lead, contacted, follow-up"
              />
            </div>
          </div>
        )

      case 'notify':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notify-message">Notification Message</Label>
              <Textarea
                id="notify-message"
                value={notifyMessage}
                onChange={(e) => setNotifyMessage(e.target.value)}
                placeholder="Contact reached step in campaign..."
                rows={3}
              />
            </div>
          </div>
        )

      default:
        return (
          <p className="text-sm text-muted-foreground py-4">
            Configuration for this step type coming soon.
          </p>
        )
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
          <h1 className="text-2xl font-bold">Add Campaign Step</h1>
          <p className="text-muted-foreground">
            Choose a step type and configure it
          </p>
        </div>
      </div>

      {/* Step Type Selection */}
      {!selectedType ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stepTypes.map((type) => {
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
                  const type = stepTypes.find(t => t.value === selectedType)
                  const Icon = type?.icon || Mail
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
            {/* Delay Settings */}
            <div className="space-y-4 pb-4 border-b">
              <h3 className="font-medium">Timing</h3>
              <div className="flex items-end gap-3">
                <div className="space-y-2">
                  <Label htmlFor="delay-value">Wait</Label>
                  <Input
                    id="delay-value"
                    type="number"
                    min={0}
                    value={delayValue}
                    onChange={(e) => setDelayValue(parseInt(e.target.value) || 0)}
                    className="w-24"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delay-unit">Unit</Label>
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
                <p className="text-sm text-muted-foreground pb-2">
                  after previous step
                </p>
              </div>
            </div>

            {/* Step-specific Config */}
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
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Step'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
