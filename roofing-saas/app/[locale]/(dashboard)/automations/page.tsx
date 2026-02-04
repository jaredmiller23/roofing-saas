'use client'

import { useEffect, useState } from 'react'
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
  Activity,
  AlertCircle
} from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { apiFetch } from '@/lib/api/client'

interface Campaign {
  id: string
  name: string
  description: string | null
  status: 'draft' | 'active' | 'paused' | 'archived'
  trigger_type: string
  trigger_config: Record<string, unknown>
  created_at: string
  updated_at: string
  total_enrollments: number
  total_completed: number
  total_active: number
}

interface CampaignExecution {
  id: string
  enrollment_id: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  campaign_name: string
  contact_name: string | null
  step_type: string
}

interface CampaignStats {
  total_campaigns: number
  active_campaigns: number
  paused_campaigns: number
  total_enrollments: number
  total_executions: number
  completed_executions: number
  failed_executions: number
}

// Campaign templates for quick setup
const templates = [
  {
    id: 'new-lead-nurture',
    name: 'New Lead Nurturing Sequence',
    description: 'A 7-day email sequence for new leads with follow-up tasks',
    category: 'lead_nurturing',
    trigger_type: 'stage_change',
    trigger_config: { to_stage: 'prospect', entity_type: 'project' }
  },
  {
    id: 'project-won',
    name: 'Project Won Follow-up',
    description: 'Automatically send thank you and request review when project is won',
    category: 'customer_success',
    trigger_type: 'stage_change',
    trigger_config: { to_stage: 'won', entity_type: 'project' }
  },
  {
    id: 'qualified-lead',
    name: 'Qualified Lead Notification',
    description: 'Alert sales team when a lead becomes qualified',
    category: 'notifications',
    trigger_type: 'stage_change',
    trigger_config: { to_stage: 'qualified', entity_type: 'project' }
  }
]

export default function AutomationsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [executions, setExecutions] = useState<CampaignExecution[]>([])
  const [stats, setStats] = useState<CampaignStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      setError(null)

      // Fetch campaigns
      const campaigns = await apiFetch<Campaign[]>('/api/campaigns')
      setCampaigns(campaigns)

      // Fetch recent executions
      try {
        const executions = await apiFetch<CampaignExecution[]>('/api/campaigns/executions?limit=20')
        setExecutions(executions)
      } catch {
        // Non-critical - continue without executions
      }

      // Fetch stats
      try {
        const stats = await apiFetch<CampaignStats>('/api/campaigns/stats')
        setStats(stats)
      } catch {
        // Non-critical - continue without stats
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function toggleCampaignStatus(campaignId: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    try {
      await apiFetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        body: { status: newStatus },
      })
      loadData() // Refresh data
    } catch (err) {
      console.error('Error toggling campaign status:', err)
    }
  }

  const filteredCampaigns = campaigns.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const activeCampaigns = campaigns.filter(c => c.status === 'active').length
  const pausedCampaigns = campaigns.filter(c => c.status === 'paused').length
  const totalExecutions = stats?.total_executions || 0
  const successRate = stats && stats.total_executions > 0
    ? ((stats.completed_executions / stats.total_executions) * 100).toFixed(1)
    : '0'

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Campaign Automation</h1>
            <p className="text-muted-foreground mt-2">
              Automate follow-ups, notifications, and tasks based on stage changes
            </p>
          </div>
          <Link href="/campaigns/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </Link>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-4 mb-6 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeCampaigns}</div>
              <p className="text-xs text-muted-foreground">
                {pausedCampaigns} paused
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_enrollments || 0}</div>
              <p className="text-xs text-muted-foreground">
                Contacts in campaigns
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{successRate}%</div>
              <p className="text-xs text-muted-foreground">
                {totalExecutions} total executions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.failed_executions || 0}</div>
              <p className="text-xs text-muted-foreground">
                Needs attention
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="campaigns" className="space-y-6">
          <TabsList>
            <TabsTrigger value="campaigns">My Campaigns</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="executions">Recent Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="space-y-4">
            {/* Search */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search campaigns..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Campaigns List */}
            {filteredCampaigns.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first campaign to automate follow-ups based on stage changes.
                  </p>
                  <Link href="/campaigns/new">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Campaign
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredCampaigns.map((campaign) => (
                  <Card key={campaign.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">
                              <Link
                                href={`/campaigns/${campaign.id}`}
                                className="hover:underline"
                              >
                                {campaign.name}
                              </Link>
                            </h3>
                            <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                              {campaign.status}
                            </Badge>
                            <Badge variant="outline">
                              {campaign.trigger_type.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-sm mb-3">
                            {campaign.description || 'No description'}
                          </p>
                          <div className="flex items-center gap-6 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Activity className="h-4 w-4" />
                              {campaign.total_enrollments || 0} enrolled
                            </div>
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-4 w-4" />
                              {campaign.total_completed || 0} completed
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Created {new Date(campaign.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => toggleCampaignStatus(campaign.id, campaign.status)}
                            disabled={campaign.status === 'draft' || campaign.status === 'archived'}
                          >
                            {campaign.status === 'active' ? (
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
                          <Link href={`/campaigns/${campaign.id}/edit`}>
                            <Button variant="outline" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
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
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="outline">{template.category.replace('_', ' ')}</Badge>
                      <Badge variant="secondary">
                        {template.trigger_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <Link href={`/campaigns/new?template=${template.id}`}>
                      <Button className="w-full" variant="outline">
                        Use Template
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="executions" className="space-y-4">
            {executions.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No executions yet</h3>
                  <p className="text-muted-foreground">
                    Campaign step executions will appear here once campaigns start running.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {executions.map((execution) => (
                  <Card key={execution.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            execution.status === 'completed' ? 'bg-green-500' :
                            execution.status === 'failed' ? 'bg-red-500' :
                            execution.status === 'running' ? 'bg-yellow-500' : 'bg-muted'
                          }`} />
                          <div>
                            <div className="font-medium">{execution.campaign_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {execution.contact_name || 'Unknown contact'}
                              <span className="mx-2">•</span>
                              {execution.step_type.replace('_', ' ')}
                              {execution.status === 'failed' && execution.error_message && (
                                <span className="text-destructive ml-2">• {execution.error_message}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          {execution.started_at && (
                            <>
                              <div>{new Date(execution.started_at).toLocaleDateString()}</div>
                              <div>{new Date(execution.started_at).toLocaleTimeString()}</div>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
