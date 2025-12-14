'use client';

/**
 * Enrichment Progress Component
 *
 * Displays real-time progress of property enrichment jobs
 * Polls API for status updates and shows detailed metrics
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type {
  BatchEnrichmentResult,
  PropertyEnrichmentResult,
  EnrichmentError
} from '@/lib/enrichment/types';

interface EnrichmentProgressProps {
  jobId: string;
  onComplete?: (result: BatchEnrichmentResult) => void;
  onError?: (error: string) => void;
  pollInterval?: number; // ms
  showDetails?: boolean;
}

interface JobStatus {
  success: boolean;
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
    cached: number;
    percentage: number;
  };
  timing: {
    started_at: string;
    completed_at?: string;
    estimated_completion_at?: string;
    duration_ms?: number;
  };
  cost_estimate: {
    provider: string;
    total_addresses: number;
    cached_addresses: number;
    new_lookups: number;
    property_lookup_cost: number;
    total_cost: number;
    cost_per_property: number;
    cache_savings: number;
  };
  quality: {
    average_quality_score?: number;
    average_completeness?: number;
  };
  results: PropertyEnrichmentResult[];
  errors: EnrichmentError[];
}

export function EnrichmentProgress({
  jobId,
  onComplete,
  onError,
  pollInterval = 2000,
  showDetails = true,
}: EnrichmentProgressProps) {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Poll for job status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/storm-targeting/enrich-properties?jobId=${jobId}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch enrichment status');
      }

      const data: JobStatus = await response.json();
      setStatus(data);
      setLoading(false);

      // Call callbacks
      if (data.status === 'completed' && onComplete) {
        // Convert JobStatus to BatchEnrichmentResult
        const result: BatchEnrichmentResult = {
          job_id: data.job_id,
          status: data.status,
          total_addresses: data.progress.total,
          processed_count: data.progress.processed,
          successful_count: data.progress.successful,
          failed_count: data.progress.failed,
          cached_count: data.progress.cached,
          results: data.results,
          errors: data.errors,
          started_at: data.timing.started_at,
          completed_at: data.timing.completed_at,
          estimated_completion_at: data.timing.estimated_completion_at,
          duration_ms: data.timing.duration_ms,
          cost_estimate: {
            provider: data.cost_estimate.provider as 'batchdata' | 'propertyradar' | 'tracerfy' | 'lead_sherpa' | 'county_assessor' | 'manual',
            total_addresses: data.cost_estimate.total_addresses,
            cached_addresses: data.cost_estimate.cached_addresses,
            new_lookups: data.cost_estimate.new_lookups,
            property_lookup_cost: data.cost_estimate.property_lookup_cost,
            skip_trace_cost: 0,
            total_cost: data.cost_estimate.total_cost,
            cost_per_property: data.cost_estimate.cost_per_property,
            cost_per_skip_trace: 0,
            cache_savings: data.cost_estimate.cache_savings,
            estimated_total_without_cache: data.cost_estimate.total_cost + data.cost_estimate.cache_savings,
          },
          average_quality_score: data.quality.average_quality_score,
          average_completeness: data.quality.average_completeness,
        };
        onComplete(result);
      } else if (data.status === 'failed' && onError) {
        onError('Enrichment job failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setLoading(false);

      if (onError) {
        onError(errorMessage);
      }
    }
  }, [jobId, onComplete, onError]);

  // Set up polling
  useEffect(() => {
    fetchStatus();

    const interval = setInterval(() => {
      if (status?.status && ['completed', 'failed', 'cancelled'].includes(status.status)) {
        clearInterval(interval);
        return;
      }

      fetchStatus();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [fetchStatus, pollInterval, status?.status]);

  // Format cost
  const formatCost = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  };

  // Format duration
  const formatDuration = (ms?: number) => {
    if (!ms) return 'Calculating...';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Format time remaining
  const formatTimeRemaining = (estimatedCompletionAt?: string) => {
    if (!estimatedCompletionAt) return 'Calculating...';
    const now = new Date().getTime();
    const completion = new Date(estimatedCompletionAt).getTime();
    const remaining = completion - now;

    if (remaining <= 0) return 'Almost done...';

    const seconds = Math.floor(remaining / 1000);
    if (seconds < 60) return `${seconds}s remaining`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m remaining`;
  };

  // Status badge
  const getStatusBadge = () => {
    if (!status) return null;

    switch (status.status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="default" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="secondary" className="gap-1">
            <XCircle className="h-3 w-3" />
            Cancelled
          </Badge>
        );
    }
  };

  if (loading && !status) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading enrichment status...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Error loading enrichment status</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStatus}
            className="mt-4"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return null;
  }

  const isProcessing = status.status === 'processing' || status.status === 'pending';
  const isComplete = status.status === 'completed';
  const hasFailed = status.status === 'failed';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Property Enrichment Progress</CardTitle>
          {getStatusBadge()}
        </div>
        <CardDescription>
          Job ID: {status.job_id}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {status.progress.processed} of {status.progress.total} addresses processed
            </span>
            <span className="text-muted-foreground">
              {status.progress.percentage}%
            </span>
          </div>
          <Progress value={status.progress.percentage} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Successful */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              Successful
            </div>
            <p className="text-2xl font-bold">{status.progress.successful}</p>
          </div>

          {/* Failed */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <XCircle className="h-3 w-3 text-red-600" />
              Failed
            </div>
            <p className="text-2xl font-bold">{status.progress.failed}</p>
          </div>

          {/* Cached */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-primary" />
              Cached
            </div>
            <p className="text-2xl font-bold">{status.progress.cached}</p>
          </div>

          {/* Cost */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3 text-green-600" />
              Estimated Cost
            </div>
            <p className="text-2xl font-bold">
              {formatCost(status.cost_estimate.total_cost)}
            </p>
          </div>
        </div>

        {/* Time Info */}
        {isProcessing && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatTimeRemaining(status.timing.estimated_completion_at)}
            </span>
            <span>
              Started {new Date(status.timing.started_at).toLocaleTimeString()}
            </span>
          </div>
        )}

        {isComplete && status.timing.duration_ms && (
          <div className="flex items-center justify-between text-sm text-green-600">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              Completed in {formatDuration(status.timing.duration_ms)}
            </span>
            {status.quality.average_quality_score && (
              <span>
                Avg Quality: {status.quality.average_quality_score}/100
              </span>
            )}
          </div>
        )}

        {/* Detailed Stats (Optional) */}
        {showDetails && isComplete && (
          <div className="border-t pt-4 space-y-4">
            <h4 className="font-medium text-sm">Enrichment Details</h4>

            {/* Cost Breakdown */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Provider</p>
                <p className="font-medium capitalize">{status.cost_estimate.provider}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Cost per Property</p>
                <p className="font-medium">
                  {formatCost(status.cost_estimate.cost_per_property)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">New Lookups</p>
                <p className="font-medium">{status.cost_estimate.new_lookups}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Cache Savings</p>
                <p className="font-medium text-green-600">
                  {formatCost(status.cost_estimate.cache_savings)}
                </p>
              </div>
            </div>

            {/* Quality Metrics */}
            {(status.quality.average_quality_score || status.quality.average_completeness) && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {status.quality.average_quality_score && (
                  <div>
                    <p className="text-muted-foreground">Average Quality Score</p>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={status.quality.average_quality_score}
                        className="h-2 flex-1"
                      />
                      <span className="font-medium">
                        {status.quality.average_quality_score}%
                      </span>
                    </div>
                  </div>
                )}
                {status.quality.average_completeness && (
                  <div>
                    <p className="text-muted-foreground">Data Completeness</p>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={status.quality.average_completeness}
                        className="h-2 flex-1"
                      />
                      <span className="font-medium">
                        {status.quality.average_completeness}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Errors */}
        {hasFailed && status.errors.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium text-sm text-destructive mb-2">
              Errors ({status.errors.length})
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {status.errors.slice(0, 5).map((err, idx) => (
                <div key={idx} className="text-sm p-2 bg-destructive/10 rounded">
                  <p className="font-medium">{err.error_type}</p>
                  <p className="text-muted-foreground">{err.error_message}</p>
                </div>
              ))}
              {status.errors.length > 5 && (
                <p className="text-sm text-muted-foreground">
                  ... and {status.errors.length - 5} more errors
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default EnrichmentProgress;
