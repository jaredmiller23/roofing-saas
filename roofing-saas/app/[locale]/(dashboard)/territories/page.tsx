import { redirect } from 'next/navigation'

/**
 * Territories page - Redirects to unified Field Activity page
 *
 * The Territories functionality has been moved to the Field Activity page
 * at /knocks for better organization and user experience.
 */
export default function TerritoriesPage() {
  redirect('/knocks')
}