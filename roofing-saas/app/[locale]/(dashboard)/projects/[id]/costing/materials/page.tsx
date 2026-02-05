'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Link } from '@/lib/i18n/navigation'
import { Users, Clock, Package, DollarSign, Plus, Trash2, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api/client'

interface MaterialPurchase {
  id: string
  project_id: string
  material_name: string
  material_type?: string
  supplier: string
  quantity: number
  unit?: string
  unit_cost: number
  total_cost: number
  purchase_order_number?: string
  invoice_number?: string
  delivery_date?: string
  purchase_date: string
  quantity_used?: number
  quantity_wasted?: number
  waste_percent?: number
  notes?: string
}

const MATERIAL_TYPES = [
  'Shingles',
  'Underlayment',
  'Flashing',
  'Drip Edge',
  'Ridge Vent',
  'Nails/Fasteners',
  'Sealant',
  'Gutters',
  'Downspouts',
  'Lumber',
  'Plywood',
  'Other',
]

const UNITS = ['sq ft', 'bundle', 'roll', 'box', 'piece', 'linear ft', 'gallon', 'bag']

export default function MaterialsPage() {
  const params = useParams()
  const projectId = params.id as string

  const [purchases, setPurchases] = useState<MaterialPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    material_name: '',
    material_type: '',
    supplier: '',
    quantity: '',
    unit: '',
    unit_cost: '',
    purchase_order_number: '',
    invoice_number: '',
    delivery_date: '',
    purchase_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const fetchPurchases = async () => {
    try {
      const response = await apiFetch<{ purchases: MaterialPurchase[] }>(
        `/api/material-purchases?project_id=${projectId}`
      )
      if (response.purchases) {
        setPurchases(response.purchases)
      }
    } catch (error) {
      console.error('Failed to fetch material purchases:', error)
      toast.error('Failed to load material purchases')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPurchases()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const resetForm = () => {
    setFormData({
      material_name: '',
      material_type: '',
      supplier: '',
      quantity: '',
      unit: '',
      unit_cost: '',
      purchase_order_number: '',
      invoice_number: '',
      delivery_date: '',
      purchase_date: new Date().toISOString().split('T')[0],
      notes: '',
    })
  }

  const handleSave = async () => {
    if (!formData.material_name || !formData.supplier || !formData.quantity || !formData.unit_cost) {
      toast.error('Please fill in all required fields')
      return
    }

    setSaving(true)
    try {
      await apiFetch('/api/material-purchases', {
        method: 'POST',
        body: {
          project_id: projectId,
          material_name: formData.material_name,
          material_type: formData.material_type || null,
          supplier: formData.supplier,
          quantity: parseFloat(formData.quantity),
          unit: formData.unit || null,
          unit_cost: parseFloat(formData.unit_cost),
          purchase_order_number: formData.purchase_order_number || null,
          invoice_number: formData.invoice_number || null,
          delivery_date: formData.delivery_date || null,
          purchase_date: formData.purchase_date,
          notes: formData.notes || null,
        },
      })

      toast.success('Material purchase added')
      setShowAddDialog(false)
      resetForm()
      fetchPurchases()
    } catch (error) {
      console.error('Failed to save material purchase:', error)
      toast.error('Failed to save material purchase')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (purchase: MaterialPurchase) => {
    if (!confirm(`Delete ${purchase.material_name} purchase?`)) {
      return
    }

    try {
      await apiFetch(`/api/material-purchases?id=${purchase.id}`, {
        method: 'DELETE',
      })
      toast.success('Material purchase deleted')
      fetchPurchases()
    } catch (error) {
      console.error('Failed to delete material purchase:', error)
      toast.error('Failed to delete material purchase')
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Calculate totals
  const totalCost = purchases.reduce((sum, p) => sum + p.total_cost, 0)
  const totalItems = purchases.length

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/projects/${projectId}`}
            className="text-sm text-primary hover:text-primary/80 mb-4 inline-block"
          >
            ← Back to Project
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Material Purchases</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Track material costs and inventory for this project
              </p>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="lg" className="h-12">
                  <Plus className="h-5 w-5 mr-2" />
                  Add Purchase
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Add Material Purchase</DialogTitle>
                  <DialogDescription>
                    Record a material purchase for this project
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="material_name">Material Name *</Label>
                      <Input
                        id="material_name"
                        value={formData.material_name}
                        onChange={(e) => setFormData({ ...formData, material_name: e.target.value })}
                        placeholder="GAF Timberline HDZ"
                      />
                    </div>
                    <div>
                      <Label htmlFor="material_type">Type</Label>
                      <Select
                        value={formData.material_type}
                        onValueChange={(value) => setFormData({ ...formData, material_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {MATERIAL_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="supplier">Supplier *</Label>
                    <Input
                      id="supplier"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      placeholder="ABC Supply Co."
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="quantity">Quantity *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        step="0.01"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        placeholder="10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="unit">Unit</Label>
                      <Select
                        value={formData.unit}
                        onValueChange={(value) => setFormData({ ...formData, unit: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {UNITS.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="unit_cost">Unit Cost *</Label>
                      <Input
                        id="unit_cost"
                        type="number"
                        step="0.01"
                        value={formData.unit_cost}
                        onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                        placeholder="45.00"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="purchase_order_number">PO #</Label>
                      <Input
                        id="purchase_order_number"
                        value={formData.purchase_order_number}
                        onChange={(e) => setFormData({ ...formData, purchase_order_number: e.target.value })}
                        placeholder="PO-2026-001"
                      />
                    </div>
                    <div>
                      <Label htmlFor="invoice_number">Invoice #</Label>
                      <Input
                        id="invoice_number"
                        value={formData.invoice_number}
                        onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                        placeholder="INV-12345"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="purchase_date">Purchase Date *</Label>
                      <Input
                        id="purchase_date"
                        type="date"
                        value={formData.purchase_date}
                        onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="delivery_date">Delivery Date</Label>
                      <Input
                        id="delivery_date"
                        type="date"
                        value={formData.delivery_date}
                        onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional details..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Add Purchase
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 border-b pb-4">
          <Link
            href={`/projects/${projectId}/costing`}
            className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-md text-sm font-medium"
          >
            <DollarSign className="h-4 w-4" />
            Overview
          </Link>
          <Link
            href={`/projects/${projectId}/costing/crew`}
            className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-md text-sm font-medium"
          >
            <Users className="h-4 w-4" />
            Crew
          </Link>
          <Link
            href={`/projects/${projectId}/costing/timesheets`}
            className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-md text-sm font-medium"
          >
            <Clock className="h-4 w-4" />
            Timesheets
          </Link>
          <Link
            href={`/projects/${projectId}/costing/materials`}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
          >
            <Package className="h-4 w-4" />
            Materials
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Purchases</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalItems}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Material Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalCost)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Materials Content */}
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Purchases</CardTitle>
              <CardDescription>All material purchases for this project</CardDescription>
            </CardHeader>
            <CardContent>
              {purchases.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No purchases yet. Click &quot;Add Purchase&quot; to track materials.
                </p>
              ) : (
                <div className="divide-y">
                  {purchases.map((purchase) => (
                    <div key={purchase.id} className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {purchase.material_name}
                            {purchase.material_type && (
                              <span className="text-muted-foreground ml-2">({purchase.material_type})</span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <span>{purchase.supplier}</span>
                            <span>•</span>
                            <span>{formatDate(purchase.purchase_date)}</span>
                            <span>•</span>
                            <span>
                              {purchase.quantity} {purchase.unit || 'units'} @ {formatCurrency(purchase.unit_cost)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium text-foreground">
                            {formatCurrency(purchase.total_cost)}
                          </p>
                          {purchase.invoice_number && (
                            <p className="text-xs text-muted-foreground">
                              Invoice: {purchase.invoice_number}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(purchase)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
