import { redirect } from 'next/navigation'

/**
 * Field Me Page — redirects to Settings where profile management lives.
 */
export default function FieldMePage() {
  redirect('/settings')
}
