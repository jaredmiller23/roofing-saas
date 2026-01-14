/**
 * ARIA - AI Roofing Intelligent Assistant
 * Core type definitions
 */

import type { VoiceFunction, FunctionCallParameters, FunctionCallResult } from '@/lib/voice/providers/types'
import type { SupabaseClient } from '@supabase/supabase-js'

// =============================================================================
// ARIA Function Categories
// =============================================================================

export type ARIAFunctionCategory =
  | 'crm'           // Contact/project lookups, notes
  | 'quickbooks'    // Financial queries
  | 'actions'       // SMS, email, tasks
  | 'calendar'      // Appointments, scheduling
  | 'intelligence'  // Customer insights, predictions
  | 'knowledge'     // Roofing KB, Perplexity
  | 'weather'       // Job safety
  | 'reporting'     // Sales reports, analytics
  | 'financial'     // AR, invoices, payment tracking
  | 'documents'     // Estimates, reports, summaries
  | 'workflows'     // Automation orchestration
  | 'vision'        // Photo analysis, damage detection
  | 'insurance'     // Claims intelligence, adjusters, carriers
  | 'analytics'     // Business intelligence, coaching, performance
  | 'team'          // Crew management, dispatch, performance

export type ARIARiskLevel = 'low' | 'medium' | 'high'

// =============================================================================
// ARIA Context
// =============================================================================

export interface ARIAContext {
  tenantId: string
  userId: string
  supabase: SupabaseClient

  // Current page/entity context
  page?: string
  entityType?: 'contact' | 'project' | 'territory' | 'knock'
  entityId?: string
  entityData?: Record<string, unknown>

  // Enriched data (populated by context builder)
  contact?: {
    id: string
    first_name: string
    last_name: string
    phone?: string
    email?: string
    address_street?: string
    address_city?: string
    address_state?: string
    address_zip?: string
    stage?: string
    dnc_status?: string
  }
  project?: {
    id: string
    name: string
    status?: string
    pipeline_stage?: string
    estimated_value?: number
    insurance_carrier?: string
  }
  qbCustomer?: {
    Id: string
    DisplayName: string
    Balance?: number
  }

  // Channel info
  channel: 'chat' | 'voice_inbound' | 'voice_outbound' | 'sms'
  sessionId?: string
  callSid?: string

  // Girl Friday Enrichment (Phase 1 - Omniscience)
  recentActivities?: ARIAActivity[]
  upcomingTasks?: ARIATask[]
  messageThread?: ARIAMessage[]

  // Authorization
  requiresConfirmation?: boolean
}

// =============================================================================
// Girl Friday Context Types (Phase 1)
// =============================================================================

export interface ARIAActivity {
  id: string
  type: 'call' | 'sms' | 'email' | 'note' | 'task' | 'status_change' | 'other'
  subject?: string
  content?: string
  direction?: 'inbound' | 'outbound'
  created_at: string
  metadata?: Record<string, unknown>
}

export interface ARIATask {
  id: string
  title: string
  description?: string
  due_date?: string
  priority?: 'low' | 'medium' | 'high'
  type?: 'task' | 'callback'
  status: 'pending' | 'completed' | 'cancelled'
}

export interface ARIAMessage {
  id: string
  direction: 'inbound' | 'outbound'
  body: string
  sent_at: string
  status?: string
}

// =============================================================================
// ARIA Function Registration
// =============================================================================

export interface ARIAFunction {
  name: string
  category: ARIAFunctionCategory
  description: string

  // Voice provider function definition
  voiceDefinition: VoiceFunction

  // Execution
  execute: (args: FunctionCallParameters, context: ARIAContext) => Promise<FunctionCallResult>

  // Authorization
  riskLevel: ARIARiskLevel
  requiresConfirmation?: boolean

  // Metadata
  enabledByDefault?: boolean
  requiredIntegrations?: ('quickbooks' | 'calendar' | 'perplexity')[]
}

export interface ARIAFunctionRegistry {
  functions: Map<string, ARIAFunction>

  register(fn: ARIAFunction): void
  get(name: string): ARIAFunction | undefined
  getByCategory(category: ARIAFunctionCategory): ARIAFunction[]
  getVoiceFunctions(): VoiceFunction[]
  getEnabledFunctions(integrations: string[]): ARIAFunction[]
}

// =============================================================================
// ARIA Orchestrator
// =============================================================================

export interface ARIAExecutionResult {
  success: boolean
  data?: unknown
  error?: string
  message?: string

  // For multi-step actions
  requiresFollowUp?: boolean
  followUpAction?: string

  // For confirmations
  awaitingConfirmation?: boolean
  confirmationPrompt?: string

  // Human-in-the-Loop (HITL) - Draft content awaiting approval
  awaitingApproval?: boolean
  draft?: {
    type: 'sms' | 'email' | 'other'
    recipient?: string
    subject?: string
    body: string
    metadata?: Record<string, unknown>
  }
}

export interface ARIAOrchestrator {
  executeFunction(
    name: string,
    args: FunctionCallParameters,
    context: ARIAContext
  ): Promise<ARIAExecutionResult>

  enrichContext(baseContext: Partial<ARIAContext>): Promise<ARIAContext>

  getSystemPrompt(context: ARIAContext): string
}

// =============================================================================
// ARIA Conversation
// =============================================================================

export interface ARIAConversation {
  id: string
  tenantId: string
  userId?: string
  contactId?: string
  channel: ARIAContext['channel']
  sessionId?: string
  summary?: string
  context: Record<string, unknown>
  createdAt: Date
  endedAt?: Date
}

// =============================================================================
// ARIA Callback & Voicemail
// =============================================================================

export interface CallbackRequest {
  id: string
  tenantId: string
  contactId?: string
  callSid?: string
  phone: string
  requestedTime?: Date
  scheduledTime?: Date
  completedAt?: Date
  reason?: string
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled'
  createdAt: Date
}

export interface VoicemailMessage {
  id: string
  tenantId: string
  contactId?: string
  callSid?: string
  recordingUrl?: string
  transcription?: string
  status: 'pending' | 'transcribed' | 'reviewed'
  urgency: 'normal' | 'urgent'
  createdAt: Date
}

// =============================================================================
// ARIA Knowledge Base
// =============================================================================

export interface KnowledgeEntry {
  id: string
  category: string
  question: string
  answer: string
  keywords: string[]
  source: 'local' | 'perplexity'
  createdAt: Date
  lastUsed?: Date
  useCount: number
}

export interface KnowledgeSearchResult {
  entry?: KnowledgeEntry
  source: 'local' | 'perplexity' | 'not_found'
  confidence: number
  answer: string
}
