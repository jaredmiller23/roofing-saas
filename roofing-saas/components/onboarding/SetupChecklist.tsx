'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Circle, ChevronDown, ChevronUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useParams, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { ChecklistItem } from '@/lib/onboarding/types'

interface ChecklistData {
  items: ChecklistItem[]
  completedCount: number
  totalCount: number
  dismissed: boolean
}

export function SetupChecklist() {
  const [data, setData] = useState<ChecklistData | null>(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string || 'en'

  useEffect(() => {
    const fetchChecklist = async () => {
      try {
        const res = await fetch('/api/onboarding/checklist')
        if (res.ok) {
          const json = await res.json()
          setData(json.data)
        }
      } catch {
        // Non-critical — hide the checklist on error
      } finally {
        setLoading(false)
      }
    }

    fetchChecklist()
  }, [])

  const handleDismiss = async () => {
    setDismissing(true)
    try {
      await fetch('/api/onboarding/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' }),
      })
      setData(null)
    } catch {
      // Silently fail
    } finally {
      setDismissing(false)
    }
  }

  if (loading || !data || data.dismissed) return null

  // Hide once all items are complete
  if (data.completedCount === data.totalCount) return null

  const progressPercent = Math.round((data.completedCount / data.totalCount) * 100)

  return (
    <div className="bg-card border border-border rounded-lg mb-6">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-sm font-medium text-foreground"
        >
          {collapsed ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          )}
          Getting Started
          <span className="text-xs text-muted-foreground font-normal">
            {data.completedCount}/{data.totalCount} complete
          </span>
        </button>

        <div className="flex items-center gap-3">
          {/* Progress bar */}
          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            disabled={dismissing}
            className="text-muted-foreground h-6 w-6 p-0"
            aria-label="Dismiss checklist"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Items */}
      {!collapsed && (
        <div className="px-4 py-2 divide-y divide-border">
          {data.items.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => router.push(`/${locale}${item.href}`)}
              className={cn(
                'flex items-center gap-3 py-2.5 w-full text-left group',
                item.completed && 'opacity-60'
              )}
            >
              {item.completed ? (
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
              )}
              <div>
                <div
                  className={cn(
                    'text-sm font-medium',
                    item.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                  )}
                >
                  {item.label}
                </div>
                <div className="text-xs text-muted-foreground">{item.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
