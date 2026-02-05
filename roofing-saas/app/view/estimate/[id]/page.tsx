'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { FileText, Clock, AlertCircle, Star, Check, ArrowRight, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

  // Acceptance flow state
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showDeclineDialog, setShowDeclineDialog] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [responseStatus, setResponseStatus] = useState<'accepted' | 'declined' | null>(null)
  const [acceptedOptionName, setAcceptedOptionName] = useState<string | null>(null)
  const [acceptedOptionAmount, setAcceptedOptionAmount] = useState<number | null>(null)

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

      // Set initial state based on existing proposal status
      const proposal = result.data?.proposal
      if (proposal?.status === 'accepted') {
        setResponseStatus('accepted')
        setSelectedOptionId(proposal.selected_option_id)
        // Find the accepted option name
        const acceptedOption = result.data?.options?.find(
          (o: QuoteOption) => o.id === proposal.selected_option_id
        )
        if (acceptedOption) {
          setAcceptedOptionName(acceptedOption.name)
          setAcceptedOptionAmount(acceptedOption.total_amount || acceptedOption.subtotal)
        }
      } else if (proposal?.status === 'rejected') {
        setResponseStatus('declined')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load estimate')
    } finally {
      setLoading(false)
    }
  }, [proposalId])

  useEffect(() => {
    fetchEstimate()
  }, [fetchEstimate])

  const isActionable = data?.proposal && ['sent', 'viewed'].includes(data.proposal.status) && !responseStatus

  const handleAccept = async () => {
    if (!selectedOptionId) return
    setSubmitting(true)

    try {
      const res = await fetch(`/api/estimates/${proposalId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_option_id: selectedOptionId }),
      })
      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error?.message || 'Failed to accept estimate')
      }

      setResponseStatus('accepted')
      setAcceptedOptionName(result.data?.selected_option?.name || null)
      setAcceptedOptionAmount(result.data?.selected_option?.amount || null)
      setShowConfirmation(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept estimate')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDecline = async () => {
    setSubmitting(true)

    try {
      const res = await fetch(`/api/estimates/${proposalId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: declineReason || undefined }),
      })
      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error?.message || 'Failed to decline estimate')
      }

      setResponseStatus('declined')
      setShowDeclineDialog(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline estimate')
    } finally {
      setSubmitting(false)
    }
  }

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
  const selectedOption = options.find(opt => opt.id === selectedOptionId)

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
        {/* Response Status Banner */}
        {responseStatus === 'accepted' && (
          <Card className="bg-green-500/10 border-green-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <CheckCircle2 className="h-10 w-10 text-green-500 shrink-0" />
                <div>
                  <h2 className="text-xl font-bold text-foreground">Estimate Accepted</h2>
                  <p className="text-muted-foreground mt-1">
                    Thank you! You selected <strong className="text-foreground">{acceptedOptionName}</strong>
                    {acceptedOptionAmount != null && (
                      <> for <strong className="text-foreground">{formatCurrency(acceptedOptionAmount)}</strong></>
                    )}.
                    {company.name} will be in touch to schedule your project.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {responseStatus === 'declined' && (
          <Card className="bg-muted border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <XCircle className="h-10 w-10 text-muted-foreground shrink-0" />
                <div>
                  <h2 className="text-xl font-bold text-foreground">Estimate Declined</h2>
                  <p className="text-muted-foreground mt-1">
                    We understand. If you change your mind or would like to discuss other options,
                    please contact {company.name}.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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

        {/* Selection prompt */}
        {isActionable && (
          <p className="text-center text-muted-foreground text-sm">
            Select an option below, then accept or decline this estimate.
          </p>
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
              isSelected={selectedOptionId === option.id || (responseStatus === 'accepted' && proposal.selected_option_id === option.id)}
              isActionable={!!isActionable}
              onSelect={() => {
                if (isActionable) {
                  setSelectedOptionId(option.id)
                }
              }}
            />
          ))}
        </div>

        {/* Accept / Decline Actions */}
        {isActionable && (
          <Card className="bg-card border-border no-print">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  disabled={!selectedOptionId}
                  onClick={() => setShowConfirmation(true)}
                  className="w-full sm:w-auto"
                >
                  <Check className="h-5 w-5 mr-2" />
                  Accept Estimate
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setShowDeclineDialog(true)}
                  className="w-full sm:w-auto"
                >
                  Decline
                </Button>
              </div>
              {!selectedOptionId && (
                <p className="text-center text-sm text-muted-foreground mt-3">
                  Please select an option above to accept
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Confirmation Dialog */}
        {showConfirmation && selectedOption && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="bg-card max-w-md w-full shadow-xl">
              <CardHeader>
                <CardTitle className="text-foreground">Confirm Acceptance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">Selected option</p>
                  <p className="text-lg font-bold text-foreground">{selectedOption.name}</p>
                  <p className="text-2xl font-bold text-primary mt-1">
                    {formatCurrency(selectedOption.total_amount || selectedOption.subtotal)}
                  </p>
                </div>

                <p className="text-sm text-muted-foreground">
                  By accepting, you agree to the terms and conditions outlined in this estimate.
                  {company.name} will contact you to schedule the work.
                </p>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowConfirmation(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleAccept}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Accepting...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Confirm
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Decline Dialog */}
        {showDeclineDialog && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="bg-card max-w-md w-full shadow-xl">
              <CardHeader>
                <CardTitle className="text-foreground">Decline Estimate</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  We&apos;d appreciate knowing why so we can better serve you in the future. This is completely optional.
                </p>

                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="e.g., Price too high, going with another contractor, project postponed..."
                  className="w-full h-24 px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowDeclineDialog(false)
                      setDeclineReason('')
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleDecline}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Declining...
                      </>
                    ) : (
                      'Confirm Decline'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
  isActionable: boolean
  onSelect: () => void
}

function OptionCard({ option, rank, viewMode, isSelected, isActionable, onSelect }: OptionCardProps) {
  const isRecommended = option.is_recommended
  const totalAmount = option.total_amount || option.subtotal

  const getCardBorder = () => {
    if (isSelected) return 'border-primary ring-2 ring-primary/30'
    if (isRecommended) return 'border-yellow-400 ring-2 ring-yellow-200'
    if (rank === 1) return 'border-green-400'
    return 'border-border'
  }

  return (
    <Card
      className={`bg-card relative transition-all duration-200 ${getCardBorder()} ${
        isActionable ? 'cursor-pointer hover:shadow-lg' : 'hover:shadow-lg'
      }`}
      onClick={onSelect}
    >
      {/* Selection indicator */}
      {isActionable && (
        <div className="absolute top-4 right-4">
          <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            isSelected
              ? 'border-primary bg-primary'
              : 'border-muted-foreground'
          }`}>
            {isSelected && <Check className="h-4 w-4 text-white" />}
          </div>
        </div>
      )}

      <CardHeader>
        <div className="flex items-start justify-between">
          <div className={isActionable ? 'pr-8' : ''}>
            <div className="flex items-center gap-2 flex-wrap">
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
              {isSelected && !isActionable && (
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
