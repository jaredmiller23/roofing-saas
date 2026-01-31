'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Send,
  ArrowLeft,
  Loader2,
  FileText,
  User,
  Mail,
  Calendar
} from 'lucide-react'
import { apiFetch } from '@/lib/api/client'

interface SignatureDocument {
  id: string
  title: string
  description: string | null
  document_type: string
  status: string
  contact?: {
    id: string
    first_name: string
    last_name: string
    email: string | null
  }
  project?: {
    id: string
    name: string
  }
}

export default function SendSignatureDocumentPage() {
  const router = useRouter()
  const params = useParams()
  const documentId = params.id as string

  const [document, setDocument] = useState<SignatureDocument | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [message, setMessage] = useState('Please review and sign this document at your earliest convenience.')
  const [expirationDays, setExpirationDays] = useState(30)

  const loadDocument = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const doc = await apiFetch<SignatureDocument>(`/api/signature-documents/${documentId}`)
      setDocument(doc)

      // Pre-fill from contact if available
      if (doc.contact) {
        setRecipientName(`${doc.contact.first_name} ${doc.contact.last_name}`)
        if (doc.contact.email) {
          setRecipientEmail(doc.contact.email)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document')
    } finally {
      setIsLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    loadDocument()
  }, [loadDocument])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!recipientEmail || !recipientName) {
      setError('Recipient email and name are required')
      return
    }

    try {
      setIsSending(true)
      setError(null)

      await apiFetch(`/api/signature-documents/${documentId}/send`, {
        method: 'POST',
        body: {
          recipient_email: recipientEmail,
          recipient_name: recipientName,
          message,
          expiration_days: expirationDays
        }
      })

      setSuccess(true)
      setTimeout(() => {
        router.push('/signatures')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send document')
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading document...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error && !document) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-2xl mx-auto">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button
            variant="outline"
            onClick={() => router.push('/signatures')}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Signatures
          </Button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Alert variant="success" className="max-w-md">
          <AlertDescription>
            Document sent successfully! Redirecting...
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (document?.status !== 'draft') {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-2xl mx-auto">
          <Alert variant="warning">
            <AlertDescription>
              This document has already been {document?.status}. Only draft documents can be sent.
            </AlertDescription>
          </Alert>
          <Button
            variant="outline"
            onClick={() => router.push('/signatures')}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Signatures
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/signatures" className="hover:text-foreground flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              E-Signatures
            </Link>
            <span>/</span>
            <Link href={`/signatures/${documentId}`} className="hover:text-foreground">
              {document?.title}
            </Link>
            <span>/</span>
            <span>Send</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <Send className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Send Document</h1>
              <p className="text-muted-foreground mt-1">
                Send &ldquo;{document?.title}&rdquo; for signature
              </p>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Document Preview */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Details
          </h2>
          <div className="grid gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Title:</span>
              <span className="font-medium text-foreground">{document?.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium text-foreground capitalize">
                {document?.document_type.replace('_', ' ')}
              </span>
            </div>
            {document?.project && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Project:</span>
                <span className="font-medium text-foreground">{document.project.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Send Form */}
        <form onSubmit={handleSubmit} className="bg-card rounded-lg shadow-sm border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <User className="h-5 w-5" />
            Recipient Information
          </h2>

          <div className="space-y-6">
            <div>
              <Label htmlFor="recipientName">Recipient Name *</Label>
              <Input
                id="recipientName"
                type="text"
                placeholder="e.g., John Smith"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="recipientEmail">Recipient Email *</Label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="recipientEmail"
                  type="email"
                  placeholder="e.g., john@example.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="message">Custom Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a personal message to the recipient..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="expirationDays">Expires In (Days)</Label>
              <div className="relative mt-2">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="expirationDays"
                  type="number"
                  min="1"
                  max="365"
                  value={expirationDays}
                  onChange={(e) => setExpirationDays(parseInt(e.target.value) || 30)}
                  className="pl-10"
                />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Document will expire on {new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-8 pt-6 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/signatures/${documentId}`)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSending || !recipientEmail || !recipientName}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              <Send className="h-4 w-4 mr-2" />
              {isSending ? 'Sending...' : 'Send Document'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
