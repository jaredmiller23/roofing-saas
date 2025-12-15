/**
 * Advanced Sync Manager
 * Coordinates online/offline data synchronization with conflict resolution
 */

import { createClient } from '@/lib/supabase/client';
import { 
  getUnsyncedRecords, 
  markRecordSynced, 
  incrementRetryCount,
  addConflict,
  getUnresolvedConflicts,
  resolveConflict,
  updateSyncMetadata,
  getSyncMetadata,
  clearExpiredCache,
  cacheData 
} from './indexed-db';
import { 
  OfflineRecord, 
  ConflictResolution, 
  SyncStatus, 
  SyncOptions, 
  OfflineEventType,
  OfflineEvent 
} from './offline-types';
import { logger } from '@/lib/logger';

class SyncManager {
  private isOnline: boolean = false;
  private isSyncing: boolean = false;
  private syncStatus: SyncStatus;
  private eventListeners: Map<OfflineEventType, Function[]> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.syncStatus = {
      is_online: typeof navigator !== 'undefined' ? navigator.onLine : false,
      is_syncing: false,
      last_sync: null,
      pending_changes: 0,
      failed_syncs: 0,
      sync_errors: [],
    };

    this.setupNetworkListeners();
    this.setupPeriodicSync();
  }

  /**
   * Initialize sync manager
   */
  public async initialize(): Promise<void> {
    try {
      // Clean expired cache on startup
      await clearExpiredCache();
      
      // Check for pending changes
      const unsyncedRecords = await getUnsyncedRecords();
      this.syncStatus.pending_changes = unsyncedRecords.length;
      
      // Start sync if online
      if (this.isOnline && unsyncedRecords.length > 0) {
        this.scheduleSync();
      }
      
      logger.info('Sync manager initialized', {
        isOnline: this.isOnline,
        pendingChanges: this.syncStatus.pending_changes
      });
      
    } catch (error) {
      logger.error('Failed to initialize sync manager', { error });
      throw error;
    }
  }

  /**
   * Add event listener
   */
  public addEventListener(eventType: OfflineEventType, handler: Function): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(handler);
  }

  /**
   * Remove event listener
   */
  public removeEventListener(eventType: OfflineEventType, handler: Function): void {
    const handlers = this.eventListeners.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  private emitEvent(eventType: OfflineEventType, data?: Record<string, unknown>): void {
    const event: OfflineEvent = {
      type: eventType,
      data,
      timestamp: Date.now(),
    };

    const handlers = this.eventListeners.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          logger.error('Error in event handler', { eventType, error });
        }
      });
    }
  }

  /**
   * Get current sync status
   */
  public getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Force sync now
   */
  public async syncNow(options: SyncOptions = {}): Promise<boolean> {
    if (!this.isOnline) {
      logger.warn('Cannot sync while offline');
      return false;
    }

    if (this.isSyncing) {
      logger.warn('Sync already in progress');
      return false;
    }

    try {
      await this.performSync(options);
      return true;
    } catch (error) {
      logger.error('Sync failed', { error });
      return false;
    }
  }

  /**
   * Perform synchronization
   */
  private async performSync(options: SyncOptions = {}): Promise<void> {
    if (this.isSyncing) return;

    this.isSyncing = true;
    this.syncStatus.is_syncing = true;
    this.emitEvent('sync_started');

    try {
      logger.info('Starting sync', options);

      // Get unsynced records
      const unsyncedRecords = await getUnsyncedRecords();
      let filteredRecords = unsyncedRecords;

      // Filter by tables if specified
      if (options.tables && options.tables.length > 0) {
        filteredRecords = unsyncedRecords.filter(record => 
          options.tables!.includes(record.table)
        );
      }

      // Process records in batches
      const batchSize = options.batch_size || 10;
      const maxRetries = options.max_retries || 3;
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < filteredRecords.length; i += batchSize) {
        const batch = filteredRecords.slice(i, i + batchSize);
        
        const batchResults = await Promise.allSettled(
          batch.map(record => this.syncRecord(record, maxRetries))
        );

        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            successCount++;
          } else {
            failCount++;
            logger.error('Record sync failed', {
              recordId: batch[index].id,
              error: result.reason
            });
          }
        });

        // Small delay between batches to avoid overwhelming the server
        if (i + batchSize < filteredRecords.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Handle conflicts if requested
      if (options.resolve_conflicts) {
        await this.autoResolveConflicts();
      }

      // Update sync status
      this.syncStatus.last_sync = Date.now();
      this.syncStatus.pending_changes = (await getUnsyncedRecords()).length;
      this.syncStatus.failed_syncs = failCount;

      // Update sync metadata
      await updateSyncMetadata('all_tables', this.syncStatus.last_sync);

      logger.info('Sync completed', {
        success: successCount,
        failed: failCount,
        remaining: this.syncStatus.pending_changes
      });

      this.emitEvent('sync_completed', {
        success: successCount,
        failed: failCount,
        remaining: this.syncStatus.pending_changes
      });

    } catch (error) {
      this.syncStatus.failed_syncs++;
      this.syncStatus.sync_errors.push({
        id: `error_${Date.now()}`,
        operation: { id: 'sync', table: 'all', operation: 'CREATE' } as OfflineRecord,
        error: error instanceof Error ? error.message : 'Unknown sync error',
        timestamp: Date.now(),
      });

      logger.error('Sync operation failed', { error });
      this.emitEvent('sync_failed', { error });
      throw error;

    } finally {
      this.isSyncing = false;
      this.syncStatus.is_syncing = false;
    }
  }

  /**
   * Sync individual record
   */
  private async syncRecord(record: OfflineRecord, maxRetries: number): Promise<void> {
    const supabase = createClient();
    
    try {
      let result;
      
      switch (record.operation) {
        case 'CREATE':
          result = await supabase
            .from(record.table)
            .insert(record.data)
            .select()
            .single();
          break;
          
        case 'UPDATE':
          result = await supabase
            .from(record.table)
            .update(record.data)
            .eq('id', record.data.id)
            .select()
            .single();
          break;
          
        case 'DELETE':
          result = await supabase
            .from(record.table)
            .delete()
            .eq('id', record.data.id);
          break;
      }

      if (result.error) {
        throw new Error(`${result.error.message}`);
      }

      // Check for conflicts (for updates)
      if (record.operation === 'UPDATE' && result.data) {
        const conflict = await this.detectConflict(record, result.data);
        if (conflict) {
          await addConflict(conflict);
          this.emitEvent('conflict_detected', { conflict: conflict as unknown as Record<string, unknown> });
          return; // Don't mark as synced if there's a conflict
        }
      }

      // Mark as synced
      await markRecordSynced(record.id);
      
    } catch (error) {
      // Increment retry count
      await incrementRetryCount(record.id);
      
      if (record.retry_count >= maxRetries) {
        logger.error('Max retries reached for record', {
          recordId: record.id,
          operation: record.operation,
          table: record.table
        });
      }
      
      throw error;
    }
  }

  /**
   * Detect conflicts
   */
  private async detectConflict(localRecord: OfflineRecord, serverData: Record<string, unknown>): Promise<ConflictResolution | null> {
    // Simple timestamp-based conflict detection
    const localTimestampValue = localRecord.data.updated_at || localRecord.timestamp;
    const localTimestamp = typeof localTimestampValue === 'number' ? localTimestampValue : new Date(localTimestampValue as string).getTime();
    const serverTimestamp = new Date(serverData.updated_at as string | number).getTime();

    if (localTimestamp < serverTimestamp) {
      return {
        id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        local_version: localRecord.data,
        server_version: serverData,
        resolution_strategy: 'manual', // Default to manual resolution
        resolved: false,
      };
    }
    
    return null;
  }

  /**
   * Auto-resolve conflicts based on strategy
   */
  private async autoResolveConflicts(): Promise<void> {
    const conflicts = await getUnresolvedConflicts();
    
    for (const conflict of conflicts) {
      try {
        let resolvedData;
        
        switch (conflict.resolution_strategy) {
          case 'local_wins':
            resolvedData = conflict.local_version;
            break;
            
          case 'server_wins':
            resolvedData = conflict.server_version;
            break;
            
          case 'merge':
            resolvedData = this.mergeConflictData(conflict);
            break;
            
          case 'manual':
            continue; // Skip automatic resolution
        }
        
        if (resolvedData) {
          await resolveConflict(conflict.id, resolvedData);
          this.emitEvent('conflict_resolved', {
            conflictId: conflict.id,
            strategy: conflict.resolution_strategy,
            data: resolvedData
          });
        }
        
      } catch (error) {
        logger.error('Failed to resolve conflict', {
          conflictId: conflict.id,
          error
        });
      }
    }
  }

  /**
   * Merge conflict data (simple field-level merge)
   */
  private mergeConflictData(conflict: ConflictResolution): Record<string, unknown> {
    const local = conflict.local_version;
    const server = conflict.server_version;
    
    // Simple merge strategy: take server data but preserve local fields that are newer
    const merged = { ...server };
    
    // Compare timestamps for each field if available
    Object.keys(local).forEach(key => {
      if (key.endsWith('_at') && local[key] && server[key]) {
        if (new Date(local[key] as string | number).getTime() > new Date(server[key] as string | number).getTime()) {
          merged[key] = local[key];
        }
      }
    });
    
    return merged;
  }

  /**
   * Cache fresh data from server
   */
  public async refreshCache(tables: string[], maxAge: number = 5 * 60 * 1000): Promise<void> {
    if (!this.isOnline) return;
    
    const supabase = createClient();
    
    for (const table of tables) {
      try {
        const metadata = await getSyncMetadata(table);
        const lastSync = metadata?.last_sync || 0;
        
        // Fetch data updated since last sync
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .gte('updated_at', new Date(lastSync).toISOString())
          .order('updated_at', { ascending: false });
          
        if (error) {
          logger.error(`Failed to fetch ${table}`, { error });
          continue;
        }
        
        if (data && data.length > 0) {
          await cacheData(table, data, maxAge);
          await updateSyncMetadata(table, Date.now());
          
          this.emitEvent('cache_updated', {
            table,
            count: data.length
          });
          
          logger.info(`Cached ${data.length} ${table} records`);
        }
        
      } catch (error) {
        logger.error(`Failed to refresh cache for ${table}`, { error });
      }
    }
  }

  /**
   * Setup network listeners
   */
  private setupNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    this.isOnline = navigator.onLine;
    this.syncStatus.is_online = this.isOnline;

    const handleOnline = async () => {
      this.isOnline = true;
      this.syncStatus.is_online = true;
      this.emitEvent('network_changed', { online: true });
      
      logger.info('Network online - starting sync');
      await this.scheduleSync();
    };

    const handleOffline = () => {
      this.isOnline = false;
      this.syncStatus.is_online = false;
      this.emitEvent('network_changed', { online: false });
      
      logger.info('Network offline');
      
      // Cancel any pending sync operations
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
        this.retryTimeout = null;
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Also listen for page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.scheduleSync();
      }
    });
  }

  /**
   * Setup periodic sync
   */
  private setupPeriodicSync(): void {
    // Sync every 5 minutes when online
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.scheduleSync();
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Schedule sync with backoff
   */
  private scheduleSync(delay: number = 1000): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    
    this.retryTimeout = setTimeout(() => {
      this.syncNow().catch(error => {
        logger.error('Scheduled sync failed', { error });
        
        // Exponential backoff for retries
        const nextDelay = Math.min(delay * 2, 60000); // Max 1 minute
        this.scheduleSync(nextDelay);
      });
    }, delay);
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    
    this.eventListeners.clear();
  }
}

// Singleton instance
export const syncManager = new SyncManager();

// Convenience exports
export const initializeSyncManager = () => syncManager.initialize();
export const syncNow = (options?: SyncOptions) => syncManager.syncNow(options);
export const getSyncStatus = () => syncManager.getSyncStatus();
export const addSyncEventListener = (eventType: OfflineEventType, handler: Function) => 
  syncManager.addEventListener(eventType, handler);
export const removeSyncEventListener = (eventType: OfflineEventType, handler: Function) => 
  syncManager.removeEventListener(eventType, handler);
export const refreshCache = (tables: string[], maxAge?: number) => 
  syncManager.refreshCache(tables, maxAge);
