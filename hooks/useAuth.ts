import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { useContext } from 'react'
import { AuthContext } from '@/providers/AuthProvider'



export function useAuth() {
  const context = useContext(AuthContext)
  const router = useRouter()
  const supabase = createClientComponentClient()

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  const { user, isLoading, error } = context

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
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            scope: 'openid email profile'
          }
        }
      })

      if (error) throw error
      if (data.url) window.location.href = data.url
    } catch (error) {
      console.error('Google sign in error:', error)
      throw error
    }
  }


  return {
    user,
    isLoading,
    error,
    login,
    logout,
    signInWithGoogle,
    requestPasswordReset,
    updatePassword,
  }
}
