'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Plus, ChevronRight, Building2, AlertTriangle } from 'lucide-react'
import { ApprovalRateBadge } from './shared/ApprovalRateBadge'
import { PatternBadge } from './shared/PatternBadge'
import { StatCard } from './shared/StatCard'
import type {
  CarrierIntelligence as CarrierIntelligenceType,
  CarrierPattern,
  CarrierPatternType,
  PatternFrequency,
} from '@/lib/claims/intelligence-types'

interface CarrierWithPatterns extends CarrierIntelligenceType {
  patterns?: CarrierPattern[]
}

/**
 * CarrierIntelligence - Carriers tab for Claims Intelligence
 *
 * Displays:
 * - Searchable carrier list with stats
 * - Detail dialog with carrier-specific patterns
 * - Add pattern functionality
 */
export function CarrierIntelligence() {
  const [carriers, setCarriers] = useState<CarrierIntelligenceType[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCarrier, setSelectedCarrier] = useState<CarrierWithPatterns | null>(null)
  const [carrierPatterns, setCarrierPatterns] = useState<CarrierPattern[]>([])
  const [patternsLoading, setPatternsLoading] = useState(false)
  const [isAddPatternOpen, setIsAddPatternOpen] = useState(false)
  const [addPatternLoading, setAddPatternLoading] = useState(false)

  // Fetch carriers from dashboard API
  const fetchCarriers = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiFetch<{ carriers: CarrierIntelligenceType[] }>('/api/intelligence/dashboard')
      setCarriers(data.carriers || [])
    } catch (error) {
      console.error('Error fetching carriers:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCarriers()
  }, [fetchCarriers])

  // Fetch patterns for selected carrier
  const fetchCarrierPatterns = async (carrierName: string, carrierId?: string) => {
    try {
      setPatternsLoading(true)
      const params = new URLSearchParams()
      if (carrierId) {
        params.set('carrier_id', carrierId)
      } else {
        params.set('carrier_name', carrierName)
      }

      const data = await apiFetch<{ patterns: CarrierPattern[] }>(`/api/carriers/patterns?${params}`)
      setCarrierPatterns(data.patterns || [])
    } catch (error) {
      console.error('Error fetching carrier patterns:', error)
      setCarrierPatterns([])
    } finally {
      setPatternsLoading(false)
    }
  }

  // Handle carrier selection
  const handleSelectCarrier = (carrier: CarrierIntelligenceType) => {
    setSelectedCarrier(carrier)
    fetchCarrierPatterns(carrier.carrier_name, carrier.carrier_id)
  }

  // Handle add pattern
  const handleAddPattern = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedCarrier) return

    const formData = new FormData(e.currentTarget)
    const patternData = {
      carrier_id: selectedCarrier.carrier_id || undefined,
      carrier_name: selectedCarrier.carrier_name,
      pattern_type: formData.get('pattern_type') as CarrierPatternType,
      pattern_detail: formData.get('pattern_detail') || undefined,
      frequency: formData.get('frequency') as PatternFrequency,
      successful_counter: formData.get('successful_counter') || undefined,
      notes: formData.get('notes') || undefined,
    }

    try {
      setAddPatternLoading(true)
      await apiFetch('/api/carriers/patterns', {
        method: 'POST',
        body: patternData,
      })

      setIsAddPatternOpen(false)
      // Refresh patterns
      fetchCarrierPatterns(selectedCarrier.carrier_name, selectedCarrier.carrier_id)
    } catch (error) {
      console.error('Error adding pattern:', error)
    } finally {
      setAddPatternLoading(false)
    }
  }

  // Filter carriers by search
  const filteredCarriers = carriers.filter((c) =>
    c.carrier_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Carriers</h2>
          <p className="text-muted-foreground">
            Track carrier-level patterns and behaviors
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search carriers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Carriers Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredCarriers.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No carriers found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Carrier data populates from recorded claims
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Claims</TableHead>
                  <TableHead>Approval Rate</TableHead>
                  <TableHead>Avg Days</TableHead>
                  <TableHead>Top Disputes</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCarriers.map((carrier, index) => (
                  <TableRow
                    key={carrier.carrier_id || index}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSelectCarrier(carrier)}
                  >
                    <TableCell className="font-medium">
                      {carrier.carrier_name}
                    </TableCell>
                    <TableCell>{carrier.total_claims}</TableCell>
                    <TableCell>
                      <ApprovalRateBadge rate={carrier.approval_rate} />
                    </TableCell>
                    <TableCell>
                      {carrier.avg_days_to_decision > 0
                        ? `${carrier.avg_days_to_decision.toFixed(0)}d`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {carrier.top_disputed_items.length > 0 ? (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          <span className="text-sm">
                            {carrier.top_disputed_items.length} items
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
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

      {/* Carrier Detail Dialog */}
      {selectedCarrier && (
        <Dialog
          open={!!selectedCarrier}
          onOpenChange={(open) => !open && setSelectedCarrier(null)}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {selectedCarrier.carrier_name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Total Claims"
                  value={selectedCarrier.total_claims}
                  icon={Building2}
                  color="default"
                />
                <StatCard
                  label="Approval Rate"
                  value={`${selectedCarrier.approval_rate.toFixed(0)}%`}
                  icon={Building2}
                  color={
                    selectedCarrier.approval_rate >= 70
                      ? 'success'
                      : selectedCarrier.approval_rate >= 50
                      ? 'warning'
                      : 'danger'
                  }
                />
                <StatCard
                  label="Avg Decision"
                  value={`${selectedCarrier.avg_days_to_decision.toFixed(0)}`}
                  subtitle="days"
                  icon={Building2}
                  color="default"
                />
                <StatCard
                  label="Supplement Rate"
                  value={`${selectedCarrier.supplement_approval_rate.toFixed(0)}%`}
                  icon={Building2}
                  color={
                    selectedCarrier.supplement_approval_rate >= 70
                      ? 'success'
                      : 'default'
                  }
                />
              </div>

              {/* Known Patterns */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Known Patterns
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddPatternOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Pattern
                  </Button>
                </CardHeader>
                <CardContent>
                  {patternsLoading ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : carrierPatterns.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No patterns recorded for this carrier yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {carrierPatterns.map((pattern) => (
                        <div
                          key={pattern.id}
                          className="border border-border rounded-lg p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <PatternBadge
                              type={pattern.pattern_type}
                              frequency={pattern.frequency}
                            />
                            <Badge variant="secondary">
                              {pattern.occurrence_count}x
                            </Badge>
                          </div>
                          {pattern.pattern_detail && (
                            <p className="text-sm">
                              <span className="text-muted-foreground">Detail:</span>{' '}
                              {pattern.pattern_detail}
                            </p>
                          )}
                          {pattern.successful_counter && (
                            <p className="text-sm text-green-600">
                              <span className="font-medium">Counter:</span>{' '}
                              {pattern.successful_counter}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Disputed Items */}
              {selectedCarrier.top_disputed_items.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Top Disputed Items</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableBody>
                        {selectedCarrier.top_disputed_items.map((item, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">
                              {item.item}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary">{item.count}x</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Pattern Dialog */}
      <Dialog open={isAddPatternOpen} onOpenChange={setIsAddPatternOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Carrier Pattern</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddPattern} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Pattern Type *</label>
              <Select name="pattern_type" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select pattern type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="denies_coverage">Denies Coverage</SelectItem>
                  <SelectItem value="disputes_line_item">
                    Disputes Line Item
                  </SelectItem>
                  <SelectItem value="fights_matching">Fights Matching</SelectItem>
                  <SelectItem value="fights_code_upgrade">
                    Fights Code Upgrade
                  </SelectItem>
                  <SelectItem value="slow_payment">Slow Payment</SelectItem>
                  <SelectItem value="requires_inspection">
                    Requires Reinspection
                  </SelectItem>
                  <SelectItem value="accepts_supplements">
                    Accepts Supplements
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Detail (optional)</label>
              <Select name="pattern_detail">
                <SelectTrigger>
                  <SelectValue placeholder="Select specific item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="drip_edge">Drip Edge</SelectItem>
                  <SelectItem value="starter_strip">Starter Strip</SelectItem>
                  <SelectItem value="steep_charge">Steep Charge</SelectItem>
                  <SelectItem value="O&P">Overhead & Profit</SelectItem>
                  <SelectItem value="OL_coverage">Ordinance & Law</SelectItem>
                  <SelectItem value="ice_water_shield">Ice & Water Shield</SelectItem>
                  <SelectItem value="ridge_vent">Ridge Vent</SelectItem>
                  <SelectItem value="pipe_boots">Pipe Boots</SelectItem>
                  <SelectItem value="flashing">Flashing</SelectItem>
                  <SelectItem value="underlayment">Underlayment</SelectItem>
                  <SelectItem value="matching">Matching</SelectItem>
                  <SelectItem value="code_upgrade">Code Upgrade</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Frequency *</label>
              <Select name="frequency" defaultValue="sometimes">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="always">Always</SelectItem>
                  <SelectItem value="often">Often</SelectItem>
                  <SelectItem value="sometimes">Sometimes</SelectItem>
                  <SelectItem value="rarely">Rarely</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">
                What argument works against this? (optional)
              </label>
              <Textarea
                name="successful_counter"
                placeholder="e.g., Reference IRC R905.2.8.5 for drip edge requirements"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea name="notes" placeholder="Additional context..." />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddPatternOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addPatternLoading}>
                {addPatternLoading ? 'Adding...' : 'Add Pattern'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
