'use client'

import { useState, useTransition } from 'react'
import { Trash2, CheckCircle, AlertCircle } from 'lucide-react'
import { deleteExpenseAction, approveExpenseAction } from './actions'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Expense {
  id: string
  expense_type: string
  category: string | null
  description: string
  amount: number
  vendor_name: string | null
  expense_date: string
  is_approved: boolean | null
}

interface ExpensesListProps {
  expenses: Expense[]
  projectId: string
}

export function ExpensesList({ expenses, projectId }: ExpensesListProps) {
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

  const getExpenseTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      labor: 'bg-blue-500/20 text-blue-400',
      material: 'bg-purple-500/20 text-purple-400',
      equipment: 'bg-orange-500/20 text-orange-400',
      subcontractor: 'bg-green-500/20 text-green-400',
      permit: 'bg-yellow-500/20 text-yellow-400',
      disposal: 'bg-muted text-muted-foreground',
      other: 'bg-muted text-muted-foreground',
    }
    return colors[type] || 'bg-muted text-muted-foreground'
  }

  const handleDelete = (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) {
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await deleteExpenseAction(expenseId, projectId)
      if (result.error) {
        setError(result.error)
      }
    })
  }

  const handleApprove = (expenseId: string) => {
    setError(null)
    startTransition(async () => {
      const result = await approveExpenseAction(expenseId, projectId)
      if (result.error) {
        setError(result.error)
      }
    })
  }

  if (expenses.length === 0) {
    return (
      <div className="bg-card rounded-lg shadow">
        <div className="px-6 py-4 border-b border">
          <h2 className="text-xl font-semibold text-foreground">Expense Details</h2>
        </div>
        <div className="p-12 text-center text-muted-foreground">
          <p className="text-lg">No expenses recorded yet</p>
          <p className="text-sm mt-2">Click &ldquo;Add Expense&rdquo; to start tracking costs</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg shadow">
      <div className="px-6 py-4 border-b border">
        <h2 className="text-xl font-semibold text-foreground">Expense Details</h2>
      </div>

      {error && (
        <Alert variant="destructive" className="mx-6 mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-background">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Vendor
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-gray-200">
            {expenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-background">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {formatDate(expense.expense_date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getExpenseTypeColor(expense.expense_type)}`}>
                    {expense.expense_type}
                  </span>
                  {expense.category && (
                    <div className="text-xs text-muted-foreground mt-1">{expense.category}</div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-foreground">
                  <div className="max-w-xs truncate" title={expense.description}>
                    {expense.description}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {expense.vendor_name || '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground text-right font-medium">
                  {formatCurrency(expense.amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {expense.is_approved ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
                      <CheckCircle className="h-3 w-3" />
                      Approved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-full">
                      <AlertCircle className="h-3 w-3" />
                      Pending
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    {!expense.is_approved && (
                      <button
                        onClick={() => handleApprove(expense.id)}
                        disabled={isPending}
                        className="text-green-600 hover:text-green-900 disabled:opacity-50"
                        title="Approve expense"
                      >
                        <CheckCircle className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(expense.id)}
                      disabled={isPending}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      title="Delete expense"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-background">
            <tr>
              <td colSpan={4} className="px-6 py-4 text-sm font-semibold text-foreground">
                Total
              </td>
              <td className="px-6 py-4 text-sm font-bold text-foreground text-right">
                {formatCurrency(expenses.reduce((sum, exp) => sum + exp.amount, 0))}
              </td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
