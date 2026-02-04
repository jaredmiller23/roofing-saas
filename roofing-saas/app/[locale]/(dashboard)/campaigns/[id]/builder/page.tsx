'use client'

import { useEffect, useState } from 'react'
import { useRouter } from '@/lib/i18n/navigation'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Save,
  Play,
  Pause,
  Plus,
  Trash2,
  ChevronRight,
  Mail,
  MessageSquare,
  Clock,
  Edit,
  Loader2,
  Users,
  UserPlus,
  RefreshCw,
  ChevronLeft,
} from 'lucide-react'
import type {
  Campaign,
  CampaignStep,
  CampaignTrigger,
  CampaignEnrollment,
  EnrollmentStatus,
  StepType,
} from '@/lib/campaigns/types'
import { apiFetch, apiFetchPaginated } from '@/lib/api/client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function CampaignBuilderPage() {
  const router = useRouter()
  const params = useParams()
  const campaignId = params?.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [steps, setSteps] = useState<CampaignStep[]>([])
  const [triggers, setTriggers] = useState<CampaignTrigger[]>([])
  const [enrollments, setEnrollments] = useState<CampaignEnrollment[]>([])
  const [enrollmentTotal, setEnrollmentTotal] = useState(0)
  const [enrollmentPage, setEnrollmentPage] = useState(1)
  const [enrollmentFilter, setEnrollmentFilter] = useState<EnrollmentStatus | 'all'>('all')
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (campaignId) {
      fetchCampaignData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId])

  const fetchCampaignData = async () => {
    setLoading(true)
    try {
      // Fetch campaign details, steps, and triggers in parallel
      const [campaignData, stepsData, triggersData] = await Promise.all([
        apiFetch<Campaign>(`/api/campaigns/${campaignId}`),
        apiFetch<CampaignStep[]>(`/api/campaigns/${campaignId}/steps`),
        apiFetch<CampaignTrigger[]>(`/api/campaigns/${campaignId}/triggers`).catch(() => []),
      ])

      setCampaign(campaignData)
      setSteps(stepsData)
      setTriggers(triggersData)
    } catch (error) {
      console.error('Error fetching campaign data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEnrollments = async (page = 1, status: EnrollmentStatus | 'all' = 'all') => {
    setEnrollmentsLoading(true)
    try {
      const limit = 20
      const offset = (page - 1) * limit
      let url = `/api/campaigns/${campaignId}/enrollments?limit=${limit}&offset=${offset}`
      if (status !== 'all') {
        url += `&status=${status}`
      }
      const result = await apiFetchPaginated<CampaignEnrollment[]>(url)
      setEnrollments(result.data)
      setEnrollmentTotal(result.pagination.total)
    } catch (error) {
      console.error('Error fetching enrollments:', error)
    } finally {
      setEnrollmentsLoading(false)
    }
  }

  const handleUpdateCampaign = async (updates: Partial<Campaign>) => {
    setSaving(true)
    try {
      const updated = await apiFetch<Campaign>(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        body: updates,
      })
      setCampaign(updated)
    } catch (error) {
      console.error('Error updating campaign:', error)
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!campaign) return

    const newStatus = campaign.status === 'active' ? 'paused' : 'active'
    await handleUpdateCampaign({ status: newStatus })
  }

  const handleAddStep = () => {
    router.push(`/campaigns/${campaignId}/builder/new-step`)
  }

  const handleDeleteStep = async (stepId: string) => {
    if (!confirm('Are you sure you want to delete this step?')) return

    try {
      await apiFetch<void>(`/api/campaigns/${campaignId}/steps/${stepId}`, { method: 'DELETE' })
      await fetchCampaignData()
    } catch (error) {
      console.error('Error deleting step:', error)
      alert('Failed to delete step')
    }
  }

  const handleAddTrigger = () => {
    router.push(`/campaigns/${campaignId}/builder/new-trigger`)
  }

  const handleDeleteTrigger = async (triggerId: string) => {
    if (!confirm('Are you sure you want to delete this trigger?')) return

    try {
      await apiFetch<void>(`/api/campaigns/${campaignId}/triggers/${triggerId}`, { method: 'DELETE' })
      await fetchCampaignData()
    } catch (error) {
      console.error('Error deleting trigger:', error)
      alert('Failed to delete trigger')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="container mx-auto p-6">
        <p>Campaign not found</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/campaigns')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{campaign.name}</h1>
            <p className="text-muted-foreground">
              {campaign.description || 'No description'}
            </p>
          </div>
          <Badge
            variant={
              campaign.status === 'active'
                ? 'default'
                : campaign.status === 'draft'
                  ? 'secondary'
                  : 'outline'
            }
          >
            {campaign.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleToggleStatus}>
            {campaign.status === 'active' ? (
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
          <Button onClick={() => handleUpdateCampaign(campaign)} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="steps" className="w-full">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="triggers">Triggers</TabsTrigger>
          <TabsTrigger value="steps">Steps</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Settings</CardTitle>
              <CardDescription>
                Configure campaign details and behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  value={campaign.name}
                  onChange={(e) =>
                    setCampaign({ ...campaign, name: e.target.value })
                  }
                  onBlur={() => handleUpdateCampaign({ name: campaign.name })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={campaign.description || ''}
                  onChange={(e) =>
                    setCampaign({ ...campaign, description: e.target.value })
                  }
                  onBlur={() =>
                    handleUpdateCampaign({ description: campaign.description })
                  }
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Campaign Type</Label>
                  <p className="text-sm text-muted-foreground">
                    {campaign.campaign_type}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Enrollment Type</Label>
                  <p className="text-sm text-muted-foreground">
                    {campaign.enrollment_type}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Triggers Tab */}
        <TabsContent value="triggers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Campaign Triggers</CardTitle>
                  <CardDescription>
                    Define when contacts should be enrolled in this campaign
                  </CardDescription>
                </div>
                <Button size="sm" onClick={handleAddTrigger}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Trigger
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {triggers.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    No triggers configured. Add a trigger to automatically enroll
                    contacts.
                  </p>
                  <Button onClick={handleAddTrigger}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Trigger
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {triggers.map((trigger: CampaignTrigger) => (
                    <div
                      key={trigger.id}
                      className="border rounded-lg p-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium capitalize">
                          {trigger.trigger_type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Priority: {trigger.priority}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={trigger.is_active ? 'default' : 'secondary'}>
                          {trigger.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTrigger(trigger.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Steps Tab */}
        <TabsContent value="steps" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Campaign Steps</CardTitle>
                  <CardDescription>
                    Build your campaign sequence
                  </CardDescription>
                </div>
                <Button onClick={handleAddStep}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Step
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {steps.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    No steps added yet. Create your first step to get started.
                  </p>
                  <Button onClick={handleAddStep}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Step
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {steps.map((step, index) => (
                    <StepCard
                      key={step.id}
                      step={step}
                      index={index}
                      onDelete={handleDeleteStep}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Enrollments Tab */}
        <TabsContent value="enrollments" className="space-y-4">
          <EnrollmentsPanel
            campaignId={campaignId}
            enrollments={enrollments}
            total={enrollmentTotal}
            page={enrollmentPage}
            filter={enrollmentFilter}
            loading={enrollmentsLoading}
            onFilterChange={(status) => {
              setEnrollmentFilter(status)
              setEnrollmentPage(1)
              fetchEnrollments(1, status)
            }}
            onPageChange={(page) => {
              setEnrollmentPage(page)
              fetchEnrollments(page, enrollmentFilter)
            }}
            onRefresh={() => fetchEnrollments(enrollmentPage, enrollmentFilter)}
            onLoad={() => fetchEnrollments(1, enrollmentFilter)}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface StepCardProps {
  step: CampaignStep
  index: number
  onDelete: (stepId: string) => void
}

function StepCard({ step, index, onDelete }: StepCardProps) {
  const getStepIcon = (stepType: StepType) => {
    switch (stepType) {
      case 'send_email':
        return <Mail className="h-4 w-4" />
      case 'send_sms':
        return <MessageSquare className="h-4 w-4" />
      case 'wait':
        return <Clock className="h-4 w-4" />
      default:
        return <Edit className="h-4 w-4" />
    }
  }

  const getStepLabel = (stepType: StepType) => {
    return stepType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
              {index + 1}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              {getStepIcon(step.step_type)}
              <h4 className="font-medium">{getStepLabel(step.step_type)}</h4>
            </div>

            {step.delay_value > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Wait {step.delay_value} {step.delay_unit} after previous step
              </p>
            )}

            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span>Executed: {step.total_executed}</span>
              <span>Succeeded: {step.total_succeeded}</span>
              <span>Failed: {step.total_failed}</span>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(step.id)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// --- Enrollments Panel ---

interface EnrollmentsPanelProps {
  campaignId: string
  enrollments: CampaignEnrollment[]
  total: number
  page: number
  filter: EnrollmentStatus | 'all'
  loading: boolean
  onFilterChange: (status: EnrollmentStatus | 'all') => void
  onPageChange: (page: number) => void
  onRefresh: () => void
  onLoad: () => void
}

function EnrollmentsPanel({
  campaignId,
  enrollments,
  total,
  page,
  filter,
  loading,
  onFilterChange,
  onPageChange,
  onRefresh,
  onLoad,
}: EnrollmentsPanelProps) {
  const [loaded, setLoaded] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [contactIdInput, setContactIdInput] = useState('')

  useEffect(() => {
    if (!loaded) {
      setLoaded(true)
      onLoad()
    }
  }, [loaded, onLoad])

  const handleManualEnroll = async () => {
    if (!contactIdInput.trim()) return
    setEnrolling(true)
    try {
      await apiFetch<CampaignEnrollment>(`/api/campaigns/${campaignId}/enrollments`, {
        method: 'POST',
        body: { contact_id: contactIdInput.trim() },
      })
      setContactIdInput('')
      onRefresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to enroll contact'
      alert(message)
    } finally {
      setEnrolling(false)
    }
  }

  const limit = 20
  const totalPages = Math.ceil(total / limit)

  const getStatusBadge = (status: EnrollmentStatus) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>
      case 'completed':
        return <Badge variant="default">Completed</Badge>
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>
      case 'exited':
        return <Badge variant="outline">Exited</Badge>
      case 'failed':
        return <Badge className="bg-red-500">Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Campaign Enrollments
            </CardTitle>
            <CardDescription>
              {total} contact{total !== 1 ? 's' : ''} enrolled
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Manual Enrollment */}
        <div className="flex items-end gap-2 p-3 border border-dashed border-border rounded-lg">
          <div className="flex-1 space-y-1">
            <Label htmlFor="contact-id" className="text-xs text-muted-foreground">
              Enroll a contact by ID
            </Label>
            <Input
              id="contact-id"
              placeholder="Contact UUID..."
              value={contactIdInput}
              onChange={(e) => setContactIdInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleManualEnroll()
              }}
            />
          </div>
          <Button
            size="sm"
            onClick={handleManualEnroll}
            disabled={enrolling || !contactIdInput.trim()}
          >
            {enrolling ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4 mr-2" />
            )}
            Enroll
          </Button>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground">Status:</Label>
          <Select
            value={filter}
            onValueChange={(value) => onFilterChange(value as EnrollmentStatus | 'all')}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="exited">Exited</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Enrollment Table */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : enrollments.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              {filter !== 'all'
                ? `No ${filter} enrollments found`
                : 'No contacts enrolled yet'}
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Step</TableHead>
                    <TableHead className="text-right">Emails</TableHead>
                    <TableHead className="text-right">SMS</TableHead>
                    <TableHead>Enrolled</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.map((enrollment) => (
                    <TableRow key={enrollment.id}>
                      <TableCell className="font-mono text-xs">
                        {enrollment.contact_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>{getStatusBadge(enrollment.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {enrollment.enrollment_source?.replace(/_/g, ' ') || 'unknown'}
                      </TableCell>
                      <TableCell className="text-right">
                        {enrollment.steps_completed}/{enrollment.current_step_order ?? '?'}
                      </TableCell>
                      <TableCell className="text-right">
                        <span title={`Sent: ${enrollment.emails_sent}, Opened: ${enrollment.emails_opened}, Clicked: ${enrollment.emails_clicked}`}>
                          {enrollment.emails_sent}
                          {enrollment.emails_opened > 0 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({Math.round((enrollment.emails_opened / enrollment.emails_sent) * 100) || 0}%)
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{enrollment.sms_sent}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(enrollment.enrolled_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages} ({total} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
