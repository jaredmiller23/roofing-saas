'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, FileText, Calendar, DollarSign, AlertCircle, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import type { ClaimData, ClaimStatus } from '@/lib/claims/types'
import { WeatherEvidence } from '@/components/claims/WeatherEvidence'

interface Project {
  id: string
  name: string
  contact_id: string
  start_date?: string
  storm_event_id?: string
}

interface Contact {
  latitude?: number
  longitude?: number
}

const STATUS_COLORS: Record<ClaimStatus, string> = {
  'new': 'bg-blue-500',
  'documents_pending': 'bg-yellow-500',
  'under_review': 'bg-purple-500',
  'approved': 'bg-green-500',
  'paid': 'bg-emerald-500',
  'closed': 'bg-muted',
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

export default function ProjectClaimsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [contact, setContact] = useState<Contact | null>(null)
  const [claims, setClaims] = useState<ClaimData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      // Fetch project
      const projectRes = await fetch(`/api/projects/${projectId}`)
      if (projectRes.ok) {
        const projectData = await projectRes.json()
        setProject(projectData.project)

        // Fetch contact for lat/lng (for weather evidence)
        if (projectData.project?.contact_id) {
          const contactRes = await fetch(`/api/contacts/${projectData.project.contact_id}`)
          if (contactRes.ok) {
            const contactData = await contactRes.json()
            setContact({
              latitude: contactData.contact?.latitude,
              longitude: contactData.contact?.longitude,
            })
          }
        }
      }

      // Fetch claims for this project
      const claimsRes = await fetch(`/api/claims?project_id=${projectId}`)
      if (claimsRes.ok) {
        const claimsData = await claimsRes.json()
        setClaims(claimsData.claims || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleStartInspection = () => {
    router.push(`/projects/${projectId}/claims/inspection`)
  }

  const handleViewClaim = (claimId: string) => {
    router.push(`/projects/${projectId}/claims/${claimId}`)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
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
            onClick={() => router.push(`/projects/${projectId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Project
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Claims Management</h1>
            {project && (
              <p className="text-muted-foreground mt-1">{project.name}</p>
            )}
          </div>
        </div>
        <Button onClick={handleStartInspection}>
          <Plus className="h-4 w-4 mr-2" />
          Start Inspection
        </Button>
      </div>

      {/* Claims List */}
      {claims.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Claims Yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Start an inspection to document property damage and create an insurance claim package.
            </p>
            <Button onClick={handleStartInspection}>
              <Plus className="h-4 w-4 mr-2" />
              Start Inspection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {claims.map((claim) => (
            <Card
              key={claim.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleViewClaim(claim.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-xl">
                        {claim.claim_number || 'Claim in Progress'}
                      </CardTitle>
                      <Badge className={STATUS_COLORS[claim.status]}>
                        {STATUS_LABELS[claim.status]}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Loss Date: {format(new Date(claim.date_of_loss), 'MMM d, yyyy')}
                    </CardDescription>
                  </div>
                  {claim.approved_amount && (
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Approved Amount</div>
                      <div className="text-2xl font-bold text-green-600">
                        ${claim.approved_amount.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Policy #</div>
                    <div className="font-medium">{claim.policy_number || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Claim Type</div>
                    <div className="font-medium capitalize">{claim.claim_type.replace('_', ' ')}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Property</div>
                    <div className="font-medium">{claim.property_city}, {claim.property_state}</div>
                  </div>
                  {claim.initial_estimate && (
                    <div>
                      <div className="text-muted-foreground">Initial Estimate</div>
                      <div className="font-medium">${claim.initial_estimate.toLocaleString()}</div>
                    </div>
                  )}
                </div>

                {/* Timeline indicators */}
                {claim.status === 'documents_pending' && (
                  <div className="mt-4 flex items-center gap-2 text-yellow-600 bg-yellow-50 p-3 rounded-lg">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">
                      Waiting for additional documentation
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Weather Documentation */}
      <WeatherEvidence
        projectId={projectId}
        dateOfLoss={claims[0]?.date_of_loss || project?.start_date}
        latitude={contact?.latitude}
        longitude={contact?.longitude}
        stormEventId={project?.storm_event_id}
      />

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks for managing insurance claims
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            variant="outline"
            className="h-auto flex-col items-start p-4"
            onClick={handleStartInspection}
          >
            <FileText className="h-6 w-6 mb-2" />
            <div className="text-left">
              <div className="font-semibold">New Inspection</div>
              <div className="text-xs text-muted-foreground">
                Document property damage
              </div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col items-start p-4"
            onClick={() => router.push(`/projects/${projectId}/claims/export`)}
          >
            <DollarSign className="h-6 w-6 mb-2" />
            <div className="text-left">
              <div className="font-semibold">Export Claim Package</div>
              <div className="text-xs text-muted-foreground">
                Generate submission docs
              </div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col items-start p-4"
            onClick={() => router.push(`/projects/${projectId}`)}
          >
            <Calendar className="h-6 w-6 mb-2" />
            <div className="text-left">
              <div className="font-semibold">View Project</div>
              <div className="text-xs text-muted-foreground">
                Back to project details
              </div>
            </div>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
