'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { User, Briefcase, FileText, Phone, Mail, MapPin, Calendar, DollarSign, Play, CheckCircle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { STAGE_DISPLAY_NAMES } from '@/lib/pipeline/validation'
import type { PipelineStage } from '@/lib/types/api'

interface Project {
  id: string
  name: string
  project_number: string | null
  status: string
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

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [contact, setContact] = useState<Contact | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [startingProduction, setStartingProduction] = useState(false)

  useEffect(() => {
    fetchProjectData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  async function fetchProjectData() {
    try {
      setLoading(true)

      // Fetch project
      const projectRes = await fetch(`/api/projects/${projectId}`)
      if (projectRes.ok) {
        const projectData = await projectRes.json()
        setProject(projectData.project || projectData)

        // Fetch contact if exists
        if (projectData.project?.contact_id || projectData.contact_id) {
          const contactId = projectData.project?.contact_id || projectData.contact_id
          const contactRes = await fetch(`/api/contacts/${contactId}`)
          if (contactRes.ok) {
            const contactData = await contactRes.json()
            setContact(contactData.contact || contactData)
          }
        }
      }

      // Fetch jobs for this project
      const jobsRes = await fetch(`/api/jobs?project_id=${projectId}`)
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json()
        setJobs(jobsData.jobs || [])
      }

      // Fetch activities
      const activitiesRes = await fetch(`/api/activities?project_id=${projectId}&limit=20`)
      if (activitiesRes.ok) {
        const activitiesData = await activitiesRes.json()
        setActivities(activitiesData.activities || activitiesData.data?.activities || [])
      }
    } catch (error) {
      console.error('Failed to fetch project data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '—'
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
      const response = await fetch(`/api/projects/${projectId}/start-production`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_type: 'roof_replacement',
        }),
      })

      if (response.ok) {
        const data = await response.json()
        // Refresh project data to show updated stage
        await fetchProjectData()
        // Navigate to the newly created job
        if (data.job?.id) {
          router.push(`/jobs/${data.job.id}`)
        }
      } else {
        const errorData = await response.json()
        console.error('Failed to start production:', errorData.error)
        alert(errorData.error || 'Failed to start production')
      }
    } catch (error) {
      console.error('Error starting production:', error)
      alert('Failed to start production. Please try again.')
    } finally {
      setStartingProduction(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      lead: 'bg-blue-100 text-blue-800',
      won: 'bg-green-100 text-green-800',
      lost: 'bg-red-100 text-red-800',
      proposal: 'bg-yellow-100 text-yellow-800',
      negotiation: 'bg-purple-100 text-purple-800',
      estimate: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    }

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Project not found</p>
          </div>
          <Link href="/projects" className="text-blue-600 hover:text-blue-700 mt-4 inline-block">
            ← Back to Projects
          </Link>
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
          <Link
            href="/projects"
            className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block"
          >
            ← Back to Projects
          </Link>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{project.name}</h1>
              {project.project_number && (
                <p className="text-sm text-gray-500 mt-1">Project #{project.project_number}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {getStatusBadge(project.status)}
              {project.pipeline_stage === 'won' && (
                <Button
                  size="sm"
                  className="gap-2 bg-green-600 hover:bg-green-700"
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
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                  <div className="animate-pulse h-2 w-2 bg-yellow-500 rounded-full" />
                  In Production
                </div>
              )}
              {project.pipeline_stage === 'complete' && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium">
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
              <Link href={`/projects/${projectId}/edit`}>
                <Button size="sm">Edit Project</Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="jobs" className="gap-2">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Jobs</span>
              {jobs.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                  {jobs.length}
                </span>
              )}
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
                      <label className="text-sm font-medium text-gray-500">Description</label>
                      <p className="text-gray-900 mt-1">{project.description || 'No description provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Scope of Work</label>
                      <p className="text-gray-900 mt-1">{project.scope_of_work || 'No scope defined'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Type</label>
                        <p className="text-gray-900">{project.type || '—'}</p>
                      </div>
                      {customFields?.lead_source && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Lead Source</label>
                          <p className="text-gray-900">{customFields.lead_source}</p>
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
                        <label className="text-sm font-medium text-gray-500">Estimated Value</label>
                        <p className="text-lg font-semibold text-gray-900">{formatCurrency(project.estimated_value)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Approved Value</label>
                        <p className="text-lg font-semibold text-gray-900">{formatCurrency(project.approved_value)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Final Value</label>
                        <p className="text-lg font-semibold text-green-600">{formatCurrency(project.final_value)}</p>
                      </div>
                      {project.profit_margin && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Profit Margin</label>
                          <p className="text-lg font-semibold text-gray-900">
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
                          <div key={activity.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                            <div className="flex items-start justify-between mb-1">
                              <div>
                                {activity.subject && (
                                  <p className="text-sm font-medium text-gray-800">{activity.subject}</p>
                                )}
                                <p className="text-xs text-gray-500">{formatDate(activity.created_at)}</p>
                              </div>
                              {activity.type && (
                                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded capitalize">
                                  {activity.type.replace('_', ' ')}
                                </span>
                              )}
                            </div>
                            {activity.notes && (
                              <p className="text-sm text-gray-600">{activity.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 text-sm">
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
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Current Stage</label>
                      <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                        project.pipeline_stage === 'won' ? 'bg-green-100 text-green-800 border border-green-200' :
                        project.pipeline_stage === 'production' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                        project.pipeline_stage === 'complete' ? 'bg-green-100 text-green-800 border border-green-200' :
                        project.pipeline_stage === 'lost' ? 'bg-red-100 text-red-800 border border-red-200' :
                        'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {STAGE_DISPLAY_NAMES[project.pipeline_stage] || project.pipeline_stage}
                      </div>
                    </div>

                    {/* Stage-specific actions/info */}
                    {project.pipeline_stage === 'won' && jobs.length === 0 && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800 font-medium">Ready to start production!</p>
                        <p className="text-xs text-green-600 mt-1">
                          Click &quot;Start Production&quot; to create a job and begin work.
                        </p>
                      </div>
                    )}

                    {project.pipeline_stage === 'production' && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800 font-medium">Production in progress</p>
                        <p className="text-xs text-yellow-600 mt-1">
                          {jobs.length} job{jobs.length !== 1 ? 's' : ''} associated with this project.
                        </p>
                      </div>
                    )}

                    {/* Legacy pipeline info if exists */}
                    {(pipeline || stage) && (
                      <div className="pt-3 border-t border-gray-200">
                        <label className="text-xs font-medium text-gray-400 mb-2 block">Legacy Pipeline</label>
                        <div className="text-xs text-gray-500">
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
                      <label className="text-sm font-medium text-gray-500">Created</label>
                      <p className="text-gray-900">{formatDate(project.created_at)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Last Updated</label>
                      <p className="text-gray-900">{formatDate(project.updated_at)}</p>
                    </div>
                    {project.estimated_start && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Estimated Start</label>
                        <p className="text-gray-900">{formatDate(project.estimated_start)}</p>
                      </div>
                    )}
                    {project.actual_start && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Actual Start</label>
                        <p className="text-gray-900">{formatDate(project.actual_start)}</p>
                      </div>
                    )}
                    {project.actual_completion && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Completion</label>
                        <p className="text-gray-900">{formatDate(project.actual_completion)}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Production Jobs</h2>
                <p className="text-sm text-gray-600">Jobs and work orders for this project</p>
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
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{formatDate(job.scheduled_date)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 mb-1">Progress</div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${job.completion_percentage || 0}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-medium">{job.completion_percentage || 0}%</span>
                      </div>
                      {job.total_cost && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-gray-400" />
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
                  <Briefcase className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No jobs yet</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Create a job to schedule production work for this project
                  </p>
                  <Link href={`/jobs/new?project_id=${projectId}`}>
                    <Button>+ Create First Job</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Project Files & Photos</h2>
              <p className="text-sm text-gray-600">Documents, photos, and attachments</p>
            </div>

            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">Files integration coming soon</h3>
                <p className="text-sm text-gray-500">
                  Upload and manage project documents, photos, and files
                </p>
              </CardContent>
            </Card>
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
                        <Phone className="h-5 w-5 text-gray-400" />
                        <div>
                          <label className="text-sm font-medium text-gray-500">Phone</label>
                          <p className="text-gray-900">{contact.phone}</p>
                        </div>
                      </div>
                    )}
                    {contact.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-gray-400" />
                        <div>
                          <label className="text-sm font-medium text-gray-500">Email</label>
                          <p className="text-gray-900">{contact.email}</p>
                        </div>
                      </div>
                    )}
                    {contact.address_street && (
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                        <div>
                          <label className="text-sm font-medium text-gray-500">Address</label>
                          <p className="text-gray-900">
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
                  <User className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No contact linked</h3>
                  <p className="text-sm text-gray-500">
                    Link a contact to this project to track customer information
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
