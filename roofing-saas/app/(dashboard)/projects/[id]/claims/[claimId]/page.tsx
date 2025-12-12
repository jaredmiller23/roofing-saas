'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  FileText,
  Download,
  Upload,
  Clock,
  CheckCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import type { ClaimData, ClaimStatus } from '@/lib/claims/types'
import { ClaimStatusWorkflow } from '@/components/claims/ClaimStatusWorkflow'
import { ClaimDocuments } from '@/components/claims/ClaimDocuments'
import { ClaimApprovalWorkflow } from '@/components/claims/ClaimApprovalWorkflow'

interface ClaimDocument {
  id: string
  name: string
  file_url: string
  file_size?: number
  mime_type?: string
  type?: string
  created_at: string
  created_by?: string
}

const STATUS_COLORS: Record<ClaimStatus, string> = {
  'new': 'bg-blue-500',
  'documents_pending': 'bg-yellow-500',
  'under_review': 'bg-purple-500',
  'approved': 'bg-green-500',
  'paid': 'bg-emerald-500',
  'closed': 'bg-background0',
  'disputed': 'bg-red-500',
  'supplement_filed': 'bg-orange-500',
  'escalated': 'bg-pink-500',
}

const STATUS_LABELS: Record<ClaimStatus, string> = {
  'new': 'New',
  'documents_pending': 'Docs Pending',
  'under_review': 'Under Review',
  'approved': 'Approved',
  'paid': 'Paid',
  'closed': 'Closed',
  'disputed': 'Disputed',
  'supplement_filed': 'Supplement Filed',
  'escalated': 'Escalated',
}

export default function ClaimDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const claimId = params.claimId as string

  const [claim, setClaim] = useState<ClaimData | null>(null)
  const [documents, setDocuments] = useState<ClaimDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const fetchClaim = useCallback(async () => {
    try {
      const res = await fetch(`/api/claims/${claimId}`)
      if (res.ok) {
        const data = await res.json()
        setClaim(data.claim)
      } else {
        console.error('Failed to fetch claim')
      }
    } catch (error) {
      console.error('Error fetching claim:', error)
    } finally {
      setLoading(false)
    }
  }, [claimId])

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`/api/claims/${claimId}/documents`)
      if (res.ok) {
        const data = await res.json()
        setDocuments(data.documents || [])
      } else {
        console.error('Failed to fetch documents')
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
    }
  }, [claimId])

  useEffect(() => {
    fetchClaim()
    fetchDocuments()
  }, [fetchClaim, fetchDocuments])

  const handleSyncToClaims = async () => {
    setSyncing(true)
    try {
      const res = await fetch(`/api/claims/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId }),
      })

      if (res.ok) {
        alert('Successfully synced to Claims system')
        fetchClaim() // Refresh claim data
      } else {
        const error = await res.json()
        alert(`Sync failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Error syncing to claims:', error)
      alert('Failed to sync to Claims system')
    } finally {
      setSyncing(false)
    }
  }

  const handleExportPackage = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/claims/export`)
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `claim-package-${claimId}.zip`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Failed to export claim package')
      }
    } catch (error) {
      console.error('Error exporting claim package:', error)
      alert('Failed to export claim package')
    }
  }

  const handleStatusChange = async (newStatus: ClaimStatus, data?: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/claims/${claimId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, status: newStatus }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update claim status')
      }

      // Refresh claim data
      await fetchClaim()
    } catch (error) {
      console.error('Error updating claim status:', error)
      throw error
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!claim) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600 mb-4">Claim not found</p>
            <Button onClick={() => router.push(`/projects/${projectId}/claims`)}>
              Back to Claims
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push(`/projects/${projectId}/claims`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Claims
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">
                {claim.claim_number || 'Claim in Progress'}
              </h1>
              <Badge className={STATUS_COLORS[claim.status]}>
                {STATUS_LABELS[claim.status]}
              </Badge>
            </div>
            <p className="text-gray-600 mt-1">
              {claim.property_address}, {claim.property_city}, {claim.property_state}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSyncToClaims}
            disabled={syncing}
          >
            <Upload className="h-4 w-4 mr-2" />
            {syncing ? 'Syncing...' : 'Sync to Claims'}
          </Button>
          <Button onClick={handleExportPackage}>
            <Download className="h-4 w-4 mr-2" />
            Export Package
          </Button>
        </div>
      </div>

      {/* Status Workflow */}
      <ClaimStatusWorkflow claim={claim} onStatusChange={handleStatusChange} />

      {/* Approval Workflow */}
      <ClaimApprovalWorkflow claim={claim} onApprovalChange={fetchClaim} />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Initial Estimate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {claim.initial_estimate
                ? `$${claim.initial_estimate.toLocaleString()}`
                : 'N/A'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Approved Amount</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {claim.approved_amount
                ? `$${claim.approved_amount.toLocaleString()}`
                : 'Pending'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Paid Amount</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {claim.paid_amount
                ? `$${claim.paid_amount.toLocaleString()}`
                : 'Pending'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Deductible</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {claim.deductible
                ? `$${claim.deductible.toLocaleString()}`
                : 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Claim Details</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Claim Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-1">Policy Number</div>
                <div className="font-medium">{claim.policy_number || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Claim Type</div>
                <div className="font-medium capitalize">
                  {claim.claim_type.replace('_', ' ')}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Date of Loss</div>
                <div className="font-medium">
                  {format(new Date(claim.date_of_loss), 'MMMM d, yyyy')}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Date Filed</div>
                <div className="font-medium">
                  {claim.date_filed
                    ? format(new Date(claim.date_filed), 'MMMM d, yyyy')
                    : 'Not yet filed'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Property Type</div>
                <div className="font-medium capitalize">
                  {claim.property_type?.replace('_', ' ') || 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Storm Event</div>
                <div className="font-medium">
                  {claim.storm_event_id ? 'Yes' : 'No'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Property Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-gray-600 mb-1">Address</div>
                <div className="font-medium">{claim.property_address}</div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">City</div>
                  <div className="font-medium">{claim.property_city}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">State</div>
                  <div className="font-medium">{claim.property_state}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">ZIP</div>
                  <div className="font-medium">{claim.property_zip}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Claim Timeline</CardTitle>
              <CardDescription>
                Track important dates and milestones
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date of Loss */}
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Date of Loss</div>
                  <div className="text-sm text-gray-600">
                    {format(new Date(claim.date_of_loss), 'MMMM d, yyyy')}
                  </div>
                </div>
              </div>

              {/* Date Filed */}
              {claim.date_filed && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                    <FileText className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Claim Filed</div>
                    <div className="text-sm text-gray-600">
                      {format(new Date(claim.date_filed), 'MMMM d, yyyy')}
                    </div>
                  </div>
                </div>
              )}

              {/* Acknowledgment */}
              {claim.acknowledgment_received && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                    <CheckCircle className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Acknowledgment Received</div>
                    <div className="text-sm text-gray-600">
                      {format(new Date(claim.acknowledgment_received), 'MMMM d, yyyy')}
                    </div>
                  </div>
                </div>
              )}

              {/* Inspection Scheduled */}
              {claim.inspection_scheduled && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100">
                    <Clock className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Inspection Scheduled</div>
                    <div className="text-sm text-gray-600">
                      {format(new Date(claim.inspection_scheduled), 'MMMM d, yyyy')}
                    </div>
                  </div>
                </div>
              )}

              {/* Inspection Completed */}
              {claim.inspection_completed && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Inspection Completed</div>
                    <div className="text-sm text-gray-600">
                      {format(new Date(claim.inspection_completed), 'MMMM d, yyyy')}
                    </div>
                  </div>
                </div>
              )}

              {/* Decision Date */}
              {claim.decision_date && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Decision Received</div>
                    <div className="text-sm text-gray-600">
                      {format(new Date(claim.decision_date), 'MMMM d, yyyy')}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <ClaimDocuments
            claimId={claimId}
            documents={documents}
            onDocumentsChange={fetchDocuments}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
