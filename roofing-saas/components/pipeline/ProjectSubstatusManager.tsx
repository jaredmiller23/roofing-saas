'use client'

import { useState, useEffect, useCallback } from 'react'
import { SubstatusSelector } from '@/components/substatus/SubstatusSelector'
import type { SubstatusConfig } from '@/lib/substatus/types'
import { apiFetch } from '@/lib/api/client'

interface ProjectSubstatusManagerProps {
  projectId: string
  status: string
  currentSubstatus: string | null
  onSubstatusUpdated?: (newSubstatus: string) => void
  className?: string
}

export function ProjectSubstatusManager({
  projectId,
  status,
  currentSubstatus,
  onSubstatusUpdated,
  className = ''
}: ProjectSubstatusManagerProps) {
  const [substatus, setSubstatus] = useState<string | null>(currentSubstatus)
  const [_substatusConfig, setSubstatusConfig] = useState<SubstatusConfig | null>(null)
  const [loading, setLoading] = useState(false)

  const loadSubstatusConfig = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        entity_type: 'projects',
        status_value: status
      })

      const response = await fetch(`/api/substatus/configs?${params.toString()}`)
      if (!response.ok) return

      const data = await response.json()
      const config = data.configs?.find((c: SubstatusConfig) => c.substatus_value === substatus)
      setSubstatusConfig(config || null)
    } catch (err) {
      console.error('Error loading substatus config:', err)
    }
  }, [status, substatus])

  useEffect(() => {
    if (substatus) {
      loadSubstatusConfig()
    } else {
      setSubstatusConfig(null)
    }
  }, [substatus, loadSubstatusConfig])

  // Sync with parent when currentSubstatus prop changes (e.g. stage change resets it)
  useEffect(() => {
    setSubstatus(currentSubstatus)
  }, [currentSubstatus])

  const handleSubstatusChange = async (substatusValue: string, config: SubstatusConfig) => {
    try {
      setLoading(true)

      await apiFetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        body: { substatus: substatusValue },
      })

      setSubstatus(substatusValue)
      setSubstatusConfig(config)
      onSubstatusUpdated?.(substatusValue)
    } catch (err) {
      console.error('Error updating project substatus:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={className}>
      <SubstatusSelector
        entityType="projects"
        statusFieldName="status"
        statusValue={status}
        currentSubstatusValue={substatus}
        onSubstatusChange={handleSubstatusChange}
        disabled={loading}
        size="sm"
      />
    </div>
  )
}
