'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, FileText, Calendar, DollarSign, AlertCircle, ArrowLeft, Package, Download, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import type { ClaimData, ClaimStatus } from '@/lib/claims/types'
import { WeatherEvidence } from '@/components/claims/WeatherEvidence'
import { apiFetch } from '@/lib/api/client'
import { Alert, AlertDescription } from '@/components/ui/alert'

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
  'new': 'bg-primary',
  'documents_pending': 'bg-yellow-500',
  'under_review': 'bg-secondary',
  'approved': 'bg-green-500',
  'paid': 'bg-green-500',
  'closed': 'bg-muted-foreground',
  'disputed': 'bg-red-500',
  'supplement_filed': 'bg-orange-500',
  'escalated': 'bg-red-500',
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
  const [generatingPacket, setGeneratingPacket] = useState(false)
  const [packetGenerated, setPacketGenerated] = useState(false)
  const [packetError, setPacketError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      // Fetch project - API returns: { success: true, data: <project> }
      try {
        const proj = await apiFetch<Project>(`/api/projects/${projectId}`)
        setProject(proj)

        // Fetch contact for lat/lng (for weather evidence)
        if (proj?.contact_id) {
          try {
            const ct = await apiFetch<Contact & { latitude?: number; longitude?: number }>(`/api/contacts/${proj.contact_id}`)
            setContact({
              latitude: ct?.latitude,
              longitude: ct?.longitude,
            })
          } catch {
            // Contact may not exist
          }
        }
      } catch {
        // Project fetch failed
      }

      // Fetch claims for this project
      // Note: /api/claims is NOT in Group A scope, so we keep the old pattern
      const claimsRes = await fetch(`/api/claims?project_id=${projectId}`)
      if (claimsRes.ok) {
        const claimsData = await claimsRes.json()
        setClaims(claimsData.data?.claims || claimsData.claims || [])
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

  const handleGeneratePacket = async () => {
    setGeneratingPacket(true)
    setPacketError(null)

    try {
      await apiFetch(`/api/projects/${projectId}/claims/packet`, {
        method: 'POST',
        body: {
          include_weather: true,
          include_codes: true,
          include_manufacturer_specs: true,
          include_policy_provisions: true,
        },
      })

      setPacketGenerated(true)
    } catch (error) {
      console.error('Error generating packet:', error)
      setPacketError(error instanceof Error ? error.message : 'Failed to generate packet')
    } finally {
      setGeneratingPacket(false)
    }
  }

  const handleDownloadPacketPdf = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/claims/packet/pdf`)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to download PDF')
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `claims-packet-${projectId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading packet PDF:', error)
      setPacketError(error instanceof Error ? error.message : 'Failed to download PDF')
    }
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
                      <Badge className={STATUS_COLORS[claim.status || 'new']}>
                        {STATUS_LABELS[claim.status || 'new']}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Loss Date: {claim.date_of_loss ? format(new Date(claim.date_of_loss), 'MMM d, yyyy') : 'N/A'}
                    </CardDescription>
                  </div>
                  {claim.approved_amount && (
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Approved Amount</div>
                      <div className="text-2xl font-bold text-green-500">
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
                    <div className="font-medium capitalize">
                      {((claim.custom_fields as Record<string, string> | undefined)?.claim_type || 'roof').replace('_', ' ')}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Property</div>
                    <div className="font-medium">
                      {(() => {
                        const cf = claim.custom_fields as Record<string, string> | undefined
                        const city = cf?.property_city
                        const state = cf?.property_state
                        return city || state ? `${city || ''}${city && state ? ', ' : ''}${state || ''}` : 'N/A'
                      })()}
                    </div>
                  </div>
                  {claim.estimated_damage && (
                    <div>
                      <div className="text-muted-foreground">Initial Estimate</div>
                      <div className="font-medium">${claim.estimated_damage.toLocaleString()}</div>
                    </div>
                  )}
                </div>

                {/* Timeline indicators */}
                {claim.status === 'documents_pending' && (
                  <Alert variant="warning" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Waiting for additional documentation
                    </AlertDescription>
                  </Alert>
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

      {/* THE PACKET - Claims Documentation Package */}
      <Card className="border-primary/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                THE PACKET
              </CardTitle>
              <CardDescription>
                Complete claims documentation package with building codes, manufacturer specs, and policy provisions
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {packetGenerated && (
                <Button
                  variant="outline"
                  onClick={handleDownloadPacketPdf}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              )}
              <Button
                onClick={handleGeneratePacket}
                disabled={generatingPacket}
              >
                {generatingPacket ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : packetGenerated ? (
                  <>
                    <Package className="h-4 w-4 mr-2" />
                    Regenerate Packet
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4 mr-2" />
                    Generate Packet
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        {packetError && (
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{packetError}</AlertDescription>
            </Alert>
          </CardContent>
        )}
        {packetGenerated && !packetError && (
          <CardContent>
            <Alert variant="success">
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Packet generated successfully. Click Download PDF to save the complete claims documentation package.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks for managing insurance claims
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Button
            variant="outline"
            className="h-auto flex-col items-start p-4 whitespace-normal overflow-hidden min-w-0"
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
            className="h-auto flex-col items-start p-4 whitespace-normal overflow-hidden min-w-0"
            onClick={handleGeneratePacket}
            disabled={generatingPacket}
          >
            <Package className="h-6 w-6 mb-2" />
            <div className="text-left">
              <div className="font-semibold">Generate Packet</div>
              <div className="text-xs text-muted-foreground">
                Build complete claims package
              </div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col items-start p-4 whitespace-normal overflow-hidden min-w-0"
            onClick={() => router.push(`/projects/${projectId}/claims/export`)}
          >
            <DollarSign className="h-6 w-6 mb-2" />
            <div className="text-left">
              <div className="font-semibold">Export Claim</div>
              <div className="text-xs text-muted-foreground">
                Legacy export format
              </div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col items-start p-4 whitespace-normal overflow-hidden min-w-0"
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
