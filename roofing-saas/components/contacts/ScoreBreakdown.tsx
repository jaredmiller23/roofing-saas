'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp, Info, TrendingUp } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { calculateLeadScore } from '@/lib/scoring/lead-scorer'
import { getScoreLevelStyles, getScoreLevelColor } from '@/lib/scoring/scoring-rules'
import type { Contact } from '@/lib/types/contact'
import type { LeadScore, ScoreComponent } from '@/lib/scoring/score-types'

interface ScoreBreakdownProps {
  contact: Contact
  showExpandedByDefault?: boolean
  className?: string
}

/**
 * ScoreBreakdown component displays detailed lead scoring breakdown
 * Shows total score, level, and breakdown by category
 */
export function ScoreBreakdown({
  contact,
  showExpandedByDefault = false,
  className = '',
}: ScoreBreakdownProps) {
  const [expanded, setExpanded] = useState(showExpandedByDefault)
  const leadScore = calculateLeadScore(contact)

  const styles = getScoreLevelStyles(leadScore.level)

  // Group components by category
  const componentsByCategory = leadScore.components.reduce((acc, component) => {
    if (!acc[component.category]) {
      acc[component.category] = []
    }
    acc[component.category].push(component)
    return acc
  }, {} as Record<string, ScoreComponent[]>)

  const categoryTotals = Object.entries(componentsByCategory).map(([category, components]) => ({
    category,
    total: Math.round(components.reduce((sum, comp) => sum + comp.contribution, 0)),
    components,
  }))

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">Lead Score</CardTitle>
            <CardDescription>
              AI-powered lead qualification and prioritization
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-3xl font-bold text-foreground">
                {leadScore.total}
                <span className="text-lg text-muted-foreground">/100</span>
              </div>
              <Badge
                variant="secondary"
                className={`${styles.bg} ${styles.text} ${styles.border} border font-semibold`}
              >
                {leadScore.level.toUpperCase()} PRIORITY
              </Badge>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="p-2"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Score Progress</span>
            <span>{leadScore.total}/100</span>
          </div>
          <Progress 
            value={leadScore.total} 
            className="h-3"
            style={{
              '--progress-background': getScoreLevelColor(leadScore.level) === 'red' ? '#fee2e2' :
                                     getScoreLevelColor(leadScore.level) === 'orange' ? '#fed7aa' :
                                     '#dbeafe',
              '--progress-foreground': getScoreLevelColor(leadScore.level) === 'red' ? '#dc2626' :
                                     getScoreLevelColor(leadScore.level) === 'orange' ? '#ea580c' :
                                     '#2563eb',
            } as any}
          />
          
          {/* Score thresholds indicators */}
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>Cold</span>
            <span className="relative">
              <span className="absolute -translate-x-1/2">50</span>
            </span>
            <span className="relative">
              <span className="absolute -translate-x-1/2">75</span>
            </span>
            <span>Hot</span>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Category Breakdown */}
            <div className="space-y-3">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Score Breakdown
              </h4>
              
              {categoryTotals.map(({ category, total, components }) => (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm capitalize">
                      {category.replace('_', ' ')}
                    </span>
                    <span className="text-sm font-semibold">+{total}</span>
                  </div>
                  
                  {/* Component details */}
                  <div className="space-y-1 ml-4">
                    {components.map((component) => (
                      <div key={component.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{component.name}</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{component.reason}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <span className="font-medium">+{Math.round(component.contribution)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Improvement Suggestions */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-foreground mb-3">Improvement Opportunities</h4>
              <div className="space-y-2 text-sm">
                {getImprovementSuggestions(contact, leadScore).map((suggestion, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span className="text-muted-foreground">{suggestion}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Last Updated */}
            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              Score calculated on {new Date(leadScore.lastUpdated).toLocaleDateString()} at{' '}
              {new Date(leadScore.lastUpdated).toLocaleTimeString()}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

/**
 * Generate improvement suggestions based on missing or low-scoring components
 */
function getImprovementSuggestions(contact: Contact, score: LeadScore): string[] {
  const suggestions: string[] = []

  // Check for missing property value
  if (!contact.property_value || contact.property_value <= 0) {
    suggestions.push('Add property value estimate to increase property score')
  }

  // Check for missing contact information
  const missingContactInfo: string[] = []
  if (!contact.email) missingContactInfo.push('email')
  if (!contact.phone && !contact.mobile_phone) missingContactInfo.push('phone number')
  if (!contact.address_street) missingContactInfo.push('address')
  
  if (missingContactInfo.length > 0) {
    suggestions.push(`Complete missing contact information: ${missingContactInfo.join(', ')}`)
  }

  // Check for missing property details
  const missingPropertyInfo: string[] = []
  if (!contact.roof_type) missingPropertyInfo.push('roof type')
  if (!contact.roof_age) missingPropertyInfo.push('roof age')
  if (!contact.square_footage) missingPropertyInfo.push('square footage')
  
  if (missingPropertyInfo.length > 0) {
    suggestions.push(`Add property details: ${missingPropertyInfo.join(', ')}`)
  }

  // Check for missing insurance information
  if (!contact.insurance_carrier || !contact.policy_number) {
    suggestions.push('Collect insurance carrier and policy information')
  }

  // Check for engagement opportunities
  if (contact.stage === 'new' || contact.stage === 'contacted') {
    suggestions.push('Schedule follow-up call to advance lead through sales stages')
  }

  // If no suggestions and score is not hot, provide generic advice
  if (suggestions.length === 0 && score.level !== 'hot') {
    suggestions.push('Contact is well-documented. Focus on engagement and moving through sales stages.')
  }

  return suggestions.slice(0, 3) // Limit to top 3 suggestions
}

/**
 * Compact version for smaller spaces
 */
export function CompactScoreBreakdown({
  contact,
  className = '',
}: {
  contact: Contact
  className?: string
}) {
  const leadScore = calculateLeadScore(contact)
  const styles = getScoreLevelStyles(leadScore.level)

  return (
    <div className={`p-3 rounded-lg border ${styles.bg} ${styles.border} ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-sm">Lead Score</div>
          <div className="text-xs text-muted-foreground">
            {leadScore.components.length} factors analyzed
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${styles.text}`}>
            {leadScore.total}
          </div>
          <div className={`text-xs font-medium ${styles.text}`}>
            {leadScore.level.toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  )
}
