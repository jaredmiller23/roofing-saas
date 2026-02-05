'use client'

import { useState } from 'react'
import { FileText, Star, ArrowRight, Eye } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { type QuoteOption, formatCurrency } from '@/lib/types/quote-option'

interface EstimatePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  options: QuoteOption[]
  projectName: string
  companyName: string
  companyTagline?: string | null
  terms?: string
}

const LINE_ITEM_CATEGORIES: Record<string, { label: string; icon: string }> = {
  materials: { label: 'Materials', icon: '🧱' },
  labor: { label: 'Labor', icon: '👷' },
  equipment: { label: 'Equipment', icon: '🚚' },
  permits: { label: 'Permits', icon: '📋' },
  other: { label: 'Other', icon: '📦' },
}

export function EstimatePreviewDialog({
  open,
  onOpenChange,
  options,
  projectName,
  companyName,
  companyTagline,
  terms,
}: EstimatePreviewDialogProps) {
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary')

  const sortedOptions = [...options].sort(
    (a, b) => (a.total_amount || 0) - (b.total_amount || 0)
  )
  const recommendedOption = options.find((opt) => opt.is_recommended)
  const lowestTotal = Math.min(
    ...sortedOptions.map((opt) => opt.total_amount || opt.subtotal || 0)
  )
  const highestTotal = Math.max(
    ...sortedOptions.map((opt) => opt.total_amount || opt.subtotal || 0)
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Customer Preview
          </DialogTitle>
        </DialogHeader>

        {/* Preview Banner */}
        <div className="bg-muted rounded-lg px-4 py-2 text-sm text-muted-foreground">
          This is how your customer will see the estimate.
        </div>

        {/* Mirrored Customer View */}
        <div className="space-y-6">
          {/* Header */}
          <div className="border-b border-border pb-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg shrink-0">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground">
                  {companyName}
                </h2>
                {companyTagline && (
                  <p className="text-muted-foreground mt-1">{companyTagline}</p>
                )}
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                  <span>
                    Project: <strong className="text-foreground">{projectName}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

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
                          {formatCurrency(
                            recommendedOption.total_amount || recommendedOption.subtotal || 0
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* View Toggle */}
          <div className="flex justify-end">
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
          <div
            className={`grid gap-6 ${
              options.length === 3
                ? 'grid-cols-1 lg:grid-cols-3'
                : options.length === 2
                  ? 'grid-cols-1 md:grid-cols-2'
                  : 'grid-cols-1'
            }`}
          >
            {sortedOptions.map((option, index) => (
              <PreviewOptionCard
                key={option.id}
                option={option}
                rank={index + 1}
                viewMode={viewMode}
              />
            ))}
          </div>

          {/* Terms & Conditions */}
          {terms && (
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Terms &amp; Conditions
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {terms}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground pt-4 pb-2">
            <p>This estimate was prepared by {companyName}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PreviewOptionCard({
  option,
  rank,
  viewMode,
}: {
  option: QuoteOption
  rank: number
  viewMode: 'summary' | 'detailed'
}) {
  const isRecommended = option.is_recommended
  const totalAmount = option.total_amount || option.subtotal || 0

  const getCardBorder = () => {
    if (isRecommended) return 'border-yellow-400 ring-2 ring-yellow-200'
    if (rank === 1) return 'border-green-400'
    return 'border-border'
  }

  return (
    <Card className={`bg-card relative ${getCardBorder()}`}>
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
          <PreviewOptionSummary option={option} />
        ) : (
          <PreviewOptionDetails option={option} />
        )}
      </CardContent>
    </Card>
  )
}

function PreviewOptionSummary({ option }: { option: QuoteOption }) {
  const lineItems = option.line_items || []
  const categoryTotals = lineItems.reduce(
    (acc, item) => {
      const category = item.category || 'other'
      if (!acc[category]) {
        acc[category] = 0
      }
      acc[category] += item.quantity * item.unit_price
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-foreground">What&apos;s Included:</h4>
      <div className="space-y-2">
        {Object.entries(categoryTotals).map(([category, total]) => {
          const catInfo = LINE_ITEM_CATEGORIES[category] || {
            label: category,
            icon: '📦',
          }
          return (
            <div key={category} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{catInfo.icon}</span>
                <span className="text-sm text-foreground">{catInfo.label}</span>
              </div>
              <span className="text-sm font-medium text-foreground">
                {formatCurrency(total)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PreviewOptionDetails({ option }: { option: QuoteOption }) {
  const lineItems = option.line_items || []

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-foreground">Line Items:</h4>
      <div className="space-y-2">
        {lineItems.map((item, index) => (
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
