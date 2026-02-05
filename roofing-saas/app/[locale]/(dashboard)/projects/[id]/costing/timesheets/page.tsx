'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Link } from '@/lib/i18n/navigation'
import { Users, Clock, Package, DollarSign, Plus, CheckCircle, Loader2, Calendar } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api/client'

interface CrewMember {
  id: string
  first_name: string
  last_name: string
  role: string
  hourly_rate: number
  overtime_rate?: number
}

interface Timesheet {
  id: string
  crew_member_id: string
  project_id: string
  work_date: string
  regular_hours: number
  overtime_hours: number
  hourly_rate: number
  overtime_rate?: number
  total_labor_cost: number
  work_description?: string
  status: 'draft' | 'submitted' | 'approved' | 'paid'
  crew_member?: {
    id: string
    first_name: string
    last_name: string
    role: string
  }
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-blue-500/20 text-blue-400',
  approved: 'bg-green-500/20 text-green-400',
  paid: 'bg-purple-500/20 text-purple-400',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  paid: 'Paid',
}

export default function TimesheetsPage() {
  const params = useParams()
  const projectId = params.id as string

  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    crew_member_id: '',
    work_date: new Date().toISOString().split('T')[0],
    regular_hours: '',
    overtime_hours: '',
    work_description: '',
  })

  const fetchData = async () => {
    try {
      const [timesheetsRes, crewRes] = await Promise.all([
        apiFetch<{ timesheets: Timesheet[] }>(`/api/timesheets?project_id=${projectId}`),
        apiFetch<{ crewMembers: CrewMember[] }>('/api/crew-members?active_only=true'),
      ])

      if (timesheetsRes.timesheets) {
        setTimesheets(timesheetsRes.timesheets)
      }
      if (crewRes.crewMembers) {
        setCrewMembers(crewRes.crewMembers)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to load timesheets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const resetForm = () => {
    setFormData({
      crew_member_id: '',
      work_date: new Date().toISOString().split('T')[0],
      regular_hours: '',
      overtime_hours: '',
      work_description: '',
    })
  }

  const handleSave = async () => {
    if (!formData.crew_member_id || !formData.work_date || !formData.regular_hours) {
      toast.error('Please fill in all required fields')
      return
    }

    const selectedMember = crewMembers.find((m) => m.id === formData.crew_member_id)
    if (!selectedMember) {
      toast.error('Please select a crew member')
      return
    }

    setSaving(true)
    try {
      await apiFetch('/api/timesheets', {
        method: 'POST',
        body: {
          project_id: projectId,
          crew_member_id: formData.crew_member_id,
          work_date: formData.work_date,
          regular_hours: parseFloat(formData.regular_hours),
          overtime_hours: formData.overtime_hours ? parseFloat(formData.overtime_hours) : 0,
          hourly_rate: selectedMember.hourly_rate,
          overtime_rate: selectedMember.overtime_rate || selectedMember.hourly_rate * 1.5,
          work_description: formData.work_description || null,
          status: 'draft',
        },
      })

      toast.success('Timesheet entry added')
      setShowAddDialog(false)
      resetForm()
      fetchData()
    } catch (error) {
      console.error('Failed to save timesheet:', error)
      toast.error('Failed to save timesheet')
    } finally {
      setSaving(false)
    }
  }

  const handleApprove = async (timesheet: Timesheet) => {
    try {
      await apiFetch('/api/timesheets', {
        method: 'PATCH',
        body: {
          id: timesheet.id,
          status: 'approved',
        },
      })
      toast.success('Timesheet approved')
      fetchData()
    } catch (error) {
      console.error('Failed to approve timesheet:', error)
      toast.error('Failed to approve timesheet')
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  // Calculate totals
  const totalHours = timesheets.reduce((sum, t) => sum + t.regular_hours + t.overtime_hours, 0)
  const totalCost = timesheets.reduce((sum, t) => sum + t.total_labor_cost, 0)
  const approvedCost = timesheets
    .filter((t) => t.status === 'approved' || t.status === 'paid')
    .reduce((sum, t) => sum + t.total_labor_cost, 0)

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/projects/${projectId}`}
            className="text-sm text-primary hover:text-primary/80 mb-4 inline-block"
          >
            ← Back to Project
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Timesheets</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Track labor hours and costs for this project
              </p>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="lg" className="h-12">
                  <Plus className="h-5 w-5 mr-2" />
                  Log Time
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Log Time Entry</DialogTitle>
                  <DialogDescription>
                    Add a timesheet entry for a crew member
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div>
                    <Label htmlFor="crew_member">Crew Member *</Label>
                    <Select
                      value={formData.crew_member_id}
                      onValueChange={(value) => setFormData({ ...formData, crew_member_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select crew member" />
                      </SelectTrigger>
                      <SelectContent>
                        {crewMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.first_name} {member.last_name} ({formatCurrency(member.hourly_rate)}/hr)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="work_date">Date *</Label>
                    <Input
                      id="work_date"
                      type="date"
                      value={formData.work_date}
                      onChange={(e) => setFormData({ ...formData, work_date: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="regular_hours">Regular Hours *</Label>
                      <Input
                        id="regular_hours"
                        type="number"
                        step="0.25"
                        min="0"
                        max="24"
                        value={formData.regular_hours}
                        onChange={(e) => setFormData({ ...formData, regular_hours: e.target.value })}
                        placeholder="8"
                      />
                    </div>
                    <div>
                      <Label htmlFor="overtime_hours">Overtime Hours</Label>
                      <Input
                        id="overtime_hours"
                        type="number"
                        step="0.25"
                        min="0"
                        max="24"
                        value={formData.overtime_hours}
                        onChange={(e) => setFormData({ ...formData, overtime_hours: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="work_description">Work Description</Label>
                    <Input
                      id="work_description"
                      value={formData.work_description}
                      onChange={(e) => setFormData({ ...formData, work_description: e.target.value })}
                      placeholder="What work was completed?"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Add Entry
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 border-b pb-4">
          <Link
            href={`/projects/${projectId}/costing`}
            className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-md text-sm font-medium"
          >
            <DollarSign className="h-4 w-4" />
            Overview
          </Link>
          <Link
            href={`/projects/${projectId}/costing/crew`}
            className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-md text-sm font-medium"
          >
            <Users className="h-4 w-4" />
            Crew
          </Link>
          <Link
            href={`/projects/${projectId}/costing/timesheets`}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
          >
            <Clock className="h-4 w-4" />
            Timesheets
          </Link>
          <Link
            href={`/projects/${projectId}/costing/materials`}
            className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-md text-sm font-medium"
          >
            <Package className="h-4 w-4" />
            Materials
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalHours.toFixed(1)} hrs</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Labor Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalCost)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(approvedCost)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Time Entries</CardTitle>
              <CardDescription>All logged time for this project</CardDescription>
            </CardHeader>
            <CardContent>
              {timesheets.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No time entries yet. Click &quot;Log Time&quot; to add your first entry.
                </p>
              ) : (
                <div className="divide-y">
                  {timesheets.map((timesheet) => (
                    <div key={timesheet.id} className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {timesheet.crew_member?.first_name} {timesheet.crew_member?.last_name}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <span>{formatDate(timesheet.work_date)}</span>
                            <span>•</span>
                            <span>
                              {timesheet.regular_hours}h
                              {timesheet.overtime_hours > 0 && ` + ${timesheet.overtime_hours}h OT`}
                            </span>
                            {timesheet.work_description && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-xs">{timesheet.work_description}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium text-foreground">
                            {formatCurrency(timesheet.total_labor_cost)}
                          </p>
                          <Badge className={STATUS_COLORS[timesheet.status]}>
                            {STATUS_LABELS[timesheet.status]}
                          </Badge>
                        </div>
                        {(timesheet.status === 'draft' || timesheet.status === 'submitted') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApprove(timesheet)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
