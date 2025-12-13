/**
 * ARIA - AI Roofing Intelligent Assistant
 *
 * Central orchestration layer that unifies:
 * - Voice AI (OpenAI, ElevenLabs, Gemini)
 * - CRM (contacts, projects, activities)
 * - QuickBooks (invoices, payments)
 * - Communications (SMS, email)
 * - Calendar (appointments)
 * - Knowledge Base (roofing expertise)
 */

// Types
export type {
  ARIAContext,
  ARIAFunction,
  ARIAFunctionCategory,
  ARIAFunctionRegistry,
  ARIARiskLevel,
  ARIAExecutionResult,
  ARIAOrchestrator,
  ARIAConversation,
  CallbackRequest,
  VoicemailMessage,
  KnowledgeEntry,
  KnowledgeSearchResult,
} from './types'

// Function Registry (with all registered functions)
export { ariaFunctionRegistry } from './functions'

// Context Builder
export {
  buildARIAContext,
  findContactByPhone,
  getContextSummary,
} from './context-builder'

// Orchestrator
export {
  ariaOrchestrator,
  executeARIAFunction,
  getARIASystemPrompt,
  initializeARIA,
} from './orchestrator'
