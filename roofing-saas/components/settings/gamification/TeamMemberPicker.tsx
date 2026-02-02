'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api/client'
import { Check, Search, User, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { UserForImpersonation } from '@/lib/impersonation/types'

interface TeamMemberPickerProps {
  selectedUserIds: string[]
  onSelectionChange: (userIds: string[]) => void
  disabled?: boolean
}

/**
 * TeamMemberPicker
 * Multi-select component for selecting team members for challenges
 * Features:
 * - Search users by email/name
 * - "All team members" option (empty array means all)
 * - Show selected count and member badges
 * - Filter out admins (they shouldn't participate in challenges)
 */
export function TeamMemberPicker({
  selectedUserIds,
  onSelectionChange,
  disabled = false
}: TeamMemberPickerProps) {
  const [users, setUsers] = useState<UserForImpersonation[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserForImpersonation[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const isAllSelected = selectedUserIds.length === 0

  // Fetch users when popover opens
  useEffect(() => {
    if (isOpen && users.length === 0) {
      fetchUsers()
    }
  }, [isOpen, users.length])

  // Filter users based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = users.filter(
        (user) =>
          user.email.toLowerCase().includes(query) ||
          user.first_name?.toLowerCase().includes(query) ||
          user.last_name?.toLowerCase().includes(query)
      )
      setFilteredUsers(filtered)
    }
  }, [searchQuery, users])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const data = await apiFetch<{ users: UserForImpersonation[] }>('/api/admin/users?exclude_admins=true')
      setUsers(data.users || [])
      setFilteredUsers(data.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAllToggle = () => {
    if (isAllSelected) {
      // If currently all selected, select none
      onSelectionChange([])
    } else {
      // If some or none selected, select all
      onSelectionChange([])
    }
  }

  const handleUserToggle = (userId: string) => {
    if (isAllSelected) {
      // If all were selected, start with just this user
      onSelectionChange([userId])
    } else {
      // Normal toggle logic
      const newSelection = selectedUserIds.includes(userId)
        ? selectedUserIds.filter(id => id !== userId)
        : [...selectedUserIds, userId]
      onSelectionChange(newSelection)
    }
  }

  const getUserDisplayName = (user: UserForImpersonation): string => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim()
    }
    return user.email
  }

  const getSelectedUsers = (): UserForImpersonation[] => {
    if (isAllSelected) return []
    return users.filter(user => selectedUserIds.includes(user.id))
  }

  const getDisplayText = (): string => {
    if (isAllSelected) {
      return 'All team members'
    }

    const selectedCount = selectedUserIds.length
    if (selectedCount === 0) {
      return 'Select team members'
    }

    return `${selectedCount} member${selectedCount === 1 ? '' : 's'} selected`
  }

  return (
    <div className="space-y-2">
      <Label>Team Members</Label>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className="w-full justify-between text-left"
          >
            <span className="truncate">
              {getDisplayText()}
            </span>
            <Users className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-80 p-0">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <ScrollArea className="max-h-[300px]">
            <div className="p-1">
              {/* All Team Members Option */}
              <div
                className="flex items-center space-x-2 rounded-md p-2 hover:bg-accent cursor-pointer"
                onClick={handleAllToggle}
              >
                <div className="w-4 h-4 border border-input rounded flex items-center justify-center bg-background">
                  {isAllSelected && <Check className="h-3 w-3" />}
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="font-medium">All team members</span>
                </div>
              </div>

              {/* Individual Users */}
              <div className="relative">
                {isLoading && (
                  <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                    <div className="p-4 text-center text-sm text-muted-foreground">Loading users...</div>
                  </div>
                )}
                {filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {isLoading ? 'Loading...' : searchQuery ? 'No users found' : 'No users available'}
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-2 rounded-md p-2 hover:bg-accent cursor-pointer"
                    onClick={() => handleUserToggle(user.id)}
                  >
                    <div className="w-4 h-4 border border-input rounded flex items-center justify-center bg-background">
                      {!isAllSelected && selectedUserIds.includes(user.id) && (
                        <Check className="h-3 w-3" />
                      )}
                    </div>
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-3 w-3 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">
                          {getUserDisplayName(user)}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                ))
                )}
              </div>
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Selected Members Display */}
      {!isAllSelected && selectedUserIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {getSelectedUsers().map((user) => (
            <Badge
              key={user.id}
              variant="secondary"
              className="text-xs"
            >
              {getUserDisplayName(user)}
              <button
                type="button"
                className="ml-1 hover:text-destructive"
                onClick={() => handleUserToggle(user.id)}
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {isAllSelected
          ? 'Challenge will apply to all current and future team members'
          : selectedUserIds.length === 0
          ? 'Select specific team members or choose "All team members"'
          : `Challenge will apply to ${selectedUserIds.length} selected member${selectedUserIds.length === 1 ? '' : 's'}`
        }
      </p>
    </div>
  )
}