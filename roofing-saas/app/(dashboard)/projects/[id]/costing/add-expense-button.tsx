'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AddExpenseDialog } from './add-expense-dialog'

interface AddExpenseButtonProps {
  projectId: string
}

export function AddExpenseButton({ projectId }: AddExpenseButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2 font-medium"
      >
        <Plus className="h-5 w-5" />
        Add Expense
      </button>

      <AddExpenseDialog
        projectId={projectId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}
