'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { TrendingUp, TrendingDown, DollarSign, ArrowRight } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { Button } from '@/components/ui/button'

export interface ProjectPLData {
  project_id: string | null
  project_name: string | null
  project_number: string | null
  status: string | null
  revenue: number | null
  estimated_labor: number | null
  estimated_materials: number | null
  estimated_equipment: number | null
  estimated_other: number | null
  total_estimated_cost: number | null
  actual_labor: number | null
  actual_materials: number | null
  actual_equipment: number | null
  actual_other: number | null
  total_actual_cost: number | null
  gross_profit: number | null
  profit_margin_percent: number | null
  cost_variance: number | null
}

interface JobProfitabilitySheetProps {
  project: ProjectPLData | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function VarianceCell({ estimated, actual }: { estimated: number; actual: number }) {
  const variance = actual - estimated
  const isOver = variance > 0
  const isZero = variance === 0

  return (
    <span className={isZero ? 'text-muted-foreground' : isOver ? 'text-red-600' : 'text-green-600'}>
      {isOver ? '+' : ''}{formatCurrency(variance)}
    </span>
  )
}

export function JobProfitabilitySheet({ project, open, onOpenChange }: JobProfitabilitySheetProps) {
  if (!project) return null

  const revenue = project.revenue || 0
  const totalEstimated = project.total_estimated_cost || 0
  const totalActual = project.total_actual_cost || 0
  const grossProfit = project.gross_profit || 0
  const margin = project.profit_margin_percent || 0
  const estimatedMargin = revenue > 0 ? ((revenue - totalEstimated) / revenue) * 100 : 0
  const marginVariance = margin - estimatedMargin

  const costRows = [
    { label: 'Labor', estimated: project.estimated_labor || 0, actual: project.actual_labor || 0 },
    { label: 'Materials', estimated: project.estimated_materials || 0, actual: project.actual_materials || 0 },
    { label: 'Equipment', estimated: project.estimated_equipment || 0, actual: project.actual_equipment || 0 },
    { label: 'Other', estimated: project.estimated_other || 0, actual: project.actual_other || 0 },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">
            <span className="block text-lg">{project.project_name || 'Unnamed Project'}</span>
            {project.project_number && (
              <span className="block text-sm font-normal text-muted-foreground mt-1">
                {project.project_number}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Revenue */}
          <div className="bg-primary/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Revenue</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(revenue)}</p>
          </div>

          {/* Cost Breakdown */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Cost Breakdown</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Category</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Estimated</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Actual</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {costRows.map((row) => (
                    <tr key={row.label}>
                      <td className="px-4 py-2 font-medium text-foreground">{row.label}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{formatCurrency(row.estimated)}</td>
                      <td className="px-4 py-2 text-right text-foreground">{formatCurrency(row.actual)}</td>
                      <td className="px-4 py-2 text-right">
                        <VarianceCell estimated={row.estimated} actual={row.actual} />
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted/30 font-semibold">
                    <td className="px-4 py-2 text-foreground">Total</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{formatCurrency(totalEstimated)}</td>
                    <td className="px-4 py-2 text-right text-foreground">{formatCurrency(totalActual)}</td>
                    <td className="px-4 py-2 text-right">
                      <VarianceCell estimated={totalEstimated} actual={totalActual} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Profitability Summary */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Profitability</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Gross Profit</span>
                <span className={`text-lg font-bold ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(grossProfit)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Margin</span>
                <div className="flex items-center gap-2">
                  {margin >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-lg font-bold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {margin.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Est. Margin</span>
                <span className="text-sm text-foreground">{estimatedMargin.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Margin Variance</span>
                <span className={`text-sm font-medium ${marginVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {marginVariance >= 0 ? '+' : ''}{marginVariance.toFixed(1)} pp
                </span>
              </div>
            </div>
          </div>

          {/* Link to project */}
          {project.project_id && (
            <Button variant="outline" className="w-full" asChild>
              <Link href={`/projects/${project.project_id}`}>
                View Project Details
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
