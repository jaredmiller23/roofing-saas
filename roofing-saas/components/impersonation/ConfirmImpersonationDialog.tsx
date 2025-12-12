'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { UserForImpersonation } from '@/lib/impersonation/types'

interface ConfirmImpersonationDialogProps {
  user: UserForImpersonation | null
  isOpen: boolean
  onClose: () => void
  onConfirm: (userId: string, reason?: string) => Promise<void>
}

/**
 * ConfirmImpersonationDialog
 * Confirmation dialog before starting impersonation
 * Features:
 * - Shows user details
 * - Optional reason field
 * - Security warnings
 * - Clear confirm/cancel actions
 */
export function ConfirmImpersonationDialog({
  user,
  isOpen,
  onClose,
  onConfirm,
}: ConfirmImpersonationDialogProps) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async () => {
    if (!user) return

    setIsSubmitting(true)
    try {
      await onConfirm(user.id, reason.trim() || undefined)
      setReason('') // Clear reason after successful confirmation
      onClose()
    } catch (error) {
      console.error('Error starting impersonation:', error)
      // Error handling is done in the parent component
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('')
      onClose()
    }
  }

  const getUserDisplayName = (u: UserForImpersonation): string => {
    if (u.first_name || u.last_name) {
      return `${u.first_name || ''} ${u.last_name || ''}`.trim()
    }
    return u.email
  }

  if (!user) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Confirm User Impersonation
          </DialogTitle>
          <DialogDescription>
            You are about to view the application as another user. All actions
            will be logged for security and compliance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User details */}
          <div className="rounded-lg bg-muted/30 p-4 space-y-2">
            <div className="text-sm text-muted-foreground">You will impersonate:</div>
            <div className="font-semibold text-lg">{getUserDisplayName(user)}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                {user.role}
              </span>
            </div>
          </div>

          {/* Reason field */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for Impersonation{' '}
              <span className="text-muted-foreground font-normal">(optional but recommended)</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="e.g., Support ticket #1234, Performance review, Bug investigation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This reason will be stored in the audit log for compliance purposes.
            </p>
          </div>

          {/* Warning messages */}
          <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-3 space-y-2">
            <div className="font-semibold text-sm text-orange-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Important Security Information
            </div>
            <ul className="text-xs text-orange-800 space-y-1 pl-6 list-disc">
              <li>Your session will be logged and audited</li>
              <li>All actions you perform will be attributed to you</li>
              <li>The impersonated user will see this in their activity log</li>
              <li>Session will automatically expire after 4 hours</li>
              <li>You can exit impersonation at any time</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isSubmitting ? 'Starting...' : 'Start Impersonation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
