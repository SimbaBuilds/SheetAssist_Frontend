import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { User } from '@supabase/supabase-js'
import { useState, useEffect } from 'react'

export function useAuth() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      router.push('/dashboard')
    } catch (error) {
      throw error
    }
  }

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
    login,
    logout,
    signInWithGoogle,
    requestPasswordReset,
    updatePassword,
  }
}
