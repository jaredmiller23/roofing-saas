'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  FileText,
  ArrowLeft,
  Send,
  Download,
  Trash2,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  User,
  Building,
  Calendar,
  Mail,
  Phone,
  MapPin,
  RefreshCw,
  Copy,
  MessageSquare,
  AlertCircle,
  PenLine
} from 'lucide-react'
import {
  getDisplayStatus,
  getStatusBadgeClasses,
  getStatusIconColor,
  type StatusColor
} from '@/lib/signatures/status'
import { apiFetch } from '@/lib/api/client'

interface SignatureDocument {
  id: string
  title: string
  description: string | null
  document_type: string
  status: string
  file_url: string | null
  requires_customer_signature: boolean
  requires_company_signature: boolean
  created_at: string
  sent_at: string | null
  viewed_at: string | null
  signed_at: string | null
  expires_at: string | null
  declined_at: string | null
  decline_reason: string | null
  reminder_count?: number
  reminder_sent_at?: string | null
  project?: {
    id: string
    name: string
    address: string | null
  }
  contact?: {
    id: string
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
  }
  signatures?: Array<{
    id: string
    signer_type: string
    signer_name: string
    signer_email: string
    signed_at: string
  }>
}

export default function ViewSignatureDocumentPage() {
  const router = useRouter()
  const params = useParams()
  const documentId = params.id as string

  const [document, setDocument] = useState<SignatureDocument | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState<string | null>(null)

  const loadDocument = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const doc = await apiFetch<SignatureDocument>('/api/signature-documents/' + documentId)
      setDocument(doc)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document')
    } finally {
      setIsLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    loadDocument()
  }, [loadDocument])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return
    }

    try {
      setIsDeleting(true)
      await apiFetch<void>('/api/signature-documents/' + documentId, { method: 'DELETE' })
      router.push('/signatures')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document')
      setIsDeleting(false)
    }
  }

  const handleResend = async () => {
    if (!document?.contact?.email) {
      setError('Contact does not have an email address')
      return
    }

    try {
      setIsResending(true)
      setError(null)
      setResendSuccess(null)

      const result = await apiFetch<{ message: string; recipient: { email: string; name: string }; reminderType: string }>(
        `/api/signature-documents/${documentId}/resend`,
        { method: 'POST' }
      )
      setResendSuccess('Reminder sent to ' + result.recipient.email)

      // Reload document to update reminder count
      loadDocument()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reminder')
    } finally {
      setIsResending(false)
    }
  }

  // Get icon based on computed display status
  const getStatusIcon = () => {
    if (!document) return <FileText className="h-5 w-5 text-muted-foreground" />

    const displayStatus = getDisplayStatus(document)
    const iconColorClass = getStatusIconColor(displayStatus.color)

    const iconMap: Record<StatusColor, React.ReactNode> = {
      gray: <FileText className={`h-5 w-5 ${iconColorClass}`} />,
      blue: <Send className={`h-5 w-5 ${iconColorClass}`} />,
      amber: <AlertCircle className={`h-5 w-5 ${iconColorClass}`} />,
      teal: <Eye className={`h-5 w-5 ${iconColorClass}`} />,
      green: <CheckCircle className={`h-5 w-5 ${iconColorClass}`} />,
      yellow: <Clock className={`h-5 w-5 ${iconColorClass}`} />,
      red: <XCircle className={`h-5 w-5 ${iconColorClass}`} />
    }

    return iconMap[displayStatus.color]
  }

  // Get badge based on computed display status
  const getStatusBadge = () => {
    if (!document) return null

    const displayStatus = getDisplayStatus(document)
    const badgeClasses = getStatusBadgeClasses(displayStatus.color)

    return (
      <span
        className={`px-3 py-1 rounded-full text-sm font-medium ${badgeClasses}`}
        title={displayStatus.description}
      >
        {displayStatus.label}
      </span>
    )
  }

  // Check if resend button should be shown
  const canResend = document && 
    (document.status === 'sent' || document.status === 'viewed') &&
    document.contact?.email

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
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
        <div className="max-w-4xl mx-auto">
          <Alert className="bg-red-50 border-red-200">
            <AlertDescription className="text-red-900">
              {error || 'Document not found'}
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

  if (!document) {
    return null
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        {/* Success/Error Messages */}
        {resendSuccess && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-900 ml-2">
              {resendSuccess}
            </AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert className="mb-4 bg-red-50 border-red-200">
            <XCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-900 ml-2">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/signatures" className="hover:text-foreground flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              E-Signatures
            </Link>
            <span>/</span>
            <span>{document.title}</span>
          </div>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                {getStatusIcon()}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">{document.title}</h1>
                <div className="flex items-center gap-3 mt-2">
                  {getStatusBadge()}
                  <span className="text-sm text-muted-foreground capitalize">
                    {document.document_type.replace('_', ' ')}
                  </span>
                  {document.reminder_count !== undefined && document.reminder_count > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({document.reminder_count} reminder{document.reminder_count !== 1 ? 's' : ''} sent)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {document.status === 'draft' && (
                <Button
                  onClick={() => router.push('/signatures/' + document.id + '/send')}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              )}
              {canResend && (
                <Button
                  variant="outline"
                  onClick={handleResend}
                  disabled={isResending}
                  className="text-primary hover:text-primary hover:bg-primary/10"
                >
                  {isResending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {isResending ? 'Sending...' : 'Resend Reminder'}
                </Button>
              )}
              {['draft', 'sent', 'viewed'].includes(document.status) && (
                <Button
                  onClick={() => window.open('/sign/' + document.id + '?as=customer&inperson=true', '_blank')}
                  variant="outline"
                  className="text-primary hover:text-primary hover:bg-primary/10"
                >
                  <PenLine className="h-4 w-4 mr-2" />
                  Sign In Person
                </Button>
              )}
              {document.status === 'signed' && (
                <Button
                  variant="outline"
                  onClick={() => window.open('/api/signature-documents/' + document.id + '/download', '_blank')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
              {document.status === 'declined' && (
                <Button
                  onClick={() => router.push('/signatures/new?clone=' + document.id)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Create New Version
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>

        {/* Document Details */}
        <div className="grid gap-6">
          {/* Description */}
          {document.description && (
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-2">Description</h2>
              <p className="text-muted-foreground">{document.description}</p>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Timeline</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Created</div>
                  <div className="font-medium text-foreground">
                    {new Date(document.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              {document.sent_at && (
                <div className="flex items-center gap-3">
                  <Send className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-sm text-muted-foreground">Sent</div>
                    <div className="font-medium text-foreground">
                      {new Date(document.sent_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
              {document.viewed_at && (
                <div className="flex items-center gap-3">
                  <Eye className="h-5 w-5 text-secondary" />
                  <div>
                    <div className="text-sm text-muted-foreground">Viewed</div>
                    <div className="font-medium text-foreground">
                      {new Date(document.viewed_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
              {document.signed_at && (
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="text-sm text-muted-foreground">Signed</div>
                    <div className="font-medium text-foreground">
                      {new Date(document.signed_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
              {document.declined_at && (
                <div className="flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <div className="text-sm text-muted-foreground">Declined</div>
                    <div className="font-medium text-foreground">
                      {new Date(document.declined_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
              {document.expires_at && (
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <div>
                    <div className="text-sm text-muted-foreground">Expires</div>
                    <div className="font-medium text-foreground">
                      {new Date(document.expires_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
              {document.reminder_sent_at && (
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Last Reminder</div>
                    <div className="font-medium text-foreground">
                      {new Date(document.reminder_sent_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Decline Reason */}
          {document.status === 'declined' && document.decline_reason && (
            <div className="bg-red-50 border border-red-200 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-red-900 mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-red-600" />
                Decline Reason
              </h2>
              <p className="text-red-800 whitespace-pre-wrap">{document.decline_reason}</p>
            </div>
          )}

          {/* Contact & Project */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Contact */}
            {document.contact && (
              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Contact
                </h2>
                <div className="space-y-3">
                  <div className="font-medium text-foreground">
                    {document.contact.first_name} {document.contact.last_name}
                  </div>
                  {document.contact.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <a href={'mailto:' + document.contact.email} className="hover:text-primary">
                        {document.contact.email}
                      </a>
                    </div>
                  )}
                  {document.contact.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <a href={'tel:' + document.contact.phone} className="hover:text-primary">
                        {document.contact.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Project */}
            {document.project && (
              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Project
                </h2>
                <div className="space-y-3">
                  <div className="font-medium text-foreground">
                    {document.project.name}
                  </div>
                  {document.project.address && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {document.project.address}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/projects/' + document.project!.id)}
                  >
                    View Project
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Signatures */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Signature Requirements</h2>
            <div className="space-y-4">
              {/* Required Signatures */}
              <div className="flex gap-4">
                {document.requires_customer_signature && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Customer Signature Required</span>
                    {document.signatures?.some(s => s.signer_type === 'customer') && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                )}
                {document.requires_company_signature && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Company Signature Required</span>
                    {document.signatures?.some(s => s.signer_type === 'company') ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Button size="sm" variant="default" className="ml-2" asChild>
                        <Link href={`/sign/${document.id}?as=company`}>
                          <FileText className="h-4 w-4 mr-1" />
                          Sign as Company
                        </Link>
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Collected Signatures */}
              {document.signatures && document.signatures.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Collected Signatures</h3>
                  <div className="space-y-2">
                    {document.signatures.map((sig) => (
                      <div
                        key={sig.id}
                        className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div>
                            <div className="font-medium text-green-900">{sig.signer_name}</div>
                            <div className="text-sm text-green-700">
                              {sig.signer_email} ({sig.signer_type})
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-green-700">
                          {new Date(sig.signed_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
