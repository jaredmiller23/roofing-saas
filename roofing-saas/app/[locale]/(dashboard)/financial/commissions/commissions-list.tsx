'use client'

import { useState, useTransition } from 'react'
import { CheckCircle, DollarSign, Clock, XCircle } from 'lucide-react'
import { approveCommissionAction, markCommissionPaidAction } from './actions'

interface Commission {
  id: string
  user_id: string
  amount: number
  percentage: number
  status: string
  notes: string | null
  created_at: string
  project?: {
    id: string
    name: string
    project_number: string
  }[] | null
}

interface CommissionsListProps {
  commissions: Commission[]
}

export function CommissionsList({ commissions }: CommissionsListProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-primary" />
      case 'paid':
        return <DollarSign className="h-4 w-4 text-green-500" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    }
    return badges[status] || 'bg-muted text-foreground'
  }

  const handleApprove = (commissionId: string) => {
    setError(null)
    startTransition(async () => {
      const result = await approveCommissionAction(commissionId)
      if (result.error) {
        setError(result.error)
      }
    })
  }

  const handleMarkPaid = (commissionId: string) => {
    const paymentDate = prompt('Enter payment date (YYYY-MM-DD):')
    const paymentMethod = prompt('Enter payment method (e.g., Check, Direct Deposit):')

    if (!paymentDate || !paymentMethod) return

    setError(null)
    startTransition(async () => {
      const result = await markCommissionPaidAction(commissionId, paymentDate, paymentMethod)
      if (result.error) {
        setError(result.error)
      }
    })
  }

  if (commissions.length === 0) {
    return (
      <div className="bg-card rounded-lg shadow">
        <div className="px-6 py-4 border-b border">
          <h2 className="text-xl font-semibold text-foreground">Recent Commissions</h2>
        </div>
        <div className="p-12 text-center text-muted-foreground">
          <p className="text-lg">No commissions recorded yet</p>
          <p className="text-sm mt-2">Click &ldquo;Add Commission&rdquo; to start tracking</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg shadow">
      <div className="px-6 py-4 border-b border">
        <h2 className="text-xl font-semibold text-foreground">Recent Commissions</h2>
      </div>

      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-background">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Project</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Rate</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Amount</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {commissions.map((commission) => {
              const project = commission.project?.[0]
              return (
                <tr key={commission.id} className="hover:bg-background">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {formatDate(commission.created_at)}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {project ? (
                      <div>
                        <p className="font-medium truncate max-w-xs">{project.name}</p>
                        <p className="text-xs text-muted-foreground">#{project.project_number}</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground text-right">
                    {commission.percentage}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-foreground text-right">
                    {formatCurrency(commission.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(commission.status)}`}>
                      {getStatusIcon(commission.status)}
                      {commission.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    {commission.status === 'pending' && (
                      <button
                        onClick={() => handleApprove(commission.id)}
                        disabled={isPending}
                        className="text-primary hover:text-primary/80 disabled:opacity-50 mr-3"
                      >
                        Approve
                      </button>
                    )}
                    {commission.status === 'approved' && (
                      <button
                        onClick={() => handleMarkPaid(commission.id)}
                        disabled={isPending}
                        className="text-green-600 hover:text-green-900 disabled:opacity-50"
                      >
                        Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
