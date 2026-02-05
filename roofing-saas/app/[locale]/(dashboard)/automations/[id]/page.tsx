'use client'

import { useState, useEffect } from 'react'
import { useRouter, Link } from '@/lib/i18n/navigation'
import { useParams } from 'next/navigation'
import { WorkflowBuilder } from '@/components/automation/WorkflowBuilder'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Play, Pause, Trash2, Copy, Activity, Clock } from 'lucide-react'
import { apiFetch } from '@/lib/api/client'
import type { Workflow, WorkflowExecution } from '@/lib/automation/workflow-types'

export default function WorkflowDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const workflowId = params.id as string

  const [workflow, setWorkflow] = useState<Workflow | null>(null)
  const [executions, setExecutions] = useState<WorkflowExecution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('builder')

  useEffect(() => {
    loadWorkflow()
    loadExecutions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId])

  const loadWorkflow = async () => {
    try {
      const data = await apiFetch<Workflow>(`/api/automations/${workflowId}`)
      setWorkflow(data)
    } catch (error) {
      console.error('Error loading workflow:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadExecutions = async () => {
    try {
      const data = await apiFetch<{ executions: WorkflowExecution[] }>(`/api/automations/${workflowId}/executions`)
      setExecutions(data.executions || [])
    } catch (error) {
      console.error('Error loading executions:', error)
    }
  }

  const handleSave = async (workflowData: Partial<Workflow>) => {
    try {
      const updatedWorkflow = await apiFetch<Workflow>(`/api/automations/${workflowId}`, {
        method: 'PATCH',
        body: workflowData
      })

      setWorkflow(updatedWorkflow)
    } catch (error) {
      console.error('Error updating workflow:', error)
      throw error
    }
  }

  const handleTest = async (testWorkflow: Workflow) => {
    try {
      const result = await apiFetch<{ status: string }>(`/api/automations/${workflowId}/test`, {
        method: 'POST',
        body: {
          workflow: testWorkflow,
          test_data: {
            contact: {
              id: 'test_contact',
              first_name: 'Test',
              last_name: 'User',
              email: 'test@example.com',
              stage: 'new'
            }
          }
        }
      })

      alert(`Test completed: ${result.status}`)
      loadExecutions() // Refresh executions
    } catch (error) {
      console.error('Error testing workflow:', error)
      throw error
    }
  }

  const handleStatusToggle = async () => {
    if (!workflow) return

    try {
      const newStatus = workflow.status === 'active' ? 'paused' : 'active'
      const updatedWorkflow = await apiFetch<Workflow>(`/api/automations/${workflowId}`, {
        method: 'PATCH',
        body: { status: newStatus }
      })

      setWorkflow(updatedWorkflow)
    } catch (error) {
      console.error('Error updating workflow status:', error)
    }
  }

  const handleDuplicate = async () => {
    if (!workflow) return

    try {
      const newWorkflow = await apiFetch<Workflow>('/api/automations', {
        method: 'POST',
        body: {
          ...workflow,
          name: `${workflow.name} (Copy)`,
          status: 'draft'
        }
      })

      router.push(`/automations/${newWorkflow.id}`)
    } catch (error) {
      console.error('Error duplicating workflow:', error)
    }
  }

  const handleDelete = async () => {
    if (!workflow || !confirm('Are you sure you want to delete this workflow?')) return

    try {
      await apiFetch(`/api/automations/${workflowId}`, {
        method: 'DELETE'
      })

      router.push('/automations')
    } catch (error) {
      console.error('Error deleting workflow:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading workflow...</p>
        </div>
      </div>
    )
  }

  if (!workflow) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold mb-2">Workflow not found</p>
          <Link href="/automations">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Workflows
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/automations">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold">{workflow.name}</h1>
                <Badge variant={workflow.status === 'active' ? 'default' : 'secondary'}>
                  {workflow.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{workflow.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleStatusToggle}
            >
              {workflow.status === 'active' ? (
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
            <Button variant="outline" size="sm" onClick={handleDuplicate}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>
            <Button variant="outline" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 py-4 border-b">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="builder">Workflow Builder</TabsTrigger>
            <TabsTrigger value="executions">Execution History</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="h-[calc(100vh-140px)]">
        {activeTab === 'builder' && (
          <WorkflowBuilder
            workflow={workflow}
            onSave={handleSave}
            onTest={handleTest}
          />
        )}

        {activeTab === 'executions' && (
          <div className="p-6">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Recent Executions</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  {executions.length} total executions
                </div>
              </div>

              <div className="space-y-3">
                {executions.map((execution) => (
                  <Card key={execution.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            execution.status === 'completed' ? 'bg-green-500' :
                            execution.status === 'failed' ? 'bg-red-500' :
                            execution.status === 'running' ? 'bg-blue-500' : 'bg-yellow-500'
                          }`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium capitalize">{execution.status}</span>
                              <Badge variant="outline" className="text-xs">
                                {execution.executed_actions.length} actions
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Started: {new Date(execution.started_at).toLocaleString()}
                              {execution.completed_at && (
                                <span className="ml-2">
                                  • Duration: {Math.round(
                                    (new Date(execution.completed_at).getTime() -
                                     new Date(execution.started_at).getTime()) / 1000
                                  )}s
                                </span>
                              )}
                            </div>
                            {execution.error_message && (
                              <div className="text-sm text-red-600 mt-1">
                                Error: {execution.error_message}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <div>ID: {execution.id}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {executions.length === 0 && (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No executions yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        This workflow hasn&apos;t been triggered yet
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-lg font-semibold mb-6">Workflow Analytics</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{workflow.execution_count}</div>
                    <p className="text-xs text-muted-foreground">Since creation</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {executions.length > 0
                        ? Math.round((executions.filter(e => e.status === 'completed').length / executions.length) * 100)
                        : 0}%
                    </div>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {executions.filter(e => e.completed_at).length > 0
                        ? Math.round(
                            executions
                              .filter(e => e.completed_at)
                              .reduce((sum, e) => {
                                const duration = new Date(e.completed_at!).getTime() - new Date(e.started_at).getTime()
                                return sum + duration
                              }, 0) /
                            executions.filter(e => e.completed_at).length / 1000
                          )
                        : 0}s
                    </div>
                    <p className="text-xs text-muted-foreground">Per execution</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Execution Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Analytics charts would be implemented here in a real application
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}