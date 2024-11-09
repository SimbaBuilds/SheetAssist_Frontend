import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { SignUpFormValues } from "@/types/auth"

const signUpSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export function useSignUp() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  async function onSubmit(values: SignUpFormValues) {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed')
      }

      setShowPermissionsDialog(true)
    } catch (error) {
      console.error("Signup failed:", error)
      form.setError('root', { 
        message: error instanceof Error ? error.message : 'Signup failed' 
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
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?provider=google`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            scope: [
              'https://www.googleapis.com/auth/spreadsheets',
              'https://www.googleapis.com/auth/documents',
              'https://www.googleapis.com/auth/drive'
            ].join(' ')
          },
        },
      })

      if (error) throw error
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Error signing up with Google:', error)
      form.setError('root', {
        message: 'Failed to sign up with Google'
      })
    }
  }

  const handlePermissionsSetup = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?provider=google&pendingMicrosoft=true`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            scope: [
              'https://www.googleapis.com/auth/spreadsheets',
              'https://www.googleapis.com/auth/documents',
              'https://www.googleapis.com/auth/drive'
            ].join(' ')
          },
        },
      })

      if (error) throw error
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Error setting up permissions:', error)
      form.setError('root', {
        message: 'Failed to set up permissions'
      })
    }
  }

  const handleSkipPermissions = async () => {
    try {
      const { error } = await supabase
        .from('user_profile')
        .update({
          permissions_setup_completed: true
        })
        .eq('id', supabase.auth.getUser().then(({ data }) => data.user?.id))

      if (error) throw error
      router.push('/dashboard')
    } catch (error) {
      console.error('Error skipping permissions:', error)
      form.setError('root', {
        message: 'Failed to skip permissions setup'
      })
    }
  }

  return {
    form,
    isLoading,
    showPermissionsDialog,
    onSubmit,
    handleGoogleSignUp,
    handlePermissionsSetup,
    handleSkipPermissions
  }
} 