/* eslint-disable */
/**
 * Affected Customers Component
 *
 * List of customers affected by storm with damage predictions and contact actions
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import type { AffectedCustomer } from '@/lib/storm/storm-types'
import {  
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  Search,
  Filter
} from 'lucide-react'

interface AffectedCustomersProps {
  customers: AffectedCustomer[]
  onContact?: (customerId: string, method: 'phone' | 'email' | 'sms') => void
}

export function AffectedCustomers({
  customers,
  onContact,
}: AffectedCustomersProps) {
  const [search, setSearch] = useState('')
  const [filterMode, setFilterMode] = useState<'all' | 'urgent' | 'high'>('all')

  // Filter customers
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = 
      customer.contact.first_name.toLowerCase().includes(search.toLowerCase()) ||
      customer.contact.last_name.toLowerCase().includes(search.toLowerCase()) ||
      customer.contact.address_street?.toLowerCase().includes(search.toLowerCase())

    const matchesFilter =
      filterMode === 'all' ||
      (filterMode === 'urgent' && customer.priority === 'urgent') ||
      (filterMode === 'high' && (customer.priority === 'high' || customer.priority === 'urgent'))

    return matchesSearch && matchesFilter
  })

  const stats = {
    total: customers.length,
    urgent: customers.filter(c => c.priority === 'urgent').length,
    high: customers.filter(c => c.priority === 'high').length,
    contacted: customers.filter(c => c.notificationStatus === 'sent' || c.notificationStatus === 'delivered').length,
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Affected</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
            <div className="text-sm text-muted-foreground">Urgent</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
            <div className="text-sm text-muted-foreground">High Priority</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.contacted}</div>
            <div className="text-sm text-muted-foreground">Contacted</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Affected Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterMode === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterMode('all')}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={filterMode === 'urgent' ? 'default' : 'outline'}
                onClick={() => setFilterMode('urgent')}
                size="sm"
              >
                Urgent
              </Button>
              <Button
                variant={filterMode === 'high' ? 'default' : 'outline'}
                onClick={() => setFilterMode('high')}
                size="sm"
              >
                High
              </Button>
            </div>
          </div>

          {/* Customer List */}
          <div className="space-y-2">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No customers found
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <CustomerCard
                  key={customer.contact.id}
                  customer={customer}
                  onContact={onContact}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Individual Customer Card
 */
interface CustomerCardProps {
  customer: AffectedCustomer
  onContact?: (customerId: string, method: 'phone' | 'email' | 'sms') => void
}

function CustomerCard({ customer, onContact }: CustomerCardProps) {
  const { contact, distance, damagePrediction, priority, notificationStatus } = customer

  const priorityColors = {
    urgent: 'bg-red-500/10 text-red-500 border-red-500/30',
    high: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
    medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
    low: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  }

  return (
    <div className={`border rounded-lg p-4 ${priorityColors[priority]}`}>
      <div className="flex items-start justify-between gap-4">
        {/* Customer Info */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">
              {contact.first_name} {contact.last_name}
            </h4>
            <PriorityBadge priority={priority} />
            {notificationStatus !== 'pending' && (
              <NotificationBadge status={notificationStatus} />
            )}
          </div>

          {contact.address_street && (
            <div className="flex items-center gap-1 text-sm">
              <MapPin className="w-4 h-4" />
              <span>{contact.address_street}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Distance</div>
              <div className="font-medium">{distance.toFixed(1)} mi</div>
            </div>
            <div>
              <div className="text-muted-foreground">Probability</div>
              <div className="font-medium">{damagePrediction.probability}%</div>
            </div>
            <div>
              <div className="text-muted-foreground">Est. Damage</div>
              <div className="font-medium">
                ${(damagePrediction.estimatedDamage / 1000).toFixed(1)}K
              </div>
            </div>
          </div>
        </div>

        {/* Contact Actions */}
        <div className="flex flex-col gap-2">
          {contact.phone && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onContact?.(contact.id, 'phone')}
            >
              <Phone className="w-4 h-4" />
            </Button>
          )}
          {contact.email && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onContact?.(contact.id, 'email')}
            >
              <Mail className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Priority Badge
 */
function PriorityBadge({ priority }: { priority: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    urgent: { label: 'URGENT', className: 'bg-red-600 text-white' },
    high: { label: 'High', className: 'bg-orange-600 text-white' },
    medium: { label: 'Medium', className: 'bg-yellow-600 text-white' },
    low: { label: 'Low', className: 'bg-blue-600 text-white' },
  }

  const config = configs[priority] || configs.medium

  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  )
}

/**
 * Notification Status Badge
 */
function NotificationBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
    sent: { label: 'Sent', variant: 'default' },
    delivered: { label: 'Delivered', variant: 'default' },
    failed: { label: 'Failed', variant: 'destructive' },
    opted_out: { label: 'Opted Out', variant: 'secondary' },
  }

  const config = configs[status] || { label: status, variant: 'secondary' as const }

  return (
    <Badge variant={config.variant} className="text-xs">
      {config.label}
    </Badge>
  )
}
