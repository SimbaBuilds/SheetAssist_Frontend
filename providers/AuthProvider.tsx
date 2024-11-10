'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { User } from '@supabase/supabase-js'
import { LoadingSpinner } from '@/components/pages/signup/LoadingSpinner'
import type { AuthContextType, PermissionsStatus } from '@/types/auth'

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  error: null,
  permissionsStatus: null
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [permissionsStatus, setPermissionsStatus] = useState<PermissionsStatus | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchPermissionsStatus = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('user_profile')
          .select('google_permissions_set, microsoft_permissions_set, permissions_setup_completed')
          .eq('id', userId)
          .single()

        if (error) throw error

        if (data) {
          setPermissionsStatus({
            googlePermissionsSet: data.google_permissions_set,
            microsoftPermissionsSet: data.microsoft_permissions_set,
            permissionsSetupCompleted: data.permissions_setup_completed
          })
        }
      } catch (error) {
        console.error('Error fetching permissions:', error)
        setError(error as Error)
      }
    }

    const initializeAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) throw sessionError

        if (session?.user) {
          setUser(session.user)
          await fetchPermissionsStatus(session.user.id)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        setError(error as Error)
        setUser(null)
        setPermissionsStatus(null)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchPermissionsStatus(session.user.id)
      } else {
        setPermissionsStatus(null)
      }
    })

    const refreshInterval = setInterval(async () => {
      const { error } = await supabase.auth.getSession()
      if (error) {
        console.error('Error refreshing session:', error)
      }
    }, 10 * 60 * 1000)

    return () => {
      subscription.unsubscribe()
      clearInterval(refreshInterval)
    }
  }, [supabase])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, error, permissionsStatus }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
