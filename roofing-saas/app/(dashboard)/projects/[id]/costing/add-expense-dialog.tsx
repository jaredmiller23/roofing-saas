'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { createExpenseAction } from './actions'

interface AddExpenseDialogProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
}

export function AddExpenseDialog({ projectId, isOpen, onClose }: AddExpenseDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    formData.set('project_id', projectId)

    startTransition(async () => {
      const result = await createExpenseAction(formData)

      if (result.error) {
        setError(result.error)
      } else {
        onClose()
        // Reset form
        ;(e.target as HTMLFormElement).reset()
      }
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-foreground">Add Expense</h2>
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
            {/* Expense Type */}
            <div>
              <label htmlFor="expense_type" className="block text-sm font-medium text-muted-foreground mb-1">
                Expense Type *
              </label>
              <select
                id="expense_type"
                name="expense_type"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select type...</option>
                <option value="labor">Labor</option>
                <option value="material">Material</option>
                <option value="equipment">Equipment</option>
                <option value="subcontractor">Subcontractor</option>
                <option value="permit">Permit</option>
                <option value="disposal">Disposal</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-muted-foreground mb-1">
                Category
              </label>
              <input
                type="text"
                id="category"
                name="category"
                placeholder="e.g., shingles, flashing"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-muted-foreground mb-1">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={3}
              placeholder="Describe the expense..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Amount */}
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-muted-foreground mb-1">
                Amount *
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Quantity */}
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-muted-foreground mb-1">
                Quantity
              </label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                step="0.01"
                min="0"
                placeholder="Optional"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Unit Price */}
            <div>
              <label htmlFor="unit_price" className="block text-sm font-medium text-muted-foreground mb-1">
                Unit Price
              </label>
              <input
                type="number"
                id="unit_price"
                name="unit_price"
                step="0.01"
                min="0"
                placeholder="Optional"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vendor Name */}
            <div>
              <label htmlFor="vendor_name" className="block text-sm font-medium text-muted-foreground mb-1">
                Vendor Name
              </label>
              <input
                type="text"
                id="vendor_name"
                name="vendor_name"
                placeholder="e.g., ABC Supply"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Invoice Number */}
            <div>
              <label htmlFor="invoice_number" className="block text-sm font-medium text-muted-foreground mb-1">
                Invoice Number
              </label>
              <input
                type="text"
                id="invoice_number"
                name="invoice_number"
                placeholder="Optional"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Expense Date */}
            <div>
              <label htmlFor="expense_date" className="block text-sm font-medium text-muted-foreground mb-1">
                Expense Date *
              </label>
              <input
                type="date"
                id="expense_date"
                name="expense_date"
                required
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Paid Date */}
            <div>
              <label htmlFor="paid_date" className="block text-sm font-medium text-muted-foreground mb-1">
                Paid Date
              </label>
              <input
                type="date"
                id="paid_date"
                name="paid_date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-muted-foreground mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder="Additional notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 border border-gray-300 rounded-md text-muted-foreground hover:bg-background disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
