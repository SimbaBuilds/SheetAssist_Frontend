"use client"

import { useEffect } from 'react'
import { useAuth } from '@/hooks/auth'
import { useRouter } from 'next/navigation'

export default function MicrosoftAuthPage() {
  const { initiateMicrosoftAuth } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const handleMicrosoftAuth = async () => {
      try {
        const authUrl = await initiateMicrosoftAuth()
        if (authUrl) {
          // Clear the pending flag before redirecting
          localStorage.removeItem('pendingMicrosoftAuth')
          window.location.href = authUrl
        } else {
          throw new Error('Failed to initiate Microsoft authentication')
        }
      } catch (error) {
        console.error('Error during Microsoft auth:', error)
        router.push('/dashboard')
      }
    }

    handleMicrosoftAuth()
  }, [initiateMicrosoftAuth, router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Setting up Microsoft permissions...</h1>
        <p className="text-gray-600">Please wait while we complete the setup.</p>
      </div>
    </div>
  )
} 