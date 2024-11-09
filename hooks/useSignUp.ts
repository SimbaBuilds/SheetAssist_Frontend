import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
  import * as z from "zod"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { SignUpFormValues, PasswordStrength } from "@/types/auth"
import React from "react"
import { DOCUMENT_SCOPES } from "@/hooks/useAuth"
import { useAuth } from '@/hooks/useAuth'
import { getGoogleOAuthURL } from "@/utils/google-oauth"
import { getMicrosoftOAuthURL } from "@/utils/microsoft-oauth"

// Password strength regex patterns
const passwordStrengthPatterns = {
  hasNumber: /\d/,
  hasLowerCase: /[a-z]/,
  minLength: 8,
}

const signUpSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(passwordStrengthPatterns.minLength, `Password must be at least ${passwordStrengthPatterns.minLength} characters`)
    .regex(passwordStrengthPatterns.hasLowerCase, "Password must contain at least one lowercase letter")
    .regex(passwordStrengthPatterns.hasNumber, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data: { password: string; confirmPassword: string }) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export function useSignUp() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    hasNumber: false,
    hasLowerCase: false,
    hasMinLength: false,
  })
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { linkIdentity } = useAuth()

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onChange", // Enable real-time validation
  })

  // Calculate password strength
  const calculatePasswordStrength = (password: string) => {
    const strength = {
      score: 0,
      hasNumber: passwordStrengthPatterns.hasNumber.test(password),
      hasLowerCase: passwordStrengthPatterns.hasLowerCase.test(password),
      hasMinLength: password.length >= passwordStrengthPatterns.minLength,
    }

    // Calculate score based on criteria met
    strength.score = [
      strength.hasNumber,
      strength.hasLowerCase,
      strength.hasMinLength,
    ].filter(Boolean).length

    setPasswordStrength(strength)
  }

  // Watch password field for changes
  const password = form.watch("password")
  const confirmPassword = form.watch("confirmPassword")

  // Update password strength when password changes
  React.useEffect(() => {
    calculatePasswordStrength(password)
    
    // Validate confirm password when password changes
    if (confirmPassword && password !== confirmPassword) {
      form.setError("confirmPassword", {
        type: "manual",
        message: "Passwords don't match",
      })
    } else {
      form.clearErrors("confirmPassword")
    }
  }, [password, confirmPassword])

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
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            scope: [
              'https://www.googleapis.com/auth/spreadsheets',
              'https://www.googleapis.com/auth/documents',
              'https://www.googleapis.com/auth/drive'
            ].join(' ')
          }
        }
      })

      if (error) throw error
      if (data.url) window.location.href = data.url
    } catch (error) {
      console.error('Error signing up with Google:', error)
      form.setError('root', {
        message: 'Failed to sign up with Google'
      })
    }
  }

  const handlePermissionsSetup = async (provider: 'google' | 'azure') => {
    if (provider === 'google') {
      const googleAuthUrl = getGoogleOAuthURL()
      window.location.href = googleAuthUrl
    } else {
      const microsoftAuthUrl = getMicrosoftOAuthURL()
      window.location.href = microsoftAuthUrl
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

  const handleMicrosoftSignUp = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
          queryParams: {
            prompt: 'consent',
            scope: [
              'offline_access',
              'Files.ReadWrite.All',
              'Sites.ReadWrite.All'
            ].join(' ')
          }
        }
      })

      if (error) throw error
      if (data.url) window.location.href = data.url
    } catch (error) {
      console.error('Error signing up with Microsoft:', error)
      form.setError('root', {
        message: 'Failed to sign up with Microsoft'
      })
    }
  }

  return {
    form,
    isLoading,
    showPermissionsDialog,
    passwordStrength,
    onSubmit,
    handleGoogleSignUp,
    handleMicrosoftSignUp,
    handlePermissionsSetup,
    handleSkipPermissions,
  }
} 