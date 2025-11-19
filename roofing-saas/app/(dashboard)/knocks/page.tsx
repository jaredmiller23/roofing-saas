import { redirect } from 'next/navigation'

/**
 * Knocks page - Redirects to unified Territories & Activity page
 *
 * The Knocks functionality has been merged with Territories into a single
 * unified "Field Activity" page at /territories
 */
export default function KnocksPage() {
  redirect('/territories')
}
