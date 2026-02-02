'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Globe,
  Monitor,
  Code,
  ArrowRight,
  Plus,
  Minus,
  Edit3,
} from 'lucide-react'
import { format } from 'date-fns'
import { calculateAuditDiff } from '@/lib/audit/audit-types'
import type { AuditEntry, AuditDiff, AuditActionType } from '@/lib/audit/audit-types'

interface AuditEntryDetailProps {
  entry: AuditEntry
}

const actionColors: Record<AuditActionType, string> = {
  create: 'bg-green-500/10 text-green-500',
  update: 'bg-blue-500/10 text-blue-500',
  delete: 'bg-red-500/10 text-red-500',
}

const actionIcons: Record<AuditActionType, React.ComponentType<{ className?: string }>> = {
  create: Plus,
  update: Edit3,
  delete: Minus,
}

const diffTypeColors = {
  added: 'bg-green-500/10 border-green-500/30 text-green-500',
  removed: 'bg-red-500/10 border-red-500/30 text-red-500',
  changed: 'bg-blue-500/10 border-blue-500/30 text-blue-500',
}

const diffTypeIcons = {
  added: Plus,
  removed: Minus,
  changed: ArrowRight,
}

function JsonViewer({ data, title }: { data: Record<string, unknown> | null; title: string }) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic">No data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <pre className="text-xs font-mono bg-muted p-3 rounded">
            {JSON.stringify(data, null, 2)}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null'
  }

  if (typeof value === 'string') {
    // Handle empty strings
    if (value === '') return '(empty string)'
    return value
  }

  if (typeof value === 'boolean') {
    return String(value)
  }

  if (typeof value === 'number') {
    return String(value)
  }

  if (Array.isArray(value)) {
    return `[${value.length} items]`
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }

  return String(value)
}

function DiffTable({ diff }: { diff: AuditDiff[] }) {
  if (!diff || diff.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Code className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No changes detected</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {diff.map((change, index) => {
        const Icon = diffTypeIcons[change.type]

        return (
          <div
            key={index}
            className={`border rounded-lg p-4 ${diffTypeColors[change.type]}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-4 w-4" />
              <span className="font-medium text-sm">{change.field}</span>
              <Badge variant="outline" className="text-xs capitalize">
                {change.type}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {change.type !== 'added' && (
                <div>
                  <div className="font-medium text-xs text-muted-foreground mb-1">
                    Previous Value
                  </div>
                  <div className="bg-card/50 p-2 rounded border">
                    <code className="text-xs">{formatValue(change.old_value)}</code>
                  </div>
                </div>
              )}

              {change.type !== 'removed' && (
                <div>
                  <div className="font-medium text-xs text-muted-foreground mb-1">
                    New Value
                  </div>
                  <div className="bg-card/50 p-2 rounded border">
                    <code className="text-xs">{formatValue(change.new_value)}</code>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function AuditEntryDetail({ entry }: AuditEntryDetailProps) {
  const [activeTab, setActiveTab] = useState('overview')

  // Calculate diff between before and after values
  const diff = useMemo(() => {
    return calculateAuditDiff(entry.before_values, entry.after_values)
  }, [entry.before_values, entry.after_values])

  const ActionIcon = actionIcons[entry.action_type]

  const getUserInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatMetadata = (metadata: Record<string, unknown> | null) => {
    if (!metadata) return {}

    // Remove common fields that are displayed elsewhere
    const { ip_address: _ip_address, user_agent: _user_agent, ...displayMetadata } = metadata
    return displayMetadata
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className={`p-2 rounded-lg ${actionColors[entry.action_type]}`}>
            <ActionIcon className="h-5 w-5" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold capitalize">
                {entry.action_type} {entry.entity_type}
              </h3>
              <Badge variant="outline" className="text-xs">
                {entry.entity_id.slice(0, 8)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {format(new Date(entry.timestamp), 'PPpp')}
            </p>
          </div>
        </div>
      </div>

      {/* User and context info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarFallback>
                  {getUserInitials(entry.user_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{entry.user_name}</div>
                <div className="text-sm text-muted-foreground">{entry.user_email}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-muted rounded-lg">
                <Globe className="h-4 w-4" />
              </div>
              <div>
                <div className="font-medium text-sm">IP Address</div>
                <div className="text-sm text-muted-foreground">
                  {entry.ip_address || 'Unknown'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-muted rounded-lg">
                <Monitor className="h-4 w-4" />
              </div>
              <div>
                <div className="font-medium text-sm">User Agent</div>
                <div className="text-sm text-muted-foreground truncate" title={entry.user_agent || 'Unknown'}>
                  {entry.user_agent ? entry.user_agent.slice(0, 30) + '...' : 'Unknown'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed information */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="changes">Changes</TabsTrigger>
          <TabsTrigger value="raw">Raw Data</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <CardDescription>
                High-level information about this audit entry
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium">Action Type:</span>
                  <Badge className={`ml-2 ${actionColors[entry.action_type]}`}>
                    {entry.action_type}
                  </Badge>
                </div>
                <div>
                  <span className="text-sm font-medium">Entity Type:</span>
                  <span className="ml-2 capitalize">{entry.entity_type}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">Entity ID:</span>
                  <code className="ml-2 text-xs bg-muted px-2 py-1 rounded">
                    {entry.entity_id}
                  </code>
                </div>
                <div>
                  <span className="text-sm font-medium">Tenant ID:</span>
                  <code className="ml-2 text-xs bg-muted px-2 py-1 rounded">
                    {entry.tenant_id}
                  </code>
                </div>
              </div>

              {diff.length > 0 && (
                <div>
                  <span className="text-sm font-medium">Changes:</span>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {diff.map((change, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className={`text-xs ${diffTypeColors[change.type]}`}
                      >
                        {change.field} ({change.type})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="changes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Field Changes</CardTitle>
              <CardDescription>
                Detailed view of what changed in this operation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DiffTable diff={diff} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="raw" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <JsonViewer data={entry.before_values} title="Before Values" />
            <JsonViewer data={entry.after_values} title="After Values" />
          </div>
        </TabsContent>

        <TabsContent value="metadata" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Request Context</CardTitle>
              <CardDescription>
                Additional metadata about the request that triggered this audit entry
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Timestamp:</span>
                  <div className="mt-1 text-muted-foreground">
                    {format(new Date(entry.timestamp), 'PPpp')}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Created:</span>
                  <div className="mt-1 text-muted-foreground">
                    {format(new Date(entry.created_at), 'PPpp')}
                  </div>
                </div>
                <div>
                  <span className="font-medium">IP Address:</span>
                  <div className="mt-1 text-muted-foreground font-mono">
                    {entry.ip_address || 'Not recorded'}
                  </div>
                </div>
                <div>
                  <span className="font-medium">User Agent:</span>
                  <div className="mt-1 text-muted-foreground text-xs break-all">
                    {entry.user_agent || 'Not recorded'}
                  </div>
                </div>
              </div>

              <Separator />

              {Object.keys(formatMetadata(entry.metadata)).length > 0 ? (
                <div>
                  <span className="font-medium">Additional Metadata:</span>
                  <div className="mt-2">
                    <ScrollArea className="h-48">
                      <pre className="text-xs font-mono bg-muted p-3 rounded">
                        {JSON.stringify(formatMetadata(entry.metadata), null, 2)}
                      </pre>
                    </ScrollArea>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No additional metadata available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}