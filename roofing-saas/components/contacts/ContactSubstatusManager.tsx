'use client'

import { useState, useEffect, useCallback } from 'react'
import { SubstatusSelector } from '@/components/substatus/SubstatusSelector'
import type { SubstatusConfig } from '@/lib/substatus/types'
import { apiFetch } from '@/lib/api/client'

interface ContactSubstatusManagerProps {
  contactId: string
  stage: string
  currentSubstatus: string | null
  className?: string
}

export function ContactSubstatusManager({
  contactId,
  stage,
  currentSubstatus,
  className = ''
}: ContactSubstatusManagerProps) {
  const [substatus, setSubstatus] = useState<string | null>(currentSubstatus)
  const [_substatusConfig, setSubstatusConfig] = useState<SubstatusConfig | null>(null)
  const [loading, setLoading] = useState(false)

  const loadSubstatusConfig = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        entity_type: 'contacts',
        status_value: stage
      })

      const response = await fetch(`/api/substatus/configs?${params.toString()}`)
      if (!response.ok) return

      const data = await response.json()
      const config = data.configs?.find((c: SubstatusConfig) => c.substatus_value === substatus)
      setSubstatusConfig(config || null)
    } catch (err) {
      console.error('Error loading substatus config:', err)
    }
  }, [stage, substatus])

  // Load substatus config for current value
  useEffect(() => {
    if (substatus) {
      loadSubstatusConfig()
    } else {
      setSubstatusConfig(null)
    }
  }, [substatus, loadSubstatusConfig])

  const handleSubstatusChange = async (substatusValue: string, config: SubstatusConfig) => {
    try {
      setLoading(true)

      // Update contact substatus via API
      await apiFetch(`/api/contacts/${contactId}`, {
        method: 'PATCH',
        body: { substatus: substatusValue },
      })

      setSubstatus(substatusValue)
      setSubstatusConfig(config)
    } catch (err) {
      console.error('Error updating substatus:', err)
      // Optionally show error toast
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={className}>
      <SubstatusSelector
        entityType="contacts"
        statusFieldName="stage"
        statusValue={stage}
        currentSubstatusValue={substatus}
        onSubstatusChange={handleSubstatusChange}
        disabled={loading}
      />
    </div>
  )
}
