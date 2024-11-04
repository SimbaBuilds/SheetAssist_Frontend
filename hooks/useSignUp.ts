import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from "next/navigation"
import { useAuth } from './auth'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

export type SignUpFormValues = z.infer<typeof signUpSchema>

export function useSignUp() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false)
  const router = useRouter()
  const { initiateGoogleLogin, initiateMicrosoftAuth } = useAuth()

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
    let signupData: { user: { id: string } | null } | null = null

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password
      })
      if (authError) throw authError

      signupData = authData

      const { error: profileError } = await supabase
        .from('user_profile')
        .insert({
          id: authData.user!.id,
          first_name: values.firstName,
          last_name: values.lastName,
          google_permissions_set: false,
          microsoft_permissions_set: false,
          plan: 'free'
        })
      if (profileError) throw profileError

      const { error: usageError } = await supabase
        .from('user_usage')
        .insert({
          id: authData.user!.id,
          recent_urls: [],
          recent_queries: [],
          requests_this_week: 0,
          requests_this_month: 0,
          requests_previous_3_months: 0
        })
      if (usageError) throw usageError

      setShowPermissionsDialog(true)
    } catch (error) {
      console.error("Signup failed:", error)
      if (error instanceof Error) {
        await supabase
          .from('error_messages')
          .insert({
            user_id: signupData?.user?.id || null,
            message: error.message,
            error_code: 'AUTH_ERROR',
            resolved: false
          })
      } else {
        await supabase
          .from('error_messages')
          .insert({
            user_id: signupData?.user?.id || null,
            message: 'An unknown error occurred during signup',
            error_code: 'UNKNOWN_ERROR',
            resolved: false
          })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    try {
      const googleAuthUrl = await initiateGoogleLogin()
      if (googleAuthUrl) {
        window.location.href = googleAuthUrl
      } else {
        throw new Error('Failed to initiate Google authentication')
      }
    } catch (error) {
      console.error('Error signing up with Google:', error)
      alert('Error signing up with Google')
    }
  }

  const handlePermissionsSetup = async () => {
    try {
      const googleAuthUrl = await initiateGoogleLogin()
      if (googleAuthUrl) {
        localStorage.setItem('pendingMicrosoftAuth', 'true')
        window.location.href = googleAuthUrl
      } else {
        throw new Error('Failed to initiate Google authentication')
      }
    } catch (error) {
      console.error('Error setting up permissions:', error)
      alert('Error setting up permissions. Please try again.')
    }
  }

  const handleSkipPermissions = () => {
    router.push('/dashboard')
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