'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getAppBaseUrl } from '@/lib/utils'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getAppBaseUrl()}/auth/update-password`,
      })

      if (resetError) {
        setError(resetError.message)
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)
    } catch {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="rounded-md bg-green-500/10 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Password reset email sent!
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>
                    Please check your email for a link to reset your password. The link will expire in 1 hour.
                  </p>
                  <p className="mt-2">
                    <Link href="/login" className="font-medium underline">
                      Return to sign in
                    </Link>
                  </p>
                </div>
              </div>
            </div>
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
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
          {error && (
            <div className="rounded-md bg-red-500/10 p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-muted-foreground">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-border placeholder-muted-foreground text-foreground rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-card"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </div>

          <div className="text-center">
            <Link href="/login" className="text-sm font-medium text-primary hover:text-primary/80">
              Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
