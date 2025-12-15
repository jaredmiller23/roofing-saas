'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { WorkflowBuilder } from '@/components/automation/WorkflowBuilder'
import type { Workflow } from '@/lib/automation/workflow-types'

export default function NewWorkflowPage() {
  const router = useRouter()
  const [_isSaving, setIsSaving] = useState(false)

  const handleSave = async (workflowData: Partial<Workflow>) => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/automations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workflowData)
      })

      if (!response.ok) {
        throw new Error('Failed to create workflow')
      }

      const workflow = await response.json()
      router.push(`/automations/${workflow.id}`)
    } catch (error) {
      console.error('Error creating workflow:', error)
      throw error
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="h-screen">
      <WorkflowBuilder onSave={handleSave} />
    </div>
  )
}