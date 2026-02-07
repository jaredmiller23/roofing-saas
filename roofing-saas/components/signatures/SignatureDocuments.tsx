'use client'

import { useRouter } from '@/lib/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  FileText,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  Eye
} from 'lucide-react'

interface SignatureDocument {
  id: string
  title: string
  description: string
  document_type: string
  status: string
  created_at: string
  sent_at: string | null
  signed_at: string | null
  expires_at: string | null
  project?: { id: string; name: string }
  contact?: { id: string; first_name: string; last_name: string }
  signatures?: Array<{ signer_type: string }>
}

interface SignatureDocumentsProps {
  documents: SignatureDocument[]
  isLoading?: boolean
  error?: string | null
}

export default function SignatureDocuments({ 
  documents, 
  isLoading = false, 
  error = null
}: SignatureDocumentsProps) {
  const router = useRouter()

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <FileText className="h-5 w-5 text-muted-foreground" />
      case 'sent':
        return <Send className="h-5 w-5 text-primary" />
      case 'viewed':
        return <Eye className="h-5 w-5 text-secondary" />
      case 'signed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'expired':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'declined':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <FileText className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      draft: 'bg-muted text-muted-foreground',
      sent: 'bg-primary/10 text-primary',
      viewed: 'bg-secondary/10 text-secondary',
      signed: 'bg-green-500/10 text-green-500',
      expired: 'bg-yellow-500/10 text-yellow-500',
      declined: 'bg-red-500/10 text-red-500'
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors] || colors.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading documents...</p>
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border p-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No documents found
        </h3>
        <p className="text-muted-foreground">
          Get started by creating your first signature document
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="bg-card rounded-lg shadow-sm border border-border p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1">
              <div className="mt-1">
                {getStatusIcon(doc.status)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3
                    className="text-lg font-semibold text-foreground hover:text-primary cursor-pointer"
                    onClick={() => router.push(`/signatures/${doc.id}`)}
                  >
                    {doc.title}
                  </h3>
                  {getStatusBadge(doc.status)}
                </div>
                {doc.description && (
                  <p className="text-muted-foreground text-sm mb-3">{doc.description}</p>
                )}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Type:</span>{' '}
                    <span className="capitalize">{doc.document_type.replace('_', ' ')}</span>
                  </div>
                  {doc.project && (
                    <div>
                      <span className="font-medium">Project:</span>{' '}
                      <span>{doc.project.name}</span>
                    </div>
                  )}
                  {doc.contact && (
                    <div>
                      <span className="font-medium">Contact:</span>{' '}
                      <span>{doc.contact.first_name} {doc.contact.last_name}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Created:</span>{' '}
                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                  {doc.signed_at && (
                    <div>
                      <span className="font-medium">Signed:</span>{' '}
                      <span>{new Date(doc.signed_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 ml-4">
              {doc.status === 'draft' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/signatures/${doc.id}/send`)}
                >
                  <Send className="h-4 w-4 mr-1" />
                  Send
                </Button>
              )}
              {doc.status === 'signed' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`/api/signature-documents/${doc.id}/download`, '_blank')}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
