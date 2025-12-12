/**
 * Offline Queue Status Component
 * Shows real-time status of photo upload queue
 */

'use client';

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/offline-queue';
import { processPhotoQueue, retryFailedPhotos } from '@/lib/services/photo-queue';
import { WifiOff, Wifi, Upload, AlertCircle, RefreshCw, X } from 'lucide-react';

export default function OfflineQueueStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Live query for queue status
  const queuedPhotos = useLiveQuery(
    () => db.queuedPhotos.where('status').notEqual('completed').toArray(),
    []
  );

  const pendingCount = queuedPhotos?.filter(p => p.status === 'pending').length || 0;
  const syncingCount = queuedPhotos?.filter(p => p.status === 'syncing').length || 0;
  const failedCount = queuedPhotos?.filter(p => p.status === 'failed').length || 0;
  const totalCount = pendingCount + syncingCount + failedCount;

  // Network status listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('🌐 Network online - auto-syncing...');
      processPhotoQueue().catch(console.error);
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('📴 Network offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Service Worker message listener
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'SYNC_PHOTOS') {
          console.log('📡 Sync request from service worker');
          processPhotoQueue().catch(console.error);
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);

      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, []);

  const handleRetry = async () => {
    setIsProcessing(true);
    try {
      await retryFailedPhotos();
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSync = async () => {
    setIsProcessing(true);
    try {
      await processPhotoQueue();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Don't show if queue is empty and online
  if (totalCount === 0 && isOnline) {
    return null;
  }

  // Don't show if manually dismissed
  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
      <div className="bg-card rounded-lg shadow-lg border border-border p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-green-600" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-600" />
            )}
            <span className="font-semibold text-foreground">
              {isOnline ? 'Online' : 'Offline Mode'}
            </span>
          </div>

          <button
            onClick={() => setIsVisible(false)}
            className="text-muted-foreground hover:text-muted-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Queue Status */}
        {totalCount > 0 && (
          <div className="space-y-2">
            {/* Pending */}
            {pendingCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Upload className="w-4 h-4 text-primary" />
                <span>
                  {pendingCount} photo{pendingCount !== 1 ? 's' : ''} queued
                </span>
              </div>
            )}

            {/* Syncing */}
            {syncingCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>
                  Uploading {syncingCount} photo{syncingCount !== 1 ? 's' : ''}...
                </span>
              </div>
            )}

            {/* Failed */}
            {failedCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span>
                  {failedCount} upload{failedCount !== 1 ? 's' : ''} failed
                </span>
              </div>
            )}
          </div>
        )}

        {/* Offline Message */}
        {!isOnline && totalCount === 0 && (
          <p className="text-sm text-muted-foreground">
            Photos will sync automatically when you&apos;re back online.
          </p>
        )}

        {/* Actions */}
        {isOnline && totalCount > 0 && (
          <div className="mt-3 pt-3 border-t border-border flex gap-2">
            {failedCount > 0 && (
              <button
                onClick={handleRetry}
                disabled={isProcessing}
                className="flex-1 text-sm bg-red-50 text-red-700 px-3 py-2 rounded hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isProcessing ? 'Retrying...' : 'Retry Failed'}
              </button>
            )}

            {pendingCount > 0 && (
              <button
                onClick={handleSync}
                disabled={isProcessing}
                className="flex-1 text-sm bg-primary/10 text-primary px-3 py-2 rounded hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isProcessing ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
          </div>
        )}

        {/* Progress Indicator */}
        {syncingCount > 0 && (
          <div className="mt-3">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
