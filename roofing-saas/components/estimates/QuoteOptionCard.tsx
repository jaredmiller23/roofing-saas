'use client'

import { Star, Check, Eye, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  QuoteOption,
  formatCurrency,
  LINE_ITEM_CATEGORIES
} from '@/lib/types/quote-option'

interface QuoteOptionCardProps {
  option: QuoteOption
  isSelected?: boolean
  isRecommended?: boolean
  onSelect?: () => void
  onPreview?: () => void
  mode?: 'display' | 'selection' | 'preview'
  showLineItems?: boolean
  className?: string
}

export function QuoteOptionCard({
  option,
  isSelected = false,
  isRecommended = false,
  onSelect,
  onPreview,
  mode = 'display',
  showLineItems = false,
  className = ''
}: QuoteOptionCardProps) {

  const handleCardClick = () => {
    if (mode === 'selection' && onSelect) {
      onSelect()
    }
  }

  return (
    <Card
      className={`
        transition-all duration-200 hover:shadow-lg
        ${isSelected ? 'ring-2 ring-primary border-primary' : ''}
        ${isRecommended ? 'border-yellow-400 bg-yellow-50/50' : ''}
        ${mode === 'selection' ? 'cursor-pointer hover:shadow-md' : ''}
        ${className}
      `}
      onClick={handleCardClick}
    >
      <CardHeader className="relative">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <CardTitle className="text-xl">{option.name}</CardTitle>

              {isRecommended && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                  <Star className="h-3 w-3 mr-1" />
                  Recommended
                </Badge>
              )}

              {isSelected && mode === 'selection' && (
                <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
                  <Check className="h-3 w-3 mr-1" />
                  Selected
                </Badge>
              )}
            </div>

            {option.description && (
              <p className="text-muted-foreground text-sm">{option.description}</p>
            )}
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(option.total_amount)}
            </div>
            {option.tax_rate && option.tax_amount && (
              <div className="text-xs text-muted-foreground">
                Includes {option.tax_rate}% tax ({formatCurrency(option.tax_amount)})
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Line Items Summary */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm">Included Items</h4>
            <span className="text-xs text-muted-foreground">
              {option.line_items.length} item{option.line_items.length !== 1 ? 's' : ''}
            </span>
          </div>

          {showLineItems ? (
            <LineItemsDetailed lineItems={option.line_items} />
          ) : (
            <LineItemsSummary lineItems={option.line_items} />
          )}
        </div>

        {/* Financial Breakdown */}
        <div className="bg-muted p-3 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>{formatCurrency(option.subtotal)}</span>
          </div>

          {option.tax_rate && option.tax_amount && (
            <div className="flex justify-between text-sm">
              <span>Tax ({option.tax_rate}%):</span>
              <span>{formatCurrency(option.tax_amount)}</span>
            </div>
          )}

          <div className="flex justify-between font-semibold text-base border-t border-border pt-2">
            <span>Total:</span>
            <span className="text-primary">{formatCurrency(option.total_amount)}</span>
          </div>

          {option.profit_margin && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Profit Margin:</span>
              <span>{(option.profit_margin * 100).toFixed(1)}%</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {mode !== 'preview' && (
          <div className="flex gap-2 pt-2">
            {mode === 'selection' && onSelect && (
              <Button
                variant={isSelected ? "default" : "outline"}
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect()
                }}
              >
                {isSelected ? 'Selected' : 'Select This Option'}
              </Button>
            )}

            {onPreview && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onPreview()
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            )}

            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface LineItemsSummaryProps {
  lineItems: Array<{
    description: string
    quantity: number
    unit: string
    unit_price: number
    category: string
  }>
}

function LineItemsSummary({ lineItems }: LineItemsSummaryProps) {
  // Group items by category
  const itemsByCategory = lineItems.reduce((acc, item) => {
    const category = item.category || 'other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(item)
    return acc
  }, {} as Record<string, typeof lineItems>)

  return (
    <div className="space-y-2">
      {Object.entries(itemsByCategory).map(([category, items]) => {
        const categoryInfo = getCategoryInfo(category)
        const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)

        return (
          <div key={category} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">{categoryInfo.icon}</span>
              <div>
                <div className="font-medium text-sm">{categoryInfo.label}</div>
                <div className="text-xs text-muted-foreground">
                  {items.length} item{items.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <div className="text-sm font-medium">
              {formatCurrency(totalValue)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface LineItemsDetailedProps {
  lineItems: Array<{
    description: string
    quantity: number
    unit: string
    unit_price: number
    total_price: number
    category: string
  }>
}

function LineItemsDetailed({ lineItems }: LineItemsDetailedProps) {
  return (
    <div className="space-y-2">
      {lineItems.map((item, index) => {
        const categoryInfo = getCategoryInfo(item.category)

        return (
          <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
            <div className="flex items-center gap-3">
              <span className="text-sm">{categoryInfo.icon}</span>
              <div className="flex-1">
                <div className="font-medium text-sm">{item.description}</div>
                <div className="text-xs text-muted-foreground">
                  {item.quantity} {item.unit} @ {formatCurrency(item.unit_price)} each
                </div>
              </div>
            </div>
            <div className="text-sm font-medium">
              {formatCurrency(item.total_price)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function getCategoryInfo(category: string) {
  const categoryData = LINE_ITEM_CATEGORIES.find(cat => cat.value === category)
  return categoryData || { value: category, label: category, icon: '📦' }
}