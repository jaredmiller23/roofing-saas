'use client';

/**
 * Enrichment Cost Calculator Component
 *
 * Calculates and displays estimated costs for property enrichment
 * Helps users understand pricing before starting enrichment jobs
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingDown, Info } from 'lucide-react';
import type { EnrichmentProvider } from '@/lib/enrichment/types';

interface EnrichmentCostCalculatorProps {
  addressCount: number;
  cachedCount?: number;
  onProviderChange?: (provider: EnrichmentProvider) => void;
  onCostChange?: (cost: number) => void;
  defaultProvider?: EnrichmentProvider;
}

export function EnrichmentCostCalculator({
  addressCount,
  cachedCount = 0,
  onProviderChange,
  onCostChange,
  defaultProvider = 'batchdata',
}: EnrichmentCostCalculatorProps) {
  const [selectedProvider, setSelectedProvider] = useState<EnrichmentProvider>(defaultProvider);

  // Provider pricing (in cents per lookup)
  const providerPricing: Record<EnrichmentProvider, {
    cost: number;
    label: string;
    description: string;
    paymentModel: 'pay-per-use' | 'subscription' | 'free';
    subscriptionCost?: number;
  }> = {
    batchdata: {
      cost: 2.5, // $0.025
      label: 'BatchData API',
      description: 'Pay-as-you-go property data',
      paymentModel: 'pay-per-use',
    },
    propertyradar: {
      cost: 0,
      label: 'PropertyRadar',
      description: 'Subscription-based (limited queries)',
      paymentModel: 'subscription',
      subscriptionCost: 11900, // $119/month
    },
    tracerfy: {
      cost: 0.9, // $0.009
      label: 'Tracerfy Skip Tracing',
      description: 'Requires owner names - for door-knock follow-ups',
      paymentModel: 'pay-per-use',
    },
    lead_sherpa: {
      cost: 12, // $0.12
      label: 'Lead Sherpa',
      description: 'Premium skip tracing',
      paymentModel: 'pay-per-use',
    },
    county_assessor: {
      cost: 0,
      label: 'County Assessor',
      description: 'Free (limited data)',
      paymentModel: 'free',
    },
    manual: {
      cost: 0,
      label: 'Manual Entry',
      description: 'No API cost',
      paymentModel: 'free',
    },
  };

  // Calculate costs
  const costs = useMemo(() => {
    const newLookups = Math.max(0, addressCount - cachedCount);
    const provider = providerPricing[selectedProvider];

    const lookupCost = newLookups * provider.cost;
    const subscriptionCost = provider.subscriptionCost || 0;
    const totalCost = lookupCost + (provider.paymentModel === 'subscription' ? subscriptionCost : 0);
    const cacheSavings = cachedCount * provider.cost;
    const estimatedWithoutCache = addressCount * provider.cost;

    const costPerAddress = addressCount > 0 ? totalCost / addressCount : 0;

    return {
      lookupCost,
      subscriptionCost,
      totalCost,
      cacheSavings,
      estimatedWithoutCache,
      costPerAddress,
      newLookups,
    };
  }, [addressCount, cachedCount, selectedProvider, providerPricing]);

  // Notify parent of cost changes
  useEffect(() => {
    if (onCostChange) {
      onCostChange(costs.totalCost);
    }
  }, [costs.totalCost, onCostChange]);

  // Notify parent of provider changes
  const handleProviderChange = (provider: EnrichmentProvider) => {
    setSelectedProvider(provider);
    if (onProviderChange) {
      onProviderChange(provider);
    }
  };

  // Format currency
  const formatCost = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  };

  const provider = providerPricing[selectedProvider];
  const savingsPercentage = costs.estimatedWithoutCache > 0
    ? Math.round((costs.cacheSavings / costs.estimatedWithoutCache) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Cost Estimate
        </CardTitle>
        <CardDescription>
          Calculate enrichment costs before starting
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Provider Selection */}
        <div className="space-y-2">
          <Label htmlFor="provider">Enrichment Provider</Label>
          <Select
            value={selectedProvider}
            onValueChange={(value: string) => handleProviderChange(value as EnrichmentProvider)}
          >
            <SelectTrigger id="provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="batchdata">
                <div className="flex items-center justify-between w-full">
                  <span>BatchData API</span>
                  <Badge variant="outline" className="ml-2">Recommended</Badge>
                </div>
              </SelectItem>
              <SelectItem value="tracerfy">
                <div className="flex items-center justify-between w-full">
                  <span>Tracerfy (Skip Tracing)</span>
                  <Badge variant="outline" className="ml-2 text-xs">Names Required</Badge>
                </div>
              </SelectItem>
              <SelectItem value="lead_sherpa">Lead Sherpa</SelectItem>
              <SelectItem value="propertyradar">PropertyRadar</SelectItem>
              <SelectItem value="county_assessor">County Assessor (Free)</SelectItem>
              <SelectItem value="manual">Manual Entry</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {provider.description}
          </p>
        </div>

        {/* Cost Breakdown */}
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Addresses</span>
            <span className="font-medium">{addressCount.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Cached (Free)</span>
            <span className="font-medium text-green-600">
              -{cachedCount.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">New Lookups</span>
            <span className="font-medium">{costs.newLookups.toLocaleString()}</span>
          </div>

          {provider.paymentModel === 'pay-per-use' && costs.newLookups > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Cost per Lookup
              </span>
              <span className="font-medium">{formatCost(provider.cost)}</span>
            </div>
          )}

          {provider.paymentModel === 'subscription' && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Monthly Subscription</span>
                <span className="font-medium">{formatCost(provider.subscriptionCost!)}</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded text-xs text-blue-600 dark:text-blue-400">
                <Info className="h-4 w-4" />
                <span>Subscription includes limited queries per month</span>
              </div>
            </>
          )}
        </div>

        {/* Total Cost */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">Estimated Total</span>
            <span className="text-2xl font-bold text-primary">
              {formatCost(costs.totalCost)}
            </span>
          </div>

          {addressCount > 0 && (
            <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
              <span>Per Address</span>
              <span>{formatCost(costs.costPerAddress)}</span>
            </div>
          )}
        </div>

        {/* Cache Savings */}
        {cachedCount > 0 && costs.cacheSavings > 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded">
              <TrendingDown className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="font-medium text-green-700 dark:text-green-400">
                  Cache Savings: {formatCost(costs.cacheSavings)}
                </p>
                <p className="text-xs text-green-600 dark:text-green-500">
                  {savingsPercentage}% savings from cached data
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Warning for expensive jobs */}
        {costs.totalCost > 10000 && ( // $100+
          <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded">
            <Info className="h-5 w-5 text-yellow-600" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-yellow-700 dark:text-yellow-400">
                Large Enrichment Job
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-500">
                Consider processing in smaller batches to manage costs
              </p>
            </div>
          </div>
        )}

        {/* Free providers note */}
        {costs.totalCost === 0 && addressCount > 0 && (
          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded text-sm">
            <Info className="h-4 w-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {provider.paymentModel === 'free'
                ? 'No API costs for this provider'
                : 'All addresses are cached - no new API costs'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default EnrichmentCostCalculator;
