/**
 * Damage Probability Component
 *
 * Visual display of damage probability with breakdown of contributing factors
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { DamagePrediction, DamageLevel } from '@/lib/storm/storm-types'
import { AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react'

interface DamageProbabilityProps {
  prediction: DamagePrediction
  showFactors?: boolean
}

export function DamageProbability({
  prediction,
  showFactors = true,
}: DamageProbabilityProps) {
  const { probability, damageLevel, estimatedDamage, confidence, factors } = prediction

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Damage Assessment</span>
          <DamageLevelBadge level={damageLevel} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Probability Score */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Damage Probability</span>
            <span className="text-2xl font-bold">{probability}%</span>
          </div>
          <Progress value={probability} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Low Risk</span>
            <span>High Risk</span>
          </div>
        </div>

        {/* Estimated Damage Cost */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Estimated Damage</span>
          </div>
          <span className="text-lg font-bold">
            ${estimatedDamage.toLocaleString()}
          </span>
        </div>

        {/* Confidence Score */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Prediction Confidence
          </span>
          <div className="flex items-center gap-2">
            <Progress value={confidence} className="w-20 h-2" />
            <span className="text-sm font-medium">{confidence}%</span>
          </div>
        </div>

        {/* Contributing Factors */}
        {showFactors && factors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Contributing Factors</h4>
            <div className="space-y-2">
              {factors.map((factor, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground capitalize">
                      {factor.type.replace('_', ' ')}
                    </span>
                    <span className="font-medium">{factor.value}%</span>
                  </div>
                  <Progress
                    value={factor.value}
                    className="h-1.5"
                  />
                  <p className="text-xs text-muted-foreground">
                    {factor.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Damage Level Badge Component
 */
function DamageLevelBadge({ level }: { level: DamageLevel }) {
  const config: Record<DamageLevel, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
    none: { label: 'No Damage', variant: 'secondary' },
    minor: { label: 'Minor', variant: 'default' },
    moderate: { label: 'Moderate', variant: 'default' },
    severe: { label: 'Severe', variant: 'destructive' },
    catastrophic: { label: 'Catastrophic', variant: 'destructive' },
  }

  const { label, variant } = config[level]

  return (
    <Badge variant={variant} className="gap-1">
      {level === 'none' ? (
        <CheckCircle className="w-3 h-3" />
      ) : (
        <AlertTriangle className="w-3 h-3" />
      )}
      {label}
    </Badge>
  )
}
