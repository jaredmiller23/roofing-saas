'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from '@/lib/i18n/navigation'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Search,
  Building2,
  CreditCard,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react'

interface TenantSummary {
  id: string
  name: string
  subscription_tier: string | null
  subscription_status: string | null
  user_count: number
  created_at: string | null
  onboarding_completed: boolean
  is_active: boolean
}

interface Metrics {
  total_tenants: number
  active_tenants: number
  total_users: number
  mrr: number
  trials_active: number
  plans_breakdown: Record<string, number>
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'N/A'

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

function getTierBadgeVariant(tier: string | null): 'default' | 'secondary' | 'outline' {
  switch (tier?.toLowerCase()) {
    case 'enterprise':
      return 'default'
    case 'professional':
      return 'secondary'
    default:
      return 'outline'
  }
}

function getStatusColor(status: string | null): string {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'bg-green-500/15 text-green-500 border-green-500/20'
    case 'trialing':
      return 'bg-blue-500/15 text-blue-500 border-blue-500/20'
    case 'past_due':
      return 'bg-orange-500/15 text-orange-500 border-orange-500/20'
    case 'canceled':
    case 'cancelled':
      return 'bg-red-500/15 text-red-500 border-red-500/20'
    default:
      return 'bg-muted/50 text-muted-foreground border-border'
  }
}

function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-5 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-16" />
      </CardContent>
    </Card>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-5" />
        </div>
      ))}
    </div>
  )
}

export function TenantList() {
  const router = useRouter()
  const [tenants, setTenants] = useState<TenantSummary[]>([])
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const fetchTenants = useCallback(async (search?: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)

      const response = await fetch(`/api/admin/tenants?${params.toString()}`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.error?.message || 'Failed to load tenants')
        return
      }

      setTenants(result.data.tenants)
    } catch {
      setError('An unexpected error occurred while loading tenants')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true)
    try {
      const response = await fetch('/api/admin/tenants/metrics')
      const result = await response.json()

      if (!response.ok || !result.success) {
        toast.error(result.error?.message || 'Failed to load metrics')
        return
      }

      setMetrics(result.data)
    } catch {
      toast.error('Failed to load metrics')
    } finally {
      setMetricsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTenants()
    fetchMetrics()
  }, [fetchTenants, fetchMetrics])

  const handleSearch = () => {
    setSearchQuery(searchInput)
    fetchTenants(searchInput)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleRefresh = () => {
    fetchTenants(searchQuery)
    fetchMetrics()
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Operator Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manage tenants, subscriptions, and monitor platform health
            </p>
          </div>
          <Button variant="outline" className="gap-2" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {metricsLoading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : metrics ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Tenants
                  </CardTitle>
                  <Building2 className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{metrics.total_tenants}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Subscriptions
                  </CardTitle>
                  <CreditCard className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{metrics.active_tenants}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    MRR
                  </CardTitle>
                  <DollarSign className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    ${metrics.mrr.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Trials
                  </CardTitle>
                  <Clock className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{metrics.trials_active}</div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tenants..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={handleSearch}>
            Search
          </Button>
        </div>

        {/* Tenants Table */}
        <div className="bg-card rounded-lg border border-border">
          {loading ? (
            <TableSkeleton />
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button variant="outline" onClick={() => fetchTenants(searchQuery)}>
                Try Again
              </Button>
            </div>
          ) : tenants.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              {searchQuery ? 'No tenants match your search.' : 'No tenants found.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant Name</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Users</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-center">Onboarding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow
                    key={tenant.id}
                    className="cursor-pointer hover:bg-muted/10"
                    onClick={() => router.push(`/admin/tenants/${tenant.id}`)}
                  >
                    <TableCell className="font-medium text-foreground">
                      {tenant.name}
                    </TableCell>
                    <TableCell>
                      {tenant.subscription_tier ? (
                        <Badge variant={getTierBadgeVariant(tenant.subscription_tier)}>
                          {tenant.subscription_tier}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {tenant.subscription_status ? (
                        <Badge className={getStatusColor(tenant.subscription_status)}>
                          {tenant.subscription_status}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-foreground">
                      {tenant.user_count}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRelativeTime(tenant.created_at)}
                    </TableCell>
                    <TableCell className="text-center">
                      {tenant.onboarding_completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground mx-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  )
}
