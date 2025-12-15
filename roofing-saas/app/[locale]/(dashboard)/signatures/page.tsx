'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  FileText,
  Plus,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  Search,
  LayoutTemplate,
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

export default function SignaturesPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<SignatureDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const loadDocuments = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      const res = await fetch(`/api/signature-documents?${params.toString()}`)
      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error?.message || 'Failed to load documents')
      }

      // Handle response format: { success, data: { documents, ... } } or { documents, ... }
      const data = result.data || result
      setDocuments(data.documents || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

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
      signed: 'bg-green-100 text-green-700',
      expired: 'bg-yellow-100 text-yellow-700',
      declined: 'bg-red-100 text-red-700'
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors] || colors.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const filteredDocuments = documents.filter(doc => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      doc.title.toLowerCase().includes(query) ||
      doc.description?.toLowerCase().includes(query) ||
      doc.document_type.toLowerCase().includes(query)
    )
  })

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">E-Signatures</h1>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push('/signatures/templates')}
              >
                <LayoutTemplate className="h-4 w-4 mr-2" />
                Templates
              </Button>
              <Button
                onClick={() => router.push('/signatures/new')}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Document
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground">
            Create, send, and manage signature documents
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg shadow-sm border border p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="md:w-64">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="viewed">Viewed</option>
                <option value="signed">Signed</option>
                <option value="expired">Expired</option>
                <option value="declined">Declined</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <AlertDescription className="text-red-900">{error}</AlertDescription>
          </Alert>
        )}

        {/* Documents List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading documents...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="bg-card rounded-lg shadow-sm border border p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No documents found
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first signature document'}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => router.push('/signatures/new')}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Document
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="bg-card rounded-lg shadow-sm border border p-6 hover:shadow-md transition-shadow"
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
        )}
      </div>
    </div>
  )
}
