'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { BarChart3, CheckCircle2, Users, Building2 } from 'lucide-react'
import { PatternBadge, FrequencyBadge } from './shared/PatternBadge'
import type {
  CarrierPattern,
  AdjusterPatternType,
  CarrierPatternType,
  PatternFrequency,
  AdjusterIntelligence,
} from '@/lib/claims/intelligence-types'

interface ExtendedCarrierPattern extends CarrierPattern {
  resolved_carrier_name?: string
}

/**
 * PatternAnalytics - Patterns tab for Claims Intelligence
 *
 * Displays:
 * - Sub-tabs for Adjuster and Carrier patterns
 * - Filters for pattern type, frequency, detail
 * - Pattern list with counter information
 */
export function PatternAnalytics() {
  const [subTab, setSubTab] = useState<'adjuster' | 'carrier'>('adjuster')
  const [adjusters, setAdjusters] = useState<AdjusterIntelligence[]>([])
  const [carrierPatterns, setCarrierPatterns] = useState<ExtendedCarrierPattern[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all')

  // Fetch adjuster data (which includes pattern info)
  const fetchAdjusterData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/intelligence/dashboard')
      if (!response.ok) throw new Error('Failed to fetch data')
      const data = await response.json()
      setAdjusters(data.adjusters || [])
    } catch (error) {
      console.error('Error fetching adjuster data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch carrier patterns
  const fetchCarrierPatterns = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/carriers/patterns')
      if (!response.ok) throw new Error('Failed to fetch patterns')
      const data = await response.json()
      setCarrierPatterns(data.patterns || [])
    } catch (error) {
      console.error('Error fetching carrier patterns:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (subTab === 'adjuster') {
      fetchAdjusterData()
    } else {
      fetchCarrierPatterns()
    }
  }, [subTab, fetchAdjusterData, fetchCarrierPatterns])

  // Build adjuster patterns from the adjusters' common_omissions and effective_counters
  const adjusterPatternsList = adjusters
    .filter((adj) => adj.common_omissions.length > 0 || adj.effective_counters.length > 0)
    .flatMap((adj) => {
      const patterns: Array<{
        adjuster: AdjusterIntelligence
        type: AdjusterPatternType
        detail?: string
        counter?: string
        count: number
      }> = []

      // Common omissions → omits_line_item patterns
      adj.common_omissions.forEach((omission) => {
        patterns.push({
          adjuster: adj,
          type: 'omits_line_item',
          detail: omission,
          count: adj.total_claims,
        })
      })

      // Effective counters
      adj.effective_counters.forEach((counter) => {
        patterns.push({
          adjuster: adj,
          type: 'disputes_item',
          counter,
          count: adj.total_claims,
        })
      })

      return patterns
    })

  // Filter carrier patterns
  const filteredCarrierPatterns = carrierPatterns.filter((pattern) => {
    if (typeFilter !== 'all' && pattern.pattern_type !== typeFilter) return false
    if (frequencyFilter !== 'all' && pattern.frequency !== frequencyFilter) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Pattern Analytics</h2>
        <p className="text-muted-foreground">
          Deep dive into recorded patterns across adjusters and carriers
        </p>
      </div>

      {/* Sub-tabs */}
      <Tabs value={subTab} onValueChange={(v) => setSubTab(v as 'adjuster' | 'carrier')}>
        <TabsList>
          <TabsTrigger value="adjuster" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Adjuster Patterns
          </TabsTrigger>
          <TabsTrigger value="carrier" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Carrier Patterns
          </TabsTrigger>
        </TabsList>

        {/* Adjuster Patterns Tab */}
        <TabsContent value="adjuster" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : adjusterPatternsList.length === 0 ? (
                <div className="p-12 text-center">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No adjuster patterns recorded</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Patterns will appear as you track adjusters on claims
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Adjuster</TableHead>
                      <TableHead>Pattern</TableHead>
                      <TableHead>Detail</TableHead>
                      <TableHead>Claims</TableHead>
                      <TableHead>Counter</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adjusterPatternsList.map((pattern, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{pattern.adjuster.adjuster_name}</p>
                            {pattern.adjuster.carrier_name && (
                              <p className="text-sm text-muted-foreground">
                                {pattern.adjuster.carrier_name}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <PatternBadge type={pattern.type} showFrequency={false} />
                        </TableCell>
                        <TableCell>
                          {pattern.detail ? (
                            <Badge variant="outline">{pattern.detail}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{pattern.count}x</Badge>
                        </TableCell>
                        <TableCell>
                          {pattern.counter ? (
                            <div className="flex items-center gap-1 text-sm text-green-600">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="truncate max-w-xs">{pattern.counter}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              No counter recorded
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Carrier Patterns Tab */}
        <TabsContent value="carrier" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="w-48">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="denies_coverage">Denies Coverage</SelectItem>
                  <SelectItem value="disputes_line_item">Disputes Line Item</SelectItem>
                  <SelectItem value="fights_matching">Fights Matching</SelectItem>
                  <SelectItem value="fights_code_upgrade">Fights Code Upgrade</SelectItem>
                  <SelectItem value="slow_payment">Slow Payment</SelectItem>
                  <SelectItem value="requires_inspection">Requires Inspection</SelectItem>
                  <SelectItem value="accepts_supplements">Accepts Supplements</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Frequencies</SelectItem>
                  <SelectItem value="always">Always</SelectItem>
                  <SelectItem value="often">Often</SelectItem>
                  <SelectItem value="sometimes">Sometimes</SelectItem>
                  <SelectItem value="rarely">Rarely</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : filteredCarrierPatterns.length === 0 ? (
                <div className="p-12 text-center">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {typeFilter !== 'all' || frequencyFilter !== 'all'
                      ? 'No patterns match filters'
                      : 'No carrier patterns recorded'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Record patterns from the Carriers tab
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Carrier</TableHead>
                      <TableHead>Pattern</TableHead>
                      <TableHead>Detail</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Counter</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCarrierPatterns.map((pattern) => (
                      <TableRow key={pattern.id}>
                        <TableCell className="font-medium">
                          {pattern.resolved_carrier_name ||
                            pattern.carrier_name ||
                            'Unknown'}
                        </TableCell>
                        <TableCell>
                          <PatternBadge
                            type={pattern.pattern_type as CarrierPatternType}
                            showFrequency={false}
                          />
                        </TableCell>
                        <TableCell>
                          {pattern.pattern_detail ? (
                            <Badge variant="outline">{pattern.pattern_detail}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <FrequencyBadge frequency={pattern.frequency as PatternFrequency} />
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{pattern.occurrence_count}x</Badge>
                        </TableCell>
                        <TableCell>
                          {pattern.successful_counter ? (
                            <div className="flex items-center gap-1 text-sm text-green-600">
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate max-w-xs">
                                {pattern.successful_counter}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              No counter recorded
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
