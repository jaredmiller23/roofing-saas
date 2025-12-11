'use client'

import { type DamageArea } from '@/lib/claims/inspection-state'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface DamageChecklistProps {
  areas: DamageArea[]
  onToggle: (type: string) => void
  onContinue: () => void
  onBack: () => void
}

/**
 * DamageChecklist - Select damage areas to photograph
 *
 * Allows user to select which areas of the roof show damage
 * before proceeding to photo capture.
 */
export function DamageChecklist({
  areas,
  onToggle,
  onContinue,
  onBack,
}: DamageChecklistProps) {
  const selectedCount = areas.filter(a => a.selected).length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Damage Checklist</CardTitle>
        <CardDescription>
          Select all areas where you see damage. You&apos;ll photograph each selected area.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Checklist grid */}
          <div className="grid grid-cols-2 gap-2">
            {areas.map(area => (
              <button
                key={area.type}
                onClick={() => onToggle(area.type)}
                className={cn(
                  'p-3 rounded-lg border-2 text-left transition-all',
                  area.selected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-5 h-5 rounded flex items-center justify-center',
                      area.selected ? 'bg-blue-500' : 'border border-gray-300'
                    )}
                  >
                    {area.selected && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <span className={cn('font-medium', area.selected ? 'text-blue-700' : 'text-gray-700')}>
                    {area.label}
                  </span>
                </div>
                {area.photos.length > 0 && (
                  <div className="mt-1 ml-7 text-xs text-gray-500">
                    {area.photos.length} photo{area.photos.length !== 1 ? 's' : ''}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Quick select buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => areas.forEach(a => !a.selected && onToggle(a.type))}
              className="flex-1 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
            >
              Select All
            </button>
            <button
              onClick={() => areas.forEach(a => a.selected && onToggle(a.type))}
              className="flex-1 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
            >
              Clear All
            </button>
          </div>

          {/* Selection summary */}
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <span className="text-gray-600">
              <span className="font-medium text-blue-600">{selectedCount}</span> area
              {selectedCount !== 1 ? 's' : ''} selected
            </span>
            {selectedCount === 0 && (
              <p className="text-sm text-gray-500 mt-1">Select at least one area to continue</p>
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-2">
            <button
              onClick={onBack}
              className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={onContinue}
              disabled={selectedCount === 0}
              className={cn(
                'flex-1 py-3 rounded-lg font-medium',
                selectedCount > 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              )}
            >
              Continue to Photos ({selectedCount})
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
