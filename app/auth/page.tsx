import { createClient } from '@/utils/supabase/client'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Authentication - Sheet Assist',
  description: 'Sign in or create an account to get started with Sheet Assist',
}

export default async function AuthPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    redirect('/dashboard')
  }

  redirect('/auth/login')
} 