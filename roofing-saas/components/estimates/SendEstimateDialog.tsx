'use client'

import { useState, useEffect } from 'react'
import { Loader2, Send, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface SendEstimateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
  contactEmail?: string
  contactName?: string
  onSuccess?: (proposalId: string, viewUrl: string) => void
}

export function SendEstimateDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  contactEmail,
  contactName,
  onSuccess,
}: SendEstimateDialogProps) {
  const [recipientEmail, setRecipientEmail] = useState(contactEmail || '')
  const [recipientName, setRecipientName] = useState(contactName || '')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successState, setSuccessState] = useState<{ proposalId: string; viewUrl: string } | null>(null)

  // Sync contact info when dialog opens or props change
  useEffect(() => {
    if (open) {
      setRecipientEmail(contactEmail || '')
      setRecipientName(contactName || '')
    }
  }, [open, contactEmail, contactName])

  const handleSend = async () => {
    if (!recipientEmail) {
      setError('Recipient email is required')
      return
    }

    setIsSending(true)
    setError(null)

    try {
      const res = await fetch(`/api/estimates/${projectId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_email: recipientEmail,
          recipient_name: recipientName || 'Customer',
          message: message || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to send estimate')
      }

      const proposalId = data.data?.proposal_id
      const viewUrl = data.data?.view_url

      setSuccessState({ proposalId, viewUrl })
      onSuccess?.(proposalId, viewUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send estimate')
    } finally {
      setIsSending(false)
    }
  }

  const handleClose = () => {
    setSuccessState(null)
    setError(null)
    setMessage('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Send Estimate
          </DialogTitle>
          <DialogDescription>
            Send the estimate for &quot;{projectName}&quot; to your customer via email.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {successState ? (
          <div className="py-6 text-center">
            <div className="mx-auto w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Estimate Sent</h3>
            <p className="text-muted-foreground text-sm mb-4">
              The estimate has been emailed to {recipientEmail}.
            </p>
            {successState.viewUrl && (
              <div className="bg-muted/30 rounded-lg p-3 border border-border text-left">
                <p className="text-xs text-muted-foreground mb-1">Shareable link:</p>
                <p className="text-sm font-mono text-foreground break-all">{successState.viewUrl}</p>
              </div>
            )}
            <Button onClick={handleClose} className="mt-4 w-full">
              Done
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="recipient-name">Recipient Name</Label>
                <Input
                  id="recipient-name"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="John Doe"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="recipient-email">Recipient Email *</Label>
                <Input
                  id="recipient-email"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="estimate-message">Message (optional)</Label>
                <Textarea
                  id="estimate-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a personal message to include with the estimate..."
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isSending}>
                Cancel
              </Button>
              <Button onClick={handleSend} disabled={isSending || !recipientEmail}>
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Estimate
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
