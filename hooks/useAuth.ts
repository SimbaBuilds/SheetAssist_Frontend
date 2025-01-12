import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { useState, useEffect } from 'react'
import { PUBLIC_PATHS } from '@/middleware'

export function useAuth() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get initial user
    const initAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) {
        // Check if current path is not in PUBLIC_PATHS before redirecting
        const currentPath = window.location.pathname
        const isPublicPath = PUBLIC_PATHS.includes(currentPath as any)
        if (!isPublicPath) {
          router.push('/auth/login')
        }
      }
    })

    return () => subscription.unsubscribe()
  }, []) // Remove router from dependencies

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      router.push('/auth/login')
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }

  const requestPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) throw error
  }

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })
    if (error) throw error
  }

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      })
      
      if (error) throw error
      
      if (data?.url) {
        window.location.href = data.url
      }
      
    } catch (error) {
      console.error('Google sign in error:', error)
      throw error
    }
  }

  return {
    user,
    isLoading,
    logout,
    signInWithGoogle,
    requestPasswordReset,
    updatePassword,
  }
}
