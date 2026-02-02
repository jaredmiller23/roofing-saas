'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Users, Clock, Package, DollarSign, Plus, Pencil, UserX, Loader2 } from 'lucide-react'
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
  email?: string
  phone?: string
  employee_number?: string
  role: 'apprentice' | 'journeyman' | 'master' | 'foreman' | 'project_manager' | 'subcontractor'
  hourly_rate: number
  overtime_rate?: number
  is_active: boolean
  hire_date?: string
  notes?: string
}

const ROLE_LABELS: Record<string, string> = {
  apprentice: 'Apprentice',
  journeyman: 'Journeyman',
  master: 'Master',
  foreman: 'Foreman',
  project_manager: 'Project Manager',
  subcontractor: 'Subcontractor',
}

const ROLE_COLORS: Record<string, string> = {
  apprentice: 'bg-blue-100 text-blue-800',
  journeyman: 'bg-green-100 text-green-800',
  master: 'bg-purple-100 text-purple-800',
  foreman: 'bg-orange-100 text-orange-800',
  project_manager: 'bg-red-100 text-red-800',
  subcontractor: 'bg-gray-100 text-gray-800',
}

export default function CrewManagementPage() {
  const params = useParams()
  const projectId = params.id as string

  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingMember, setEditingMember] = useState<CrewMember | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    employee_number: '',
    role: 'journeyman' as CrewMember['role'],
    hourly_rate: '',
    overtime_rate: '',
    notes: '',
  })

  const fetchCrewMembers = async () => {
    try {
      const response = await apiFetch<{ crewMembers: CrewMember[] }>('/api/crew-members?active_only=false')
      if (response.crewMembers) {
        setCrewMembers(response.crewMembers)
      }
    } catch (error) {
      console.error('Failed to fetch crew members:', error)
      toast.error('Failed to load crew members')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCrewMembers()
  }, [])

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      employee_number: '',
      role: 'journeyman',
      hourly_rate: '',
      overtime_rate: '',
      notes: '',
    })
  }

  const openEditDialog = (member: CrewMember) => {
    setEditingMember(member)
    setFormData({
      first_name: member.first_name,
      last_name: member.last_name,
      email: member.email || '',
      phone: member.phone || '',
      employee_number: member.employee_number || '',
      role: member.role,
      hourly_rate: member.hourly_rate.toString(),
      overtime_rate: member.overtime_rate?.toString() || '',
      notes: member.notes || '',
    })
    setShowAddDialog(true)
  }

  const handleSave = async () => {
    if (!formData.first_name || !formData.last_name || !formData.hourly_rate) {
      toast.error('Please fill in all required fields')
      return
    }

    setSaving(true)
    try {
      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email || null,
        phone: formData.phone || null,
        employee_number: formData.employee_number || null,
        role: formData.role,
        hourly_rate: parseFloat(formData.hourly_rate),
        overtime_rate: formData.overtime_rate ? parseFloat(formData.overtime_rate) : null,
        notes: formData.notes || null,
      }

      if (editingMember) {
        await apiFetch('/api/crew-members', {
          method: 'PATCH',
          body: { id: editingMember.id, ...payload },
        })
        toast.success('Crew member updated')
      } else {
        await apiFetch('/api/crew-members', {
          method: 'POST',
          body: payload,
        })
        toast.success('Crew member added')
      }

      setShowAddDialog(false)
      setEditingMember(null)
      resetForm()
      fetchCrewMembers()
    } catch (error) {
      console.error('Failed to save crew member:', error)
      toast.error('Failed to save crew member')
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (member: CrewMember) => {
    if (!confirm(`Deactivate ${member.first_name} ${member.last_name}?`)) {
      return
    }

    try {
      await apiFetch(`/api/crew-members?id=${member.id}`, {
        method: 'DELETE',
      })
      toast.success('Crew member deactivated')
      fetchCrewMembers()
    } catch (error) {
      console.error('Failed to deactivate crew member:', error)
      toast.error('Failed to deactivate crew member')
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  const activeMembers = crewMembers.filter((m) => m.is_active)
  const inactiveMembers = crewMembers.filter((m) => !m.is_active)

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
              <h1 className="text-3xl font-bold text-foreground">Crew Management</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage crew members and labor rates
              </p>
            </div>
            <Dialog open={showAddDialog} onOpenChange={(open) => {
              setShowAddDialog(open)
              if (!open) {
                setEditingMember(null)
                resetForm()
              }
            }}>
              <DialogTrigger asChild>
                <Button size="lg" className="h-12">
                  <Plus className="h-5 w-5 mr-2" />
                  Add Crew Member
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{editingMember ? 'Edit Crew Member' : 'Add Crew Member'}</DialogTitle>
                  <DialogDescription>
                    {editingMember ? 'Update crew member information' : 'Add a new crew member to your team'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        placeholder="Smith"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="john@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(423) 555-1234"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="employee_number">Employee #</Label>
                      <Input
                        id="employee_number"
                        value={formData.employee_number}
                        onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
                        placeholder="EMP001"
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">Role *</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(value) => setFormData({ ...formData, role: value as CrewMember['role'] })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ROLE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="hourly_rate">Hourly Rate *</Label>
                      <Input
                        id="hourly_rate"
                        type="number"
                        step="0.01"
                        value={formData.hourly_rate}
                        onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                        placeholder="25.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="overtime_rate">Overtime Rate</Label>
                      <Input
                        id="overtime_rate"
                        type="number"
                        step="0.01"
                        value={formData.overtime_rate}
                        onChange={(e) => setFormData({ ...formData, overtime_rate: e.target.value })}
                        placeholder="37.50"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Default: 1.5x hourly</p>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Certifications, specialties, etc."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingMember ? 'Update' : 'Add'} Member
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
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
          >
            <Users className="h-4 w-4" />
            Crew
          </Link>
          <Link
            href={`/projects/${projectId}/costing/timesheets`}
            className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-md text-sm font-medium"
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

        {/* Crew Content */}
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          <>
            {/* Active Crew Members */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Active Crew Members ({activeMembers.length})</CardTitle>
                <CardDescription>Current team members available for work</CardDescription>
              </CardHeader>
              <CardContent>
                {activeMembers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No active crew members. Add your first crew member above.
                  </p>
                ) : (
                  <div className="divide-y">
                    {activeMembers.map((member) => (
                      <div key={member.id} className="py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {member.first_name[0]}{member.last_name[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {member.first_name} {member.last_name}
                              {member.employee_number && (
                                <span className="text-muted-foreground ml-2">#{member.employee_number}</span>
                              )}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={ROLE_COLORS[member.role]}>
                                {ROLE_LABELS[member.role]}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatCurrency(member.hourly_rate)}/hr
                              </span>
                              {member.overtime_rate && (
                                <span className="text-sm text-muted-foreground">
                                  • OT: {formatCurrency(member.overtime_rate)}/hr
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(member)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeactivate(member)}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Inactive Crew Members */}
            {inactiveMembers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-muted-foreground">
                    Inactive Crew Members ({inactiveMembers.length})
                  </CardTitle>
                  <CardDescription>Former team members</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="divide-y opacity-60">
                    {inactiveMembers.map((member) => (
                      <div key={member.id} className="py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-sm font-medium text-muted-foreground">
                              {member.first_name[0]}{member.last_name[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-muted-foreground">
                              {member.first_name} {member.last_name}
                            </p>
                            <Badge variant="outline" className="mt-1">
                              {ROLE_LABELS[member.role]}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(member)}
                        >
                          Reactivate
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        </div>
      </div>
    </div>
  )
}
