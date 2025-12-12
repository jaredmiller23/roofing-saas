'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Zap,
  Plus,
  Play,
  Pause,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  Trophy,
  Mail,
  MessageSquare,
  ClipboardList,
  Bell
} from 'lucide-react'

interface Workflow {
  id: string
  name: string
  description?: string
  trigger_type: string
  trigger_config: Record<string, unknown>
  is_active: boolean
  created_at: string
}

interface WorkflowExecution {
  id: string
  workflow_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  started_at?: string
  completed_at?: string
  error_message?: string
}

// Pre-built workflow templates
const WORKFLOW_TEMPLATES = [
  {
    id: 'won-notification',
    name: 'Project Won Notification',
    description: 'Send email notification when a project is marked as Won',
    trigger_type: 'project_won',
    icon: Trophy,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    steps: [
      {
        step_order: 1,
        step_type: 'send_email',
        step_config: {
          to: '{{trigger.changed_by.email}}',
          subject: 'Deal Won: {{trigger.project_name}}',
          html: '<h2>Congratulations!</h2><p>Project <strong>{{trigger.project_name}}</strong> has been won with a value of ${{trigger.approved_value}}.</p>'
        },
        delay_minutes: 0
      }
    ]
  },
  {
    id: 'won-task',
    name: 'Create Production Task on Win',
    description: 'Automatically create a task to schedule production when project is won',
    trigger_type: 'project_won',
    icon: ClipboardList,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    steps: [
      {
        step_order: 1,
        step_type: 'create_task',
        step_config: {
          title: 'Schedule Production: {{trigger.project_name}}',
          description: 'Project won! Schedule production crew and materials.\n\nApproved Value: ${{trigger.approved_value}}',
          priority: 'high',
          due_date_days: 3
        },
        delay_minutes: 0
      }
    ]
  },
  {
    id: 'job-complete-survey',
    name: 'Post-Job Survey',
    description: 'Send customer satisfaction survey when job is completed',
    trigger_type: 'job_completed',
    icon: Mail,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    steps: [
      {
        step_order: 1,
        step_type: 'wait',
        step_config: { delay_minutes: 1440 }, // Wait 24 hours
        delay_minutes: 1440
      },
      {
        step_order: 2,
        step_type: 'send_email',
        step_config: {
          to: '{{trigger.contact.email}}',
          subject: 'How did we do? - Your Recent Roofing Project',
          html: '<h2>Thank you for choosing us!</h2><p>Your job #{{trigger.job_number}} has been completed. We would love to hear about your experience.</p><p><a href="{{survey_link}}">Click here to leave a review</a></p>'
        },
        delay_minutes: 0
      }
    ]
  },
  {
    id: 'job-complete-followup',
    name: 'Job Completion Follow-up Task',
    description: 'Create follow-up task to check on customer after job completion',
    trigger_type: 'job_completed',
    icon: Bell,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    steps: [
      {
        step_order: 1,
        step_type: 'create_task',
        step_config: {
          title: 'Follow-up: Job #{{trigger.job_number}}',
          description: 'Job completed. Follow up with customer to ensure satisfaction and ask for referrals.',
          priority: 'medium',
          due_date_days: 7
        },
        delay_minutes: 0
      }
    ]
  },
  {
    id: 'stage-change-sms',
    name: 'Stage Change SMS Alert',
    description: 'Send SMS when project moves to a new pipeline stage',
    trigger_type: 'pipeline_stage_changed',
    icon: MessageSquare,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    steps: [
      {
        step_order: 1,
        step_type: 'send_sms',
        step_config: {
          to: '{{trigger.changed_by.phone}}',
          body: 'Pipeline Update: {{trigger.project_name}} moved from {{trigger.previous_stage}} to {{trigger.new_stage}}'
        },
        delay_minutes: 0
      }
    ]
  }
]

export function AutomationSettings() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [_recentExecutions, _setRecentExecutions] = useState<WorkflowExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState<string | null>(null)

  const fetchWorkflows = useCallback(async () => {
    try {
      const response = await fetch('/api/workflows')
      if (response.ok) {
        const result = await response.json()
        // API returns { success, data: { workflows, ... }, pagination }
        const workflows = result.data?.workflows || result.workflows || []
        setWorkflows(workflows)
      }
    } catch (error) {
      console.error('Failed to fetch workflows:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWorkflows()
  }, [fetchWorkflows])

  const toggleWorkflow = async (workflowId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive })
      })
      if (response.ok) {
        setWorkflows(prev => prev.map(w =>
          w.id === workflowId ? { ...w, is_active: isActive } : w
        ))
      }
    } catch (error) {
      console.error('Failed to toggle workflow:', error)
    }
  }

  const createFromTemplate = async (template: typeof WORKFLOW_TEMPLATES[0]) => {
    setCreating(template.id)
    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          trigger_type: template.trigger_type,
          trigger_config: {},
          is_active: true,
          steps: template.steps
        })
      })
      if (response.ok) {
        await fetchWorkflows()
      }
    } catch (error) {
      console.error('Failed to create workflow:', error)
    } finally {
      setCreating(null)
    }
  }

  const deleteWorkflow = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return

    try {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setWorkflows(prev => prev.filter(w => w.id !== workflowId))
      }
    } catch (error) {
      console.error('Failed to delete workflow:', error)
    }
  }

  const getTriggerLabel = (triggerType: string) => {
    const labels: Record<string, string> = {
      'project_won': 'Project Won',
      'job_completed': 'Job Completed',
      'pipeline_stage_changed': 'Stage Changed',
      'contact_created': 'Contact Created',
      'contact_updated': 'Contact Updated'
    }
    return labels[triggerType] || triggerType
  }

  const _getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'running': return <Clock className="h-4 w-4 text-blue-500 animate-spin" />
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />
      default: return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  // Check which templates are already created
  const isTemplateCreated = (templateTrigger: string, templateName: string) => {
    return workflows.some(w =>
      w.trigger_type === templateTrigger && w.name === templateName
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            <CardTitle>Workflow Automations</CardTitle>
          </div>
          <CardDescription>
            Automate repetitive tasks when projects move through the pipeline or jobs are completed
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Quick Start Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Start Templates</CardTitle>
          <CardDescription>
            One-click setup for common automations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {WORKFLOW_TEMPLATES.map(template => {
              const Icon = template.icon
              const isCreated = isTemplateCreated(template.trigger_type, template.name)

              return (
                <div
                  key={template.id}
                  className={`p-4 rounded-lg border ${template.bgColor} border-gray-200`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-white ${template.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground text-sm">{template.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                      <Badge variant="outline" className="mt-2 text-xs">
                        {getTriggerLabel(template.trigger_type)}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full mt-3"
                    variant={isCreated ? 'outline' : 'default'}
                    disabled={isCreated || creating === template.id}
                    onClick={() => createFromTemplate(template)}
                  >
                    {creating === template.id ? (
                      'Creating...'
                    ) : isCreated ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Already Added
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Automation
                      </>
                    )}
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Active Workflows */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Your Automations</CardTitle>
              <CardDescription>
                {workflows.length} workflow{workflows.length !== 1 ? 's' : ''} configured
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading workflows...</div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No automations yet</p>
              <p className="text-sm mt-1">Use the templates above to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {workflows.map(workflow => (
                <div
                  key={workflow.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <Switch
                      checked={workflow.is_active}
                      onCheckedChange={(checked: boolean) => toggleWorkflow(workflow.id, checked)}
                    />
                    <div>
                      <h4 className="font-medium text-foreground">{workflow.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {getTriggerLabel(workflow.trigger_type)}
                        </Badge>
                        {workflow.is_active ? (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <Play className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Pause className="h-3 w-3" /> Paused
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => deleteWorkflow(workflow.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How Automations Work</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h4 className="font-medium">Trigger Event</h4>
              <p className="text-sm text-muted-foreground mt-1">
                When a project is won, job is completed, or stage changes
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <h4 className="font-medium">Workflow Runs</h4>
              <p className="text-sm text-muted-foreground mt-1">
                System automatically executes configured actions
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">3</span>
              </div>
              <h4 className="font-medium">Action Complete</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Emails sent, tasks created, or SMS delivered
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
