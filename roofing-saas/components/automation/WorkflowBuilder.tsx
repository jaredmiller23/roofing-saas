'use client'

import React, { useState, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Save,
  Play,
  Pause,
  Trash2,
  Plus,
  Settings,
  Zap,
  Mail,
  MessageSquare,
  CheckSquare,
  UserPlus,
  Tag as TagIcon,
  Globe,
  Clock,
  GitBranch
} from 'lucide-react'
import type {
  Workflow,
  WorkflowAction,
  WorkflowTrigger,
  WorkflowCondition,
  TriggerType,
  ActionType
} from '@/lib/automation/workflow-types'
import { TriggerNode } from './TriggerNode'
import { ActionNode } from './ActionNode'
import { ConditionNode } from './ConditionNode'
import { WorkflowCanvas } from './WorkflowCanvas'

interface WorkflowBuilderProps {
  workflow?: Workflow
  onSave: (workflow: Partial<Workflow>) => Promise<void>
  onTest?: (workflow: Workflow) => Promise<void>
}

const TRIGGER_TYPES: Array<{
  type: TriggerType
  name: string
  description: string
  icon: React.ReactNode
  category: string
}> = [
  {
    type: 'contact_created',
    name: 'Contact Created',
    description: 'When a new contact is added',
    icon: <UserPlus className="h-4 w-4" />,
    category: 'Contact'
  },
  {
    type: 'stage_changed',
    name: 'Stage Changed',
    description: 'When contact stage changes',
    icon: <GitBranch className="h-4 w-4" />,
    category: 'Contact'
  },
  {
    type: 'field_changed',
    name: 'Field Changed',
    description: 'When a field value changes',
    icon: <Settings className="h-4 w-4" />,
    category: 'Contact'
  },
  {
    type: 'time_elapsed',
    name: 'Time Elapsed',
    description: 'After a specific time period',
    icon: <Clock className="h-4 w-4" />,
    category: 'Time'
  },
  {
    type: 'scheduled',
    name: 'Scheduled',
    description: 'Run on a schedule',
    icon: <Clock className="h-4 w-4" />,
    category: 'Time'
  },
  {
    type: 'form_submitted',
    name: 'Form Submitted',
    description: 'When a form is submitted',
    icon: <CheckSquare className="h-4 w-4" />,
    category: 'Form'
  }
]

const ACTION_TYPES: Array<{
  type: ActionType
  name: string
  description: string
  icon: React.ReactNode
  category: string
}> = [
  {
    type: 'send_email',
    name: 'Send Email',
    description: 'Send an email message',
    icon: <Mail className="h-4 w-4" />,
    category: 'Communication'
  },
  {
    type: 'send_sms',
    name: 'Send SMS',
    description: 'Send an SMS message',
    icon: <MessageSquare className="h-4 w-4" />,
    category: 'Communication'
  },
  {
    type: 'create_task',
    name: 'Create Task',
    description: 'Create a new task',
    icon: <CheckSquare className="h-4 w-4" />,
    category: 'Task'
  },
  {
    type: 'update_field',
    name: 'Update Field',
    description: 'Update a contact field',
    icon: <Settings className="h-4 w-4" />,
    category: 'Data'
  },
  {
    type: 'change_stage',
    name: 'Change Stage',
    description: 'Change contact stage',
    icon: <GitBranch className="h-4 w-4" />,
    category: 'Data'
  },
  {
    type: 'assign_user',
    name: 'Assign User',
    description: 'Assign contact to user',
    icon: <UserPlus className="h-4 w-4" />,
    category: 'Data'
  },
  {
    type: 'add_tag',
    name: 'Add Tag',
    description: 'Add tags to contact',
    icon: <TagIcon className="h-4 w-4" />,
    category: 'Data'
  },
  {
    type: 'webhook',
    name: 'Webhook',
    description: 'Call external webhook',
    icon: <Globe className="h-4 w-4" />,
    category: 'Integration'
  },
  {
    type: 'wait',
    name: 'Wait',
    description: 'Wait for a period',
    icon: <Clock className="h-4 w-4" />,
    category: 'Flow'
  }
]

export function WorkflowBuilder({ workflow, onSave, onTest }: WorkflowBuilderProps) {
  const [name, setName] = useState(workflow?.name || '')
  const [description, setDescription] = useState(workflow?.description || '')
  const [trigger, setTrigger] = useState<WorkflowTrigger | null>(workflow?.trigger || null)
  const [actions, setActions] = useState<WorkflowAction[]>(workflow?.actions || [])
  const [conditions, setConditions] = useState<WorkflowCondition[]>(workflow?.conditions || [])
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [showTriggerPanel, setShowTriggerPanel] = useState(!trigger)
  const [showActionPanel, setShowActionPanel] = useState(false)
  const [editingAction, setEditingAction] = useState<WorkflowAction | null>(null)

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(actions)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Update order values
    const updatedActions = items.map((action, index) => ({
      ...action,
      order: index
    }))

    setActions(updatedActions)
  }, [actions])

  const handleSave = async () => {
    if (!name.trim() || !trigger) {
      alert('Please provide a workflow name and trigger')
      return
    }

    setIsSaving(true)
    try {
      const workflowData: Partial<Workflow> = {
        name: name.trim(),
        description: description.trim() || undefined,
        trigger,
        actions,
        conditions: conditions.length > 0 ? conditions : undefined,
        status: 'draft'
      }

      if (workflow?.id) {
        workflowData.id = workflow.id
      }

      await onSave(workflowData)
    } catch (error) {
      console.error('Failed to save workflow:', error)
      alert('Failed to save workflow')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async () => {
    if (!workflow?.id || !trigger) {
      alert('Please save the workflow first')
      return
    }

    setIsTesting(true)
    try {
      const testWorkflow: Workflow = {
        ...workflow,
        name,
        description,
        trigger,
        actions,
        conditions
      }

      await onTest?.(testWorkflow)
    } catch (error) {
      console.error('Failed to test workflow:', error)
      alert('Failed to test workflow')
    } finally {
      setIsTesting(false)
    }
  }

  const handleTriggerSelect = (triggerType: TriggerType) => {
    const newTrigger: WorkflowTrigger = {
      id: `trigger_${Date.now()}`,
      type: triggerType,
      config: { type: triggerType } as any,
      enabled: true
    }
    setTrigger(newTrigger)
    setShowTriggerPanel(false)
  }

  const handleAddAction = (actionType: ActionType) => {
    const newAction: WorkflowAction = {
      id: `action_${Date.now()}`,
      type: actionType,
      config: { type: actionType } as any,
      enabled: true,
      order: actions.length
    }
    setActions([...actions, newAction])
    setEditingAction(newAction)
    setShowActionPanel(false)
  }

  const handleUpdateAction = (updatedAction: WorkflowAction) => {
    setActions(prev => prev.map(action =>
      action.id === updatedAction.id ? updatedAction : action
    ))
    setEditingAction(null)
  }

  const handleDeleteAction = (actionId: string) => {
    setActions(prev => {
      const filtered = prev.filter(action => action.id !== actionId)
      return filtered.map((action, index) => ({ ...action, order: index }))
    })
  }

  const handleToggleAction = (actionId: string) => {
    setActions(prev => prev.map(action =>
      action.id === actionId ? { ...action, enabled: !action.enabled } : action
    ))
  }

  return (
    <div className="h-full bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Input
              placeholder="Workflow name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-lg font-semibold border-none bg-transparent p-0 focus-visible:ring-0"
            />
            <Textarea
              placeholder="Describe what this workflow does..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none border-none bg-transparent p-0 text-sm text-muted-foreground focus-visible:ring-0"
              rows={1}
            />
          </div>
          <div className="flex items-center gap-2">
            {onTest && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={isTesting || !workflow?.id}
              >
                <Play className="h-4 w-4 mr-2" />
                {isTesting ? 'Testing...' : 'Test'}
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={isSaving || !name.trim() || !trigger}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100%-80px)]">
        {/* Sidebar */}
        <div className="w-80 border-r bg-card flex flex-col">
          {/* Trigger Section */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Trigger
              </h3>
              {trigger && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTriggerPanel(!showTriggerPanel)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>

            {trigger ? (
              <div className="space-y-2">
                <TriggerNode
                  trigger={trigger}
                  onChange={setTrigger}
                  onDelete={() => setTrigger(null)}
                  isExpanded={showTriggerPanel}
                />
              </div>
            ) : (
              <div className="space-y-2">
                {TRIGGER_TYPES.map((triggerType) => (
                  <Card
                    key={triggerType.type}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleTriggerSelect(triggerType.type)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        {triggerType.icon}
                        <div>
                          <div className="font-medium text-sm">{triggerType.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {triggerType.description}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Actions Section */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Actions</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowActionPanel(!showActionPanel)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {showActionPanel && (
              <div className="mb-4 space-y-2">
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  Add Action
                </div>
                {ACTION_TYPES.map((actionType) => (
                  <Card
                    key={actionType.type}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleAddAction(actionType.type)}
                  >
                    <CardContent className="p-2">
                      <div className="flex items-center gap-2">
                        {actionType.icon}
                        <div>
                          <div className="font-medium text-xs">{actionType.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {actionType.description}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowActionPanel(false)}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            )}

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="actions">
                {(provided: any) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    {actions.map((action, index) => (
                      <Draggable key={action.id} draggableId={action.id} index={index}>
                        {(provided: any) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <ActionNode
                              action={action}
                              isEditing={editingAction?.id === action.id}
                              onChange={handleUpdateAction}
                              onEdit={setEditingAction}
                              onDelete={handleDeleteAction}
                              onToggle={handleToggleAction}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 bg-muted/20">
          <WorkflowCanvas
            trigger={trigger}
            actions={actions}
            conditions={conditions}
            onTriggerClick={() => setShowTriggerPanel(true)}
            onActionClick={setEditingAction}
          />
        </div>
      </div>
    </div>
  )
}