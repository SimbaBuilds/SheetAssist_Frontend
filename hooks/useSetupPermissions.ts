import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import type { PermissionSetupOptions } from '@/types/auth'

export const DOCUMENT_SCOPES = {
    google: [

      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/spreadsheets.readonly'
    ].join(' '),
    microsoft: [
      'offline_access',
      'Files.Read',
      'Files.ReadWrite.Selected',
      'User.Read',
    ].join(' ')
  } as const

export function useSetupPermissions() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isReauth, setIsReauth] = useState(false)
  const [provider, setProvider] = useState<'google' | 'microsoft' | null>(null)

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const reauth = searchParams.get('reauth') === 'true'
        const providerParam = searchParams.get('provider') as 'google' | 'microsoft' | null
        
        setIsReauth(reauth)
        setProvider(providerParam)

        console.log('Checking session...')
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session) {
          console.log('No session found or session error, redirecting to login')
          router.push('/auth/login')
          return
        }

        console.log('Attempting to retrieve user...')
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError) {
          console.error('User retrieval error:', userError)
          router.push('/auth/verify-email')
          return
        }

        console.log('User retrieved successfully:', user)
        setIsLoading(false)

        // Auto-trigger reauth if provider is specified
        if (reauth && providerParam) {
          if (providerParam === 'google') {
            handleGoogleSetup()
          } else if (providerParam === 'microsoft') {
            handleMicrosoftSetup()
          }
        }
      } catch (error) {
        console.error('Error in checkAccess:', error)
        setError('Unable to verify access. Please try again.')
        setIsLoading(false)
      }
    }

    checkAccess()
  }, [router, searchParams])

  const handleGoogleSetup = async () => {
    try {
      await setupPermissions({
        provider: 'google',
        onError: (error) => setError(error.message)
      })
    } catch (error) {
      console.error('Error setting up Google permissions:', error)
      setError('Failed to setup Google permissions')
    }
  }

  const handleMicrosoftSetup = async () => {
    try {
      await setupPermissions({
        provider: 'microsoft',
        onError: (error) => setError(error.message)
      })
    } catch (error) {
      console.error('Error setting up Microsoft permissions:', error)
      setError('Failed to setup Microsoft permissions')
    }
  }

  const setupPermissions = async ({ provider, onError }: PermissionSetupOptions) => {
    try {
      const baseParams = {
        client_id: provider === 'google' 
          ? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!
          : process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID!,
        response_type: 'code',
        scope: DOCUMENT_SCOPES[provider],
        state: provider,
      }

      // Microsoft-specific params
      const microsoftParams = {
        ...baseParams,
        response_mode: 'query',
        redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/microsoft-permissions-callback`,
        tenant: 'common',
        prompt: 'consent',
        access_type: 'offline'
      }

      // Google-specific params 
      const googleParams = {
        ...baseParams,
        access_type: 'offline',
        redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/google-permissions-callback`,
        prompt: 'consent'
      }

      const params = new URLSearchParams(
        provider === 'google' ? googleParams : microsoftParams
      )

      const authUrl = provider === 'google'
        ? `https://accounts.google.com/o/oauth2/v2/auth?${params}`
        // : `https://login.live.com/oauth20_authorize.srf?${params}`
        : `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`

      window.location.href = authUrl
    } catch (error) {
      console.error(`${provider} auth error:`, error)
      onError?.(error instanceof Error ? error : new Error(`${provider} permissions setup failed`))
    }
  }

  const handleSkip = async () => {
    try {
      if (error) throw error
      router.push('/dashboard')
    } catch (error) {
      console.error('Error skipping permissions:', error)
      setError('Failed to skip permissions setup')
    }
  }

  return {
    isLoading,
    error,
    isReauth,
    provider,
    handleGoogleSetup,
    handleMicrosoftSetup,
    handleSkip,
  }
} 