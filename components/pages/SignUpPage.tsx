"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from '@/hooks/auth'
import { createBrowserClient } from '@supabase/ssr'

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

type SignUpFormValues = z.infer<typeof signUpSchema>

export default function SignUpPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { initiateGoogleLogin, initiateMicrosoftAuth } = useAuth()
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false)

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
      // First create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password
      })
      if (authError) throw authError

      signupData = authData // Store the auth data for error logging

      // Then create user profile
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

      // Initialize user usage
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
      // Log error with proper type checking
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
        // For direct Google signup, we don't set pendingMicrosoftAuth
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
        // Only set pendingMicrosoftAuth when coming from permissions dialog
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

  return (
    <div className="container mx-auto flex min-h-screen flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-6 rounded-lg border p-8 shadow-lg">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Create an Account</h1>
          <p className="text-muted-foreground">
            Enter your details below to create your account
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your first name"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your last name"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your email"
                      type="email"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your password"
                      type="password"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Confirm your password"
                      type="password"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Sign Up"}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-background text-gray-500">Or</span>
              </div>
            </div>

            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 bg-white text-gray-700 hover:bg-gray-50 py-2 px-4 rounded border border-gray-300 font-medium transition duration-150 ease-in-out"
              onClick={handleGoogleSignUp}
            >
              <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
              Sign up with Google
            </button>
          </form>
        </Form>

        <div className="text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </div>
      </div>

      {showPermissionsDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg max-w-md w-full space-y-4">
            <h2 className="text-2xl font-bold">Set Up Permissions</h2>
            <p className="text-gray-600">
              To get the most out of our app, we need permission to access:
            </p>
            <ul className="list-disc list-inside text-gray-600">
              <li>Google Sheets</li>
              <li>Google Docs</li>
              <li>Microsoft Excel Online</li>
              <li>Microsoft Word Online</li>
            </ul>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Skip for now
              </button>
              <button
                onClick={handlePermissionsSetup}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
              >
                Set up permissions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
