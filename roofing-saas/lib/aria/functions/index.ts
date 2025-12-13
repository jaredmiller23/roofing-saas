/**
 * ARIA Function Modules
 * Import all function modules to register them with the registry
 */

// CRM functions are registered in function-registry.ts directly

// Action functions (SMS, email, tasks, callbacks)
import './actions'

// QuickBooks functions
import './quickbooks'

// Knowledge functions (search_knowledge, ask_roofing_question)
import './knowledge'

// Re-export the registry
export { ariaFunctionRegistry } from '../function-registry'
