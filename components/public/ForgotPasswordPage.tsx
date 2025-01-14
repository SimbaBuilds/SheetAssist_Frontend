"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import * as LabelPrimitive from "@radix-ui/react-label"
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        throw error
      }

      toast.success('Password reset link sent to your email.  You may need to check your spam folder.')
      setEmail('')
    } catch (error) {
      console.error('Error requesting password reset:', error)
      toast.error('Failed to send password reset email')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-6 py-12 flex justify-center items-center min-h-screen">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Forgot Password</h1>
        <form onSubmit={handleSubmit} className="bg-background shadow-md rounded px-8 pt-6 pb-8 mb-4 space-y-4">
          <div>
            <LabelPrimitive.Root htmlFor="email">Email</LabelPrimitive.Root>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-2 border-gray-300 focus:border-primary"
              placeholder="Enter your email address"
            />
          </div>
          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </Button>
          <div className="text-center mt-4">
            <Link 
              href="/auth/login"
              className="text-primary hover:text-primary/90 text-sm"
            >
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
} 