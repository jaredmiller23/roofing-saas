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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  CreditCard,
  Users,
  Clock,
  Save,
} from 'lucide-react'

interface TenantData {
  id: string
  name: string
  subscription_tier: string | null
  subscription_status: string | null
  onboarding_completed: boolean | null
  created_at: string | null
  is_active: boolean | null
  stripe_customer_id: string | null
  subdomain: string
  phone: string | null
}

interface Subscription {
  plan_tier: string
  plan_name: string
  status: string
  price_cents: number
  billing_interval: string | null
  trial_ends_at: string | null
  trial_started_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  cancel_at_period_end: boolean | null
}

interface TenantUser {
  id: string
  user_id: string
  email: string
  name: string | null
  role: string
  status: string
  joined_at: string | null
  last_sign_in_at: string | null
  deactivated_at: string | null
}

interface SubscriptionEvent {
  id: string
  event_type: string
  new_plan: string | null
  new_status: string | null
  previous_plan: string | null
  previous_status: string | null
  amount_cents: number | null
  created_at: string | null
  stripe_event_type: string | null
}

interface TenantDetailProps {
  tenantId: string
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

function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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

function getEventLabel(eventType: string): string {
  const labels: Record<string, string> = {
    trial_started: 'Trial Started',
    trial_ending: 'Trial Ending Soon',
    trial_expired: 'Trial Expired',
    subscription_created: 'Subscription Created',
    subscription_updated: 'Subscription Updated',
    subscription_canceled: 'Subscription Canceled',
    payment_succeeded: 'Payment Succeeded',
    payment_failed: 'Payment Failed',
    plan_changed: 'Plan Changed',
    plan_changed_manual: 'Plan Changed (Manual)',
    invoice_paid: 'Invoice Paid',
    invoice_payment_failed: 'Invoice Payment Failed',
  }
  return labels[eventType] || eventType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function DetailSkeleton() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    </div>
  )
}

export function TenantDetail({ tenantId }: TenantDetailProps) {
  const router = useRouter()
  const [tenant, setTenant] = useState<TenantData | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [users, setUsers] = useState<TenantUser[]>([])
  const [events, setEvents] = useState<SubscriptionEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit state
  const [selectedTier, setSelectedTier] = useState<string>('')
  const [onboardingCompleted, setOnboardingCompleted] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.error?.message || 'Failed to load tenant details')
        return
      }

      const data = result.data
      setTenant(data.tenant)
      setSubscription(data.subscription)
      setUsers(data.users)
      setEvents(data.events)
      setSelectedTier(data.tenant.subscription_tier || data.subscription?.plan_tier || '')
      setOnboardingCompleted(data.tenant.onboarding_completed ?? false)
    } catch {
      setError('An unexpected error occurred while loading tenant details')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  const handleSave = async () => {
    if (!tenant) return

    setSaving(true)
    try {
      const updates: Record<string, unknown> = {}

      const currentTier = tenant.subscription_tier || subscription?.plan_tier || ''
      if (selectedTier && selectedTier !== currentTier) {
        updates.subscription_tier = selectedTier
      }
      if (onboardingCompleted !== (tenant.onboarding_completed ?? false)) {
        updates.onboarding_completed = onboardingCompleted
      }

      if (Object.keys(updates).length === 0) {
        toast.info('No changes to save')
        setSaving(false)
        return
      }

      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        toast.error(result.error?.message || 'Failed to update tenant')
        return
      }

      toast.success('Tenant updated successfully')
      fetchDetail()
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <DetailSkeleton />

  if (error) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button variant="outline" onClick={fetchDetail}>Try Again</Button>
        </div>
      </div>
    )
  }

  if (!tenant) return null

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back + Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            className="gap-2 mb-4 -ml-2"
            onClick={() => router.push('/admin/tenants')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tenants
          </Button>

          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">{tenant.name}</h1>
            {tenant.subscription_tier && (
              <Badge variant="secondary">
                {tenant.subscription_tier}
              </Badge>
            )}
            {tenant.subscription_status && (
              <Badge className={getStatusColor(tenant.subscription_status)}>
                {tenant.subscription_status}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            Tenant ID: {tenant.id}
          </p>
        </div>

        {/* Subscription + Actions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Subscription Card */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Subscription</CardTitle>
            </CardHeader>
            <CardContent>
              {subscription ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan</span>
                    <span className="text-foreground font-medium">{subscription.plan_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price</span>
                    <span className="text-foreground font-medium">
                      ${(subscription.price_cents / 100).toFixed(2)}/{subscription.billing_interval === 'year' ? 'yr' : 'mo'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className={getStatusColor(subscription.status)}>{subscription.status}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Period</span>
                    <span className="text-foreground">
                      {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                    </span>
                  </div>
                  {subscription.trial_started_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trial</span>
                      <span className="text-foreground">
                        {formatDate(subscription.trial_started_at)} - {formatDate(subscription.trial_ends_at)}
                      </span>
                    </div>
                  )}
                  {subscription.stripe_customer_id && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Stripe Customer</span>
                      <span className="text-foreground font-mono text-xs">{subscription.stripe_customer_id}</span>
                    </div>
                  )}
                  {subscription.cancel_at_period_end && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Canceling</span>
                      <Badge className="bg-orange-500/15 text-orange-500 border-orange-500/20">
                        At period end
                      </Badge>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No subscription record found.</p>
              )}
            </CardContent>
          </Card>

          {/* Actions Card */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <Save className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Plan Override</label>
                <Select value={selectedTier} onValueChange={setSelectedTier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">Onboarding Completed</label>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setOnboardingCompleted(!onboardingCompleted)}
                >
                  {onboardingCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  {onboardingCompleted ? 'Yes' : 'No'}
                </Button>
              </div>

              <Button className="w-full gap-2" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Users ({users.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {users.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No users in this tenant.
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium text-foreground">
                        {u.name || '\u2014'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(u.role)}>{u.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            u.status === 'active'
                              ? 'bg-green-500/15 text-green-500 border-green-500/20'
                              : 'bg-red-500/15 text-red-500 border-red-500/20'
                          }
                        >
                          {u.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatRelativeTime(u.last_sign_in_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Subscription Events Timeline */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Subscription Events</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                No subscription events recorded.
              </p>
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 border-l-2 border-border pl-4 pb-4 last:pb-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">
                          {getEventLabel(event.event_type)}
                        </span>
                        {event.new_plan && (
                          <Badge variant="outline" className="text-xs">
                            {event.previous_plan ? `${event.previous_plan} -> ` : ''}{event.new_plan}
                          </Badge>
                        )}
                        {event.amount_cents != null && event.amount_cents > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ${(event.amount_cents / 100).toFixed(2)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDateTime(event.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
