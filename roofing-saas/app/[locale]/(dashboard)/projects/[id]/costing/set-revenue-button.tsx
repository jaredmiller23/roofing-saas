'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DollarSign, Edit2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api/client'

interface SetRevenueButtonProps {
  projectId: string
  currentRevenue: number
  estimatedValue: number | null
  approvedValue: number | null
  finalValue: number | null
}

export function SetRevenueButton({
  projectId,
  currentRevenue,
  estimatedValue,
  approvedValue,
  finalValue,
}: SetRevenueButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [revenueSource, setRevenueSource] = useState<string>('manual')
  const [manualAmount, setManualAmount] = useState(currentRevenue.toString())

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return 'Not set'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const handleSave = async () => {
    let newRevenue: number | null = null

    switch (revenueSource) {
      case 'estimated':
        newRevenue = estimatedValue
        break
      case 'approved':
        newRevenue = approvedValue
        break
      case 'final':
        newRevenue = finalValue
        break
      case 'manual':
        newRevenue = parseFloat(manualAmount) || 0
        break
    }

    if (newRevenue === null) {
      toast.error('Selected source has no value set')
      return
    }

    setSaving(true)
    try {
      await apiFetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        body: { total_revenue: newRevenue },
      })

      toast.success('Revenue updated successfully')
      setOpen(false)
      router.refresh()
    } catch (error) {
      console.error('Error updating revenue:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update revenue')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Edit2 className="h-3 w-3" />
          <span className="sr-only">Set Revenue</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Set Project Revenue
          </DialogTitle>
          <DialogDescription>
            Choose the revenue source for profit calculations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={revenueSource} onValueChange={setRevenueSource}>
            <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-accent/50">
              <RadioGroupItem value="estimated" id="estimated" disabled={!estimatedValue} />
              <Label htmlFor="estimated" className="flex-1 cursor-pointer">
                <div className="font-medium">From Estimate</div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(estimatedValue)}
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-accent/50">
              <RadioGroupItem value="approved" id="approved" disabled={!approvedValue} />
              <Label htmlFor="approved" className="flex-1 cursor-pointer">
                <div className="font-medium">From Approved Amount</div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(approvedValue)}
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-accent/50">
              <RadioGroupItem value="final" id="final" disabled={!finalValue} />
              <Label htmlFor="final" className="flex-1 cursor-pointer">
                <div className="font-medium">From Final Value</div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(finalValue)}
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-accent/50">
              <RadioGroupItem value="manual" id="manual" />
              <Label htmlFor="manual" className="flex-1 cursor-pointer">
                <div className="font-medium">Manual Entry</div>
                <div className="text-sm text-muted-foreground">
                  Enter a custom amount
                </div>
              </Label>
            </div>
          </RadioGroup>

          {revenueSource === 'manual' && (
            <div className="pl-6">
              <Label htmlFor="amount">Revenue Amount</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Revenue'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
