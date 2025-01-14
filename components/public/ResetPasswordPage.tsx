"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import * as LabelPrimitive from "@radix-ui/react-label"
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const validatePassword = (password: string) => {
    const errors = []
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters')
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number')
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }
    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const code = searchParams.get('code')
      
      if (!code) {
        toast.error('Invalid reset link')
        router.push('/auth/login')
        return
      }

      // Validate password requirements
      const passwordErrors = validatePassword(newPassword)
      if (passwordErrors.length > 0) {
        toast.error(passwordErrors[0])
        setIsLoading(false)
        return
      }

      if (newPassword !== confirmPassword) {
        toast.error('Passwords do not match')
        setIsLoading(false)
        return
      }

      // Update the password using the recovery code
      const { error } = await supabase.auth.updateUser({ 
        password: newPassword 
      })

      if (error) {
        throw error
      }

      toast.success('Password updated successfully')
      await supabase.auth.signOut()
      router.push('/auth/login')
    } catch (error) {
      console.error('Error updating password:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-6 py-12 flex justify-center items-center min-h-screen">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Reset Password</h1>
        <form onSubmit={handleSubmit} className="bg-background shadow-md rounded px-8 pt-6 pb-8 mb-4 space-y-4">
          <div className="space-y-2">
            <LabelPrimitive.Root htmlFor="newPassword">New Password</LabelPrimitive.Root>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="border-2 border-gray-300 focus:border-primary"
              placeholder="Enter your new password"
              minLength={8}
            />
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Password must:</p>
              <ul className="list-disc list-inside pl-2">
                <li>Be at least 8 characters</li>
                <li>Contain at least one number</li>
                <li>Contain at least one lowercase letter</li>
              </ul>
            </div>
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
              placeholder="Confirm your new password"
              minLength={8}
            />
          </div>
          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </div>
    </div>
  )
} 