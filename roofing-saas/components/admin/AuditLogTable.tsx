'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Eye, User, Package, FileText, Settings, Calendar } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import type { AuditEntry, AuditActionType, AuditEntityType } from '@/lib/audit/audit-types'

interface AuditLogTableProps {
  entries: AuditEntry[]
  loading: boolean
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  onEntrySelect: (entry: AuditEntry) => void
}

const actionColors: Record<AuditActionType, string> = {
  create: 'bg-green-100 text-green-800 hover:bg-green-200',
  update: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  delete: 'bg-red-100 text-red-800 hover:bg-red-200',
}

const entityIcons: Record<AuditEntityType, React.ComponentType<{ className?: string }>> = {
  contact: User,
  project: Package,
  estimate: FileText,
  user: User,
  tenant: Settings,
  settings: Settings,
  document: FileText,
}

function LoadingSkeleton() {
  return (
    <>
      {[...Array(10)].map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-16" />
          </TableCell>
          <TableCell>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-20" />
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-40" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-8 w-8" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

function EmptyState() {
  return (
    <TableRow>
      <TableCell colSpan={7} className="text-center py-8">
        <div className="flex flex-col items-center space-y-2">
          <Calendar className="h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium text-muted-foreground">No audit entries found</p>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters or check back later
          </p>
        </div>
      </TableCell>
    </TableRow>
  )
}

export function AuditLogTable({
  entries,
  loading,
  page,
  totalPages,
  onPageChange,
  onEntrySelect,
}: AuditLogTableProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  const formatEntityId = (entityType: AuditEntityType, entityId: string): string => {
    // Show first 8 characters of UUID
    const shortId = entityId.slice(0, 8)
    return `${entityType}:${shortId}`
  }

  const getUserInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatTimestamp = (timestamp: string, detailed: boolean = false): string => {
    const date = new Date(timestamp)

    if (detailed) {
      return format(date, 'PPpp') // e.g., "Apr 29, 2023 at 11:45:32 AM"
    }

    return formatDistanceToNow(date, { addSuffix: true })
  }

  const generatePaginationItems = () => {
    const items = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(i)
      }
    } else {
      if (page <= 3) {
        items.push(1, 2, 3, 4, '...', totalPages)
      } else if (page >= totalPages - 2) {
        items.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        items.push(1, '...', page - 1, page, page + 1, '...', totalPages)
      }
    }

    return items
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead className="w-20">Action</TableHead>
              <TableHead className="w-32">Entity</TableHead>
              <TableHead>Entity ID</TableHead>
              <TableHead className="w-24">Source</TableHead>
              <TableHead className="w-16">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <LoadingSkeleton />}

            {!loading && entries.length === 0 && <EmptyState />}

            {!loading &&
              entries.map((entry) => {
                const EntityIcon = entityIcons[entry.entity_type]

                return (
                  <TableRow
                    key={entry.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onMouseEnter={() => setHoveredRow(entry.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    onClick={() => onEntrySelect(entry)}
                  >
                    <TableCell className="font-medium">
                      <div className="text-sm">
                        {formatTimestamp(entry.timestamp)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(entry.timestamp), 'HH:mm:ss')}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getUserInitials(entry.user_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">{entry.user_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {entry.user_email}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`${actionColors[entry.action_type]} capitalize`}
                      >
                        {entry.action_type}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <EntityIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="capitalize text-sm">{entry.entity_type}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {formatEntityId(entry.entity_type, entry.entity_id)}
                      </code>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {String(entry.metadata?.source || 'api')}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 w-8 p-0 ${
                          hoveredRow === entry.id ? 'bg-primary text-primary-foreground' : ''
                        }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          onEntrySelect(entry)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!loading && entries.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (page > 1) onPageChange(page - 1)
              }}
              disabled={page <= 1}
            >
              Previous
            </Button>

            <div className="flex items-center gap-1">
              {generatePaginationItems().map((item, index) => (
                <div key={index}>
                  {item === '...' ? (
                    <span className="px-3 py-1 text-muted-foreground">…</span>
                  ) : (
                    <Button
                      variant={item === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        if (typeof item === 'number') onPageChange(item)
                      }}
                      className="w-10"
                    >
                      {item}
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (page < totalPages) onPageChange(page + 1)
              }}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}