"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import * as LabelPrimitive from "@radix-ui/react-label"
import { useAuth } from '@/hooks/auth'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { updatePassword } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)
    
    try {
      await updatePassword(password)
      router.push('/login')
    } catch (error) {
      console.error('Error resetting password:', error)
      setError('Failed to reset password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-6 py-12 flex justify-center items-center min-h-screen">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Reset Password</h1>
        <form onSubmit={handleSubmit} className="bg-background shadow-md rounded px-8 pt-6 pb-8 mb-4 space-y-4">
          {error && (
            <div className="text-red-500 text-sm mb-4">{error}</div>
          )}
          <div>
            <LabelPrimitive.Root htmlFor="password">New Password</LabelPrimitive.Root>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border-2 border-gray-300 focus:border-primary"
              placeholder="Enter new password"
            />
          </div>
          <div>
            <LabelPrimitive.Root htmlFor="confirmPassword">Confirm Password</LabelPrimitive.Root>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="border-2 border-gray-300 focus:border-primary"
              placeholder="Confirm new password"
            />
          </div>
          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Updating...' : 'Reset Password'}
          </Button>
        </form>
      </div>
    </div>
  )
} 