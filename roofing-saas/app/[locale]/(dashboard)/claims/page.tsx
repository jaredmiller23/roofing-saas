'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, Calendar, AlertCircle, Search, Filter, Download, FileSpreadsheet, Brain } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import type { ClaimData, ClaimStatus } from '@/lib/claims/types'
import { useFeatureAccess } from '@/lib/billing/hooks'
import { FeatureGate } from '@/components/billing/FeatureGate'

interface Project {
  id: string
  name: string
}

const STATUS_COLORS: Record<ClaimStatus, string> = {
  'new': 'bg-blue-500',
  'documents_pending': 'bg-yellow-500',
  'under_review': 'bg-purple-500',
  'approved': 'bg-green-500',
  'paid': 'bg-emerald-500',
  'closed': 'bg-gray-500',
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

export default function ClaimsPage() {
  const router = useRouter()
  const { features, isLoading: featuresLoading } = useFeatureAccess()
  const [claims, setClaims] = useState<ClaimData[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredClaims, setFilteredClaims] = useState<ClaimData[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [dateFromFilter, setDateFromFilter] = useState<string>('')
  const [dateToFilter, setDateToFilter] = useState<string>('')

  const filterClaims = useCallback(() => {
    let filtered = claims

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (claim) => {
          const cf = claim.custom_fields as Record<string, string> | undefined
          return (
            claim.claim_number?.toLowerCase().includes(term) ||
            cf?.property_address?.toLowerCase().includes(term) ||
            cf?.property_city?.toLowerCase().includes(term) ||
            claim.policy_number?.toLowerCase().includes(term)
          )
        }
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((claim) => claim.status === statusFilter)
    }

    // Apply project filter
    if (projectFilter !== 'all') {
      filtered = filtered.filter((claim) => claim.project_id === projectFilter)
    }

    // Apply date range filter (date of loss)
    if (dateFromFilter) {
      const fromDate = new Date(dateFromFilter)
      filtered = filtered.filter((claim) => claim.date_of_loss && new Date(claim.date_of_loss) >= fromDate)
    }

    if (dateToFilter) {
      const toDate = new Date(dateToFilter)
      // Set to end of day for inclusive filtering
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter((claim) => claim.date_of_loss && new Date(claim.date_of_loss) <= toDate)
    }

    setFilteredClaims(filtered)
  }, [claims, searchTerm, statusFilter, projectFilter, dateFromFilter, dateToFilter])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch claims
        const claimsRes = await fetch('/api/claims')
        if (claimsRes.ok) {
          const claimsData = await claimsRes.json()
          setClaims(claimsData.data?.claims || claimsData.claims || [])
        }

        // Fetch projects for filter dropdown
        const projectsRes = await fetch('/api/projects')
        if (projectsRes.ok) {
          const projectsData = await projectsRes.json()
          setProjects(projectsData.data?.projects || projectsData.projects || [])
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    filterClaims()
  }, [filterClaims])

  // Feature gate check - must be after all hooks
  if (!featuresLoading && !features.claimsTracking) {
    return (
      <div className="container mx-auto p-6">
        <FeatureGate
          allowed={false}
          featureName="Claims Tracking"
          requiredPlan="Professional"
        >
          <div />
        </FeatureGate>
      </div>
    )
  }

  const handleViewClaim = (claim: ClaimData) => {
    router.push(`/projects/${claim.project_id}/claims/${claim.id}`)
  }

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      // Convert filtered claims to CSV
      const headers = [
        'Claim Number',
        'Status',
        'Date of Loss',
        'Property Address',
        'City',
        'State',
        'Zip',
        'Policy Number',
        'Claim Type',
        'Initial Estimate',
        'Approved Amount',
        'Paid Amount',
      ]

      const rows = filteredClaims.map((claim) => {
        const cf = claim.custom_fields as Record<string, string> | undefined
        return [
          claim.claim_number || 'N/A',
          STATUS_LABELS[claim.status || 'new'],
          claim.date_of_loss ? format(new Date(claim.date_of_loss), 'yyyy-MM-dd') : 'N/A',
          cf?.property_address || 'N/A',
          cf?.property_city || 'N/A',
          cf?.property_state || 'N/A',
          cf?.property_zip || 'N/A',
          claim.policy_number || 'N/A',
          cf?.claim_type || 'roof',
          claim.estimated_damage?.toString() || '0',
          claim.approved_amount?.toString() || '0',
          claim.paid_amount?.toString() || '0',
        ]
      })

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n')

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `claims-export-${format(new Date(), 'yyyy-MM-dd')}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting to CSV:', error)
      alert('Failed to export claims to CSV')
    } finally {
      setExporting(false)
    }
  }

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      // Call API endpoint to generate PDF
      const response = await fetch('/api/claims/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claims: filteredClaims }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      // Download PDF
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `claims-export-${format(new Date(), 'yyyy-MM-dd')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting to PDF:', error)
      alert('Failed to export claims to PDF')
    } finally {
      setExporting(false)
    }
  }

  // Calculate statistics
  const stats = {
    total: claims.length,
    new: claims.filter((c) => c.status === 'new').length,
    pending: claims.filter((c) => c.status === 'documents_pending' || c.status === 'under_review').length,
    approved: claims.filter((c) => c.status === 'approved').length,
    paid: claims.filter((c) => c.status === 'paid').length,
    totalApproved: claims.reduce((sum, c) => sum + (c.approved_amount || 0), 0),
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Claims Management</h1>
          <p className="text-muted-foreground mt-1">View and manage all insurance claims across all projects</p>
        </div>
        <Button asChild>
          <Link href="/claims/intelligence">
            <Brain className="h-4 w-4 mr-2" />
            Intelligence
          </Link>
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Claims</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>New</CardDescription>
            <CardTitle className="text-3xl text-primary">{stats.new}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>In Progress</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Approved</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              ${stats.totalApproved.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters & Export */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Export
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={exporting || filteredClaims.length === 0}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={exporting || filteredClaims.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Row 1: Search and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by claim #, address, policy #..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="documents_pending">Docs Pending</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
                  <SelectItem value="supplement_filed">Supplement Filed</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Row 2: Project and Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  placeholder="From date"
                  value={dateFromFilter}
                  onChange={(e) => setDateFromFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  placeholder="To date"
                  value={dateToFilter}
                  onChange={(e) => setDateToFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Active Filters Summary */}
            {(searchTerm || statusFilter !== 'all' || projectFilter !== 'all' || dateFromFilter || dateToFilter) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">Active filters:</span>
                {searchTerm && <Badge variant="secondary">Search: {searchTerm}</Badge>}
                {statusFilter !== 'all' && <Badge variant="secondary">Status: {STATUS_LABELS[statusFilter as ClaimStatus]}</Badge>}
                {projectFilter !== 'all' && (
                  <Badge variant="secondary">
                    Project: {projects.find((p) => p.id === projectFilter)?.name}
                  </Badge>
                )}
                {dateFromFilter && <Badge variant="secondary">From: {dateFromFilter}</Badge>}
                {dateToFilter && <Badge variant="secondary">To: {dateToFilter}</Badge>}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('all')
                    setProjectFilter('all')
                    setDateFromFilter('')
                    setDateToFilter('')
                  }}
                  className="ml-auto text-xs"
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Claims List */}
      {filteredClaims.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {searchTerm || statusFilter !== 'all' ? 'No Claims Match Your Filters' : 'No Claims Yet'}
            </h3>
            <p className="text-muted-foreground text-center max-w-md">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Claims will appear here once they are created for projects.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Showing {filteredClaims.length} of {stats.total} claims
          </div>
          <div className="grid gap-4">
            {filteredClaims.map((claim) => (
              <Card
                key={claim.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleViewClaim(claim)}
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
                      <div className="font-medium capitalize">
                        {((claim.custom_fields as Record<string, string> | undefined)?.claim_type || 'roof').replace('_', ' ')}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Property</div>
                      <div className="font-medium">
                        {(() => {
                          const cf = claim.custom_fields as Record<string, string> | undefined
                          return (
                            <>
                              {cf?.property_address || 'N/A'}
                              <br />
                              {cf?.property_city || ''}{cf?.property_city && cf?.property_state ? ', ' : ''}{cf?.property_state || ''}
                            </>
                          )
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

                  {/* Status-specific alerts */}
                  {claim.status === 'documents_pending' && (
                    <div className="mt-4 flex items-center gap-2 text-yellow-600 bg-yellow-50 p-3 rounded-lg">
                      <AlertCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">
                        Waiting for additional documentation
                      </span>
                    </div>
                  )}
                  {claim.status === 'disputed' && (
                    <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                      <AlertCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">
                        Claim is under dispute - action required
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
