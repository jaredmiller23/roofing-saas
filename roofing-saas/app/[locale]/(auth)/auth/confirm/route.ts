import { createClient } from '@/lib/supabase/server'
import { type EmailOtpType } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, pathname } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  // Extract locale from pathname (e.g., /en/auth/confirm -> en)
  const locale = pathname.split('/')[1] || 'en'

  if (token_hash && type) {
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      // Session established - redirect to password update
      redirect(`/${locale}/auth/update-password`)
    } else {
      console.error('verifyOtp error:', error.message)
      redirect(`/${locale}/login?error=${encodeURIComponent(error.message)}`)
    }
  }

  redirect(`/${locale}/login?error=Invalid+reset+link`)
}
