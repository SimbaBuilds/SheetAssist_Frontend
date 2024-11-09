import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { useContext } from 'react'
import { AuthContext } from '@/providers/AuthProvider'
import type { PermissionSetupOptions } from '@/types/auth'

const SCOPES = {
  google: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/drive'
  ].join(' '),
  microsoft: [
    'Files.ReadWrite',
    'Sites.ReadWrite.All',
    'offline_access'
  ].join(' ')
} as const

export function useAuth() {
  const context = useContext(AuthContext)
  const router = useRouter()
  const supabase = createClientComponentClient()

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  const { user, isLoading, error, permissionsStatus } = context

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

  const initiateGoogleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?provider=google`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            scope: SCOPES.google
          },
        },
      })
      if (error) throw error
      if (data.url) window.location.href = data.url
    } catch (error) {
      console.error('Google login error:', error)
      throw error
    }
  }

  const initiateMicrosoftAuth = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?provider=microsoft`,
          queryParams: {
            prompt: 'consent',
            scope: SCOPES.microsoft
          },
        },
      })
      if (error) throw error
      if (data.url) window.location.href = data.url
    } catch (error) {
      console.error('Microsoft auth error:', error)
      throw error
    }
  }

  const setupPermissions = async ({ provider, redirectUrl, onSuccess, onError }: PermissionSetupOptions) => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider === 'microsoft' ? 'azure' : provider,
        options: {
          redirectTo: redirectUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?provider=${provider}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            scope: SCOPES[provider]
          },
        },
      })

      if (error) throw error
      if (data.url) {
        onSuccess?.()
        window.location.href = data.url
      }
    } catch (error) {
      console.error(`${provider} auth error:`, error)
      onError?.(error instanceof Error ? error : new Error(`${provider} auth failed`))
    }
  }

  const skipPermissionsSetup = async () => {
    if (!user) return

    const { error } = await supabase
      .from('user_profile')
      .update({ permissions_setup_completed: true })
      .eq('id', user.id)

    if (error) throw error
    router.push('/dashboard')
  }

  return {
    user,
    isLoading,
    error,
    permissionsStatus,
    login,
    logout,
    requestPasswordReset,
    updatePassword,
    initiateGoogleLogin,
    initiateMicrosoftAuth,
    setupPermissions,
    skipPermissionsSetup
  }
}
