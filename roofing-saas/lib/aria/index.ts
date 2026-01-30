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
  SupportedLanguage,
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

// Language Service (Phase 11)
export {
  detectLanguage,
  translateResponse,
  updateContactLanguage,
  resolveLanguage,
} from './language'

// Notification Utilities
export {
  notifyContact,
  notifyTeamMember,
} from './notify'
