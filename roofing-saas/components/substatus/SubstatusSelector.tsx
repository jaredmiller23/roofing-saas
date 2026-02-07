'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, ChevronDown, Loader2, Star } from 'lucide-react'
import { SubstatusBadge, SubstatusBadgeSkeleton } from './SubstatusBadge'
import type { SubstatusConfig } from '@/lib/substatus/types'

interface SubstatusSelectorProps {
  entityType: 'contacts' | 'projects' | 'leads'
  statusFieldName: string
  statusValue: string
  currentSubstatusValue?: string | null
  onSubstatusChange: (substatusValue: string, substatusConfig: SubstatusConfig) => Promise<void>
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function SubstatusSelector({
  entityType,
  statusFieldName: _statusFieldName,
  statusValue,
  currentSubstatusValue,
  onSubstatusChange,
  disabled = false,
  size = 'md',
  className = ''
}: SubstatusSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [substatuses, setSubstatuses] = useState<SubstatusConfig[]>([])
  const [error, setError] = useState<string | null>(null)

  const loadSubstatuses = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        entity_type: entityType,
        status_value: statusValue
      })

      const response = await fetch(`/api/substatus/configs?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to load substatuses')
      }

      const data = await response.json()
      const activeSubstatuses = (data.data?.configs || []).filter((s: SubstatusConfig) => s.is_active)
      setSubstatuses(activeSubstatuses.sort((a: SubstatusConfig, b: SubstatusConfig) => a.display_order - b.display_order))
    } catch (err) {
      console.error('Error loading substatuses:', err)
      setError(err instanceof Error ? err.message : 'Failed to load substatuses')
    } finally {
      setLoading(false)
    }
  }, [entityType, statusValue])

  useEffect(() => {
    loadSubstatuses()
  }, [loadSubstatuses])

  const handleSelect = async (substatus: SubstatusConfig) => {
    if (disabled || updating || substatus.substatus_value === currentSubstatusValue) {
      return
    }

    try {
      setUpdating(true)
      await onSubstatusChange(substatus.substatus_value, substatus)
      setIsOpen(false)
    } catch (err) {
      console.error('Error updating substatus:', err)
      setError(err instanceof Error ? err.message : 'Failed to update substatus')
    } finally {
      setUpdating(false)
    }
  }

  const currentSubstatus = substatuses.find(s => s.substatus_value === currentSubstatusValue)

  // If loading, show skeleton
  if (loading) {
    return <SubstatusBadgeSkeleton size={size} className={className} />
  }

  // If no substatuses available, don't show selector
  if (substatuses.length === 0) {
    return null
  }

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Current substatus badge (clickable) */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || updating}
        className={`inline-flex items-center gap-1 transition-opacity ${
          disabled || updating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'
        }`}
      >
        {currentSubstatus ? (
          <SubstatusBadge substatus={currentSubstatus} size={size} showIcon />
        ) : (
          <div className="px-2.5 py-1 text-sm text-muted-foreground border-2 border-dashed border-border rounded-full flex items-center gap-1">
            <span>Set substatus</span>
            {!disabled && <ChevronDown className="h-3 w-3" />}
          </div>
        )}

        {!disabled && !updating && (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        )}

        {updating && (
          <Loader2 className="h-3 w-3 text-muted-foreground animate-spin" />
        )}
      </button>

      {/* Dropdown menu */}
      {isOpen && !disabled && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute left-0 top-full mt-1 z-20 bg-card border border-border rounded-lg shadow-lg min-w-[200px] max-w-[300px] py-1">
            {error ? (
              <div className="px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            ) : (
              <>
                {substatuses.map((substatus) => {
                  const isSelected = substatus.substatus_value === currentSubstatusValue

                  return (
                    <button
                      key={substatus.id}
                      onClick={() => handleSelect(substatus)}
                      disabled={updating}
                      className={`w-full px-3 py-2 text-left flex items-center gap-2 transition-colors ${
                        isSelected
                          ? 'bg-primary/10'
                          : 'hover:bg-accent'
                      } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {/* Selection indicator */}
                      <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                      </div>

                      {/* Color dot */}
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: substatus.color || '#3B82F6' }}
                      />

                      {/* Label */}
                      <span className="text-sm flex-1 text-foreground">
                        {substatus.substatus_label}
                      </span>

                      {/* Default indicator */}
                      {substatus.is_default && (
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                      )}

                      {/* Terminal indicator */}
                      {substatus.is_terminal && (
                        <span className="text-xs text-muted-foreground flex-shrink-0">[T]</span>
                      )}
                    </button>
                  )
                })}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
