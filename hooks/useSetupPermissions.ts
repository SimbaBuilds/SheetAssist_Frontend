import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export function useSetupPermissions() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { setupPermissions } = useAuth()

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
    handleSkip
  }
} 