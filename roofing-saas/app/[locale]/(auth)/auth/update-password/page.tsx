'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams, useSearchParams } from 'next/navigation'

function UpdatePasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const locale = params.locale as string
  const supabase = createClient()

  // Handle PKCE code exchange when page loads
  useEffect(() => {
    async function handleAuthCallback() {
      const code = searchParams.get('code')

      if (code) {
        // Exchange the code for a session (PKCE flow)
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setError('Invalid or expired reset link. Please request a new password reset.')
          setInitializing(false)
          return
        }
        setSessionReady(true)
        setInitializing(false)
      } else {
        // Check if we already have a session (maybe from hash fragments in implicit flow)
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setSessionReady(true)
        } else {
          setError('No valid session found. Please request a new password reset.')
        }
        setInitializing(false)
      }
    }

    handleAuthCallback()
  }, [searchParams, supabase.auth])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }

      // Success - redirect to login
      router.push(`/${locale}/login?message=Password updated successfully`)
    } catch {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  // Show loading state while initializing
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Verifying your reset link...</p>
        </div>
      </div>
    )
  }

  // Show error if session isn't ready and we have an error
  if (!sessionReady && error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="rounded-md bg-red-500/10 p-4">
            <div className="text-sm text-red-400">{error}</div>
          </div>
          <div className="text-center">
            <a
              href={`/${locale}/reset-password`}
              className="text-primary hover:text-primary/80 text-sm font-medium"
            >
              Request new password reset
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-foreground">
            Set new password
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Enter your new password below.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleUpdatePassword}>
          {error && (
            <div className="rounded-md bg-red-500/10 p-4">
              <div className="text-sm text-red-400">{error}</div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-muted-foreground">
                New Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-border placeholder-muted-foreground text-foreground rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-card"
                placeholder="Minimum 8 characters"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-muted-foreground">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-border placeholder-muted-foreground text-foreground rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-card"
                placeholder="Re-enter password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Loading fallback for Suspense
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

// Wrap in Suspense to handle useSearchParams
export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <UpdatePasswordForm />
    </Suspense>
  )
}
