'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus,
  Search,
  Phone,
  Mail,
  AlertTriangle,
  TrendingUp,
  Clock,
  ChevronRight,
} from 'lucide-react'
import type { Adjuster, AdjusterPattern } from '@/lib/claims/intelligence-types'

interface AdjusterWithPatterns extends Adjuster {
  patterns?: AdjusterPattern[]
  recent_claims?: unknown[]
}

export function AdjusterList() {
  const [adjusters, setAdjusters] = useState<AdjusterWithPatterns[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedAdjuster, setSelectedAdjuster] = useState<AdjusterWithPatterns | null>(null)

  const fetchAdjusters = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)

      const response = await fetch(`/api/adjusters?${params}`)
      if (!response.ok) throw new Error('Failed to fetch adjusters')

      const data = await response.json()
      setAdjusters(data.adjusters || [])
    } catch (error) {
      console.error('Error fetching adjusters:', error)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchAdjusters()
    }, 300)
    return () => clearTimeout(debounceTimer)
  }, [fetchAdjusters])

  const fetchAdjusterDetails = async (id: string) => {
    try {
      const response = await fetch(`/api/adjusters/${id}`)
      if (!response.ok) throw new Error('Failed to fetch adjuster details')
      const data = await response.json()
      setSelectedAdjuster(data)
    } catch (error) {
      console.error('Error fetching adjuster details:', error)
    }
  }

  const handleAddAdjuster = async (formData: FormData) => {
    try {
      const response = await fetch('/api/adjusters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: formData.get('first_name'),
          last_name: formData.get('last_name'),
          carrier_name: formData.get('carrier_name'),
          email: formData.get('email'),
          phone: formData.get('phone'),
          notes: formData.get('notes'),
        }),
      })

      if (!response.ok) throw new Error('Failed to create adjuster')

      setIsAddDialogOpen(false)
      fetchAdjusters()
    } catch (error) {
      console.error('Error creating adjuster:', error)
    }
  }

  const getApprovalRateColor = (rate?: number) => {
    if (!rate) return 'bg-muted text-muted-foreground'
    if (rate >= 80) return 'bg-green-500 text-white'
    if (rate >= 60) return 'bg-yellow-500 text-white'
    return 'bg-red-500 text-white'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Adjusters</h2>
          <p className="text-muted-foreground">
            Track insurance adjusters and their patterns
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Adjuster
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Adjuster</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleAddAdjuster(new FormData(e.currentTarget))
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">First Name *</label>
                  <Input name="first_name" required />
                </div>
                <div>
                  <label className="text-sm font-medium">Last Name *</label>
                  <Input name="last_name" required />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Carrier</label>
                <Input name="carrier_name" placeholder="e.g., State Farm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input name="email" type="email" />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <Input name="phone" type="tel" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Input name="notes" />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Add Adjuster</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search adjusters..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Adjusters Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : adjusters.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">No adjusters found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add adjusters as you encounter them during claims
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Claims</TableHead>
                  <TableHead>Approval Rate</TableHead>
                  <TableHead>Patterns</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjusters.map((adjuster) => (
                  <TableRow
                    key={adjuster.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => fetchAdjusterDetails(adjuster.id)}
                  >
                    <TableCell className="font-medium">
                      {adjuster.first_name} {adjuster.last_name}
                    </TableCell>
                    <TableCell>
                      {adjuster.carrier_name || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {adjuster.phone && (
                          <a
                            href={`tel:${adjuster.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                        )}
                        {adjuster.email && (
                          <a
                            href={`mailto:${adjuster.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Mail className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{adjuster.total_claims_handled || 0}</TableCell>
                    <TableCell>
                      <Badge
                        className={getApprovalRateColor(
                          adjuster.avg_claim_approval_rate ?? undefined
                        )}
                      >
                        {adjuster.avg_claim_approval_rate
                          ? `${adjuster.avg_claim_approval_rate.toFixed(0)}%`
                          : 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {adjuster.common_omissions &&
                      adjuster.common_omissions.length > 0 ? (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          <span className="text-sm">
                            {adjuster.common_omissions.length} patterns
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          None recorded
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Adjuster Detail Dialog */}
      {selectedAdjuster && (
        <Dialog
          open={!!selectedAdjuster}
          onOpenChange={(open) => !open && setSelectedAdjuster(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedAdjuster.first_name} {selectedAdjuster.last_name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Carrier
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">
                      {selectedAdjuster.carrier_name || 'Unknown'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Contact
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {selectedAdjuster.email && (
                      <p className="text-sm">{selectedAdjuster.email}</p>
                    )}
                    {selectedAdjuster.phone && (
                      <p className="text-sm">{selectedAdjuster.phone}</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-2xl font-bold">
                          {selectedAdjuster.avg_claim_approval_rate?.toFixed(0) ||
                            'N/A'}
                          %
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Approval Rate
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-2xl font-bold">
                          {selectedAdjuster.avg_response_days?.toFixed(1) || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Avg Response Days
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-2xl font-bold">
                          {selectedAdjuster.total_claims_handled || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Claims Handled
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Patterns */}
              {selectedAdjuster.common_omissions &&
                selectedAdjuster.common_omissions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        Known Patterns
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {selectedAdjuster.common_omissions.map((omission, i) => (
                          <Badge key={i} variant="outline">
                            Omits: {omission}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Tips */}
              {selectedAdjuster.tips && selectedAdjuster.tips.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tips for Working With This Adjuster</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1">
                      {selectedAdjuster.tips.map((tip, i) => (
                        <li key={i} className="text-sm">
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {selectedAdjuster.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedAdjuster.notes}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
