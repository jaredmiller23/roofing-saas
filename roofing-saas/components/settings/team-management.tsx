'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Loader2, MoreHorizontal, Plus, Shield, UserX, Trash2 } from 'lucide-react'
import { InviteUserDialog } from './invite-user-dialog'
import { createClient } from '@/lib/supabase/client'

interface TeamMember {
  id: string
  user_id: string
  email: string
  name: string | null
  role: string
  status: string
  joined_at: string
  last_sign_in_at: string | null
  deactivated_at: string | null
  deactivation_reason: string | null
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never'

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' {
  switch (role) {
    case 'owner':
      return 'outline'
    case 'admin':
      return 'default'
    default:
      return 'secondary'
  }
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-8" />
        </div>
      ))}
    </div>
  )
}

export function TeamManagement() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)

  // Deactivate dialog state
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState<TeamMember | null>(null)
  const [deactivateReason, setDeactivateReason] = useState('')
  const [deactivating, setDeactivating] = useState(false)

  // Remove dialog state
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null)
  const [removing, setRemoving] = useState(false)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/team')
      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.error?.message || 'Failed to load team members')
        return
      }

      setMembers(result.data.members)
    } catch {
      setError('An unexpected error occurred while loading team members')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Get current user ID from Supabase client
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUserId(data.user.id)
      }
    })

    fetchMembers()
  }, [fetchMembers])

  const handleChangeRole = async (member: TeamMember, newRole: string) => {
    try {
      const response = await fetch(`/api/admin/team/${member.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        toast.error(result.error?.message || 'Failed to update role')
        return
      }

      toast.success(`Updated ${member.name || member.email} to ${newRole}`)
      fetchMembers()
    } catch {
      toast.error('An unexpected error occurred')
    }
  }

  const handleDeactivate = async () => {
    if (!deactivateTarget) return

    setDeactivating(true)
    try {
      const response = await fetch(`/api/admin/team/${deactivateTarget.user_id}/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: deactivateReason || undefined }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        toast.error(result.error?.message || 'Failed to deactivate user')
        return
      }

      toast.success(`${deactivateTarget.name || deactivateTarget.email} has been deactivated`)
      setDeactivateDialogOpen(false)
      setDeactivateTarget(null)
      setDeactivateReason('')
      fetchMembers()
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setDeactivating(false)
    }
  }

  const handleRemove = async () => {
    if (!removeTarget) return

    setRemoving(true)
    try {
      const response = await fetch(`/api/admin/team/${removeTarget.user_id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        toast.error(result.error?.message || 'Failed to remove user')
        return
      }

      toast.success(`${removeTarget.name || removeTarget.email} has been removed from the team`)
      setRemoveDialogOpen(false)
      setRemoveTarget(null)
      fetchMembers()
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setRemoving(false)
    }
  }

  const canShowActions = (member: TeamMember): boolean => {
    // No actions for owner or current user
    if (member.role === 'owner') return false
    if (member.user_id === currentUserId) return false
    return true
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Team Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage your team members, roles, and permissions
            </p>
          </div>

          <Button className="gap-2" onClick={() => setInviteDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Invite Member
          </Button>
        </div>

        {/* Content */}
        <div className="bg-card rounded-lg border border-border">
          {loading ? (
            <div className="p-6">
              <TableSkeleton />
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button variant="outline" onClick={fetchMembers}>
                Try Again
              </Button>
            </div>
          ) : members.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No team members found. Invite someone to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Sign-In</TableHead>
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium text-foreground">
                      {member.name || '\u2014'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          member.status === 'active'
                            ? 'bg-green-500/15 text-green-500 border-green-500/20'
                            : 'bg-red-500/15 text-red-500 border-red-500/20'
                        }
                      >
                        {member.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRelativeTime(member.last_sign_in_at)}
                    </TableCell>
                    <TableCell>
                      {canShowActions(member) ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              aria-label={`Actions for ${member.name || member.email}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <Shield className="mr-2 h-4 w-4" />
                                Change Role
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                <DropdownMenuItem
                                  onClick={() => handleChangeRole(member, 'admin')}
                                  disabled={member.role === 'admin'}
                                >
                                  Admin
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleChangeRole(member, 'user')}
                                  disabled={member.role === 'user'}
                                >
                                  User
                                </DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>

                            <DropdownMenuSeparator />

                            {member.status === 'active' && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setDeactivateTarget(member)
                                  setDeactivateDialogOpen(true)
                                }}
                              >
                                <UserX className="mr-2 h-4 w-4" />
                                Deactivate
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => {
                                setRemoveTarget(member)
                                setRemoveDialogOpen(true)
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Invite Dialog */}
        <InviteUserDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          onSuccess={fetchMembers}
        />

        {/* Deactivate Confirmation Dialog */}
        <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate Team Member</AlertDialogTitle>
              <AlertDialogDescription>
                This will deactivate{' '}
                <span className="font-semibold text-foreground">
                  {deactivateTarget?.name || deactivateTarget?.email}
                </span>
                . They will no longer be able to sign in or access the application. Their data will be preserved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <Label htmlFor="deactivate-reason">Reason (optional)</Label>
              <Input
                id="deactivate-reason"
                placeholder="e.g., Left the company"
                value={deactivateReason}
                onChange={(e) => setDeactivateReason(e.target.value)}
                className="mt-2"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={deactivating}
                onClick={() => {
                  setDeactivateReason('')
                  setDeactivateTarget(null)
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  handleDeactivate()
                }}
                disabled={deactivating}
              >
                {deactivating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Deactivate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Remove Confirmation Dialog */}
        <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove{' '}
                <span className="font-semibold text-foreground">
                  {removeTarget?.name || removeTarget?.email}
                </span>{' '}
                from the team? This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={removing}
                onClick={() => setRemoveTarget(null)}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={(e) => {
                  e.preventDefault()
                  handleRemove()
                }}
                disabled={removing}
              >
                {removing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
