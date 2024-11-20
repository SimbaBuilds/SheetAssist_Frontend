"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import * as LabelPrimitive from "@radix-ui/react-label"
import { useAuth } from '@/hooks/auth'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { requestPasswordReset } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    try {
      await requestPasswordReset(email)
      setIsSubmitted(true)
    } catch (error: any) {
      console.error('Error requesting password reset:', error)
      setError(error.message || 'Failed to send password reset email')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="container mx-auto px-6 py-12 flex justify-center items-center min-h-screen">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Check Your Email</h1>
          <p className="mb-4">
            We've sent password reset instructions to {email}
          </p>
          <Link 
            href="/login"
            className="text-primary hover:text-primary/90"
          >
            Back to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-12 flex justify-center items-center min-h-screen">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Forgot Password</h1>
        <form onSubmit={handleSubmit} className="bg-background shadow-md rounded px-8 pt-6 pb-8 mb-4 space-y-4">
          {error && (
            <div className="text-red-500 text-sm mb-4">{error}</div>
          )}
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
        </form>
        <div className="text-center">
          <Link 
            href="/login"
            className="text-primary hover:text-primary/90"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
} 