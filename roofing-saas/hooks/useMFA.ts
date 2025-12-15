'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface MFAFactor {
  id: string
  type: 'totp'
  status: 'verified' | 'unverified'
  friendlyName?: string
  createdAt: string
  updatedAt: string
}

export interface MFAStatus {
  enabled: boolean
  factors: MFAFactor[]
  assuranceLevel?: 'aal1' | 'aal2'
  requiresMFA?: boolean
}

export interface MFAEnforcementStatus {
  isEnforced: boolean
  isCompliant: boolean
  role: string | null
  message?: string
}

export function useMFA() {
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null)
  const [enforcement, setEnforcement] = useState<MFAEnforcementStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const loadMFAStatus = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Get MFA status from our API
      const response = await fetch('/api/auth/mfa/status')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load MFA status')
      }

      setMfaStatus(data.mfa)

      // Get enforcement status
      const enforcementResponse = await fetch('/api/auth/mfa/enforcement')
      if (enforcementResponse.ok) {
        const enforcementData = await enforcementResponse.json()
        setEnforcement(enforcementData)
      }

    } catch (err) {
      console.error('Error loading MFA status:', err)
      setError(err instanceof Error ? err.message : 'Failed to load MFA status')
    } finally {
      setLoading(false)
    }
  }, [])

  const enrollMFA = async (friendlyName?: string) => {
    try {
      const response = await fetch('/api/auth/mfa/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ friendlyName }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to enroll MFA')
      }

      return data
    } catch (err) {
      console.error('Error enrolling MFA:', err)
      throw err
    }
  }

  const verifyMFA = async (factorId: string, challengeId: string, code: string) => {
    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ factorId, challengeId, code }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed')
      }

      // Reload status after verification
      await loadMFAStatus()

      return data
    } catch (err) {
      console.error('Error verifying MFA:', err)
      throw err
    }
  }

  const disableMFA = async (factorId: string) => {
    try {
      const response = await fetch('/api/auth/mfa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ factorId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disable MFA')
      }

      // Reload status after disabling
      await loadMFAStatus()

      return data
    } catch (err) {
      console.error('Error disabling MFA:', err)
      throw err
    }
  }

  const createChallenge = async (factorId: string) => {
    try {
      const response = await fetch('/api/auth/mfa/challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ factorId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create challenge')
      }

      return data
    } catch (err) {
      console.error('Error creating challenge:', err)
      throw err
    }
  }

  useEffect(() => {
    loadMFAStatus()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadMFAStatus()
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [loadMFAStatus, supabase.auth])

  return {
    mfaStatus,
    enforcement,
    loading,
    error,
    enrollMFA,
    verifyMFA,
    disableMFA,
    createChallenge,
    reload: loadMFAStatus,
    isEnabled: mfaStatus?.enabled || false,
    isRequired: enforcement?.isEnforced || false,
    isCompliant: enforcement?.isCompliant || true,
    factors: mfaStatus?.factors || [],
  }
}