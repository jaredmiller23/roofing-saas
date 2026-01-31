'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api/client'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { PhoneIncoming, Upload, RefreshCw, FileText, Shield, Clock, CheckCircle, XCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface DNCImport {
  id: string
  source: 'federal' | 'state_tn' | 'internal'
  filename: string
  records_added: number
  created_at: string
  created_by_email?: string
}

interface ComplianceStats {
  total_checks: number
  allowed: number
  blocked: number
  block_rate: number
  by_reason: Record<string, number>
  dnc_counts: {
    federal: number
    state_tn: number
    internal: number
  }
}

interface AuditLogEntry {
  id: string
  phone_number: string
  check_type: string
  result: 'allowed' | 'blocked'
  reason: string | null
  created_at: string
}

export function CallComplianceSettings() {
  // State
  const [isLoading, setIsLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedSource, setSelectedSource] = useState<'federal' | 'state_tn' | 'internal'>('internal')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)

  const [recentImports, setRecentImports] = useState<DNCImport[]>([])
  const [stats, setStats] = useState<ComplianceStats | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])

  const [auditPage, setAuditPage] = useState(1)
  const [auditLimit] = useState(10)
  const [auditFilter, setAuditFilter] = useState<'all' | 'allowed' | 'blocked'>('all')
  const [totalAuditLogs, setTotalAuditLogs] = useState(0)

  // Load initial data
  useEffect(() => {
    loadData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load audit logs when page or filter changes
  useEffect(() => {
    loadAuditLogs()
  }, [auditPage, auditFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        loadRecentImports(),
        loadStats(),
        loadAuditLogs(),
      ])
    } catch (err) {
      console.error('Error loading compliance data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadRecentImports = async () => {
    try {
      const data = await apiFetch<{ imports: DNCImport[]; total: number }>('/api/compliance/dnc/imports?limit=5')
      setRecentImports(data.imports || [])
    } catch (err) {
      console.error('Error loading recent imports:', err)
    }
  }

  const loadStats = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await apiFetch<any>('/api/compliance/stats')

      // Transform API response to component format
      const stats: ComplianceStats = {
        total_checks: data.complianceChecks?.totalChecks || 0,
        allowed: data.complianceChecks?.allowed || 0,
        blocked: data.complianceChecks?.blocked || 0,
        block_rate: parseFloat(String(data.complianceChecks?.blockRate || '0').replace('%', '')) || 0,
        by_reason: Object.fromEntries(
          Object.entries(data.blockedByReason || {}).map(([key, value]) => [
            key,
            typeof value === 'object' && value !== null ? (value as { count: number }).count : 0
          ])
        ),
        dnc_counts: {
          federal: data.dncRegistry?.federal || 0,
          state_tn: data.dncRegistry?.state || 0,
          internal: data.dncRegistry?.internal || 0,
        },
      }
      setStats(stats)
    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }

  const loadAuditLogs = async () => {
    try {
      const params = new URLSearchParams({
        page: auditPage.toString(),
        limit: auditLimit.toString(),
      })
      if (auditFilter !== 'all') {
        params.append('result', auditFilter)
      }

      const data = await apiFetch<{ logs: AuditLogEntry[]; total?: number }>(`/api/compliance/audit?${params}`)
      setAuditLogs(data.logs || [])
      setTotalAuditLogs(data.total || 0)
    } catch (err) {
      console.error('Error loading audit logs:', err)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.csv')) {
        setUploadError('Please select a CSV file')
        return
      }
      setSelectedFile(file)
      setUploadError(null)
      setUploadSuccess(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file')
      return
    }

    setIsUploading(true)
    setUploadError(null)
    setUploadSuccess(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('source', selectedSource)

      const response = await fetch('/api/compliance/dnc/import', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setUploadSuccess(`Successfully imported ${data.records_added} phone numbers`)
        setSelectedFile(null)
        // Reset file input
        const fileInput = document.getElementById('dnc-file-input') as HTMLInputElement
        if (fileInput) fileInput.value = ''

        // Reload data
        await loadData()
      } else {
        setUploadError(data.error || 'Failed to import DNC list')
      }
    } catch (err) {
      console.error('Error uploading DNC list:', err)
      setUploadError('Failed to upload file. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const formatPhoneNumber = (phone: string): string => {
    // Simple formatting for US numbers
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  const totalPages = Math.ceil(totalAuditLogs / auditLimit)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-64 w-full bg-muted animate-pulse rounded-lg" />
        <div className="h-48 w-full bg-muted animate-pulse rounded-lg" />
        <div className="h-96 w-full bg-muted animate-pulse rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error/Success Messages */}
      {uploadError && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Upload Error</AlertTitle>
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      {uploadSuccess && (
        <Alert className="border-green-500 bg-green-500/10">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertTitle className="text-green-500">Success</AlertTitle>
          <AlertDescription className="text-foreground">{uploadSuccess}</AlertDescription>
        </Alert>
      )}

      {/* Section 1: DNC Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Do Not Call (DNC) Management
          </CardTitle>
          <CardDescription>
            Import and manage Do Not Call lists to ensure compliance with TCPA regulations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-card rounded-lg border border-border">
            <Upload className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1 space-y-3">
              <div>
                <h4 className="font-medium text-foreground">Upload DNC List</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload a CSV file containing phone numbers to add to the DNC registry
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    Source
                  </label>
                  <Select value={selectedSource} onValueChange={(v) => setSelectedSource(v as typeof selectedSource)}>
                    <SelectTrigger className="bg-card border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="federal">Federal DNC</SelectItem>
                      <SelectItem value="state_tn">State TN DNC</SelectItem>
                      <SelectItem value="internal">Internal DNC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    CSV File
                  </label>
                  <Input
                    id="dnc-file-input"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="bg-card border-border"
                  />
                </div>
              </div>

              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="w-full md:w-auto"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload DNC List
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Recent Imports Table */}
          {recentImports.length > 0 && (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-foreground">Date</TableHead>
                    <TableHead className="text-foreground">Source</TableHead>
                    <TableHead className="text-foreground">Filename</TableHead>
                    <TableHead className="text-foreground text-right">Records</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentImports.map((imp) => (
                    <TableRow key={imp.id} className="border-b border-border">
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(imp.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {imp.source === 'federal' && 'Federal'}
                          {imp.source === 'state_tn' && 'State TN'}
                          {imp.source === 'internal' && 'Internal'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground">{imp.filename}</TableCell>
                      <TableCell className="text-foreground text-right font-medium">
                        {imp.records_added.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Compliance Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Compliance Statistics
          </CardTitle>
          <CardDescription>
            Overview of compliance checks and DNC registry status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats ? (
            <div className="space-y-6">
              {/* Main Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Total Checks</h4>
                    <PhoneIncoming className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {stats.total_checks.toLocaleString()}
                  </p>
                </div>

                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Allowed</h4>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold text-green-500">
                    {stats.allowed.toLocaleString()}
                  </p>
                </div>

                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Blocked</h4>
                    <XCircle className="h-4 w-4 text-red-500" />
                  </div>
                  <p className="text-2xl font-bold text-red-500">
                    {stats.blocked.toLocaleString()}
                  </p>
                </div>

                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Block Rate</h4>
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {stats.block_rate.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Breakdown by Reason */}
              {Object.keys(stats.by_reason).length > 0 && (
                <div className="rounded-lg border border-border p-4 bg-muted/10">
                  <h4 className="font-medium text-foreground mb-3">Blocked by Reason</h4>
                  <div className="space-y-2">
                    {Object.entries(stats.by_reason).map(([reason, count]) => (
                      <div key={reason} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground capitalize">{reason.replace('_', ' ')}</span>
                        <span className="font-medium text-foreground">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DNC Registry Counts */}
              <div className="rounded-lg border border-border p-4 bg-muted/10">
                <h4 className="font-medium text-foreground mb-3">DNC Registry Counts</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Federal DNC</span>
                    <span className="font-medium text-foreground">
                      {stats.dnc_counts.federal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">State TN DNC</span>
                    <span className="font-medium text-foreground">
                      {stats.dnc_counts.state_tn.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Internal DNC</span>
                    <span className="font-medium text-foreground">
                      {stats.dnc_counts.internal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No compliance statistics available yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Audit Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Compliance Audit Log
              </CardTitle>
              <CardDescription>
                Recent compliance checks and their results
              </CardDescription>
            </div>
            <Select value={auditFilter} onValueChange={(v) => setAuditFilter(v as typeof auditFilter)}>
              <SelectTrigger className="w-[180px] bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Results</SelectItem>
                <SelectItem value="allowed">Allowed Only</SelectItem>
                <SelectItem value="blocked">Blocked Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {auditLogs.length > 0 ? (
            <>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-foreground">Date/Time</TableHead>
                      <TableHead className="text-foreground">Phone Number</TableHead>
                      <TableHead className="text-foreground">Check Type</TableHead>
                      <TableHead className="text-foreground">Result</TableHead>
                      <TableHead className="text-foreground">Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id} className="border-b border-border">
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(log.created_at)}
                        </TableCell>
                        <TableCell className="text-foreground font-mono">
                          {formatPhoneNumber(log.phone_number)}
                        </TableCell>
                        <TableCell className="text-foreground capitalize">
                          {log.check_type.replace('_', ' ')}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={log.result === 'allowed' ? 'default' : 'destructive'}
                            className={log.result === 'allowed' ? 'bg-green-500' : ''}
                          >
                            {log.result}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {log.reason || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {(auditPage - 1) * auditLimit + 1} to{' '}
                    {Math.min(auditPage * auditLimit, totalAuditLogs)} of{' '}
                    {totalAuditLogs} entries
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                      disabled={auditPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAuditPage(p => Math.min(totalPages, p + 1))}
                      disabled={auditPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No audit log entries found
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
