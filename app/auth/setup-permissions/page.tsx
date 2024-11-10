'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { GoogleIcon, MicrosoftIcon } from '@/components/icons'
import { getGoogleOAuthURL } from '@/hooks/google-oauth'
import { getMicrosoftOAuthURL } from '@/hooks/microsoft-oauth'

export default function SetupPermissionsPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
      }
      setIsLoading(false)
    }

    checkSession()
  }, [])

  const handleGoogleSetup = () => {
    const googleAuthUrl = getGoogleOAuthURL(true)
    window.location.href = googleAuthUrl
  }

  const handleMicrosoftSetup = () => {
    const microsoftAuthUrl = getMicrosoftOAuthURL()
    window.location.href = microsoftAuthUrl
  }

  const handleSkip = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('No session')

      const { error } = await supabase
        .from('user_profile')
        .update({ 
          permissions_setup_completed: true,
          email_verified: true 
        })
        .eq('id', session.user.id)

      if (error) throw error
      router.push('/dashboard')
    } catch (error) {
      console.error('Error skipping permissions:', error)
    }
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="bg-background rounded-lg shadow-lg p-6 space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Set Up Permissions</h1>
          <p className="text-muted-foreground">
            Choose how you'd like to connect your documents
          </p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleGoogleSetup}
            variant="outline"
            className="w-full flex items-center gap-2"
          >
            <GoogleIcon />
            Set up Google Integration
          </Button>

          <Button
            onClick={handleMicrosoftSetup}
            variant="outline"
            className="w-full flex items-center gap-2"
          >
            <MicrosoftIcon />
            Set up Microsoft Integration
          </Button>

          <Button
            onClick={handleSkip}
            variant="ghost"
            className="w-full"
          >
            Skip for now
          </Button>
        </div>
      </div>
    </div>
  )
} 