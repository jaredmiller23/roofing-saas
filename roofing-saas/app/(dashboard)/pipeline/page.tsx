import { redirect } from 'next/navigation'

/**
 * Pipeline page - Redirects to unified Projects & Pipeline page
 *
 * The Pipeline functionality has been merged with Projects into a single
 * unified page at /projects with entity and view mode toggles
 */
export default function PipelinePage() {
  redirect('/projects')
}
