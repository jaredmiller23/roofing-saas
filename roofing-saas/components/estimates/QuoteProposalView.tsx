'use client'

import { useState } from 'react'
import { Star, Check, Calendar, Phone, Mail, MapPin, FileText, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  QuoteProposal,
  QuoteOption,
  formatCurrency,
  QUOTE_STATUS_DISPLAY,
  LINE_ITEM_CATEGORIES
} from '@/lib/types/quote-option'

interface QuoteProposalViewProps {
  proposal: QuoteProposal
  companyInfo?: {
    name: string
    address: string
    phone: string
    email: string
    logo?: string
    license?: string
    website?: string
  }
  customerInfo?: {
    name: string
    address: string
    phone?: string
    email?: string
  }
  onSelectOption?: (optionId: string) => void
  onAcceptProposal?: (optionId: string) => void
  mode?: 'preview' | 'customer' | 'readonly'
}

export function QuoteProposalView({
  proposal,
  companyInfo,
  customerInfo,
  onSelectOption,
  onAcceptProposal,
  mode = 'customer'
}: QuoteProposalViewProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string>(
    proposal.selected_option_id ||
    proposal.options.find(opt => opt.is_recommended)?.id ||
    proposal.options[0]?.id ||
    ''
  )

  const selectedOption = proposal.options.find(opt => opt.id === selectedOptionId)
  const statusInfo = QUOTE_STATUS_DISPLAY[proposal.status]

  const handleSelectOption = (optionId: string) => {
    setSelectedOptionId(optionId)
    if (onSelectOption) {
      onSelectOption(optionId)
    }
  }

  const handleAcceptProposal = () => {
    if (onAcceptProposal && selectedOptionId) {
      onAcceptProposal(selectedOptionId)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="max-w-4xl mx-auto bg-card">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-8 text-center">
        <div className="flex items-center justify-center gap-4 mb-4">
          {companyInfo?.logo ? (
            <img
              src={companyInfo.logo}
              alt={companyInfo.name}
              className="h-12 w-auto"
            />
          ) : (
            <Building2 className="h-12 w-12" />
          )}
          <h1 className="text-3xl font-bold">{companyInfo?.name || 'Roofing Company'}</h1>
        </div>

        <h2 className="text-xl mb-2">{proposal.title}</h2>
        <div className="flex items-center justify-center gap-4 text-sm opacity-90">
          <span>Proposal #{proposal.proposal_number}</span>
          <span>•</span>
          <span>{formatDate(proposal.created_at)}</span>
          <span>•</span>
          <div className="flex items-center gap-1">
            <span className={statusInfo.icon}></span>
            <span>{statusInfo.label}</span>
          </div>
        </div>

        {proposal.valid_until && (
          <div className="mt-4 bg-primary-foreground/10 border border-primary-foreground/20 rounded-lg p-3">
            <div className="flex items-center justify-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              <span>This proposal is valid until {formatDate(proposal.valid_until)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-8 space-y-8">
        {/* Company and Customer Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">From: {companyInfo?.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {companyInfo?.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">{companyInfo.address}</div>
                </div>
              )}
              {companyInfo?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm">{companyInfo.phone}</div>
                </div>
              )}
              {companyInfo?.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm">{companyInfo.email}</div>
                </div>
              )}
              {companyInfo?.license && (
                <div className="text-xs text-muted-foreground">
                  License: {companyInfo.license}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">To: {customerInfo?.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {customerInfo?.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">{customerInfo.address}</div>
                </div>
              )}
              {customerInfo?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm">{customerInfo.phone}</div>
                </div>
              )}
              {customerInfo?.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm">{customerInfo.email}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Project Description */}
        {proposal.description && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Project Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">{proposal.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Quote Options */}
        <div>
          <h3 className="text-2xl font-bold mb-6 text-center">Choose Your Option</h3>

          {/* Option Selection for customer mode */}
          {mode === 'customer' && proposal.options.length > 1 && (
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {proposal.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleSelectOption(option.id)}
                    className={`
                      p-4 border-2 rounded-lg text-left transition-all duration-200
                      ${selectedOptionId === option.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{option.name}</h4>
                      {option.is_recommended && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          <Star className="h-3 w-3 mr-1" />
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-primary mb-2">
                      {formatCurrency(option.total_amount)}
                    </div>
                    {option.description && (
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected Option Details */}
          {selectedOption && (
            <Card className="border-2 border-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{selectedOption.name}</CardTitle>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-primary">
                      {formatCurrency(selectedOption.total_amount)}
                    </div>
                    {selectedOption.tax_rate && selectedOption.tax_amount && (
                      <div className="text-sm text-muted-foreground">
                        Includes {formatCurrency(selectedOption.tax_amount)} tax
                      </div>
                    )}
                  </div>
                </div>
                {selectedOption.description && (
                  <p className="text-muted-foreground">{selectedOption.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <OptionLineItems option={selectedOption} />

                {/* Financial Breakdown */}
                <div className="mt-6 bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-3">Investment Breakdown</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(selectedOption.subtotal)}</span>
                    </div>
                    {selectedOption.tax_rate && selectedOption.tax_amount && (
                      <div className="flex justify-between">
                        <span>Tax ({selectedOption.tax_rate}%):</span>
                        <span>{formatCurrency(selectedOption.tax_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
                      <span>Total Investment:</span>
                      <span className="text-primary">{formatCurrency(selectedOption.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action Buttons */}
        {mode === 'customer' && proposal.status !== 'accepted' && (
          <div className="text-center space-y-4">
            <Alert>
              <AlertDescription>
                By clicking "Accept Proposal" below, you agree to proceed with the selected option
                and authorize us to begin work according to the terms outlined in this proposal.
              </AlertDescription>
            </Alert>

            <Button
              size="lg"
              onClick={handleAcceptProposal}
              className="px-12 py-3 text-lg"
              disabled={!selectedOptionId}
            >
              <Check className="h-5 w-5 mr-2" />
              Accept Proposal - {selectedOption ? formatCurrency(selectedOption.total_amount) : ''}
            </Button>

            <p className="text-sm text-muted-foreground">
              Have questions? Contact us at{' '}
              {companyInfo?.phone && (
                <a href={`tel:${companyInfo.phone}`} className="text-primary hover:underline">
                  {companyInfo.phone}
                </a>
              )}
              {companyInfo?.phone && companyInfo?.email && ' or '}
              {companyInfo?.email && (
                <a href={`mailto:${companyInfo.email}`} className="text-primary hover:underline">
                  {companyInfo.email}
                </a>
              )}
            </p>
          </div>
        )}

        {/* Accepted Status */}
        {proposal.status === 'accepted' && (
          <Alert className="border-green-200 bg-green-50">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Proposal Accepted!</strong> Thank you for choosing our services.
              We'll be in touch soon to schedule the next steps.
            </AlertDescription>
          </Alert>
        )}

        {/* Footer */}
        <div className="border-t border-border pt-6 text-center text-sm text-muted-foreground">
          <p>Thank you for considering our services. We look forward to working with you!</p>
          {companyInfo?.website && (
            <p className="mt-2">
              Visit us at{' '}
              <a
                href={companyInfo.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {companyInfo.website}
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

interface OptionLineItemsProps {
  option: QuoteOption
}

function OptionLineItems({ option }: OptionLineItemsProps) {
  // Group items by category
  const itemsByCategory = option.line_items.reduce((acc, item) => {
    const category = item.category || 'other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(item)
    return acc
  }, {} as Record<string, typeof option.line_items>)

  return (
    <div className="space-y-4">
      <h4 className="font-medium">What's Included:</h4>

      {Object.entries(itemsByCategory).map(([category, items]) => {
        const categoryInfo = LINE_ITEM_CATEGORIES.find(cat => cat.value === category) ||
          { value: category, label: category, icon: '📦' }

        return (
          <div key={category}>
            <div className="flex items-center gap-2 mb-2 font-medium text-primary">
              <span className="text-lg">{categoryInfo.icon}</span>
              <span>{categoryInfo.label}</span>
            </div>

            <div className="ml-6 space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-1">
                  <div className="flex-1">
                    <div className="font-medium">{item.description}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.quantity} {item.unit}
                      {item.unit_price > 0 && ` @ ${formatCurrency(item.unit_price)} each`}
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
      })}
    </div>
  )
}