'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  CheckCircle,
  Clock,
  FileText,
  DollarSign,
  AlertTriangle,
  Ban,
  FileStack
} from 'lucide-react'
import type { ClaimData, ClaimStatus } from '@/lib/claims/types'

interface ClaimStatusWorkflowProps {
  claim: ClaimData
  onStatusChange: (newStatus: ClaimStatus, data?: Record<string, unknown>) => Promise<void>
}

// Define valid status transitions
const STATUS_TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
  'new': ['documents_pending', 'disputed'],
  'documents_pending': ['under_review', 'new', 'disputed'],
  'under_review': ['approved', 'documents_pending', 'disputed', 'escalated'],
  'approved': ['paid', 'supplement_filed', 'disputed'],
  'paid': ['closed', 'supplement_filed'],
  'closed': ['supplement_filed'], // Can reopen for supplements
  'disputed': ['under_review', 'escalated'],
  'supplement_filed': ['under_review', 'approved'],
  'escalated': ['under_review', 'approved'],
}

const STATUS_INFO: Record<ClaimStatus, { icon: React.ElementType; iconColor: string; bgColor: string; label: string; description: string }> = {
  'new': {
    icon: FileText,
    iconColor: 'text-primary',
    bgColor: 'bg-primary/10',
    label: 'New',
    description: 'Claim has been created and needs documentation',
  },
  'documents_pending': {
    icon: Clock,
    iconColor: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    label: 'Docs Pending',
    description: 'Waiting for additional documentation',
  },
  'under_review': {
    icon: FileStack,
    iconColor: 'text-secondary',
    bgColor: 'bg-secondary/10',
    label: 'Under Review',
    description: 'Adjuster is reviewing the claim',
  },
  'approved': {
    icon: CheckCircle,
    iconColor: 'text-green-500',
    bgColor: 'bg-green-500/10',
    label: 'Approved',
    description: 'Claim has been approved',
  },
  'paid': {
    icon: DollarSign,
    iconColor: 'text-green-500',
    bgColor: 'bg-green-500/10',
    label: 'Paid',
    description: 'Payment has been received',
  },
  'closed': {
    icon: CheckCircle,
    iconColor: 'text-muted-foreground',
    bgColor: 'bg-muted',
    label: 'Closed',
    description: 'Claim has been completed',
  },
  'disputed': {
    icon: AlertTriangle,
    iconColor: 'text-red-500',
    bgColor: 'bg-red-500/10',
    label: 'Disputed',
    description: 'Decision is being disputed',
  },
  'supplement_filed': {
    icon: FileStack,
    iconColor: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    label: 'Supplement',
    description: 'Supplement claim has been filed',
  },
  'escalated': {
    icon: Ban,
    iconColor: 'text-red-500',
    bgColor: 'bg-red-500/10',
    label: 'Escalated',
    description: 'Escalated to management',
  },
}

export function ClaimStatusWorkflow({ claim, onStatusChange }: ClaimStatusWorkflowProps) {
  const [showTransitionDialog, setShowTransitionDialog] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<ClaimStatus | null>(null)
  const [transitionData, setTransitionData] = useState<Record<string, string>>({})
  const [updating, setUpdating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const currentStatus = claim.status || 'new'
  const possibleTransitions = STATUS_TRANSITIONS[currentStatus] || []

  const validateTransition = (newStatus: ClaimStatus): string | null => {
    // Require policy number before moving to under_review
    if (newStatus === 'under_review' && !claim.policy_number) {
      return 'Policy number is required before moving to Under Review'
    }

    // Require approved amount before moving to paid
    if (newStatus === 'paid' && !claim.approved_amount) {
      return 'Approved amount is required before marking as Paid'
    }

    return null
  }

  const requiresNotes = (newStatus: ClaimStatus): boolean => {
    return ['disputed', 'escalated', 'supplement_filed'].includes(newStatus)
  }

  const requiresAmount = (newStatus: ClaimStatus): boolean => {
    return newStatus === 'approved' && !claim.approved_amount
  }

  const handleStatusClick = (newStatus: ClaimStatus) => {
    const error = validateTransition(newStatus)
    if (error) {
      setValidationError(error)
      setSelectedStatus(newStatus)
      setShowTransitionDialog(true)
      return
    }

    setValidationError(null)
    setSelectedStatus(newStatus)
    setTransitionData({})
    setShowTransitionDialog(true)
  }

  const handleConfirmTransition = async () => {
    if (!selectedStatus) return

    // Validate notes if required
    if (requiresNotes(selectedStatus) && !transitionData.notes) {
      setValidationError('Notes are required for this status change')
      return
    }

    // Validate amount if required
    if (requiresAmount(selectedStatus) && !transitionData.approved_amount) {
      setValidationError('Approved amount is required for this status change')
      return
    }

    setUpdating(true)
    try {
      const updateData: Record<string, unknown> = {
        status: selectedStatus,
      }

      if (transitionData.notes) {
        updateData.notes = transitionData.notes
      }

      if (transitionData.approved_amount) {
        updateData.approved_amount = parseFloat(transitionData.approved_amount)
      }

      if (transitionData.paid_amount) {
        updateData.paid_amount = parseFloat(transitionData.paid_amount)
      }

      await onStatusChange(selectedStatus, updateData)
      setShowTransitionDialog(false)
      setTransitionData({})
      setValidationError(null)
    } catch (_error) {
      setValidationError('Failed to update claim status. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const currentInfo = STATUS_INFO[currentStatus]
  const CurrentIcon = currentInfo.icon

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Claim Status Workflow</CardTitle>
          <CardDescription>Manage claim progression through stages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status */}
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Current Status</Label>
            <div className={`flex items-center gap-3 p-4 rounded-lg border ${currentInfo.bgColor}`}>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${currentInfo.bgColor}`}>
                <CurrentIcon className={`h-5 w-5 ${currentInfo.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground">{currentInfo.label}</div>
                <div className="text-sm text-muted-foreground">{currentInfo.description}</div>
              </div>
            </div>
          </div>

          {/* Available Transitions */}
          {possibleTransitions.length > 0 && (
            <div>
              <Label className="text-sm text-muted-foreground mb-3 block">Available Actions</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {possibleTransitions.map((nextStatus) => {
                  const info = STATUS_INFO[nextStatus]
                  const Icon = info.icon
                  const error = validateTransition(nextStatus)

                  return (
                    <Button
                      key={nextStatus}
                      variant="outline"
                      onClick={() => handleStatusClick(nextStatus)}
                      className="h-auto p-3 flex items-center gap-3 justify-start min-w-0"
                      disabled={!!error && error.includes('required')}
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${info.bgColor}`}>
                        <Icon className={`h-4 w-4 ${info.iconColor}`} />
                      </div>
                      <div className="flex-1 text-left min-w-0 overflow-hidden">
                        <div className="font-medium truncate">{info.label}</div>
                        <div className="text-xs text-muted-foreground font-normal truncate">
                          {error || info.description}
                        </div>
                      </div>
                    </Button>
                  )
                })}
              </div>
            </div>
          )}

          {/* No actions available */}
          {possibleTransitions.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
              <p className="font-medium">No further actions available</p>
              <p className="text-sm mt-1">This claim is in a final state</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transition Confirmation Dialog */}
      <Dialog open={showTransitionDialog} onOpenChange={setShowTransitionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {validationError && validationError.includes('required')
                ? 'Cannot Change Status'
                : `Change Status to ${selectedStatus ? STATUS_INFO[selectedStatus].label : ''}`}
            </DialogTitle>
            <DialogDescription>
              {validationError && validationError.includes('required')
                ? validationError
                : selectedStatus && STATUS_INFO[selectedStatus].description}
            </DialogDescription>
          </DialogHeader>

          {!validationError || !validationError.includes('required') ? (
            <div className="space-y-4 py-4">
              {/* Notes field (required for dispute, escalate, supplement) */}
              {selectedStatus && requiresNotes(selectedStatus) && (
                <div className="space-y-2">
                  <Label htmlFor="notes">
                    Notes <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder={`Explain why this claim is being ${selectedStatus === 'disputed' ? 'disputed' : selectedStatus === 'escalated' ? 'escalated' : 'supplemented'}...`}
                    value={transitionData.notes || ''}
                    onChange={(e) =>
                      setTransitionData({ ...transitionData, notes: e.target.value })
                    }
                    rows={4}
                  />
                </div>
              )}

              {/* Approved amount (required for approved status) */}
              {selectedStatus === 'approved' && !claim.approved_amount && (
                <div className="space-y-2">
                  <Label htmlFor="approved_amount">
                    Approved Amount <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="approved_amount"
                    type="number"
                    placeholder="0.00"
                    value={transitionData.approved_amount || ''}
                    onChange={(e) =>
                      setTransitionData({ ...transitionData, approved_amount: e.target.value })
                    }
                  />
                </div>
              )}

              {/* Paid amount (optional for paid status) */}
              {selectedStatus === 'paid' && (
                <div className="space-y-2">
                  <Label htmlFor="paid_amount">
                    Paid Amount {!claim.paid_amount && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id="paid_amount"
                    type="number"
                    placeholder={claim.approved_amount?.toString() || '0.00'}
                    value={transitionData.paid_amount || claim.paid_amount?.toString() || ''}
                    onChange={(e) =>
                      setTransitionData({ ...transitionData, paid_amount: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Defaults to approved amount: ${claim.approved_amount?.toLocaleString() || '0'}
                  </p>
                </div>
              )}

              {validationError && !validationError.includes('required') && (
                <div className="text-sm text-red-500 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                  {validationError}
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter>
            {!validationError || !validationError.includes('required') ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowTransitionDialog(false)
                    setTransitionData({})
                    setValidationError(null)
                  }}
                  disabled={updating}
                >
                  Cancel
                </Button>
                <Button onClick={handleConfirmTransition} disabled={updating}>
                  {updating ? 'Updating...' : 'Confirm Status Change'}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => {
                  setShowTransitionDialog(false)
                  setValidationError(null)
                }}
              >
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
