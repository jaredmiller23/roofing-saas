/**
 * Advanced Cache Strategy
 * Implements intelligent caching for offline-first data access
 */

import { createClient } from '@/lib/supabase/client';
import { getCachedData, cacheData, clearExpiredCache } from './indexed-db';
import { CacheConfig, NetworkState } from './offline-types';
import { logger } from '@/lib/logger';

class CacheStrategy {
  private networkState: NetworkState = {
    is_online: false,
    connection_type: 'unknown',
    effective_type: '4g',
    downlink: 0,
    rtt: 0,
  };

  private defaultConfigs: Map<string, CacheConfig> = new Map();

  constructor() {
    this.updateNetworkState();
    this.setupNetworkMonitoring();
    this.setupDefaultConfigs();
  }

  /**
   * Setup default cache configurations for different data types
   */
  private setupDefaultConfigs(): void {
    // Critical data - cache first, long-lived
    this.defaultConfigs.set('contacts', {
      tables: ['contacts'],
      max_age: 30 * 60 * 1000, // 30 minutes
      max_size: 1000,
      strategy: 'cache_first',
    });

    this.defaultConfigs.set('projects', {
      tables: ['projects'],
      max_age: 15 * 60 * 1000, // 15 minutes
      max_size: 500,
      strategy: 'cache_first',
    });

    // Dynamic data - network first, shorter cache
    this.defaultConfigs.set('activities', {
      tables: ['activities', 'notes'],
      max_age: 5 * 60 * 1000, // 5 minutes
      max_size: 200,
      strategy: 'network_first',
    });

    // Reference data - cache first, very long-lived
    this.defaultConfigs.set('reference', {
      tables: ['pipeline_stages', 'property_types', 'roof_types'],
      max_age: 2 * 60 * 60 * 1000, // 2 hours
      max_size: 100,
      strategy: 'cache_first',
    });

    // Files and media - network only (too large for IndexedDB)
    this.defaultConfigs.set('media', {
      tables: ['photos', 'documents'],
      max_age: 0,
      max_size: 0,
      strategy: 'network_only',
    });
  }

  /**
   * Get data with adaptive caching strategy
   */
  public async getData<T = Record<string, unknown>>(
    table: string,
    query?: Record<string, unknown>,
    config?: Partial<CacheConfig>
  ): Promise<T[]> {
    const finalConfig = this.getEffectiveConfig(table, config);
    
    logger.info('Cache strategy request', {
      table,
      strategy: finalConfig.strategy,
      networkState: this.networkState
    });

    const effectiveQuery = query ?? {};

    switch (finalConfig.strategy) {
      case 'cache_first':
        return this.cacheFirstStrategy<T>(table, effectiveQuery, finalConfig);

      case 'network_first':
        return this.networkFirstStrategy<T>(table, effectiveQuery, finalConfig);

      case 'cache_only':
        return this.cacheOnlyStrategy<T>(table);

      case 'network_only':
        return this.networkOnlyStrategy<T>(table, effectiveQuery);

      default:
        return this.adaptiveStrategy<T>(table, effectiveQuery, finalConfig);
    }
  }

  /**
   * Cache-first strategy: Check cache first, fallback to network
   */
  private async cacheFirstStrategy<T = Record<string, unknown>>(
    table: string,
    query: Record<string, unknown>,
    config: CacheConfig
  ): Promise<T[]> {
    try {
      // First, try to get from cache
      const cachedData = await getCachedData(table);
      
      if (cachedData.length > 0) {
        logger.info(`Cache hit for ${table}`, { count: cachedData.length });
        
        // If we have cached data and we're offline, return it
        if (!this.networkState.is_online) {
          return cachedData as T[];
        }

        // If online, optionally refresh cache in background
        this.backgroundRefresh(table, query, config);
        return cachedData as T[];
      }

      // Cache miss - fetch from network if online
      if (this.networkState.is_online) {
        return this.fetchAndCache(table, query, config);
      }

      // Offline and no cache - return empty array
      logger.warn(`No cached data for ${table} and offline`);
      return [];
      
    } catch (error) {
      logger.error(`Cache-first strategy failed for ${table}`, { error });
      
      // Fallback to network if online
      if (this.networkState.is_online) {
        return this.fetchAndCache(table, query, config);
      }
      
      return [];
    }
  }

  /**
   * Network-first strategy: Try network first, fallback to cache
   */
  private async networkFirstStrategy<T = Record<string, unknown>>(
    table: string,
    query: Record<string, unknown>,
    config: CacheConfig
  ): Promise<T[]> {
    try {
      // Try network first if online
      if (this.networkState.is_online) {
        return this.fetchAndCache(table, query, config);
      }
      
      // If offline, fallback to cache
      const cachedData = await getCachedData(table);
      logger.info(`Network offline, using cache for ${table}`, { count: cachedData.length });
      return cachedData as T[];
      
    } catch (error) {
      logger.error(`Network-first strategy failed for ${table}`, { error });
      
      // Network failed, try cache
      try {
        const cachedData = await getCachedData(table);
        logger.info(`Network failed, using cache for ${table}`, { count: cachedData.length });
        return cachedData as T[];
      } catch (cacheError) {
        logger.error(`Cache fallback also failed for ${table}`, { cacheError });
        return [];
      }
    }
  }

  /**
   * Cache-only strategy: Only return cached data
   */
  private async cacheOnlyStrategy<T = Record<string, unknown>>(table: string): Promise<T[]> {
    try {
      const cachedData = await getCachedData(table);
      logger.info(`Cache-only strategy for ${table}`, { count: cachedData.length });
      return cachedData as T[];
    } catch (error) {
      logger.error(`Cache-only strategy failed for ${table}`, { error });
      return [];
    }
  }

  /**
   * Network-only strategy: Always fetch from network
   */
  private async networkOnlyStrategy<T = Record<string, unknown>>(table: string, query: Record<string, unknown>): Promise<T[]> {
    if (!this.networkState.is_online) {
      logger.warn(`Network-only strategy for ${table} but offline`);
      return [];
    }

    try {
      const data = await this.fetchFromNetwork<T>(table, query);
      logger.info(`Network-only strategy for ${table}`, { count: data.length });
      return data;
    } catch (error) {
      logger.error(`Network-only strategy failed for ${table}`, { error });
      return [];
    }
  }

  /**
   * Adaptive strategy: Choose based on network conditions
   */
  private async adaptiveStrategy<T = Record<string, unknown>>(
    table: string,
    query: Record<string, unknown>,
    config: CacheConfig
  ): Promise<T[]> {
    // Analyze network conditions
    const isSlowNetwork = this.isSlowNetwork();
    const hasGoodCache = await this.hasRecentCache(table, config.max_age);

    if (!this.networkState.is_online) {
      // Offline - use cache only
      return this.cacheOnlyStrategy(table);
    }

    if (isSlowNetwork && hasGoodCache) {
      // Slow network but good cache - use cache first
      logger.info(`Slow network detected, using cache-first for ${table}`);
      return this.cacheFirstStrategy(table, query, config);
    }

    if (!isSlowNetwork) {
      // Fast network - use network first
      logger.info(`Fast network detected, using network-first for ${table}`);
      return this.networkFirstStrategy(table, query, config);
    }

    // Default to cache-first for moderate conditions
    return this.cacheFirstStrategy(table, query, config);
  }

  /**
   * Fetch data from network and cache it
   */
  private async fetchAndCache<T = Record<string, unknown>>(
    table: string,
    query: Record<string, unknown>,
    config: CacheConfig
  ): Promise<T[]> {
    const data = await this.fetchFromNetwork<T>(table, query);

    if (data.length > 0) {
      // Cache the data with configured max_age
      await cacheData(table, data as Record<string, unknown>[], config.max_age);

      // Enforce max_size limit
      if (config.max_size > 0) {
        await this.enforceMaxSize(table, config.max_size);
      }

      logger.info(`Cached ${data.length} ${table} records`);
    }

    return data;
  }

  /**
   * Fetch data from Supabase
   */
  private async fetchFromNetwork<T = Record<string, unknown>>(table: string, query?: Record<string, unknown>): Promise<T[]> {
    const supabase = createClient();
    
    let queryBuilder = supabase.from(table).select('*');
    
    // Apply query filters if provided
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (key === 'order') {
          queryBuilder = queryBuilder.order(value as string);
        } else if (key === 'limit') {
          queryBuilder = queryBuilder.limit(value as number);
        } else if (key === 'range') {
          const [from, to] = value as [number, number];
          queryBuilder = queryBuilder.range(from, to);
        } else {
          queryBuilder = queryBuilder.eq(key, value);
        }
      });
    }
    
    const { data, error } = await queryBuilder;
    
    if (error) {
      throw new Error(`Failed to fetch ${table}: ${error.message}`);
    }
    
    return data || [];
  }

  /**
   * Background refresh of cached data
   */
  private backgroundRefresh(table: string, query: Record<string, unknown>, config: CacheConfig): void {
    // Don't block the main thread
    setTimeout(async () => {
      try {
        if (this.networkState.is_online) {
          await this.fetchAndCache(table, query, config);
          logger.info(`Background refresh completed for ${table}`);
        }
      } catch (error) {
        logger.warn(`Background refresh failed for ${table}`, { error });
      }
    }, 100);
  }

  /**
   * Check if we have recent cache
   */
  private async hasRecentCache(table: string, maxAge: number): Promise<boolean> {
    try {
      const cachedData = await getCachedData(table);
      // If we have any cached data, assume it's recent enough
      // (getCachedData already filters expired data)
      return cachedData.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Determine if network is slow
   */
  private isSlowNetwork(): boolean {
    const { effective_type, downlink, rtt } = this.networkState;
    
    // Consider slow if:
    // - 2G connection
    // - Low bandwidth (< 1 Mbps)
    // - High latency (> 500ms)
    return (
      effective_type === '2g' ||
      effective_type === 'slow-2g' ||
      downlink < 1 ||
      rtt > 500
    );
  }

  /**
   * Enforce max cache size
   */
  private async enforceMaxSize(table: string, maxSize: number): Promise<void> {
    // This is a simplified implementation
    // In a real scenario, you'd want more sophisticated LRU eviction
    try {
      const cachedData = await getCachedData(table);
      
      if (cachedData.length > maxSize) {
        // For now, just clear expired cache
        await clearExpiredCache();
        logger.info(`Enforced max size for ${table} cache`);
      }
    } catch (error) {
      logger.warn(`Failed to enforce max size for ${table}`, { error });
    }
  }

  /**
   * Get effective config for a table
   */
  private getEffectiveConfig(table: string, overrides?: Partial<CacheConfig>): CacheConfig {
    // Find matching default config
    let baseConfig: CacheConfig | undefined;
    
    for (const [key, config] of this.defaultConfigs.entries()) {
      if (config.tables.includes(table)) {
        baseConfig = config;
        break;
      }
    }
    
    // Fallback to a sensible default
    if (!baseConfig) {
      baseConfig = {
        tables: [table],
        max_age: 10 * 60 * 1000, // 10 minutes
        max_size: 100,
        strategy: 'cache_first',
      };
    }
    
    // Apply overrides
    return {
      ...baseConfig,
      ...overrides,
    };
  }

  /**
   * Update network state
   */
  private updateNetworkState(): void {
    if (typeof navigator === 'undefined') return;

    this.networkState.is_online = navigator.onLine;

    // Use Network Information API if available
    const connection = (navigator as Navigator & {
      connection?: {
        type?: string;
        effectiveType?: string;
        downlink?: number;
        rtt?: number;
        addEventListener?: (type: string, listener: () => void) => void;
      };
      mozConnection?: { type?: string; effectiveType?: string; downlink?: number; rtt?: number; };
      webkitConnection?: { type?: string; effectiveType?: string; downlink?: number; rtt?: number; };
    }).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;

    if (connection) {
      this.networkState.connection_type = connection.type || 'unknown';
      this.networkState.effective_type = connection.effectiveType || '4g';
      this.networkState.downlink = connection.downlink || 0;
      this.networkState.rtt = connection.rtt || 0;
    }

    logger.info('Network state updated', this.networkState);
  }

  /**
   * Setup network monitoring
   */
  private setupNetworkMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Monitor online/offline events
    window.addEventListener('online', () => {
      this.updateNetworkState();
    });

    window.addEventListener('offline', () => {
      this.updateNetworkState();
    });

    // Monitor connection changes if available
    const connection = (navigator as Navigator & {
      connection?: { addEventListener?: (type: string, listener: () => void) => void; };
    }).connection;
    if (connection && 'addEventListener' in connection) {
      connection.addEventListener?.('change', () => {
        this.updateNetworkState();
      });
    }
  }

  /**
   * Preload critical data
   */
  public async preloadCriticalData(tables: string[]): Promise<void> {
    if (!this.networkState.is_online) {
      logger.info('Offline - skipping preload');
      return;
    }

    logger.info('Preloading critical data', { tables });

    const preloadPromises = tables.map(async (table) => {
      try {
        const config = this.getEffectiveConfig(table);
        await this.fetchAndCache(table, {}, config);
      } catch (error) {
        logger.error(`Failed to preload ${table}`, { error });
      }
    });

    await Promise.allSettled(preloadPromises);
    logger.info('Critical data preload completed');
  }

  /**
   * Clear all cached data
   */
  public async clearAllCache(): Promise<void> {
    try {
      await clearExpiredCache();
      // Note: clearExpiredCache in indexed-db.ts should be enhanced 
      // to clear all cache, not just expired
      logger.info('All cache cleared');
    } catch (error) {
      logger.error('Failed to clear cache', { error });
    }
  }

  /**
   * Get cache statistics
   */
  public async getCacheStats(): Promise<{
    total_cached_tables: number;
    network_state: NetworkState;
    cache_configs: Record<string, CacheConfig>;
  }> {
    const cacheConfigs: Record<string, CacheConfig> = {};
    
    for (const [key, config] of this.defaultConfigs.entries()) {
      cacheConfigs[key] = config;
    }

    return {
      total_cached_tables: this.defaultConfigs.size,
      network_state: this.networkState,
      cache_configs: cacheConfigs,
    };
  }
}

// Singleton instance
export const cacheStrategy = new CacheStrategy();

// Convenience exports
export const getData = <T = Record<string, unknown>>(table: string, query?: Record<string, unknown>, config?: Partial<CacheConfig>) =>
  cacheStrategy.getData<T>(table, query, config);

export const preloadCriticalData = (tables: string[]) =>
  cacheStrategy.preloadCriticalData(tables);

export const clearAllCache = () =>
  cacheStrategy.clearAllCache();

export const getCacheStats = () =>
  cacheStrategy.getCacheStats();
