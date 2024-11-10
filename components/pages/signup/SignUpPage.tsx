"use client"

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
import Link from "next/link"

import { useSignUp } from '@/hooks/useSignUp'
import { ErrorBoundary } from '@/components/pages/ErrorBoundary'
import { LoadingSpinner } from '@/components/pages/signup/LoadingSpinner'
import { GoogleIcon, MicrosoftIcon } from '@/components/icons'

export default function SignUpPage() {
  const {
    form,
    isLoading,
    showPermissionsDialog,
    onSubmit,
    handleGoogleSignUp,
    handleSkipPermissions,
    handleSetGooglePermissions,
    handleSetMicrsoftPermissions
  } = useSignUp()

  const formErrors = form.formState.errors

  return (
    <ErrorBoundary>
      <div className="container mx-auto flex min-h-screen flex-col items-center justify-center">
        <div className="w-full max-w-md space-y-6 rounded-lg border p-8 shadow-lg">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">Create an Account</h1>
            <p className="text-muted-foreground">
              Enter your details below to create your account
            </p>
          </div>

          {formErrors.root && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded">
              {formErrors.root.message}
            </div>
          )}

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

              <Button 
                type="submit" 
                className="w-full relative" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <LoadingSpinner />
                    <span className="ml-2">Creating account...</span>
                  </span>
                ) : (
                  "Sign Up"
                )}
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
                To get the most out of our app, please allow us access to your:
              </p>
              <div className="space-y-4 text-gray-600">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <li className="list-disc list-inside">Google Sheets</li>
                    <li className="list-disc list-inside">Google Docs</li>
                  </div>
                  <button
                    onClick={handleSetGooglePermissions}
                    className="w-full flex items-center justify-center gap-2 bg-white text-gray-700 hover:bg-gray-50 py-2 px-4 rounded border border-gray-300"
                  >
                    <GoogleIcon /> Allow Google permissions
                  </button>
                </div>

                <div className="flex items-center justify-center">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="px-4 text-sm text-gray-500">and/or</span>
                  <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <li className="list-disc list-inside">Microsoft Excel Online</li>
                    <li className="list-disc list-inside">Microsoft Word Online</li>
                  </div>
                  <button
                    onClick={handleSetMicrsoftPermissions}
                    className="w-full flex items-center justify-center gap-2 bg-white text-gray-700 hover:bg-gray-50 py-2 px-4 rounded border border-gray-300"
                  >
                    <MicrosoftIcon /> Allow Microsoft permissions
                  </button>
                </div>

                <button
                  onClick={handleSkipPermissions}
                  className="w-full text-gray-600 hover:text-gray-800"
                >
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}
