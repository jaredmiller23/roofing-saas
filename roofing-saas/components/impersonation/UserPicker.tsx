'use client'

import { useState, useEffect } from 'react'
import { Search, User, UserCog } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { UserForImpersonation } from '@/lib/impersonation/types'

interface UserPickerProps {
  onUserSelect: (user: UserForImpersonation) => void
  disabled?: boolean
}

/**
 * UserPicker
 * Dropdown component for admins to select a user to impersonate
 * Features:
 * - Search users by email/name
 * - Filter out admins (can't impersonate admins)
 * - Show role and last active status
 */
export function UserPicker({ onUserSelect, disabled = false }: UserPickerProps) {
  const [users, setUsers] = useState<UserForImpersonation[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserForImpersonation[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  // Fetch users when dropdown opens
  useEffect(() => {
    if (isOpen && users.length === 0) {
      fetchUsers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

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
      const response = await fetch('/api/admin/users?exclude_admins=true')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
        setFilteredUsers(data.users || [])
      } else {
        console.error('Failed to fetch users')
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUserSelect = (user: UserForImpersonation) => {
    setIsOpen(false)
    setSearchQuery('')
    onUserSelect(user)
  }

  const formatLastActive = (dateString?: string): string => {
    if (!dateString) return 'Never'

    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getUserDisplayName = (user: UserForImpersonation): string => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim()
    }
    return user.email
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="flex items-center gap-2"
        >
          <UserCog className="h-4 w-4" />
          <span className="hidden md:inline">Impersonate User</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Select User to Impersonate</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Search input */}
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* User list */}
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-gray-500">
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              {searchQuery ? 'No users found' : 'No users available'}
            </div>
          ) : (
            filteredUsers.map((user) => (
              <DropdownMenuItem
                key={user.id}
                onClick={() => handleUserSelect(user)}
                className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50"
              >
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {getUserDisplayName(user)}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {user.email}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                      {user.role}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatLastActive(user.last_active)}
                    </span>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
