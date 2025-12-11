'use client'

import { type InspectionState, getInspectionSummary } from '@/lib/claims/inspection-state'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface InspectionSummaryProps {
  state: InspectionState
  onSubmit: () => void
  onBack: () => void
  isSubmitting?: boolean
}

/**
 * InspectionSummary - Review before submitting inspection
 *
 * Shows summary of all captured data and allows final submission.
 */
export function InspectionSummary({
  state,
  onSubmit,
  onBack,
  isSubmitting = false,
}: InspectionSummaryProps) {
  const summary = getInspectionSummary(state)

  const formatDuration = (): string => {
    const start = new Date(state.startedAt)
    const now = new Date()
    const diffMs = now.getTime() - start.getTime()
    const diffMins = Math.round(diffMs / 60000)

    if (diffMins < 1) return 'Less than a minute'
    if (diffMins === 1) return '1 minute'
    if (diffMins < 60) return `${diffMins} minutes`

    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    return `${hours}h ${mins}m`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Inspection Summary</CardTitle>
        <CardDescription>Review your inspection before submitting.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status overview */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {summary.totalPhotoCount}
              </div>
              <div className="text-xs text-gray-500">Photos</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {summary.selectedAreaCount}
              </div>
              <div className="text-xs text-gray-500">Areas</div>
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            <ChecklistItem
              checked={summary.locationVerified}
              label="Location verified"
            />
            <ChecklistItem
              checked={summary.hasOverviewPhoto}
              label="Overview photo captured"
            />
            <ChecklistItem
              checked={summary.totalPhotoCount > 1}
              label="Damage photos captured"
            />
          </div>

          {/* Area breakdown */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Documented Areas</h4>
            <div className="space-y-1">
              {summary.areas.map(area => (
                <div
                  key={area.type}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded"
                >
                  <span className="text-sm text-gray-700">{area.label}</span>
                  <div className="flex items-center gap-2">
                    {area.hasSeverePhoto && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                        Severe
                      </span>
                    )}
                    <span className="text-sm text-gray-500">
                      {area.photoCount} photo{area.photoCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timing */}
          <div className="text-sm text-gray-500 text-center">
            Inspection duration: {formatDuration()}
          </div>

          {/* Warnings */}
          {!summary.readyToSubmit && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
              Please complete all required steps before submitting.
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onBack}
              disabled={isSubmitting}
              className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Back
            </button>
            <button
              onClick={onSubmit}
              disabled={!summary.readyToSubmit || isSubmitting}
              className={`flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
                summary.readyToSubmit && !isSubmitting
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Complete Inspection
                </>
              )}
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ChecklistItem({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center ${
          checked ? 'bg-green-500' : 'bg-gray-200'
        }`}
      >
        {checked ? (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
      <span className={checked ? 'text-gray-700' : 'text-gray-400'}>{label}</span>
    </div>
  )
}
