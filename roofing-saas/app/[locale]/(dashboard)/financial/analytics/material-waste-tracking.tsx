'use client'

import { useMemo } from 'react'
import { AlertCircle } from 'lucide-react'

interface Material {
  id: string
  material_name: string
  material_type?: string | null
  supplier: string
  quantity: number
  quantity_used?: number
  quantity_wasted?: number
  quantity_returned?: number
  waste_percent?: number
  unit_cost: number
  total_cost?: number
}

interface MaterialWasteTrackingProps {
  materials: Material[]
}

export function MaterialWasteTracking({ materials }: MaterialWasteTrackingProps) {
  const analysis = useMemo(() => {
    // Calculate waste statistics
    const totalPurchased = materials.reduce((sum, m) => sum + m.quantity, 0)
    const totalUsed = materials.reduce((sum, m) => sum + (m.quantity_used || 0), 0)
    const totalWasted = materials.reduce((sum, m) => sum + (m.quantity_wasted || 0), 0)
    const totalReturned = materials.reduce((sum, m) => sum + (m.quantity_returned || 0), 0)

    const overallWastePercent = totalPurchased > 0 ? (totalWasted / totalPurchased) * 100 : 0

    // Calculate waste cost
    const wasteCost = materials.reduce((sum, m) => {
      const wasted = m.quantity_wasted || 0
      return sum + (wasted * m.unit_cost)
    }, 0)

    // By material type
    const byType: Record<string, {
      purchased: number
      wasted: number
      cost: number
      wasteCost: number
    }> = {}

    materials.forEach(m => {
      const type = m.material_type || 'Other'

      if (!byType[type]) {
        byType[type] = { purchased: 0, wasted: 0, cost: 0, wasteCost: 0 }
      }

      byType[type].purchased += m.quantity
      byType[type].wasted += m.quantity_wasted || 0
      byType[type].cost += m.total_cost || 0
      byType[type].wasteCost += (m.quantity_wasted || 0) * m.unit_cost
    })

    const wasteByType = Object.entries(byType).map(([type, data]) => ({
      type,
      purchased: data.purchased,
      wasted: data.wasted,
      wastePercent: data.purchased > 0 ? (data.wasted / data.purchased) * 100 : 0,
      wasteCost: data.wasteCost,
    })).sort((a, b) => b.wastePercent - a.wastePercent)

    // By supplier
    const bySupplier: Record<string, {
      purchased: number
      wasted: number
      accuracy: number
    }> = {}

    materials.forEach(m => {
      if (!bySupplier[m.supplier]) {
        bySupplier[m.supplier] = { purchased: 0, wasted: 0, accuracy: 0 }
      }

      bySupplier[m.supplier].purchased += m.quantity
      bySupplier[m.supplier].wasted += m.quantity_wasted || 0
    })

    const supplierAccuracy = Object.entries(bySupplier).map(([supplier, data]) => {
      const wastePercent = data.purchased > 0 ? (data.wasted / data.purchased) * 100 : 0
      const accuracy = 100 - wastePercent

      return {
        supplier,
        purchased: data.purchased,
        wasted: data.wasted,
        wastePercent,
        accuracy,
      }
    }).sort((a, b) => b.accuracy - a.accuracy)

    // High waste items (>15%)
    const highWasteItems = materials
      .filter(m => (m.waste_percent || 0) > 15)
      .map(m => ({
        name: m.material_name,
        wastePercent: m.waste_percent || 0,
        wasteCost: (m.quantity_wasted || 0) * m.unit_cost,
        supplier: m.supplier,
      }))
      .sort((a, b) => b.wasteCost - a.wasteCost)

    return {
      totalPurchased,
      totalUsed,
      totalWasted,
      totalReturned,
      overallWastePercent,
      wasteCost,
      wasteByType,
      supplierAccuracy,
      highWasteItems,
    }
  }, [materials])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getWasteColor = (percent: number) => {
    if (percent < 5) return 'text-green-600'
    if (percent < 10) return 'text-yellow-600'
    if (percent < 15) return 'text-orange-600'
    return 'text-red-600'
  }

  return (
    <div className="bg-card rounded-lg shadow mb-8">
      <div className="px-6 py-4 border-b border">
        <h2 className="text-xl font-semibold text-foreground">Material Waste Tracking</h2>
        <p className="text-sm text-muted-foreground mt-1">Waste analysis and supplier accuracy comparison</p>
      </div>

      <div className="p-6">
        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="text-center p-3 bg-background rounded-lg">
            <p className="text-xs font-medium text-muted-foreground mb-1">Total Purchased</p>
            <p className="text-xl font-bold text-foreground">{analysis.totalPurchased.toFixed(0)}</p>
          </div>

          <div className="text-center p-3 bg-background rounded-lg">
            <p className="text-xs font-medium text-muted-foreground mb-1">Total Wasted</p>
            <p className="text-xl font-bold text-red-600">{analysis.totalWasted.toFixed(0)}</p>
          </div>

          <div className="text-center p-3 bg-background rounded-lg">
            <p className="text-xs font-medium text-muted-foreground mb-1">Waste %</p>
            <p className={`text-xl font-bold ${getWasteColor(analysis.overallWastePercent)}`}>
              {analysis.overallWastePercent.toFixed(1)}%
            </p>
          </div>

          <div className="text-center p-3 bg-background rounded-lg">
            <p className="text-xs font-medium text-muted-foreground mb-1">Waste Cost</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(analysis.wasteCost)}</p>
          </div>
        </div>

        {/* Waste by Material Type */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Waste by Material Type</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Purchased</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Wasted</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Waste %</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Cost Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {analysis.wasteByType.map((item, index) => (
                  <tr key={index} className="hover:bg-background">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{item.type}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground text-right">{item.purchased.toFixed(0)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground text-right">{item.wasted.toFixed(0)}</td>
                    <td className={`px-4 py-3 text-sm font-semibold text-right ${getWasteColor(item.wastePercent)}`}>
                      {item.wastePercent.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-sm text-red-600 text-right font-medium">
                      {formatCurrency(item.wasteCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Supplier Accuracy */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Supplier Accuracy Comparison</h3>
          <div className="space-y-3">
            {analysis.supplierAccuracy.map((supplier, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-background rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{supplier.supplier}</p>
                  <p className="text-xs text-muted-foreground">
                    Purchased: {supplier.purchased.toFixed(0)} | Wasted: {supplier.wasted.toFixed(0)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={`text-sm font-bold ${supplier.accuracy >= 90 ? 'text-green-600' : supplier.accuracy >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {supplier.accuracy.toFixed(1)}% accurate
                    </p>
                    <p className="text-xs text-muted-foreground">{supplier.wastePercent.toFixed(1)}% waste</p>
                  </div>
                  <div className="w-24">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${supplier.accuracy >= 90 ? 'bg-green-500' : supplier.accuracy >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${supplier.accuracy}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* High Waste Alerts */}
        {analysis.highWasteItems.length > 0 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex gap-3 mb-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900">High Waste Alert</p>
                <p className="text-xs text-red-700 mt-1">The following items have waste &gt;15%:</p>
              </div>
            </div>
            <div className="space-y-2 ml-8">
              {analysis.highWasteItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-red-900">{item.name}</span>
                    <span className="text-red-700 ml-2">({item.supplier})</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-red-900">{item.wastePercent.toFixed(1)}%</span>
                    <span className="text-red-700 ml-2">{formatCurrency(item.wasteCost)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div className="mt-6 p-4 bg-primary/10 rounded-lg">
          <p className="text-sm font-semibold text-primary mb-2">Recommendations</p>
          <ul className="text-xs text-primary space-y-1 list-disc list-inside">
            {analysis.overallWastePercent > 10 && (
              <li>Overall waste is high ({analysis.overallWastePercent.toFixed(1)}%). Target &lt;8% waste rate.</li>
            )}
            {analysis.wasteCost > 5000 && (
              <li>Waste cost is {formatCurrency(analysis.wasteCost)}. Implement better inventory management.</li>
            )}
            {analysis.supplierAccuracy.length > 0 && analysis.supplierAccuracy[0].accuracy >= 95 && (
              <li>Consider using {analysis.supplierAccuracy[0].supplier} more - {analysis.supplierAccuracy[0].accuracy.toFixed(1)}% accuracy.</li>
            )}
            {analysis.wasteByType.length > 0 && analysis.wasteByType[0].wastePercent > 15 && (
              <li>Focus on reducing {analysis.wasteByType[0].type} waste - currently at {analysis.wasteByType[0].wastePercent.toFixed(1)}%.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
