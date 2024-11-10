import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import type { PermissionSetupOptions } from '@/types/auth'

export const DOCUMENT_SCOPES = {
    google: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
      
    ].join(' '),
    microsoft: [
      'Files.ReadWrite.All',
      'Sites.ReadWrite.All'
    ].join(' ')
  } as const

export function useSetupPermissions() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAccess = async () => {
      try {
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
      } catch (error) {
        console.error('Error in checkAccess:', error)
        setError('Unable to verify access. Please try again.')
        setIsLoading(false)
      }
    }

    checkAccess()
  }, [router])

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
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider === 'microsoft' ? 'google' : provider,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/permissions-callback?provider=${provider}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            scope: DOCUMENT_SCOPES[provider],
          },
        },
      })

      if (error) throw error
      
      if (data?.url) {
        window.location.href = data.url
        return
      }
      
      throw new Error('No authentication URL returned')
    } catch (error) {
      console.error(`${provider} auth error:`, error)
      onError?.(error instanceof Error ? error : new Error(`${provider} auth failed`))
    }
  }

  const handleSkip = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('No session')

      const { error } = await supabase
        .from('user_profile')
        .update({ 
          permissions_setup_completed: true,
        })
        .eq('id', session.user.id)

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
    handleGoogleSetup,
    handleMicrosoftSetup,
    handleSkip,
  }
} 