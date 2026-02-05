'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { FileText, Clock, AlertCircle, Star, Check, ArrowRight } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/types/quote-option'

interface LineItem {
  id: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  total_price: number
  category: string
}

interface QuoteOption {
  id: string
  name: string
  description: string | null
  is_recommended: boolean
  subtotal: number
  tax_rate: number | null
  tax_amount: number | null
  total_amount: number
  display_order: number
  line_items: LineItem[]
}

interface ProposalData {
  id: string
  proposal_number: string
  title: string
  description: string | null
  status: string
  sent_at: string | null
  viewed_at: string | null
  valid_until: string | null
  selected_option_id: string | null
}

interface EstimateViewData {
  proposal: ProposalData
  project: { id: string; name: string } | null
  company: { name: string; tagline: string | null }
  options: QuoteOption[]
  terms?: string
  expired?: boolean
}

const LINE_ITEM_CATEGORIES: Record<string, { label: string; icon: string }> = {
  materials: { label: 'Materials', icon: '🧱' },
  labor: { label: 'Labor', icon: '👷' },
  equipment: { label: 'Equipment', icon: '🚚' },
  permits: { label: 'Permits', icon: '📋' },
  other: { label: 'Other', icon: '📦' },
}

export default function EstimateViewPage() {
  const params = useParams()
  const proposalId = params.id as string

  const [data, setData] = useState<EstimateViewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary')

  const fetchEstimate = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`/api/estimates/${proposalId}/view`)
      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error?.message || 'Failed to load estimate')
      }

      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load estimate')
    } finally {
      setLoading(false)
    }
  }, [proposalId])

  useEffect(() => {
    fetchEstimate()
  }, [fetchEstimate])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading estimate...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertCircle className="h-5 w-5" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  // Handle expired estimates
  if (data.expired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-8 text-center">
          <Clock className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Estimate Expired</h1>
          <p className="text-muted-foreground">
            This estimate has expired. Please contact us for an updated quote.
          </p>
        </div>
      </div>
    )
  }

  const { proposal, project, company, options } = data
  const sortedOptions = [...options].sort((a, b) => (a.total_amount || a.subtotal) - (b.total_amount || b.subtotal))
  const recommendedOption = options.find(opt => opt.is_recommended)
  const lowestTotal = Math.min(...sortedOptions.map(opt => opt.total_amount || opt.subtotal))
  const highestTotal = Math.max(...sortedOptions.map(opt => opt.total_amount || opt.subtotal))

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-6 md:py-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg shrink-0">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {company.name}
              </h1>
              {company.tagline && (
                <p className="text-muted-foreground mt-1">{company.tagline}</p>
              )}
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                {project && (
                  <span>Project: <strong className="text-foreground">{project.name}</strong></span>
                )}
                <span>Proposal #{proposal.proposal_number}</span>
                {proposal.sent_at && (
                  <span>Sent {new Date(proposal.sent_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  })}</span>
                )}
              </div>
            </div>
          </div>
          {proposal.description && (
            <p className="mt-4 text-muted-foreground bg-muted rounded-lg p-4 border border-border">
              {proposal.description}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 md:py-8 space-y-6">
        {/* Price Range Summary */}
        {options.length > 1 && (
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Lowest Option</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(lowestTotal)}
                  </div>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <ArrowRight className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Highest Option</div>
                  <div className="text-2xl font-bold text-foreground">
                    {formatCurrency(highestTotal)}
                  </div>
                </div>
                {recommendedOption && (
                  <>
                    <div className="flex items-center text-muted-foreground">
                      <Star className="h-6 w-6 text-yellow-500" />
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Recommended</div>
                      <div className="text-2xl font-bold text-yellow-600">
                        {formatCurrency(recommendedOption.total_amount || recommendedOption.subtotal)}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* View Toggle */}
        <div className="flex justify-end no-print">
          <div className="flex bg-card p-1 rounded-lg border border-border">
            <button
              onClick={() => setViewMode('summary')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'summary'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'detailed'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Detailed
            </button>
          </div>
        </div>

        {/* Options Grid */}
        <div className={`grid gap-6 ${
          options.length === 3 ? 'grid-cols-1 lg:grid-cols-3' :
          options.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
          'grid-cols-1'
        }`}>
          {sortedOptions.map((option, index) => (
            <OptionCard
              key={option.id}
              option={option}
              rank={index + 1}
              viewMode={viewMode}
              isSelected={proposal.selected_option_id === option.id}
            />
          ))}
        </div>

        {/* Terms & Conditions */}
        {data.terms && (
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">Terms &amp; Conditions</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.terms}</p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-8 pb-4">
          <p>This estimate was prepared by {company.name}</p>
          {proposal.valid_until && (
            <p className="mt-1">
              Valid until {new Date(proposal.valid_until).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric'
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

interface OptionCardProps {
  option: QuoteOption
  rank: number
  viewMode: 'summary' | 'detailed'
  isSelected: boolean
}

function OptionCard({ option, rank, viewMode, isSelected }: OptionCardProps) {
  const isRecommended = option.is_recommended
  const totalAmount = option.total_amount || option.subtotal

  const getCardBorder = () => {
    if (isRecommended) return 'border-yellow-400 ring-2 ring-yellow-200'
    if (rank === 1) return 'border-green-400'
    return 'border-border'
  }

  return (
    <Card className={`bg-card relative transition-all duration-200 hover:shadow-lg ${getCardBorder()}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl text-foreground">{option.name}</CardTitle>
              {isRecommended && (
                <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
                  <Star className="h-3 w-3 mr-1" />
                  Recommended
                </Badge>
              )}
              {rank === 1 && !isRecommended && (
                <Badge className="bg-green-100 text-green-700 border-green-300">
                  Most Economical
                </Badge>
              )}
              {isSelected && (
                <Badge className="bg-primary/10 text-primary border-primary">
                  <Check className="h-3 w-3 mr-1" />
                  Selected
                </Badge>
              )}
            </div>
            {option.description && (
              <p className="text-muted-foreground text-sm mt-2">{option.description}</p>
            )}
          </div>
        </div>

        <div className="text-center py-4 border rounded-lg bg-muted">
          <div className="text-3xl font-bold text-foreground">
            {formatCurrency(totalAmount)}
          </div>
          {option.tax_rate && option.tax_amount ? (
            <div className="text-xs text-muted-foreground">
              Includes {formatCurrency(option.tax_amount)} tax
            </div>
          ) : null}
        </div>
      </CardHeader>

      <CardContent>
        {viewMode === 'summary' ? (
          <OptionSummary option={option} />
        ) : (
          <OptionDetails option={option} />
        )}
      </CardContent>
    </Card>
  )
}

function OptionSummary({ option }: { option: QuoteOption }) {
  const categoryTotals = option.line_items.reduce((acc, item) => {
    const category = item.category || 'other'
    if (!acc[category]) {
      acc[category] = 0
    }
    acc[category] += item.quantity * item.unit_price
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-foreground">What&apos;s Included:</h4>
      <div className="space-y-2">
        {Object.entries(categoryTotals).map(([category, total]) => {
          const catInfo = LINE_ITEM_CATEGORIES[category] || { label: category, icon: '📦' }
          return (
            <div key={category} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{catInfo.icon}</span>
                <span className="text-sm text-foreground">{catInfo.label}</span>
              </div>
              <span className="text-sm font-medium text-foreground">{formatCurrency(total)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function OptionDetails({ option }: { option: QuoteOption }) {
  return (
    <div className="space-y-3">
      <h4 className="font-medium text-foreground">Line Items:</h4>
      <div className="space-y-2">
        {option.line_items.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <div className="flex-1">
              <div className="font-medium text-foreground">{item.description}</div>
              <div className="text-muted-foreground">
                {item.quantity} {item.unit} @ {formatCurrency(item.unit_price)}
              </div>
            </div>
            <div className="font-medium text-foreground">
              {formatCurrency(item.total_price)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
