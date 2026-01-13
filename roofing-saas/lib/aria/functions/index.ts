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

// Calendar functions (check_availability, book_appointment_v2, get_schedule, reschedule, cancel)
import './calendar'

// Intelligence functions (customer history, sentiment, value, predictions, similar customers)
import './intelligence'

// Financial functions (AR summary, overdue invoices, payment history, reminders, morning briefing)
import './financial'

// Document generation (estimates, inspection reports, claim summaries, project summaries)
import './documents'

// Workflow orchestration (start, list, check status, pause, stats)
import './workflows'

// Vision/Photo intelligence (analyze photos, detect damage, compare before/after, estimates)
import './vision'

// Weather/Storm intelligence (forecasts, storm impact, alerts, storm mode)
import './weather'

// Insurance/Claims intelligence (claim status, adjusters, carriers, patterns)
import './insurance'

// Re-export the registry
export { ariaFunctionRegistry } from '../function-registry'
