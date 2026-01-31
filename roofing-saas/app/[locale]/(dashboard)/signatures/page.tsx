'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  Eye,
  AlertCircle,
  MoreVertical,
  Edit,
  Trash2,
  Ban,
  PenLine,
} from 'lucide-react'
import {
  getDisplayStatus,
  getStatusBadgeClasses,
  getStatusIconColor,
  type StatusColor
} from '@/lib/signatures/status'
import { usePermissions } from '@/hooks/usePermissions'
import { createClient } from '@/lib/supabase/client'
import { apiFetch, apiFetchPaginated } from '@/lib/api/client'

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
  created_by?: string
  requires_customer_signature?: boolean
  requires_company_signature?: boolean
  decline_reason?: string | null
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

  // Permission & user state
  const { canEdit, canDelete } = usePermissions()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Action state
  const [documentToDelete, setDocumentToDelete] = useState<SignatureDocument | null>(null)
  const [documentToCancel, setDocumentToCancel] = useState<SignatureDocument | null>(null)
  const [documentToEdit, setDocumentToEdit] = useState<SignatureDocument | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Edit form state
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDocumentType, setEditDocumentType] = useState('')

  // Get current user ID
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id)
    })
  }, [])

  const loadDocuments = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      const { data: docs } = await apiFetchPaginated<SignatureDocument[]>(`/api/signature-documents?${params.toString()}`)
      setDocuments(docs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  // Check if user can perform action on a specific document
  const canUserEdit = (doc: SignatureDocument) => {
    if (doc.status === 'signed') return false
    if (canEdit('signatures')) return true
    if (doc.status === 'draft' && doc.created_by === currentUserId) return true
    return false
  }

  const canUserDelete = (doc: SignatureDocument) => {
    if (doc.status === 'signed') return false
    if (canDelete('signatures')) return true
    if (doc.status === 'draft' && doc.created_by === currentUserId) return true
    return false
  }

  const canUserCancel = (doc: SignatureDocument) => {
    return (doc.status === 'sent' || doc.status === 'viewed') && canDelete('signatures')
  }

  // Action handlers
  const handleDelete = async () => {
    if (!documentToDelete) return
    setActionLoading(documentToDelete.id)
    try {
      await apiFetch<void>(`/api/signature-documents/${documentToDelete.id}`, { method: 'DELETE' })
      setDocuments((prev) => prev.filter((d) => d.id !== documentToDelete.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document')
    } finally {
      setActionLoading(null)
      setDocumentToDelete(null)
    }
  }

  const handleCancel = async () => {
    if (!documentToCancel) return
    setActionLoading(documentToCancel.id)
    try {
      await apiFetch(`/api/signature-documents/${documentToCancel.id}`, {
        method: 'PATCH',
        body: { status: 'expired' },
      })
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === documentToCancel.id ? { ...d, status: 'expired' } : d
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel document')
    } finally {
      setActionLoading(null)
      setDocumentToCancel(null)
    }
  }

  const openEditDialog = (doc: SignatureDocument) => {
    setDocumentToEdit(doc)
    setEditTitle(doc.title)
    setEditDescription(doc.description || '')
    setEditDocumentType(doc.document_type)
  }

  const handleEdit = async () => {
    if (!documentToEdit) return
    setActionLoading(documentToEdit.id)
    try {
      const updated = await apiFetch<SignatureDocument>(`/api/signature-documents/${documentToEdit.id}`, {
        method: 'PATCH',
        body: {
          title: editTitle,
          description: editDescription,
          document_type: editDocumentType,
        },
      })
      setDocuments((prev) =>
        prev.map((d) => (d.id === documentToEdit.id ? { ...d, ...updated } : d))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update document')
    } finally {
      setActionLoading(null)
      setDocumentToEdit(null)
    }
  }

  // Get icon based on computed display status
  const getStatusIcon = (doc: SignatureDocument) => {
    const displayStatus = getDisplayStatus(doc)
    const iconColorClass = getStatusIconColor(displayStatus.color)

    // Map display status to appropriate icon
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
  const getStatusBadge = (doc: SignatureDocument) => {
    const displayStatus = getDisplayStatus(doc)
    const badgeClasses = getStatusBadgeClasses(displayStatus.color)

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${badgeClasses}`}
        title={displayStatus.description}
      >
        {displayStatus.label}
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
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
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
                      {getStatusIcon(doc)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3
                          className="text-lg font-semibold text-foreground hover:text-primary cursor-pointer"
                          onClick={() => router.push(`/signatures/${doc.id}`)}
                        >
                          {doc.title}
                        </h3>
                        {getStatusBadge(doc)}
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

                  <div className="flex items-center gap-2 ml-4">
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
                    {['draft', 'sent', 'viewed'].includes(doc.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open('/sign/' + doc.id + '?as=customer&inperson=true', '_blank')}
                        className="text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <PenLine className="h-4 w-4 mr-1" />
                        Sign In Person
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

                    {/* Actions dropdown — visible when user has any action available */}
                    {(canUserEdit(doc) || canUserDelete(doc) || canUserCancel(doc)) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            disabled={actionLoading === doc.id}
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canUserEdit(doc) && (
                            <DropdownMenuItem onClick={() => openEditDialog(doc)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {canUserCancel(doc) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDocumentToCancel(doc)}
                                className="text-orange-500 focus:text-orange-500"
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Cancel &amp; Revoke
                              </DropdownMenuItem>
                            </>
                          )}
                          {canUserDelete(doc) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDocumentToDelete(doc)}
                                className="text-red-500 focus:text-red-500"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!documentToDelete} onOpenChange={() => setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{documentToDelete?.title}&rdquo;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {actionLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel/Revoke Confirmation Dialog */}
      <AlertDialog open={!!documentToCancel} onOpenChange={() => setDocumentToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Document</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke the signing link for &ldquo;{documentToCancel?.title}&rdquo;. The customer will no longer be able to sign this document. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Active</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {actionLoading ? 'Cancelling...' : 'Cancel Document'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={!!documentToEdit} onOpenChange={() => setDocumentToEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>
            {documentToEdit?.status === 'draft' && (
              <div className="space-y-2">
                <Label htmlFor="edit-type">Document Type</Label>
                <select
                  id="edit-type"
                  value={editDocumentType}
                  onChange={(e) => setEditDocumentType(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="contract">Contract</option>
                  <option value="proposal">Proposal</option>
                  <option value="work_authorization">Work Authorization</option>
                  <option value="change_order">Change Order</option>
                  <option value="completion_certificate">Completion Certificate</option>
                  <option value="other">Other</option>
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocumentToEdit(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={!editTitle.trim() || !!actionLoading}>
              {actionLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
