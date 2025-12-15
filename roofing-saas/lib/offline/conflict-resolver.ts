/**
 * Conflict Resolution System
 * Advanced conflict detection and resolution for offline sync
 */

import { ConflictResolution } from './offline-types';
import { getUnresolvedConflicts, resolveConflict } from './indexed-db';
import { logger } from '@/lib/logger';

export type ConflictResolutionStrategy = 'local_wins' | 'server_wins' | 'manual' | 'merge' | 'field_level' | 'batch' | 'auto';

export interface ConflictField {
  field: string;
  local_value: unknown;
  server_value: unknown;
  local_timestamp?: number;
  server_timestamp?: number;
  data_type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
}

export interface ConflictAnalysis {
  conflict_id: string;
  total_fields: number;
  conflicting_fields: ConflictField[];
  recommended_strategy: ConflictResolutionStrategy;
  confidence: number; // 0-1 scale
  auto_resolvable: boolean;
}

export interface ResolutionResult {
  success: boolean;
  resolved_data?: Record<string, unknown>;
  error?: string;
  applied_strategy: ConflictResolutionStrategy;
  conflicts_resolved: number;
}

class ConflictResolver {
  private resolutionStrategies: Map<string, ConflictResolutionStrategy> = new Map();
  private fieldPriorities: Map<string, number> = new Map();

  constructor() {
    this.setupDefaultStrategies();
    this.setupFieldPriorities();
  }

  /**
   * Setup default resolution strategies for different tables/scenarios
   */
  private setupDefaultStrategies(): void {
    // Contact data - prefer local updates (user is actively editing)
    this.resolutionStrategies.set('contacts', 'field_level');
    
    // Projects - merge approach (multiple people might edit)
    this.resolutionStrategies.set('projects', 'merge');
    
    // Activities/notes - prefer local (timestamped entries)
    this.resolutionStrategies.set('activities', 'local_wins');
    this.resolutionStrategies.set('notes', 'local_wins');
    
    // System data - prefer server
    this.resolutionStrategies.set('pipeline_stages', 'server_wins');
    this.resolutionStrategies.set('property_types', 'server_wins');
  }

  /**
   * Setup field priorities for conflict resolution
   */
  private setupFieldPriorities(): void {
    // High priority fields (usually prefer local/manual resolution)
    this.fieldPriorities.set('first_name', 0.9);
    this.fieldPriorities.set('last_name', 0.9);
    this.fieldPriorities.set('phone', 0.8);
    this.fieldPriorities.set('email', 0.8);
    this.fieldPriorities.set('address', 0.7);
    this.fieldPriorities.set('notes', 0.9);
    this.fieldPriorities.set('description', 0.8);
    
    // Medium priority fields (can be automatically resolved)
    this.fieldPriorities.set('pipeline_stage', 0.5);
    this.fieldPriorities.set('status', 0.5);
    this.fieldPriorities.set('source', 0.4);
    this.fieldPriorities.set('tags', 0.6);
    
    // Low priority fields (prefer server/latest timestamp)
    this.fieldPriorities.set('created_at', 0.1);
    this.fieldPriorities.set('updated_at', 0.2);
    this.fieldPriorities.set('id', 0.0);
  }

  /**
   * Analyze a conflict and recommend resolution strategy
   */
  public async analyzeConflict(conflictId: string): Promise<ConflictAnalysis | null> {
    try {
      const conflicts = await getUnresolvedConflicts();
      const conflict = conflicts.find(c => c.id === conflictId);
      
      if (!conflict) {
        logger.warn(`Conflict ${conflictId} not found`);
        return null;
      }

      const analysis = this.performConflictAnalysis(conflict);
      
      logger.info('Conflict analysis completed', {
        conflictId,
        conflictingFields: analysis.conflicting_fields.length,
        recommendedStrategy: analysis.recommended_strategy,
        confidence: analysis.confidence
      });

      return analysis;
      
    } catch (error) {
      logger.error('Failed to analyze conflict', { conflictId, error });
      return null;
    }
  }

  /**
   * Perform detailed conflict analysis
   */
  private performConflictAnalysis(conflict: ConflictResolution): ConflictAnalysis {
    const localData = conflict.local_version;
    const serverData = conflict.server_version;
    
    const conflictingFields: ConflictField[] = [];
    const allFields = new Set([...Object.keys(localData), ...Object.keys(serverData)]);
    
    // Compare each field
    for (const field of allFields) {
      const localValue = localData[field];
      const serverValue = serverData[field];
      
      if (!this.valuesEqual(localValue, serverValue)) {
        conflictingFields.push({
          field,
          local_value: localValue,
          server_value: serverValue,
          local_timestamp: this.extractTimestamp(localData, field),
          server_timestamp: this.extractTimestamp(serverData, field),
          data_type: this.getDataType(localValue || serverValue),
        });
      }
    }
    
    const analysis: ConflictAnalysis = {
      conflict_id: conflict.id,
      total_fields: allFields.size,
      conflicting_fields: conflictingFields,
      recommended_strategy: this.recommendStrategy(conflictingFields, conflict),
      confidence: this.calculateConfidence(conflictingFields),
      auto_resolvable: this.isAutoResolvable(conflictingFields),
    };

    return analysis;
  }

  /**
   * Recommend the best resolution strategy
   */
  private recommendStrategy(
    conflictingFields: ConflictField[], 
    conflict: ConflictResolution
  ): ConflictResolutionStrategy {
    // If there's a predefined strategy for this table, use it
    const tableStrategy = this.resolutionStrategies.get((conflict.local_version?.table as string) || '');
    if (tableStrategy) {
      return tableStrategy;
    }

    // Analyze the nature of conflicts
    const highPriorityConflicts = conflictingFields.filter(field => 
      (this.fieldPriorities.get(field.field) || 0.5) > 0.7
    );

    const hasTimestampConflicts = conflictingFields.some(field => 
      field.local_timestamp && field.server_timestamp
    );

    // Decision tree for strategy recommendation
    if (highPriorityConflicts.length > conflictingFields.length * 0.5) {
      return 'manual'; // Too many important conflicts for auto-resolution
    }

    if (hasTimestampConflicts) {
      return 'field_level'; // Can resolve by timestamp
    }

    if (conflictingFields.length <= 2) {
      return 'merge'; // Simple merge for few conflicts
    }

    // Default to manual for complex scenarios
    return 'manual';
  }

  /**
   * Calculate confidence in auto-resolution
   */
  private calculateConfidence(conflictingFields: ConflictField[]): number {
    if (conflictingFields.length === 0) return 1.0;

    let totalWeight = 0;
    let conflictWeight = 0;

    for (const field of conflictingFields) {
      const priority = this.fieldPriorities.get(field.field) || 0.5;
      totalWeight += priority;

      // Higher confidence if we have timestamps
      if (field.local_timestamp && field.server_timestamp) {
        conflictWeight += priority * 0.8;
      } else {
        conflictWeight += priority * 0.3;
      }
    }

    return totalWeight > 0 ? conflictWeight / totalWeight : 0.0;
  }

  /**
   * Check if conflict can be auto-resolved
   */
  private isAutoResolvable(conflictingFields: ConflictField[]): boolean {
    // Auto-resolvable if all conflicts are low priority or have timestamps
    return conflictingFields.every(field => {
      const priority = this.fieldPriorities.get(field.field) || 0.5;
      return priority < 0.7 || (field.local_timestamp && field.server_timestamp);
    });
  }

  /**
   * Resolve conflict using specified strategy
   */
  public async resolveConflict(
    conflictId: string, 
    strategy: ConflictResolutionStrategy,
    manualData?: Record<string, unknown>
  ): Promise<ResolutionResult> {
    try {
      const conflicts = await getUnresolvedConflicts();
      const conflict = conflicts.find(c => c.id === conflictId);
      
      if (!conflict) {
        return {
          success: false,
          error: 'Conflict not found',
          applied_strategy: strategy,
          conflicts_resolved: 0,
        };
      }

      let resolvedData: Record<string, unknown>;

      switch (strategy) {
        case 'local_wins':
          resolvedData = conflict.local_version;
          break;

        case 'server_wins':
          resolvedData = conflict.server_version;
          break;

        case 'manual':
          if (!manualData) {
            return {
              success: false,
              error: 'Manual data required for manual resolution',
              applied_strategy: strategy,
              conflicts_resolved: 0,
            };
          }
          resolvedData = manualData;
          break;

        case 'merge':
          resolvedData = this.performMergeResolution(conflict);
          break;

        case 'field_level':
          resolvedData = this.performFieldLevelResolution(conflict);
          break;

        default:
          return {
            success: false,
            error: `Unknown resolution strategy: ${strategy}`,
            applied_strategy: strategy,
            conflicts_resolved: 0,
          };
      }

      // Apply the resolution
      await resolveConflict(conflictId, resolvedData);

      logger.info('Conflict resolved', {
        conflictId,
        strategy,
        resolvedData: Object.keys(resolvedData)
      });

      return {
        success: true,
        resolved_data: resolvedData,
        applied_strategy: strategy,
        conflicts_resolved: 1,
      };

    } catch (error) {
      logger.error('Failed to resolve conflict', { conflictId, strategy, error });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        applied_strategy: strategy,
        conflicts_resolved: 0,
      };
    }
  }

  /**
   * Perform merge resolution
   */
  private performMergeResolution(conflict: ConflictResolution): Record<string, unknown> {
    const local = conflict.local_version;
    const server = conflict.server_version;
    
    // Start with server data as base
    const merged = { ...server };
    
    // Merge local changes based on field priorities
    Object.keys(local).forEach(field => {
      const priority = this.fieldPriorities.get(field) || 0.5;
      
      // Prefer local for high-priority fields
      if (priority > 0.6) {
        merged[field] = local[field];
      }
      
      // For timestamp fields, use the latest
      if (field.endsWith('_at') && local[field] && server[field]) {
        const localTime = new Date(local[field] as string | number).getTime();
        const serverTime = new Date(server[field] as string | number).getTime();
        merged[field] = localTime > serverTime ? local[field] : server[field];
      }
    });
    
    // Always use the latest updated_at timestamp
    merged.updated_at = new Date().toISOString();
    
    return merged;
  }

  /**
   * Perform field-level resolution using timestamps and priorities
   */
  private performFieldLevelResolution(conflict: ConflictResolution): Record<string, unknown> {
    const local = conflict.local_version;
    const server = conflict.server_version;
    const resolved = { ...server }; // Start with server as base
    
    Object.keys(local).forEach(field => {
      const localValue = local[field];
      const serverValue = server[field];
      
      // Skip if values are the same
      if (this.valuesEqual(localValue, serverValue)) {
        return;
      }
      
      // Get timestamps for comparison
      const localTimestamp = this.extractTimestamp(local, field);
      const serverTimestamp = this.extractTimestamp(server, field);
      
      if (localTimestamp && serverTimestamp) {
        // Use timestamp-based resolution
        resolved[field] = localTimestamp > serverTimestamp ? localValue : serverValue;
      } else {
        // Use priority-based resolution
        const priority = this.fieldPriorities.get(field) || 0.5;
        resolved[field] = priority > 0.5 ? localValue : serverValue;
      }
    });
    
    // Update timestamp to current time
    resolved.updated_at = new Date().toISOString();
    
    return resolved;
  }

  /**
   * Resolve multiple conflicts in batch
   */
  public async resolveBatchConflicts(
    resolutions: Array<{
      conflictId: string;
      strategy: ConflictResolutionStrategy;
      manualData?: Record<string, unknown>;
    }>
  ): Promise<ResolutionResult> {
    let totalResolved = 0;
    let totalFailed = 0;
    const errors: string[] = [];

    for (const resolution of resolutions) {
      try {
        const result = await this.resolveConflict(
          resolution.conflictId,
          resolution.strategy,
          resolution.manualData
        );

        if (result.success) {
          totalResolved++;
        } else {
          totalFailed++;
          if (result.error) {
            errors.push(result.error);
          }
        }
      } catch (error) {
        totalFailed++;
        errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
    }

    return {
      success: totalFailed === 0,
      applied_strategy: 'batch' as ConflictResolutionStrategy,
      conflicts_resolved: totalResolved,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  }

  /**
   * Auto-resolve all resolvable conflicts
   */
  public async autoResolveConflicts(): Promise<ResolutionResult> {
    try {
      const unresolvedConflicts = await getUnresolvedConflicts();
      let resolved = 0;
      let failed = 0;

      for (const conflict of unresolvedConflicts) {
        try {
          const analysis = this.performConflictAnalysis(conflict);
          
          if (analysis.auto_resolvable && analysis.confidence > 0.7) {
            const result = await this.resolveConflict(
              conflict.id,
              analysis.recommended_strategy
            );
            
            if (result.success) {
              resolved++;
            } else {
              failed++;
            }
          }
        } catch (error) {
          failed++;
          logger.error('Failed to auto-resolve conflict', {
            conflictId: conflict.id,
            error
          });
        }
      }

      logger.info('Auto-resolution completed', { resolved, failed });

      return {
        success: true,
        applied_strategy: 'auto' as ConflictResolutionStrategy,
        conflicts_resolved: resolved,
      };

    } catch (error) {
      logger.error('Auto-resolution failed', { error });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        applied_strategy: 'auto' as ConflictResolutionStrategy,
        conflicts_resolved: 0,
      };
    }
  }

  /**
   * Utility: Check if two values are equal
   */
  private valuesEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    
    // Handle null/undefined
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;
    
    // Handle arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((val, index) => this.valuesEqual(val, b[index]));
    }
    
    // Handle objects
    if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
      const objA = a as Record<string, unknown>;
      const objB = b as Record<string, unknown>;
      const keysA = Object.keys(objA);
      const keysB = Object.keys(objB);

      if (keysA.length !== keysB.length) return false;

      return keysA.every(key =>
        keysB.includes(key) && this.valuesEqual(objA[key], objB[key])
      );
    }
    
    return false;
  }

  /**
   * Utility: Extract timestamp from data
   */
  private extractTimestamp(data: Record<string, unknown>, field: string): number | undefined {
    // Look for field-specific timestamp
    const fieldTimestamp = data[`${field}_updated_at`] || data[`${field}_timestamp`];
    if (fieldTimestamp) {
      return new Date(fieldTimestamp as string | number).getTime();
    }

    // Fallback to general timestamp
    const generalTimestamp = data.updated_at || data.created_at;
    if (generalTimestamp) {
      return new Date(generalTimestamp as string | number).getTime();
    }

    return undefined;
  }

  /**
   * Utility: Get data type
   */
  private getDataType(value: unknown): ConflictField['data_type'] {
    if (value === null || value === undefined) return 'string';
    if (typeof value === 'string') {
      // Check if it looks like a date
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        return 'date';
      }
      return 'string';
    }
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'string';
  }
}

// Singleton instance
export const conflictResolver = new ConflictResolver();

// Convenience exports
export const analyzeConflict = (conflictId: string) =>
  conflictResolver.analyzeConflict(conflictId);

export const resolveConflictById = (
  conflictId: string,
  strategy: ConflictResolutionStrategy,
  manualData?: Record<string, unknown>
) => conflictResolver.resolveConflict(conflictId, strategy, manualData);

export const resolveBatchConflicts = (
  resolutions: Array<{
    conflictId: string;
    strategy: ConflictResolutionStrategy;
    manualData?: Record<string, unknown>;
  }>
) => conflictResolver.resolveBatchConflicts(resolutions);

export const autoResolveConflicts = () =>
  conflictResolver.autoResolveConflicts();
