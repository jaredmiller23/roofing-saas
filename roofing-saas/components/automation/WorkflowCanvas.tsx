'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Zap,
  Mail,
  MessageSquare,
  CheckSquare,
  Settings,
  GitBranch,
  UserPlus,
  Tag as TagIcon,
  Globe,
  Clock,
  ArrowDown,
  Plus,
  Play
} from 'lucide-react'
import type {
  WorkflowTrigger,
  WorkflowAction,
  WorkflowCondition
} from '@/lib/automation/workflow-types'

interface WorkflowCanvasProps {
  trigger: WorkflowTrigger | null
  actions: WorkflowAction[]
  conditions: WorkflowCondition[]
  onTriggerClick?: () => void
  onActionClick?: (action: WorkflowAction) => void
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  send_email: <Mail className="h-5 w-5" />,
  send_sms: <MessageSquare className="h-5 w-5" />,
  create_task: <CheckSquare className="h-5 w-5" />,
  update_field: <Settings className="h-5 w-5" />,
  change_stage: <GitBranch className="h-5 w-5" />,
  assign_user: <UserPlus className="h-5 w-5" />,
  add_tag: <TagIcon className="h-5 w-5" />,
  remove_tag: <TagIcon className="h-5 w-5" />,
  webhook: <Globe className="h-5 w-5" />,
  wait: <Clock className="h-5 w-5" />
}

export function WorkflowCanvas({
  trigger,
  actions,
  conditions,
  onTriggerClick,
  onActionClick
}: WorkflowCanvasProps) {
  const sortedActions = [...actions].sort((a, b) => a.order - b.order)

  const getTriggerLabel = () => {
    if (!trigger) return 'No Trigger'

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
      default:
        return 'Unknown Trigger'
    }
  }

  const getActionLabel = (action: WorkflowAction) => {
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

  const getActionSummary = (action: WorkflowAction) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = action.config as any
    switch (action.type) {
      case 'send_email':
        return config.subject || 'No subject'
      case 'send_sms':
        return config.message?.substring(0, 30) + '...' || 'No message'
      case 'create_task':
        return config.title || 'No title'
      case 'update_field':
        return `${config.field} = ${config.value}`
      case 'change_stage':
        return `Stage → ${config.stage}`
      case 'wait':
        return `Wait ${config.duration} hours`
      default:
        return ''
    }
  }

  if (!trigger && actions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
            <Zap className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-medium">Start Building Your Workflow</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Add a trigger to get started. Triggers define when your workflow should run automatically.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-2xl mx-auto p-8 space-y-6">
        {/* Trigger Node */}
        {trigger ? (
          <div className="relative">
            <Card
              className={`border-2 border-primary cursor-pointer hover:shadow-md transition-shadow ${
                trigger.enabled ? 'bg-primary/10' : 'bg-muted'
              }`}
              onClick={onTriggerClick}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/100 rounded-full flex items-center justify-center">
                    <Zap className="h-6 w-6 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{getTriggerLabel()}</h3>
                      <Badge variant={trigger.enabled ? 'default' : 'secondary'}>
                        {trigger.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Workflow starts when this condition is met
                    </p>
                  </div>
                  <Play className="h-5 w-5 text-primary" />
                </div>
              </CardContent>
            </Card>

            {sortedActions.length > 0 && (
              <div className="flex justify-center mt-4">
                <ArrowDown className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>
        ) : (
          <div className="relative">
            <Card
              className="border-2 border-dashed border-muted-foreground cursor-pointer hover:border-primary transition-colors"
              onClick={onTriggerClick}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                    <Plus className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-muted-foreground">Add Trigger</h3>
                    <p className="text-sm text-muted-foreground">
                      Choose when this workflow should run
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Conditions */}
        {conditions.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <ArrowDown className="h-6 w-6 text-muted-foreground" />
            </div>
            {conditions.map((condition, index) => (
              <div key={condition.id} className="relative">
                <Card className="border-2 border-amber-500 bg-amber-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <GitBranch className="h-5 w-5 text-amber-600" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">Condition {index + 1}</span>
                          <Badge variant="outline">{condition.logic_gate}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {condition.field} {condition.operator} {String(condition.value ?? '')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {index < conditions.length - 1 && (
                  <div className="flex justify-center mt-4">
                    <ArrowDown className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {sortedActions.length > 0 && (
          <div className="space-y-4">
            {(trigger || conditions.length > 0) && (
              <div className="flex justify-center">
                <ArrowDown className="h-6 w-6 text-muted-foreground" />
              </div>
            )}

            {sortedActions.map((action, index) => (
              <div key={action.id} className="relative">
                <Card
                  className={`border-2 cursor-pointer hover:shadow-md transition-shadow ${
                    action.enabled
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-400 bg-muted'
                  }`}
                  onClick={() => onActionClick?.(action)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        action.enabled ? 'bg-green-500' : 'bg-gray-400'
                      }`}>
                        {ACTION_ICONS[action.type] || <Settings className="h-6 w-6 text-foreground" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{getActionLabel(action)}</h3>
                          <Badge variant={action.enabled ? 'default' : 'secondary'}>
                            {action.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                          {action.delay && action.delay > 0 && (
                            <Badge variant="outline" className="text-xs">
                              +{action.delay}h
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {getActionSummary(action) || 'Click to configure'}
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground font-medium">
                        #{action.order + 1}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {index < sortedActions.length - 1 && (
                  <div className="flex justify-center mt-4">
                    <ArrowDown className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State for Actions */}
        {sortedActions.length === 0 && trigger && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <ArrowDown className="h-6 w-6 text-muted-foreground" />
            </div>
            <Card className="border-2 border-dashed border-muted-foreground">
              <CardContent className="p-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 mx-auto bg-muted rounded-full flex items-center justify-center">
                    <Plus className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-muted-foreground">Add Actions</h3>
                  <p className="text-sm text-muted-foreground">
                    Add actions to define what happens when the trigger fires
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Completion */}
        {sortedActions.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <ArrowDown className="h-6 w-6 text-muted-foreground" />
            </div>
            <Card className="border-2 border-border bg-muted">
              <CardContent className="p-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 mx-auto bg-muted0 rounded-full flex items-center justify-center">
                    <CheckSquare className="h-6 w-6 text-foreground" />
                  </div>
                  <h3 className="font-semibold">Workflow Complete</h3>
                  <p className="text-sm text-muted-foreground">
                    All actions have been executed
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}