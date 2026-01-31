'use client'

import { useState, useEffect } from 'react'
import { Users, UserPlus, Mail, Shield, Trash2, Crown, Clock, MoreVertical, UserX, UserCheck, Filter } from 'lucide-react'
import { apiFetch, ApiClientError } from '@/lib/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface TeamMember {
  id: string
  user_id: string
  email: string
  name: string | null
  role: string
  status: 'active' | 'deactivated' | 'suspended' | 'pending'
  joined_at: string
  last_sign_in_at: string | null
  deactivated_at: string | null
  deactivation_reason: string | null
}

interface InviteFormData {
  email: string
  name: string
  role: 'user' | 'admin'
}

/**
 * TeamSettings
 * Manage team members: invite, view, change roles, remove
 */
export function TeamSettings() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Invite dialog state
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [inviteForm, setInviteForm] = useState<InviteFormData>({
    email: '',
    name: '',
    role: 'user',
  })

  // Remove confirmation state
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  // Role change state
  const [roleChangeInProgress, setRoleChangeInProgress] = useState<string | null>(null)

  // Deactivation state
  const [memberToDeactivate, setMemberToDeactivate] = useState<TeamMember | null>(null)
  const [deactivationReason, setDeactivationReason] = useState('')
  const [isDeactivating, setIsDeactivating] = useState(false)

  // Reactivation state
  const [memberToReactivate, setMemberToReactivate] = useState<TeamMember | null>(null)
  const [isReactivating, setIsReactivating] = useState(false)

  // Filter state
  const [showDeactivated, setShowDeactivated] = useState(false)

  // Load team members
  const loadMembers = async () => {
    try {
      setIsLoading(true)
      const data = await apiFetch<{ members: TeamMember[]; total: number }>('/api/admin/team')
      setMembers(data.members || [])
    } catch (err) {
      console.error('Error loading team members:', err)
      if (err instanceof ApiClientError && err.statusCode === 403) {
        setError('You do not have permission to manage the team')
      } else {
        setError('Failed to load team members')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadMembers()
  }, [])

  // Clear messages after delay
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const handleInvite = async () => {
    if (!inviteForm.email || !inviteForm.name) {
      setError('Please fill in all fields')
      return
    }

    try {
      setIsInviting(true)
      setError(null)

      const data = await apiFetch<{ message?: string }>('/api/admin/team', {
        method: 'POST',
        body: inviteForm,
      })

      setSuccessMessage(data.message || 'Team member invited successfully')
      setIsInviteOpen(false)
      setInviteForm({ email: '', name: '', role: 'user' })
      loadMembers()
    } catch (err) {
      console.error('Error inviting team member:', err)
      setError(err instanceof ApiClientError ? err.message : 'Failed to invite team member')
    } finally {
      setIsInviting(false)
    }
  }

  const handleRoleChange = async (member: TeamMember, newRole: string) => {
    try {
      setRoleChangeInProgress(member.user_id)
      setError(null)

      await apiFetch(`/api/admin/team/${member.user_id}`, {
        method: 'PATCH',
        body: { role: newRole },
      })

      setSuccessMessage(`Updated ${member.name || member.email}'s role to ${newRole}`)
      loadMembers()
    } catch (err) {
      console.error('Error updating role:', err)
      setError(err instanceof ApiClientError ? err.message : 'Failed to update role')
    } finally {
      setRoleChangeInProgress(null)
    }
  }

  const handleRemove = async () => {
    if (!memberToRemove) return

    try {
      setIsRemoving(true)
      setError(null)

      await apiFetch(`/api/admin/team/${memberToRemove.user_id}`, {
        method: 'DELETE',
      })

      setSuccessMessage(`Removed ${memberToRemove.name || memberToRemove.email} from the team`)
      setMemberToRemove(null)
      loadMembers()
    } catch (err) {
      console.error('Error removing team member:', err)
      setError(err instanceof ApiClientError ? err.message : 'Failed to remove team member')
    } finally {
      setIsRemoving(false)
    }
  }

  const handleDeactivate = async () => {
    if (!memberToDeactivate) return

    try {
      setIsDeactivating(true)
      setError(null)

      await apiFetch(`/api/admin/team/${memberToDeactivate.user_id}/deactivate`, {
        method: 'POST',
        body: { reason: deactivationReason || undefined },
      })

      setSuccessMessage(`Deactivated ${memberToDeactivate.name || memberToDeactivate.email}'s account`)
      setMemberToDeactivate(null)
      setDeactivationReason('')
      loadMembers()
    } catch (err) {
      console.error('Error deactivating team member:', err)
      setError(err instanceof ApiClientError ? err.message : 'Failed to deactivate team member')
    } finally {
      setIsDeactivating(false)
    }
  }

  const handleReactivate = async () => {
    if (!memberToReactivate) return

    try {
      setIsReactivating(true)
      setError(null)

      await apiFetch(`/api/admin/team/${memberToReactivate.user_id}/reactivate`, {
        method: 'POST',
      })

      setSuccessMessage(`Reactivated ${memberToReactivate.name || memberToReactivate.email}'s account`)
      setMemberToReactivate(null)
      loadMembers()
    } catch (err) {
      console.error('Error reactivating team member:', err)
      setError(err instanceof ApiClientError ? err.message : 'Failed to reactivate team member')
    } finally {
      setIsReactivating(false)
    }
  }

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return (
          <Badge className="bg-primary text-primary-foreground">
            <Crown className="h-3 w-3 mr-1" />
            Owner
          </Badge>
        )
      case 'admin':
        return (
          <Badge className="bg-secondary text-secondary-foreground">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            User
          </Badge>
        )
    }
  }

  const getStatusBadge = (status: TeamMember['status']) => {
    switch (status) {
      case 'deactivated':
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
            <UserX className="h-3 w-3 mr-1" />
            Deactivated
          </Badge>
        )
      case 'suspended':
        return (
          <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">
            Suspended
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
            Pending
          </Badge>
        )
      default:
        return null // Active users don't need a badge
    }
  }

  // Filter members based on status
  const filteredMembers = showDeactivated
    ? members
    : members.filter(m => m.status === 'active' || !m.status)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-48 w-full bg-muted animate-pulse rounded-lg" />
        <div className="h-64 w-full bg-muted animate-pulse rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Success message */}
      {successMessage && (
        <Alert className="border-green-500 bg-green-500/10">
          <AlertTitle className="text-green-500">Success</AlertTitle>
          <AlertDescription className="text-foreground">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Error message */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Team Members Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
              <CardDescription>
                Manage your team members and their access levels
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={showDeactivated ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setShowDeactivated(!showDeactivated)}
              >
                <Filter className="h-4 w-4 mr-2" />
                {showDeactivated ? 'Show All' : 'Active Only'}
              </Button>
              <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join your team. They will receive an email to set their password.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={inviteForm.name}
                      onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={inviteForm.role}
                      onValueChange={(value: 'user' | 'admin') => setInviteForm({ ...inviteForm, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User - Standard access</SelectItem>
                        <SelectItem value="admin">Admin - Full access including settings</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleInvite} disabled={isInviting}>
                    {isInviting ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No team members yet. Invite your first team member to get started.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className={`py-4 flex items-center justify-between ${
                    member.status === 'deactivated' ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      member.status === 'deactivated'
                        ? 'bg-muted'
                        : 'bg-primary/20'
                    }`}>
                      <span className={`text-sm font-semibold ${
                        member.status === 'deactivated'
                          ? 'text-muted-foreground'
                          : 'text-primary'
                      }`}>
                        {(member.name || member.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">
                          {member.name || 'No name'}
                        </span>
                        {getRoleBadge(member.role)}
                        {getStatusBadge(member.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {member.status === 'deactivated' && member.deactivated_at
                            ? `Deactivated: ${formatDate(member.deactivated_at)}`
                            : `Last active: ${formatDate(member.last_sign_in_at)}`}
                        </span>
                      </div>
                      {member.status === 'deactivated' && member.deactivation_reason && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Reason: {member.deactivation_reason}
                        </p>
                      )}
                    </div>
                  </div>
                  {member.role !== 'owner' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={roleChangeInProgress === member.user_id}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {member.status !== 'deactivated' && (
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(member, member.role === 'admin' ? 'user' : 'admin')}
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            {member.role === 'admin' ? 'Remove Admin Access' : 'Make Admin'}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {member.status === 'deactivated' ? (
                          <DropdownMenuItem
                            className="text-green-500 focus:text-green-500"
                            onClick={() => setMemberToReactivate(member)}
                          >
                            <UserCheck className="h-4 w-4 mr-2" />
                            Reactivate Account
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="text-orange-500 focus:text-orange-500"
                            onClick={() => setMemberToDeactivate(member)}
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Deactivate Account
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setMemberToRemove(member)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove from Team
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role explanations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Badge className="bg-primary text-primary-foreground mt-0.5">
                <Crown className="h-3 w-3 mr-1" />
                Owner
              </Badge>
              <p className="text-sm text-muted-foreground">
                Full access to everything including billing, team management, and all settings.
                There can only be one owner.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Badge className="bg-secondary text-secondary-foreground mt-0.5">
                <Shield className="h-3 w-3 mr-1" />
                Admin
              </Badge>
              <p className="text-sm text-muted-foreground">
                Full access to all features and settings except billing and owner-level actions.
                Can manage team members.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">
                User
              </Badge>
              <p className="text-sm text-muted-foreground">
                Standard access to CRM features: contacts, projects, pipeline, calendar, and communication tools.
                Cannot access admin settings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Remove confirmation dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={(open: boolean) => !open && setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{memberToRemove?.name || memberToRemove?.email}</strong> from the team?
              They will lose access to all data and features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate confirmation dialog */}
      <AlertDialog open={!!memberToDeactivate} onOpenChange={(open: boolean) => {
        if (!open) {
          setMemberToDeactivate(null)
          setDeactivationReason('')
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate <strong>{memberToDeactivate?.name || memberToDeactivate?.email}</strong>?
              They will be logged out immediately and won&apos;t be able to access the system until reactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input
              id="reason"
              placeholder="e.g., Left the company, temporary leave, etc."
              value={deactivationReason}
              onChange={(e) => setDeactivationReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              disabled={isDeactivating}
              className="bg-orange-500 text-foreground hover:bg-orange-600"
            >
              {isDeactivating ? 'Deactivating...' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate confirmation dialog */}
      <AlertDialog open={!!memberToReactivate} onOpenChange={(open: boolean) => !open && setMemberToReactivate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reactivate <strong>{memberToReactivate?.name || memberToReactivate?.email}</strong>?
              They will be able to log in and access the system again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReactivate}
              disabled={isReactivating}
              className="bg-green-500 text-foreground hover:bg-green-600"
            >
              {isReactivating ? 'Reactivating...' : 'Reactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
