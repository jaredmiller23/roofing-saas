'use client'

import { useState } from 'react'
import { Star, Check, ArrowRight, Download, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  QuoteOption,
  formatCurrency,
  LINE_ITEM_CATEGORIES
} from '@/lib/types/quote-option'

interface QuoteComparisonProps {
  options: QuoteOption[]
  selectedOptionId?: string
  onSelectOption?: (optionId: string) => void
  onSendProposal?: (optionIds: string[]) => void
  onDownloadPdf?: (optionIds: string[]) => void
  mode?: 'comparison' | 'selection' | 'sent'
  projectName?: string
}

export function QuoteComparison({
  options,
  selectedOptionId,
  onSelectOption,
  onSendProposal,
  onDownloadPdf,
  mode = 'comparison',
  projectName = 'Project'
}: QuoteComparisonProps) {
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary')

  // Sort options by total amount
  const sortedOptions = [...options].sort((a, b) => a.total_amount - b.total_amount)

  // Get recommended option
  const recommendedOption = options.find(option => option.is_recommended)

  const handleSelectOption = (optionId: string) => {
    if (onSelectOption) {
      onSelectOption(optionId)
    }
  }

  const handleSendProposal = () => {
    if (onSendProposal) {
      onSendProposal(options.map(opt => opt.id))
    }
  }

  const handleDownloadAll = () => {
    if (onDownloadPdf) {
      onDownloadPdf(options.map(opt => opt.id))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Quote Options for {projectName}</h2>
          <p className="text-muted-foreground">
            {mode === 'selection'
              ? 'Choose the option that best fits your needs'
              : 'Compare pricing options and features'
            }
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-muted p-1 rounded-lg">
            <button
              onClick={() => setViewMode('summary')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'summary'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'detailed'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Detailed
            </button>
          </div>

          {/* Actions */}
          {mode !== 'sent' && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownloadAll}>
                <Download className="h-4 w-4 mr-2" />
                Download All
              </Button>
              {mode !== 'selection' && onSendProposal && (
                <Button onClick={handleSendProposal}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Proposal
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Price Range Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Lowest Option</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(Math.min(...sortedOptions.map(opt => opt.total_amount)))}
              </div>
            </div>

            <div className="flex items-center text-muted-foreground">
              <ArrowRight className="h-6 w-6" />
            </div>

            <div className="text-center">
              <div className="text-sm text-muted-foreground">Highest Option</div>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(Math.max(...sortedOptions.map(opt => opt.total_amount)))}
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
                    {formatCurrency(recommendedOption.total_amount)}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Savings Display */}
          {sortedOptions.length > 1 && (
            <div className="mt-4 text-center">
              <div className="text-sm text-muted-foreground">
                Save up to{' '}
                <span className="font-semibold text-green-600">
                  {formatCurrency(
                    Math.max(...sortedOptions.map(opt => opt.total_amount)) -
                    Math.min(...sortedOptions.map(opt => opt.total_amount))
                  )}
                </span>
                {' '}by choosing the most economical option
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Options Grid */}
      <div className={`grid gap-6 ${options.length === 3 ? 'grid-cols-1 lg:grid-cols-3' : options.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        {sortedOptions.map((option, index) => (
          <QuoteOptionComparisonCard
            key={option.id}
            option={option}
            rank={index + 1}
            isRecommended={option.is_recommended}
            isSelected={selectedOptionId === option.id}
            onSelect={() => handleSelectOption(option.id)}
            mode={mode}
            viewMode={viewMode}
            showSelection={mode === 'selection'}
          />
        ))}
      </div>

      {/* Feature Comparison Table (for detailed view) */}
      {viewMode === 'detailed' && options.length > 1 && (
        <FeatureComparisonTable options={sortedOptions} />
      )}
    </div>
  )
}

interface QuoteOptionComparisonCardProps {
  option: QuoteOption
  rank: number
  isRecommended: boolean
  isSelected: boolean
  onSelect: () => void
  mode: 'comparison' | 'selection' | 'sent'
  viewMode: 'summary' | 'detailed'
  showSelection: boolean
}

function QuoteOptionComparisonCard({
  option,
  rank,
  isRecommended,
  isSelected,
  onSelect,
  _mode,
  viewMode,
  showSelection
}: QuoteOptionComparisonCardProps) {
  const getCardColor = () => {
    if (isRecommended) return 'border-yellow-400 bg-yellow-50/50'
    if (rank === 1) return 'border-green-400 bg-green-50/50'
    return ''
  }

  return (
    <Card className={`
      relative transition-all duration-200 hover:shadow-lg
      ${getCardColor()}
      ${isSelected ? 'ring-2 ring-primary' : ''}
      ${showSelection ? 'cursor-pointer' : ''}
    `} onClick={showSelection ? onSelect : undefined}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <CardTitle className="text-xl">{option.name}</CardTitle>

              {isRecommended && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  <Star className="h-3 w-3 mr-1" />
                  Recommended
                </Badge>
              )}

              {rank === 1 && !isRecommended && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Most Economical
                </Badge>
              )}

              {isSelected && (
                <Badge className="bg-primary">
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

        <div className="text-center py-4 border rounded-lg bg-background">
          <div className="text-3xl font-bold text-primary">
            {formatCurrency(option.total_amount)}
          </div>
          {option.tax_rate && option.tax_amount && (
            <div className="text-xs text-muted-foreground">
              Includes {formatCurrency(option.tax_amount)} tax
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {viewMode === 'summary' ? (
          <OptionSummary option={option} />
        ) : (
          <OptionDetails option={option} />
        )}

        {showSelection && (
          <Button
            variant={isSelected ? "default" : "outline"}
            className="w-full mt-4"
            onClick={onSelect}
          >
            {isSelected ? 'Selected' : 'Select This Option'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

interface OptionSummaryProps {
  option: QuoteOption
}

function OptionSummary({ option }: OptionSummaryProps) {
  // Group items by category for summary
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
      <h4 className="font-medium">What&apos;s Included:</h4>
      <div className="space-y-2">
        {Object.entries(categoryTotals).map(([category, total]) => {
          const categoryInfo = LINE_ITEM_CATEGORIES.find(cat => cat.value === category) ||
            { value: category, label: category, icon: '📦' }

          return (
            <div key={category} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{categoryInfo.icon}</span>
                <span className="text-sm">{categoryInfo.label}</span>
              </div>
              <span className="text-sm font-medium">{formatCurrency(total)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface OptionDetailsProps {
  option: QuoteOption
}

function OptionDetails({ option }: OptionDetailsProps) {
  return (
    <div className="space-y-3">
      <h4 className="font-medium">Line Items:</h4>
      <div className="space-y-2">
        {option.line_items.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <div className="flex-1">
              <div className="font-medium">{item.description}</div>
              <div className="text-muted-foreground">
                {item.quantity} {item.unit} @ {formatCurrency(item.unit_price)}
              </div>
            </div>
            <div className="font-medium">
              {formatCurrency(item.total_price)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface FeatureComparisonTableProps {
  options: QuoteOption[]
}

function FeatureComparisonTable({ options }: FeatureComparisonTableProps) {
  // Get all unique line items across all options for comparison
  const allLineItems = Array.from(
    new Set(
      options.flatMap(option =>
        option.line_items.map(item => item.description)
      )
    )
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Feature</th>
                {options.map(option => (
                  <th key={option.id} className="text-center py-2">
                    {option.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allLineItems.map(itemDesc => (
                <tr key={itemDesc} className="border-b">
                  <td className="py-2 text-sm">{itemDesc}</td>
                  {options.map(option => {
                    const item = option.line_items.find(li => li.description === itemDesc)
                    return (
                      <td key={option.id} className="text-center py-2">
                        {item ? (
                          <div className="text-sm">
                            <Check className="h-4 w-4 text-green-500 mx-auto mb-1" />
                            <div>{formatCurrency(item.total_price)}</div>
                          </div>
                        ) : (
                          <div className="text-muted-foreground">—</div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}