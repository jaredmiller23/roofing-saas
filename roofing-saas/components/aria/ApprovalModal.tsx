'use client'

import { useState } from 'react'
import { CheckIcon, EditIcon, XIcon, Loader2Icon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { ARIAExecutionResult } from '@/lib/aria/types'

interface ApprovalModalProps {
  /** The draft content to be approved */
  draft: NonNullable<ARIAExecutionResult['draft']>
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when modal should be closed */
  onClose: () => void
  /** Optional callback when user wants to edit - if not provided, edit button is hidden */
  onEdit?: () => void
  /** Optional callback called after successful approval */
  onApproved?: () => void
}

type SendState = 'idle' | 'sending' | 'success' | 'error'

export function ApprovalModal({
  draft,
  isOpen,
  onClose,
  onEdit,
  onApproved,
}: ApprovalModalProps) {
  const [sendState, setSendState] = useState<SendState>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')

  const handleApprove = async () => {
    setSendState('sending')
    setErrorMessage('')

    try {
      let response: Response

      if (draft.type === 'sms') {
        response = await fetch('/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: draft.recipient,
            body: draft.body,
            contactId: draft.metadata?.contactId,
          }),
        })
      } else if (draft.type === 'email') {
        response = await fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: draft.recipient,
            subject: draft.subject || 'Message',
            text: draft.body,
            contactId: draft.metadata?.contactId,
          }),
        })
      } else {
        throw new Error(`Unsupported draft type: ${draft.type}`)
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Send failed' }))
        throw new Error(errorData.message || `Failed to send ${draft.type}`)
      }

      setSendState('success')
      onApproved?.()

      // Auto-close after success
      setTimeout(() => {
        setSendState('idle')
        onClose()
      }, 1500)

    } catch (error) {
      setSendState('error')
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send message')
    }
  }

  const handleClose = () => {
    if (sendState !== 'sending') {
      setSendState('idle')
      setErrorMessage('')
      onClose()
    }
  }

  const getTitle = () => {
    switch (draft.type) {
      case 'sms':
        return 'Approve SMS Message'
      case 'email':
        return 'Approve Email Message'
      default:
        return 'Approve Message'
    }
  }

  const getDescription = () => {
    if (sendState === 'success') {
      return `${draft.type.toUpperCase()} sent successfully!`
    }
    return `Review and approve this ${draft.type} before sending.`
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        {sendState === 'success' ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-green-600">
              <CheckIcon className="size-5" />
              <span className="font-medium">Message sent!</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium text-muted-foreground">To:</span>
                <span className="ml-2">{draft.recipient}</span>
              </div>

              {draft.type === 'email' && draft.subject && (
                <div className="text-sm">
                  <span className="font-medium text-muted-foreground">Subject:</span>
                  <span className="ml-2">{draft.subject}</span>
                </div>
              )}

              <div className="text-sm">
                <span className="font-medium text-muted-foreground">
                  {draft.type === 'email' ? 'Body:' : 'Message:'}
                </span>
                <div className="mt-1 p-3 rounded-md bg-muted/50 text-sm">
                  {draft.body}
                </div>
              </div>
            </div>

            {sendState === 'error' && errorMessage && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{errorMessage}</p>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={sendState === 'sending'}
              >
                <XIcon />
                Cancel
              </Button>

              {onEdit && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onEdit()
                    handleClose()
                  }}
                  disabled={sendState === 'sending'}
                >
                  <EditIcon />
                  Edit
                </Button>
              )}

              <Button
                onClick={handleApprove}
                disabled={sendState === 'sending'}
              >
                {sendState === 'sending' ? (
                  <>
                    <Loader2Icon className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <CheckIcon />
                    Approve & Send
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}