import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import type { SignUpFormValues } from '@/types/auth'
// Validation schema
const signUpSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export function useSignUp() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [isLoading, setIsLoading] = useState(false)
  
  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: ''
    }
  })

  const handleEmailSignUp = async (data: SignUpFormValues) => {
    setIsLoading(true)
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
          }
        }
      })

      if (error) throw error
      
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('user_profile')
          .insert({
            id: authData.user.id,
            first_name: data.firstName,
            last_name: data.lastName,
            google_permissions_set: false,
            microsoft_permissions_set: false,
            permissions_setup_completed: false,
            plan: 'free'
          })

        if (profileError) throw profileError

        const { error: usageError } = await supabase
          .from('user_usage')
          .insert({
            user_id: authData.user.id,
            recent_queries: [],
            requests_this_week: 0,
            requests_this_month: 0,
            requests_previous_3_months: 0
          })

        if (usageError) throw usageError
      }

      router.push('/auth/verify-email')
    } catch (error) {
      console.error('Error signing up:', error)
      form.setError('root', { 
        type: 'manual',
        message: error instanceof Error ? error.message : 'An error occurred during sign up'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/google/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            scope: 'openid email profile'
          }
        }
      })

      if (error) throw error
      
      if (data?.url) {
        window.location.href = data.url
      } else {
        throw new Error('No authentication URL returned')
      }
    } catch (error) {
      console.error('Google sign up error:', error)
      form.setError('root', {
        type: 'manual',
        message: error instanceof Error ? error.message : 'Failed to sign up with Google'
      })
    }
  }

  return {
    form,
    handleEmailSignUp,
    handleGoogleSignUp,
    isLoading
  }
} 