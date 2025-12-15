'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AddCommissionDialog } from './add-commission-dialog'

interface CommissionPlan {
  id: string
  name: string
  plan_type: string
}

interface AddCommissionButtonProps {
  plans: CommissionPlan[]
}

export function AddCommissionButton({ plans }: AddCommissionButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2 font-medium"
      >
        <Plus className="h-5 w-5" />
        Add Commission
      </button>

      <AddCommissionDialog
        plans={plans}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}
