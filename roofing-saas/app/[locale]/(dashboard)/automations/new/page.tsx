'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { WorkflowBuilder } from '@/components/automation/WorkflowBuilder'
import { apiFetch } from '@/lib/api/client'
import type { Workflow } from '@/lib/automation/workflow-types'

export default function NewWorkflowPage() {
  const router = useRouter()
  const [_isSaving, _setIsSaving] = useState(false)

  const handleSave = async (workflowData: Partial<Workflow>) => {
    _setIsSaving(true)
    try {
      const workflow = await apiFetch<Workflow>('/api/automations', {
        method: 'POST',
        body: workflowData
      })

      router.push(`/automations/${workflow.id}`)
    } catch (error) {
      console.error('Error creating workflow:', error)
      throw error
    } finally {
      _setIsSaving(false)
    }
  }

  return (
    <div className="h-screen">
      <WorkflowBuilder onSave={handleSave} />
    </div>
  )
}