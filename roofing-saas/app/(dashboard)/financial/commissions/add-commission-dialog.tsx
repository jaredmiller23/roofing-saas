'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { createCommissionAction } from './actions'

interface CommissionPlan {
  id: string
  name: string
  plan_type: string
}

interface AddCommissionDialogProps {
  plans: CommissionPlan[]
  isOpen: boolean
  onClose: () => void
}

export function AddCommissionDialog({ plans, isOpen, onClose }: AddCommissionDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await createCommissionAction(formData)

      if (result.error) {
        setError(result.error)
      } else {
        onClose()
        ;(e.target as HTMLFormElement).reset()
      }
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border">
          <h2 className="text-xl font-semibold text-foreground">Add Commission</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-muted-foreground"
            disabled={isPending}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Commission Plan */}
            <div>
              <label htmlFor="commission_plan_id" className="block text-sm font-medium text-muted-foreground mb-1">
                Commission Plan *
              </label>
              <select
                id="commission_plan_id"
                name="commission_plan_id"
                required
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select plan...</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} ({plan.plan_type})
                  </option>
                ))}
              </select>
            </div>

            {/* Commission Type */}
            <div>
              <label htmlFor="commission_type" className="block text-sm font-medium text-muted-foreground mb-1">
                Commission Type *
              </label>
              <select
                id="commission_type"
                name="commission_type"
                required
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select type...</option>
                <option value="sale">Sale</option>
                <option value="appointment">Appointment</option>
                <option value="installation">Installation</option>
                <option value="milestone">Milestone</option>
                <option value="bonus">Bonus</option>
              </select>
            </div>
          </div>

          {/* User Email */}
          <div>
            <label htmlFor="user_email" className="block text-sm font-medium text-muted-foreground mb-1">
              Team Member Email *
            </label>
            <input
              type="email"
              id="user_email"
              name="user_email"
              required
              placeholder="user@example.com"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">Enter the email of the user earning this commission</p>
          </div>

          {/* Base Amount */}
          <div>
            <label htmlFor="base_amount" className="block text-sm font-medium text-muted-foreground mb-1">
              Base Amount *
            </label>
            <input
              type="number"
              id="base_amount"
              name="base_amount"
              step="0.01"
              min="0"
              required
              placeholder="0.00"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">Contract value, profit, or other calculation base</p>
          </div>

          {/* Project ID (Optional) */}
          <div>
            <label htmlFor="project_id" className="block text-sm font-medium text-muted-foreground mb-1">
              Project ID (Optional)
            </label>
            <input
              type="text"
              id="project_id"
              name="project_id"
              placeholder="UUID of associated project"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-muted-foreground mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Additional notes..."
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 border border-border rounded-md text-muted-foreground hover:bg-background disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Calculating...' : 'Create Commission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
