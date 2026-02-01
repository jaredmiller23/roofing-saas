'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'
import type { ClaimData } from '@/lib/claims/types'

interface ClaimApprovalWorkflowProps {
  claim: ClaimData
  onApprovalChange: () => void
}

// Statuses that require approval
const REVIEWABLE_STATUSES = ['under_review', 'escalated', 'disputed']

export function ClaimApprovalWorkflow({ claim, onApprovalChange }: ClaimApprovalWorkflowProps) {
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [notes, setNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isReviewable = REVIEWABLE_STATUSES.includes(claim.status || 'new')
  const isApproved = claim.status === 'approved'
  const isRejected = false // We can track this with a separate field or substatus in the future

  const handleApprove = async () => {
    setProcessing(true)
    setError(null)

    try {
      const res = await fetch(`/api/claims/${claim.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to approve claim')
      }

      // Refresh claim data
      onApprovalChange()
      setShowApproveDialog(false)
      setNotes('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!notes.trim()) {
      setError('Rejection reason is required')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const res = await fetch(`/api/claims/${claim.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: notes }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to reject claim')
      }

      // Refresh claim data
      onApprovalChange()
      setShowRejectDialog(false)
      setNotes('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setProcessing(false)
    }
  }

  // Don't show anything if claim is not in a reviewable state
  if (!isReviewable && !isApproved && !isRejected) {
    return null
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Claim Approval</CardTitle>
          <CardDescription>
            Review and approve or reject this insurance claim
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Approval Status */}
          {isApproved && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
              <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-green-900">Claim Approved</div>
                <div className="text-sm text-green-700 mt-1">
                  This claim has been approved and is ready for payment processing.
                </div>
                {claim.approved_amount && (
                  <div className="text-sm text-green-700 mt-1">
                    Approved Amount: <span className="font-medium">${claim.approved_amount.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {isRejected && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
              <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-red-900">Claim Rejected</div>
                <div className="text-sm text-red-700 mt-1">
                  This claim has been rejected. Contact the homeowner for more information.
                </div>
              </div>
            </div>
          )}

          {/* Pending Review */}
          {isReviewable && (
            <>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                <Clock className="h-6 w-6 text-yellow-600 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold text-yellow-900">Pending Review</div>
                  <div className="text-sm text-yellow-700 mt-1">
                    This claim is awaiting approval. Review the details below and make a decision.
                  </div>
                </div>
              </div>

              {/* Review Checklist */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Review Checklist</Label>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    {claim.policy_number ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className={claim.policy_number ? 'text-green-700' : 'text-red-700'}>
                      Policy number verified
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {claim.estimated_damage ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                    )}
                    <span className={claim.estimated_damage ? 'text-green-700' : 'text-yellow-700'}>
                      Initial estimate provided ({claim.estimated_damage ? `$${claim.estimated_damage.toLocaleString()}` : 'Missing'})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {claim.inspection_completed_at ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                    )}
                    <span className={claim.inspection_completed_at ? 'text-green-700' : 'text-yellow-700'}>
                      Inspection completed {claim.inspection_completed_at ? `(${format(new Date(claim.inspection_completed_at), 'MMM d, yyyy')})` : '(Pending)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setShowApproveDialog(true)}
                  variant="success"
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Claim
                </Button>
                <Button
                  onClick={() => setShowRejectDialog(true)}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Claim
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Claim</DialogTitle>
            <DialogDescription>
              Confirm claim approval. Add any notes or comments about this decision.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="approve-notes">Approval Notes (Optional)</Label>
              <Textarea
                id="approve-notes"
                placeholder="Add any notes about this approval decision..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowApproveDialog(false)
                setNotes('')
                setError(null)
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={processing}
              variant="success"
            >
              {processing ? 'Approving...' : 'Confirm Approval'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Claim</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this claim. This will be communicated to the homeowner.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">
                Rejection Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reject-reason"
                placeholder="Explain why this claim is being rejected..."
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value)
                  if (error) setError(null)
                }}
                rows={4}
                className={error ? 'border-red-500' : ''}
              />
              <p className="text-xs text-muted-foreground">
                Be specific and professional. This reason will be shared with the homeowner.
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false)
                setNotes('')
                setError(null)
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={processing}
              variant="destructive"
            >
              {processing ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
