'use client'

import { type InspectionState, getInspectionSummary } from '@/lib/claims/inspection-state'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

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
            <div className="bg-muted rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-primary">
                {summary.totalPhotoCount}
              </div>
              <div className="text-xs text-muted-foreground">Photos</div>
            </div>
            <div className="bg-muted rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-primary">
                {summary.selectedAreaCount}
              </div>
              <div className="text-xs text-muted-foreground">Areas</div>
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
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Documented Areas</h4>
            <div className="space-y-1">
              {summary.areas.map(area => (
                <div
                  key={area.type}
                  className="flex items-center justify-between py-2 px-3 bg-muted rounded"
                >
                  <span className="text-sm text-muted-foreground">{area.label}</span>
                  <div className="flex items-center gap-2">
                    {area.hasSeverePhoto && (
                      <span className="text-xs bg-red-500/10 text-red-500 px-2 py-0.5 rounded">
                        Severe
                      </span>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {area.photoCount} photo{area.photoCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timing */}
          <div className="text-sm text-muted-foreground text-center">
            Inspection duration: {formatDuration()}
          </div>

          {/* Warnings */}
          {!summary.readyToSubmit && (
            <Alert variant="warning">
              <AlertDescription>
                Please complete all required steps before submitting.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={onBack}
              disabled={isSubmitting}
              variant="outline"
              className="px-4 py-3"
            >
              Back
            </Button>
            <Button
              onClick={onSubmit}
              disabled={!summary.readyToSubmit || isSubmitting}
              variant="success"
              className="flex-1 py-3"
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
            </Button>
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
          checked ? 'bg-green-500' : 'bg-muted'
        }`}
      >
        {checked ? (
          <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg className="w-3 h-3 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
      <span className={checked ? 'text-muted-foreground' : 'text-muted-foreground'}>{label}</span>
    </div>
  )
}
