import { redirect } from 'next/navigation'

/**
 * Financials page — redirects to Financial Reports
 *
 * The executive P&L summary has been consolidated into the
 * Financial Reports page at /financial/reports, which provides
 * the same data plus trends and detailed analysis.
 */
export default function FinancialsPage() {
  redirect('/financial/reports')
}
