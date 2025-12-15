import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Plus,
  Search,
  Play,
  Pause,
  Settings,
  MoreHorizontal,
  Zap,
  Clock,
  CheckCircle,
  Activity
} from 'lucide-react'
import Link from 'next/link'

// Mock data - in a real app this would come from your database
const workflows = [
  {
    id: '1',
    name: 'New Lead Follow-up',
    description: 'Automatically follow up with new leads after 24 hours',
    status: 'active' as const,
    trigger: { type: 'contact_created' },
    execution_count: 42,
    last_executed_at: '2024-01-15T10:30:00Z',
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Stage Change Notification',
    description: 'Notify team when deal moves to proposal stage',
    status: 'active' as const,
    trigger: { type: 'stage_changed' },
    execution_count: 18,
    last_executed_at: '2024-01-14T15:20:00Z',
    created_at: '2024-01-05T00:00:00Z'
  },
  {
    id: '3',
    name: 'Weekly Report',
    description: 'Send weekly performance report to management',
    status: 'paused' as const,
    trigger: { type: 'scheduled' },
    execution_count: 8,
    last_executed_at: '2024-01-08T09:00:00Z',
    created_at: '2023-12-15T00:00:00Z'
  }
]

const templates = [
  {
    id: 'new-lead-nurture',
    name: 'New Lead Nurturing Sequence',
    description: 'A 7-day email sequence for new leads with follow-up tasks',
    category: 'lead_nurturing',
    usage_count: 156
  },
  {
    id: 'project-completion',
    name: 'Project Completion Survey',
    description: 'Automatically send satisfaction survey when project is completed',
    category: 'customer_onboarding',
    usage_count: 89
  },
  {
    id: 'invoice-reminder',
    name: 'Invoice Payment Reminders',
    description: 'Automated reminder sequence for overdue invoices',
    category: 'notifications',
    usage_count: 203
  }
]

const recentExecutions = [
  {
    id: '1',
    workflow_name: 'New Lead Follow-up',
    status: 'completed' as const,
    started_at: '2024-01-15T10:30:00Z',
    completed_at: '2024-01-15T10:32:00Z',
    trigger_data: { contact_name: 'John Smith' }
  },
  {
    id: '2',
    workflow_name: 'Stage Change Notification',
    status: 'completed' as const,
    started_at: '2024-01-15T09:15:00Z',
    completed_at: '2024-01-15T09:16:00Z',
    trigger_data: { contact_name: 'Sarah Johnson' }
  },
  {
    id: '3',
    workflow_name: 'New Lead Follow-up',
    status: 'failed' as const,
    started_at: '2024-01-15T08:45:00Z',
    completed_at: '2024-01-15T08:46:00Z',
    error_message: 'Email delivery failed'
  }
]

export default async function AutomationsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Workflow Automation</h1>
            <p className="text-muted-foreground mt-2">
              Automate your business processes with custom workflows
            </p>
          </div>
          <Link href="/automations/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Workflow
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {workflows.filter(w => w.status === 'active').length}
              </div>
              <p className="text-xs text-muted-foreground">
                {workflows.filter(w => w.status === 'paused').length} paused
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {workflows.reduce((sum, w) => sum + w.execution_count, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">95.2%</div>
              <p className="text-xs text-muted-foreground">
                Last 30 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24.5h</div>
              <p className="text-xs text-muted-foreground">
                This week
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="workflows" className="space-y-6">
          <TabsList>
            <TabsTrigger value="workflows">My Workflows</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="executions">Recent Executions</TabsTrigger>
          </TabsList>

          <TabsContent value="workflows" className="space-y-4">
            {/* Search and Filters */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search workflows..." className="pl-8" />
              </div>
            </div>

            {/* Workflows List */}
            <div className="grid gap-4">
              {workflows.map((workflow) => (
                <Card key={workflow.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">
                            <Link
                              href={`/automations/${workflow.id}`}
                              className="hover:underline"
                            >
                              {workflow.name}
                            </Link>
                          </h3>
                          <Badge variant={workflow.status === 'active' ? 'default' : 'secondary'}>
                            {workflow.status}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm mb-3">
                          {workflow.description}
                        </p>
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Activity className="h-4 w-4" />
                            {workflow.execution_count} executions
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Last run: {new Date(workflow.last_executed_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          {workflow.status === 'active' ? (
                            <>
                              <Pause className="h-4 w-4" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4" />
                              Resume
                            </>
                          )}
                        </Button>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm mb-4">
                      {template.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{template.category.replace('_', ' ')}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {template.usage_count} uses
                      </span>
                    </div>
                    <Button className="w-full mt-4" variant="outline">
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="executions" className="space-y-4">
            <div className="space-y-3">
              {recentExecutions.map((execution) => (
                <Card key={execution.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          execution.status === 'completed' ? 'bg-green-500' :
                          execution.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                        }`} />
                        <div>
                          <div className="font-medium">{execution.workflow_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {execution.trigger_data?.contact_name || 'System trigger'}
                            {execution.status === 'failed' && execution.error_message && (
                              <span className="text-red-600 ml-2">• {execution.error_message}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div>{new Date(execution.started_at).toLocaleDateString()}</div>
                        <div>{new Date(execution.started_at).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}