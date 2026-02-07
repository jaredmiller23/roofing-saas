'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '@/lib/i18n/navigation'
import { useParams } from 'next/navigation'
import { Link } from '@/lib/i18n/navigation'
import { User, Briefcase, FileText, Phone, Mail, MapPin, Calendar, DollarSign, Play, CheckCircle, Calculator, Send, RotateCcw, ExternalLink, XCircle, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { SendSignatureDialog } from '@/components/signatures'
import { QuoteComparison } from '@/components/estimates/QuoteComparison'
import { CreateQuoteOptionDialog } from '@/components/estimates/CreateQuoteOptionDialog'
import { SendEstimateDialog } from '@/components/estimates/SendEstimateDialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { PageSkeleton, CardSkeleton } from '@/components/ui/skeletons'
import { STAGE_DISPLAY_NAMES } from '@/lib/pipeline/validation'
import type { PipelineStage } from '@/lib/types/api'
import type { QuoteOption } from '@/lib/types/quote-option'
import { ProjectSubstatusManager } from '@/components/pipeline/ProjectSubstatusManager'
import { PresenceIndicator } from '@/components/collaboration/PresenceIndicator'
import { ProjectFilesTable } from '@/components/project-files/project-files-table'
import { WarrantyList } from '@/components/warranties/warranty-list'
import { RealtimeToast, realtimeToastPresets } from '@/components/collaboration/RealtimeToast'
import { usePresence, type PresenceUser } from '@/lib/hooks/usePresence'
import { createClient } from '@/lib/supabase/client'
import { apiFetch, apiFetchPaginated } from '@/lib/api/client'

interface Project {
  id: string
  name: string
  project_number: string | null
  status: string
  substatus: string | null
  pipeline_stage: PipelineStage
  type: string | null
  estimated_value: number | null
  approved_value: number | null
  final_value: number | null
  profit_margin: number | null
  description: string | null
  scope_of_work: string | null
  created_at: string
  updated_at: string
  estimated_start: string | null
  actual_start: string | null
  actual_completion: string | null
  custom_fields: {
    proline_pipeline?: string
    proline_stage?: string
    lead_source?: string
    [key: string]: unknown
  } | null
  contact_id: string | null
}

interface Contact {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  address_street: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
}

interface Job {
  id: string
  job_number: string
  job_type: string
  status: string
  scheduled_date: string | null
  completion_percentage: number
  crew_lead: string | null
  total_cost: number | null
}

interface Activity {
  id: string
  type: string
  subject: string | null
  notes: string | null
  created_at: string
  created_by: string
}

interface ProposalInfo {
  id: string
  proposal_number: string
  title: string
  status: string
  sent_at: string | null
  viewed_at: string | null
  responded_at: string | null
  selected_option_id: string | null
  decline_reason: string | null
  created_at: string
  selected_option: {
    id: string
    name: string
    total_amount: number | null
    subtotal: number | null
  } | null
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [contact, setContact] = useState<Contact | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [quoteOptions, setQuoteOptions] = useState<QuoteOption[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [startingProduction, setStartingProduction] = useState(false)
  const [reactivating, setReactivating] = useState(false)
  const [loadingQuoteOptions, setLoadingQuoteOptions] = useState(false)
  const [showSendEstimate, setShowSendEstimate] = useState(false)
  const [proposals, setProposals] = useState<ProposalInfo[]>([])
  const [loadingProposals, setLoadingProposals] = useState(false)
  const [currentUser, setCurrentUser] = useState<{
    id: string
    email?: string
    name?: string
    avatar?: string
  } | null>(null)

  // Get current user for presence tracking
  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUser({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.user_metadata?.full_name,
          avatar: user.user_metadata?.avatar_url,
        })
      }
    }
    fetchUser()
  }, [])

  // Track presence for this project (using hook for join/leave side effects)
  usePresence({
    entityType: 'project',
    entityId: projectId,
    user: currentUser || { id: '', name: '', email: '', avatar: '' },
    enabled: !!currentUser,
    onUserJoin: (presenceUser: PresenceUser) => {
      const userName = presenceUser.userName || presenceUser.userEmail || 'Someone'
      toast.custom(() => (
        <RealtimeToast {...realtimeToastPresets.userJoined(userName, presenceUser.userAvatar)} />
      ))
    },
    onUserLeave: (presenceUser: PresenceUser) => {
      const userName = presenceUser.userName || presenceUser.userEmail || 'Someone'
      toast.custom(() => (
        <RealtimeToast {...realtimeToastPresets.userLeft(userName, presenceUser.userAvatar)} />
      ))
    },
  })

  useEffect(() => {
    fetchProjectData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  async function fetchProjectData() {
    try {
      setLoading(true)

      // Fetch project - API returns: { success: true, data: <project> }
      const projectObj = await apiFetch<Project>(`/api/projects/${projectId}`)
      setProject(projectObj)

      // Fetch contact if exists
      if (projectObj?.contact_id) {
        try {
          const contactObj = await apiFetch<Contact>(`/api/contacts/${projectObj.contact_id}`)
          setContact(contactObj)
        } catch {
          // Contact may not exist
        }
      }

      // Fetch quote options and proposals if this is an estimate/quote project
      if (projectObj && isEstimateProject(projectObj)) {
        await Promise.all([fetchQuoteOptions(), fetchProposals()])
      }

      // Fetch jobs for this project
      try {
        const { data: jobsList } = await apiFetchPaginated<Job[]>(`/api/jobs?project_id=${projectId}`)
        setJobs(jobsList)
      } catch {
        // Jobs may not exist
      }

      // Fetch activities
      try {
        const activitiesList = await apiFetch<Activity[]>(`/api/activities?project_id=${projectId}&limit=20`)
        setActivities(activitiesList)
      } catch {
        // Activities may not exist
      }
    } catch (error) {
      console.error('Failed to fetch project data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchQuoteOptions() {
    try {
      setLoadingQuoteOptions(true)
      const quoteData = await apiFetch<{ options: QuoteOption[] }>(`/api/estimates/${projectId}/options`)
      setQuoteOptions(quoteData?.options || [])
    } catch (error) {
      console.error('Failed to fetch quote options:', error)
    } finally {
      setLoadingQuoteOptions(false)
    }
  }

  async function fetchProposals() {
    try {
      setLoadingProposals(true)
      const data = await apiFetch<{ proposals: ProposalInfo[] }>(`/api/estimates/${projectId}/proposals`)
      setProposals(data?.proposals || [])
    } catch (error) {
      console.error('Failed to fetch proposals:', error)
    } finally {
      setLoadingProposals(false)
    }
  }

  // Check if this project is an estimate/quote
  function isEstimateProject(proj: Project): boolean {
    return ['estimate', 'proposal'].includes(proj.status) ||
           ['prospect', 'qualified', 'quote_sent', 'negotiation'].includes(proj.pipeline_stage)
  }

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  async function handleStartProduction() {
    if (!project) return

    try {
      setStartingProduction(true)
      const data = await apiFetch<{ job?: { id: string } }>(`/api/projects/${projectId}/start-production`, {
        method: 'POST',
        body: { job_type: 'roof_replacement' },
      })

      // Refresh project data to show updated stage
      await fetchProjectData()
      // Navigate to the newly created job
      if (data.job?.id) {
        router.push(`/jobs/${data.job.id}`)
      }
    } catch (error) {
      console.error('Error starting production:', error)
      alert(error instanceof Error ? error.message : 'Failed to start production. Please try again.')
    } finally {
      setStartingProduction(false)
    }
  }

  async function handleReactivate() {
    if (!project || reactivating) return

    if (!confirm('Reactivate this project and move it back to Prospect?')) return

    try {
      setReactivating(true)
      await apiFetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        body: { pipeline_stage: 'prospect' },
      })
      toast.success('Project reactivated')
      await fetchProjectData()
    } catch (error) {
      console.error('Error reactivating project:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to reactivate project')
    } finally {
      setReactivating(false)
    }
  }

  const getStatusBadge = (status: string | null | undefined) => {
    if (!status) {
      return (
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-muted text-foreground">
          Unknown
        </span>
      )
    }

    const colors = {
      lead: 'bg-primary/10 text-primary',
      won: 'bg-green-500/20 text-green-400',
      lost: 'bg-red-500/20 text-red-400',
      proposal: 'bg-yellow-500/20 text-yellow-400',
      negotiation: 'bg-secondary/10 text-secondary',
      estimate: 'bg-primary/10 text-primary',
      approved: 'bg-green-500/20 text-green-400',
      in_progress: 'bg-yellow-500/20 text-yellow-400',
      completed: 'bg-green-500/20 text-green-400',
      cancelled: 'bg-red-500/20 text-red-400',
    }

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[status as keyof typeof colors] || 'bg-muted text-foreground'}`}>
        {status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
      </span>
    )
  }

  if (loading) {
    return <PageSkeleton />
  }

  if (!project) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <Alert variant="destructive">
            <AlertDescription>Project not found</AlertDescription>
          </Alert>
          <Button variant="ghost" size="default" asChild className="mt-4">
            <Link href="/projects">← Back to Projects</Link>
          </Button>
        </div>
      </div>
    )
  }

  const customFields = project.custom_fields || {}
  const pipeline = customFields?.proline_pipeline || null
  const stage = customFields?.proline_stage || null

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" size="default" asChild className="mb-4">
            <Link href="/projects">← Back to Projects</Link>
          </Button>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">{project.name}</h1>
                {/* Presence Indicator */}
                {currentUser && (
                  <PresenceIndicator
                    entityType="project"
                    entityId={projectId}
                    user={currentUser}
                    size="sm"
                    maxDisplay={3}
                  />
                )}
              </div>
              {project.project_number && (
                <p className="text-sm text-muted-foreground mt-1">Project #{project.project_number}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {getStatusBadge(project.status)}
              {project.pipeline_stage === 'won' && (
                <Button
                  size="sm"
                  variant="success"
                  className="gap-2"
                  onClick={handleStartProduction}
                  disabled={startingProduction}
                >
                  {startingProduction ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Start Production
                    </>
                  )}
                </Button>
              )}
              {project.pipeline_stage === 'production' && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-medium">
                  <div className="animate-pulse h-2 w-2 bg-yellow-500 rounded-full" />
                  In Production
                </div>
              )}
              {project.pipeline_stage === 'complete' && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
                  <CheckCircle className="h-4 w-4" />
                  Complete
                </div>
              )}
              <Link href={`/projects/${projectId}/costing`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <DollarSign className="h-4 w-4" />
                  Job Costing
                </Button>
              </Link>
              <Link href={`/projects/${projectId}/claims`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Claims
                </Button>
              </Link>
              <SendSignatureDialog
                projectId={projectId}
                projectName={project.name}
                contactId={contact?.id}
                contactName={contact ? `${contact.first_name} ${contact.last_name}` : undefined}
                contactEmail={contact?.email || undefined}
                onSuccess={fetchProjectData}
              />
              {project.pipeline_stage === 'lost' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={handleReactivate}
                  disabled={reactivating}
                >
                  {reactivating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                      Reactivating...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4" />
                      Reactivate
                    </>
                  )}
                </Button>
              )}
              <Link href={`/projects/${projectId}/edit`}>
                <Button size="sm">Edit Project</Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full ${isEstimateProject(project) ? 'grid-cols-6' : 'grid-cols-5'} lg:w-auto lg:inline-grid`}>
            <TabsTrigger value="overview" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            {isEstimateProject(project) && (
              <TabsTrigger value="quote-options" className="gap-2">
                <Calculator className="h-4 w-4" />
                <span className="hidden sm:inline">Quote Options</span>
                {quoteOptions.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                    {quoteOptions.length}
                  </span>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="jobs" className="gap-2">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Jobs</span>
              {jobs.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                  {jobs.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="warranties" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Warranties</span>
            </TabsTrigger>
            <TabsTrigger value="files" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Files</span>
            </TabsTrigger>
            <TabsTrigger value="contact" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Contact</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Project Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Project Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Description</label>
                      <p className="text-foreground mt-1">{project.description || 'No description provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Scope of Work</label>
                      <p className="text-foreground mt-1">{project.scope_of_work || 'No scope defined'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Type</label>
                        <p className="text-foreground">{project.type || '—'}</p>
                      </div>
                      {customFields?.lead_source && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Lead Source</label>
                          <p className="text-foreground">{customFields.lead_source}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Financial Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Estimated Value</label>
                        <p className="text-lg font-semibold text-foreground">{formatCurrency(project.estimated_value)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Approved Value</label>
                        <p className="text-lg font-semibold text-foreground">{formatCurrency(project.approved_value)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Final Value</label>
                        <p className="text-lg font-semibold text-green-600">{formatCurrency(project.final_value)}</p>
                      </div>
                      {project.profit_margin && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Profit Margin</label>
                          <p className="text-lg font-semibold text-foreground">
                            {(project.profit_margin * 100).toFixed(1)}%
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Notes & Activities */}
                <Card>
                  <CardHeader>
                    <CardTitle>Notes & Activity</CardTitle>
                    <CardDescription>Recent project updates and notes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {activities.length > 0 ? (
                      <div className="space-y-3">
                        {activities.map((activity) => (
                          <div key={activity.id} className="border border rounded-lg p-3 hover:bg-background">
                            <div className="flex items-start justify-between mb-1">
                              <div>
                                {activity.subject && (
                                  <p className="text-sm font-medium text-foreground">{activity.subject}</p>
                                )}
                                <p className="text-xs text-muted-foreground">{formatDate(activity.created_at)}</p>
                              </div>
                              {activity.type && (
                                <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded capitalize">
                                  {activity.type.replace('_', ' ')}
                                </span>
                              )}
                            </div>
                            {activity.notes && (
                              <p className="text-sm text-muted-foreground">{activity.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No activities yet. Add a note to track progress.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Pipeline Status */}
                <Card>
                  <CardHeader>
                    <CardTitle>Pipeline Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">Current Stage</label>
                      <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                        project.pipeline_stage === 'won' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                        project.pipeline_stage === 'production' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                        project.pipeline_stage === 'complete' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                        project.pipeline_stage === 'lost' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        'bg-primary/10 text-primary border border-primary/30'
                      }`}>
                        {STAGE_DISPLAY_NAMES[project.pipeline_stage] || project.pipeline_stage}
                      </div>
                    </div>

                    {/* Substatus */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">Substatus</label>
                      <ProjectSubstatusManager
                        projectId={project.id}
                        status={project.status}
                        currentSubstatus={project.substatus || null}
                      />
                    </div>

                    {/* Stage-specific actions/info */}
                    {project.pipeline_stage === 'won' && jobs.length === 0 && (
                      <Alert variant="success">
                        <AlertTitle>Ready to start production!</AlertTitle>
                        <AlertDescription>
                          Click &quot;Start Production&quot; to create a job and begin work.
                        </AlertDescription>
                      </Alert>
                    )}

                    {project.pipeline_stage === 'production' && (
                      <Alert variant="warning">
                        <AlertTitle>Production in progress</AlertTitle>
                        <AlertDescription>
                          {jobs.length} job{jobs.length !== 1 ? 's' : ''} associated with this project.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Legacy pipeline info if exists */}
                    {(pipeline || stage) && (
                      <div className="pt-3 border-t border">
                        <label className="text-xs font-medium text-muted-foreground mb-2 block">Legacy Pipeline</label>
                        <div className="text-xs text-muted-foreground">
                          {pipeline && <span>{pipeline}</span>}
                          {pipeline && stage && <span> → </span>}
                          {stage && <span>{stage}</span>}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle>Timeline</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Created</label>
                      <p className="text-foreground">{formatDate(project.created_at)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                      <p className="text-foreground">{formatDate(project.updated_at)}</p>
                    </div>
                    {project.estimated_start && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Estimated Start</label>
                        <p className="text-foreground">{formatDate(project.estimated_start)}</p>
                      </div>
                    )}
                    {project.actual_start && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Actual Start</label>
                        <p className="text-foreground">{formatDate(project.actual_start)}</p>
                      </div>
                    )}
                    {project.actual_completion && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Completion</label>
                        <p className="text-foreground">{formatDate(project.actual_completion)}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Quote Options Tab */}
          {isEstimateProject(project) && (
            <TabsContent value="quote-options" className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Quote Options</h2>
                  <p className="text-sm text-muted-foreground">
                    Manage pricing options for this estimate
                  </p>
                </div>
                <div className="flex gap-2">
                  {quoteOptions.length > 0 && (
                    <Button size="sm" onClick={() => setShowSendEstimate(true)}>
                      <Send className="h-4 w-4 mr-2" />
                      Send Proposal
                    </Button>
                  )}
                </div>
              </div>

              {/* Proposal Status Cards */}
              {!loadingProposals && proposals.length > 0 && (
                <div className="space-y-4">
                  {proposals.map((proposal) => (
                    <ProposalStatusCard key={proposal.id} proposal={proposal} />
                  ))}
                </div>
              )}

              {loadingQuoteOptions ? (
                <div className="space-y-4">
                  <CardSkeleton lines={4} />
                  <CardSkeleton lines={3} />
                </div>
              ) : quoteOptions.length > 0 ? (
                <QuoteComparison
                  options={quoteOptions}
                  projectId={project?.id}
                  projectName={project?.name || 'Project'}
                  mode="comparison"
                  onSendProposal={() => {
                    setShowSendEstimate(true)
                  }}
                  onDownloadPdf={async (optionIds) => {
                    try {
                      toast.info('Generating PDF...')
                      const res = await fetch(`/api/estimates/${project?.id}/pdf`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ option_ids: optionIds }),
                      })
                      if (!res.ok) throw new Error('Failed to generate PDF')
                      const blob = await res.blob()
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `estimate-${project?.name?.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() || 'estimate'}.pdf`
                      a.click()
                      URL.revokeObjectURL(url)
                      toast.success('PDF downloaded')
                    } catch {
                      toast.error('Failed to generate PDF')
                    }
                  }}
                />
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Calculator className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No Quote Options Yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create pricing options to provide your customer with choices
                    </p>
                    <CreateQuoteOptionDialog
                      projectId={projectId}
                      onSuccess={() => fetchQuoteOptions()}
                    />
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Production Jobs</h2>
                <p className="text-sm text-muted-foreground">Jobs and work orders for this project</p>
              </div>
              <Link href={`/jobs/new?project_id=${projectId}`}>
                <Button size="sm">+ Create Job</Button>
              </Link>
            </div>

            {jobs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {jobs.map((job) => (
                  <Card key={job.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Job #{job.job_number}</CardTitle>
                        {getStatusBadge(job.status)}
                      </div>
                      <CardDescription>{job.job_type?.replace('_', ' ')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {job.scheduled_date && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDate(job.scheduled_date)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground mb-1">Progress</div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${job.completion_percentage || 0}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-medium">{job.completion_percentage || 0}%</span>
                      </div>
                      {job.total_cost && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>{formatCurrency(job.total_cost)}</span>
                        </div>
                      )}
                      <Link href={`/jobs/${job.id}`}>
                        <Button variant="outline" size="sm" className="w-full mt-2">
                          View Details
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium text-foreground mb-1">No jobs yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create a job to schedule production work for this project
                  </p>
                  <Link href={`/jobs/new?project_id=${projectId}`}>
                    <Button>+ Create First Job</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Warranties Tab */}
          <TabsContent value="warranties" className="space-y-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-foreground">Warranties</h2>
              <p className="text-sm text-muted-foreground">Track warranty coverage for this project</p>
            </div>
            <WarrantyList projectId={projectId} showProjectColumn={false} />
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Project Files &amp; Photos</h2>
                <p className="text-sm text-muted-foreground">Documents, photos, and attachments</p>
              </div>
              <Link href={`/project-files/new?project_id=${projectId}`}>
                <Button>
                  <FileText className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
              </Link>
            </div>

            <ProjectFilesTable params={{ project_id: projectId }} />
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-6">
            {contact ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                    <CardDescription>
                      {contact.first_name} {contact.last_name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {contact.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Phone</label>
                          <p className="text-foreground">{contact.phone}</p>
                        </div>
                      </div>
                    )}
                    {contact.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Email</label>
                          <p className="text-foreground">{contact.email}</p>
                        </div>
                      </div>
                    )}
                    {contact.address_street && (
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground mt-1" />
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Address</label>
                          <p className="text-foreground">
                            {contact.address_street}
                            <br />
                            {contact.address_city}, {contact.address_state} {contact.address_zip}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Contact this customer</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`}>
                        <Button variant="outline" className="w-full gap-2">
                          <Phone className="h-4 w-4" />
                          Call {contact.first_name}
                        </Button>
                      </a>
                    )}
                    {contact.email && (
                      <a href={`mailto:${contact.email}`}>
                        <Button variant="outline" className="w-full gap-2">
                          <Mail className="h-4 w-4" />
                          Email {contact.first_name}
                        </Button>
                      </a>
                    )}
                    <Link href={`/contacts/${contact.id}`}>
                      <Button variant="outline" className="w-full gap-2">
                        <User className="h-4 w-4" />
                        View Full Contact
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <User className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium text-foreground mb-1">No contact linked</h3>
                  <p className="text-sm text-muted-foreground">
                    Link a contact to this project to track customer information
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {project && (
        <SendEstimateDialog
          projectId={project.id}
          projectName={project.name}
          contactEmail={contact?.email || undefined}
          contactName={contact ? `${contact.first_name} ${contact.last_name}`.trim() : undefined}
          open={showSendEstimate}
          onOpenChange={setShowSendEstimate}
          onSuccess={() => {
            fetchProposals()
          }}
        />
      )}
    </div>
  )
}

function ProposalStatusCard({ proposal }: { proposal: ProposalInfo }) {
  const fmtMoney = (value: number | null | undefined) => {
    if (value == null) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const steps = [
    { label: 'Created', date: proposal.created_at, active: true, declined: false },
    { label: 'Sent', date: proposal.sent_at, active: !!proposal.sent_at, declined: false },
    { label: 'Viewed', date: proposal.viewed_at, active: !!proposal.viewed_at, declined: false },
    {
      label: proposal.status === 'rejected' ? 'Declined' : 'Accepted',
      date: proposal.responded_at,
      active: ['accepted', 'rejected'].includes(proposal.status),
      declined: proposal.status === 'rejected',
    },
  ]

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/view/estimate/${proposal.id}`

  return (
    <Card className={
      proposal.status === 'accepted' ? 'border-green-500/30 bg-green-500/5' :
      proposal.status === 'rejected' ? 'border-red-500/30 bg-red-500/5' :
      ''
    }>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Proposal #{proposal.proposal_number}</CardTitle>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            proposal.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
            proposal.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
            proposal.status === 'viewed' ? 'bg-yellow-500/20 text-yellow-400' :
            proposal.status === 'sent' ? 'bg-blue-500/20 text-blue-400' :
            'bg-muted text-muted-foreground'
          }`}>
            {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timeline */}
        <div className="flex items-start gap-1">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-start flex-1">
              <div className="flex flex-col items-center min-w-0">
                <div className={`h-3 w-3 rounded-full shrink-0 ${
                  step.active
                    ? step.declined
                      ? 'bg-red-500'
                      : 'bg-primary'
                    : 'bg-muted'
                }`} />
                <span className="text-[10px] text-muted-foreground mt-1 whitespace-nowrap">
                  {step.label}
                </span>
                {step.date && (
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(step.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mt-1.5 mx-1 ${
                  steps[i + 1].active ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Accepted details */}
        {proposal.status === 'accepted' && proposal.selected_option && (
          <div className="bg-green-500/10 rounded-lg p-3 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
            <div className="text-sm">
              <span className="text-foreground font-medium">
                Customer accepted: {proposal.selected_option.name}
              </span>
              <span className="text-muted-foreground"> — </span>
              <span className="text-foreground font-medium">
                {fmtMoney(proposal.selected_option.total_amount ?? proposal.selected_option.subtotal)}
              </span>
            </div>
          </div>
        )}

        {/* Declined details */}
        {proposal.status === 'rejected' && (
          <div className="bg-red-500/10 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm">
              <XCircle className="h-5 w-5 text-red-500 shrink-0" />
              <span className="text-foreground font-medium">Customer declined this proposal</span>
            </div>
            {proposal.decline_reason && (
              <p className="text-sm text-muted-foreground mt-2 ml-7">
                Reason: &ldquo;{proposal.decline_reason}&rdquo;
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <a href={publicUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="h-3 w-3" />
              View Public Link
            </Button>
          </a>
          {['sent', 'viewed'].includes(proposal.status) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(publicUrl)
                toast.success('Public link copied to clipboard')
              }}
            >
              Copy Link
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
