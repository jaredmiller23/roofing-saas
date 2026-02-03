import { redirect } from 'next/navigation'

/**
 * Field Call Page — redirects to Voice Call page where call functionality lives.
 */
export default function FieldCallPage() {
  redirect('/voice/call')
}
