/**
 * Advanced Sync API Route
 * Handles server-side synchronization for offline data
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AuthenticationError, ValidationError } from '@/lib/api/errors';
import { errorResponse } from '@/lib/api/response';

export interface SyncRequest {
  operations: SyncOperation[];
  client_timestamp: number;
  conflict_resolution?: 'local_wins' | 'server_wins' | 'merge';
}

export interface SyncOperation {
  id: string;
  table: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  data: Record<string, unknown>;
  client_timestamp: number;
  retry_count?: number;
}

export interface SyncResponse {
  success: boolean;
  results: SyncResult[];
  conflicts: ConflictData[];
  server_timestamp: number;
  error?: string;
}

export interface SyncResult {
  operation_id: string;
  success: boolean;
  server_data?: Record<string, unknown>;
  error?: string;
  conflict?: boolean;
}

export interface ConflictData {
  operation_id: string;
  table: string;
  local_data: Record<string, unknown>;
  server_data: Record<string, unknown>;
  local_timestamp: number;
  server_timestamp: number;
}

/**
 * POST /api/sync - Synchronize offline operations
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw AuthenticationError('Unauthorized');
    }

    // Parse request body
    const body: SyncRequest = await request.json();
    const { operations, client_timestamp, conflict_resolution = 'merge' } = body;

    // Validate request
    if (!operations || !Array.isArray(operations)) {
      throw ValidationError('Invalid request: operations array required');
    }

    logger.info('Sync request received', {
      userId: user.id,
      operationCount: operations.length,
      clientTimestamp: client_timestamp
    });

    const results: SyncResult[] = [];
    const conflicts: ConflictData[] = [];
    const serverTimestamp = Date.now();

    // Process each operation
    for (const operation of operations) {
      try {
        const result = await processOperation(
          supabase, 
          user.id, 
          operation, 
          conflict_resolution
        );
        
        results.push(result);
        
        // If there's a conflict, add to conflicts array
        if (result.conflict && operation.operation === 'UPDATE') {
          conflicts.push({
            operation_id: operation.id,
            table: operation.table,
            local_data: operation.data,
            server_data: result.server_data ?? {},
            local_timestamp: operation.client_timestamp,
            server_timestamp: serverTimestamp,
          });
        }
        
      } catch (error) {
        logger.error('Operation failed', {
          operationId: operation.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        results.push({
          operation_id: operation.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    logger.info('Sync completed', {
      userId: user.id,
      success: successCount,
      failed: failureCount,
      conflicts: conflicts.length
    });

    const response: SyncResponse = {
      success: failureCount === 0,
      results,
      conflicts,
      server_timestamp: serverTimestamp,
    };

    return NextResponse.json(response);

  } catch (error) {
    logger.error('Sync request failed', { error });
    return errorResponse(error as Error);
  }
}

/**
 * Process a single sync operation
 */
async function processOperation(
  supabase: SupabaseClient,
  userId: string,
  operation: SyncOperation,
  conflictResolution: string
): Promise<SyncResult> {
  const { id, table, operation: op, data, client_timestamp } = operation;

  // Validate table name (security)
  const allowedTables = [
    'contacts', 'projects', 'activities', 'notes', 'photos', 
    'estimates', 'documents', 'tasks', 'appointments'
  ];
  
  if (!allowedTables.includes(table)) {
    throw new Error(`Table '${table}' is not allowed for sync operations`);
  }

  // Add user context to data
  const dataWithUser = {
    ...data,
    tenant_id: userId, // Ensure data belongs to the user
  };

  switch (op) {
    case 'CREATE':
      return await handleCreate(supabase, table, dataWithUser, id);
      
    case 'UPDATE':
      return await handleUpdate(
        supabase, 
        table, 
        dataWithUser, 
        client_timestamp,
        conflictResolution,
        id
      );
      
    case 'DELETE':
      return await handleDelete(supabase, table, data.id as string, userId, id);
      
    default:
      throw new Error(`Unknown operation: ${op}`);
  }
}

/**
 * Handle CREATE operation
 */
async function handleCreate(
  supabase: SupabaseClient,
  table: string,
  data: Record<string, unknown>,
  operationId: string
): Promise<SyncResult> {
  // Remove client-generated ID if present and generate server ID
  const { id: _clientId, ...dataWithoutId } = data;
  
  const { data: result, error } = await supabase
    .from(table)
    .insert({
      ...dataWithoutId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Create failed: ${error.message}`);
  }

  return {
    operation_id: operationId,
    success: true,
    server_data: result,
  };
}

/**
 * Handle UPDATE operation
 */
async function handleUpdate(
  supabase: SupabaseClient,
  table: string,
  data: Record<string, unknown>,
  clientTimestamp: number,
  conflictResolution: string,
  operationId: string
): Promise<SyncResult> {
  const recordId = data.id;
  
  if (!recordId) {
    throw new Error('Record ID is required for update operations');
  }

  // First, get the current server version
  const { data: serverRecord, error: fetchError } = await supabase
    .from(table)
    .select('*')
    .eq('id', recordId)
    .eq('tenant_id', data.tenant_id)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      throw new Error('Record not found');
    }
    throw new Error(`Fetch failed: ${fetchError.message}`);
  }

  // Check for conflicts
  const serverTimestamp = new Date(serverRecord.updated_at).getTime();
  const hasConflict = serverTimestamp > clientTimestamp;

  if (hasConflict) {
    // Handle conflict based on resolution strategy
    switch (conflictResolution) {
      case 'local_wins':
        // Continue with update using local data
        break;
        
      case 'server_wins':
        // Return server data without updating
        return {
          operation_id: operationId,
          success: true,
          server_data: serverRecord,
          conflict: true,
        };
        
      case 'merge':
        // Perform field-level merge
        data = performMerge(data, serverRecord);
        break;
    }
  }

  // Perform the update
  const { data: result, error } = await supabase
    .from(table)
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', recordId)
    .eq('tenant_id', data.tenant_id)
    .select()
    .single();

  if (error) {
    throw new Error(`Update failed: ${error.message}`);
  }

  return {
    operation_id: operationId,
    success: true,
    server_data: result,
    conflict: hasConflict,
  };
}

/**
 * Handle DELETE operation
 */
async function handleDelete(
  supabase: SupabaseClient,
  table: string,
  recordId: string,
  userId: string,
  operationId: string
): Promise<SyncResult> {
  if (!recordId) {
    throw new Error('Record ID is required for delete operations');
  }

  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', recordId)
    .eq('tenant_id', userId);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }

  return {
    operation_id: operationId,
    success: true,
  };
}

/**
 * Perform field-level merge of local and server data
 */
function performMerge(localData: Record<string, unknown>, serverData: Record<string, unknown>): Record<string, unknown> {
  const merged = { ...serverData };
  
  // Field priority rules for merging
  const highPriorityFields = [
    'first_name', 'last_name', 'phone', 'email', 'address',
    'notes', 'description', 'status'
  ];
  
  const systemFields = [
    'id', 'created_at', 'tenant_id'
  ];

  // Merge fields based on priority
  Object.keys(localData).forEach(field => {
    if (systemFields.includes(field)) {
      // Keep server values for system fields
      return;
    }
    
    if (highPriorityFields.includes(field)) {
      // Prefer local values for high-priority fields
      merged[field] = localData[field];
    } else {
      // For other fields, use local if it's more recent or not empty
      const localValue = localData[field];
      const serverValue = serverData[field];
      
      if (localValue && (!serverValue || localValue !== serverValue)) {
        merged[field] = localValue;
      }
    }
  });

  return merged;
}

/**
 * GET /api/sync - Get sync metadata and status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw AuthenticationError('Unauthorized');
    }

    const { searchParams } = new URL(request.url);
    const tables = searchParams.get('tables')?.split(',') || [];
    const since = searchParams.get('since'); // ISO timestamp

    const syncMetadata: {
      server_timestamp: number;
      tables: Record<string, { total_records: number; last_updated: string | null; records: { id: unknown; updated_at: unknown }[] }>;
    } = {
      server_timestamp: Date.now(),
      tables: {},
    };

    // Get metadata for each requested table
    for (const table of tables) {
      if (!['contacts', 'projects', 'activities', 'notes'].includes(table)) {
        continue;
      }

      try {
        let query = supabase
          .from(table)
          .select('id, updated_at')
          .eq('tenant_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1000);

        if (since) {
          query = query.gte('updated_at', since);
        }

        const { data: records, error } = await query;

        if (error) {
          logger.error(`Failed to fetch ${table} metadata`, { error });
          continue;
        }

        syncMetadata.tables[table] = {
          total_records: records?.length || 0,
          last_updated: records?.[0]?.updated_at || null,
          records: records?.map(r => ({
            id: r.id,
            updated_at: r.updated_at
          })) || []
        };

      } catch (error) {
        logger.error(`Error processing ${table}`, { error });
      }
    }

    return NextResponse.json(syncMetadata);

  } catch (error) {
    logger.error('Sync metadata request failed', { error });
    return errorResponse(error as Error);
  }
}
