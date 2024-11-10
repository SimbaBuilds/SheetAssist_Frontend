import { createClient } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Authentication - AI File',
  description: 'Sign in or create an account to get started with AI File',
}

export default async function AuthPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    redirect('/dashboard')
  }

  redirect('/auth/login')
} 