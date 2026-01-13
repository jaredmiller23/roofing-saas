'use client'

import { useState } from 'react'
import {
  CheckIcon,
  XIcon,
  EditIcon,
  Loader2Icon,
  UserIcon,
  PhoneIcon,
  ClockIcon,
  MessageSquareIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'

interface QueueItem {
  id: string
  phone_number: string
  contact_id: string | null
  inbound_message: string
  suggested_response: string
  category: string
  status: string
  metadata: {
    contact_name?: string
    generated_at?: string
    rejection_reason?: string
  }
  created_at: string
  expires_at: string
  contact?: {
    first_name: string
    last_name: string
  } | null
}

interface ApprovalItemProps {
  item: QueueItem
  onApprove: (id: string) => Promise<{ success: boolean; error?: string }>
  onModify: (id: string, response: string) => Promise<{ success: boolean; error?: string }>
  onReject: (id: string, reason?: string) => Promise<{ success: boolean; error?: string }>
  getCategoryColor: (category: string) => string
  formatTimeAgo: (timestamp: string) => string
}

export function ApprovalItem({
  item,
  onApprove,
  onModify,
  onReject,
  getCategoryColor,
  formatTimeAgo,
}: ApprovalItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedResponse, setEditedResponse] = useState(item.suggested_response)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const contactName = item.contact
    ? `${item.contact.first_name} ${item.contact.last_name}`.trim()
    : item.metadata?.contact_name || 'Unknown Contact'

  const isPending = item.status === 'pending'

  const handleApprove = async () => {
    setActionLoading('approve')
    setError(null)
    const result = await onApprove(item.id)
    setActionLoading(null)
    if (!result.success) {
      setError(result.error || 'Approval failed')
    }
  }

  const handleModify = async () => {
    if (editedResponse === item.suggested_response) {
      return handleApprove()
    }
    setActionLoading('modify')
    setError(null)
    const result = await onModify(item.id, editedResponse)
    setActionLoading(null)
    if (!result.success) {
      setError(result.error || 'Modification failed')
    } else {
      setIsEditing(false)
    }
  }

  const handleReject = async () => {
    setActionLoading('reject')
    setError(null)
    const result = await onReject(item.id, rejectionReason)
    setActionLoading(null)
    if (!result.success) {
      setError(result.error || 'Rejection failed')
    } else {
      setShowRejectForm(false)
    }
  }

  const getStatusBadge = () => {
    switch (item.status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved & Sent</Badge>
      case 'modified':
        return <Badge className="bg-secondary">Modified & Sent</Badge>
      case 'rejected':
        return <Badge className="bg-red-500">Rejected</Badge>
      case 'expired':
        return <Badge variant="secondary">Expired</Badge>
      default:
        return <Badge variant="outline">Pending</Badge>
    }
  }

  return (
    <div className="rounded-lg bg-card border border-border overflow-hidden">
      {/* Header - Always visible */}
      <div
        className="p-4 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Avatar */}
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UserIcon className="h-5 w-5 text-primary" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-foreground">{contactName}</span>
                <Badge className={getCategoryColor(item.category)} variant="secondary">
                  {item.category}
                </Badge>
                {!isPending && getStatusBadge()}
              </div>

              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <PhoneIcon className="h-3 w-3" />
                <span>{item.phone_number}</span>
                <span className="mx-1">•</span>
                <ClockIcon className="h-3 w-3" />
                <span>{formatTimeAgo(item.created_at)}</span>
              </div>

              {/* Preview of inbound message */}
              <p className="mt-2 text-sm text-muted-foreground line-clamp-1">
                <MessageSquareIcon className="inline h-3 w-3 mr-1" />
                {item.inbound_message}
              </p>
            </div>
          </div>

          {/* Quick actions for pending items */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {isPending && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleApprove()
                  }}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === 'approve' ? (
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckIcon className="h-4 w-4 text-green-600" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsExpanded(true)
                    setIsEditing(true)
                  }}
                  disabled={actionLoading !== null}
                >
                  <EditIcon className="h-4 w-4 text-primary" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsExpanded(true)
                    setShowRejectForm(true)
                  }}
                  disabled={actionLoading !== null}
                >
                  <XIcon className="h-4 w-4 text-red-600" />
                </Button>
              </>
            )}
            {isExpanded ? (
              <ChevronUpIcon className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-border bg-muted/10">
          {error && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Inbound message */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Customer Message</h4>
            <div className="p-3 rounded-md bg-background border border-border">
              <p className="text-sm">{item.inbound_message}</p>
            </div>
          </div>

          {/* Suggested response */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-1">
              {isEditing ? 'Edit Response' : 'ARIA Suggested Response'}
            </h4>
            {isEditing ? (
              <Textarea
                value={editedResponse}
                onChange={(e) => setEditedResponse(e.target.value)}
                className="min-h-[100px]"
                placeholder="Edit the response..."
              />
            ) : (
              <div className="p-3 rounded-md bg-primary/5 border border-primary/20">
                <p className="text-sm">{item.suggested_response}</p>
              </div>
            )}
          </div>

          {/* Rejection reason for rejected items */}
          {item.status === 'rejected' && item.metadata?.rejection_reason && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Rejection Reason</h4>
              <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20">
                <p className="text-sm">{item.metadata.rejection_reason}</p>
              </div>
            </div>
          )}

          {/* Rejection form */}
          {showRejectForm && isPending && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-1">
                Rejection Reason (optional)
              </h4>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[60px]"
                placeholder="Why are you rejecting this response?"
              />
            </div>
          )}

          {/* Action buttons for pending items */}
          {isPending && (
            <div className="flex items-center gap-2 pt-2">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false)
                      setEditedResponse(item.suggested_response)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleModify} disabled={actionLoading !== null}>
                    {actionLoading === 'modify' ? (
                      <Loader2Icon className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <CheckIcon className="h-4 w-4 mr-1" />
                    )}
                    Save & Send
                  </Button>
                </>
              ) : showRejectForm ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setShowRejectForm(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleReject}
                    disabled={actionLoading !== null}
                  >
                    {actionLoading === 'reject' ? (
                      <Loader2Icon className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <XIcon className="h-4 w-4 mr-1" />
                    )}
                    Confirm Reject
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <EditIcon className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowRejectForm(true)}>
                    <XIcon className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button size="sm" onClick={handleApprove} disabled={actionLoading !== null}>
                    {actionLoading === 'approve' ? (
                      <Loader2Icon className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <CheckIcon className="h-4 w-4 mr-1" />
                    )}
                    Approve & Send
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
